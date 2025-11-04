import type JSZip from "jszip";
import { calculateStreak } from "../utils/streakUtils";
import { getTopWords, STOP_WORDS } from "../utils/textUtils";
import Sentiment from "sentiment";

async function processMessages(
  zip: JSZip,
  channelMapping: Record<string, string>,
  userMapping: Record<string, any>,
  yourId: string,
  p0: (msgProgress: number) => void
) {
  const sentiment = new Sentiment();
  const MESSAGE_GAP_THRESHOLD = 30;
  const MESSAGE_GAP_IGNORED = 259200;

  const aggregateStats = {
    hourly: {} as Record<string, number>,
    monthly: {} as Record<string, number>,
    topWords: [] as string[],
    totalGapTime: 0,
    numGaps: 0,
    messageCount: 0,
    averageGapBetweenMessages: 0,
    hourlySentimentTotal: {} as Record<string, number>,
    hourlySentimentAverage: {} as Record<string, number>,
  };

  const channelStats: Record<string, any> = {};
  const dmManifest: string[] = [];
  const globalWordFreq: Record<string, number> = {};
  const deletedUserCountMap: Record<string, number> = {};
  const messageFiles = zip.file(/^Messages\/c\d+\/messages\.json$/i) || [];
  const totalFiles = messageFiles.length;
  let processedFiles = 0;
  await Promise.all(
    messageFiles.map(async (messagesFile) => {
      processedFiles++;
      p0(Math.floor((processedFiles / totalFiles) * 100));
      try {
        const channelIdMatch = messagesFile.name.match(/c(\d+)/);
        if (!channelIdMatch) return;
        const channelId = channelIdMatch[1];
        const channelType = channelMapping[channelId];
        if (!channelType) return;

        const content = await messagesFile.async("text");
        const messages = JSON.parse(content);
        if (!Array.isArray(messages) || messages.length === 0) return;

        const stats: any = {
          hourly: {},
          monthly: {},
          totalGapTime: 0,
          numGaps: 0,
          messageCount: 0,
          averageGapBetweenMessages: 0,
        };

        const localWordFreq: Record<string, number> = {};
        const messageDates = new Set<string>();
        let prevMessageTime: number | null = null;

        messages.sort((a: any, b: any) => {
          const tA = a.Timestamp
            ? new Date(a.Timestamp.replace(" ", "T")).getTime()
            : 0;
          const tB = b.Timestamp
            ? new Date(b.Timestamp.replace(" ", "T")).getTime()
            : 0;
          return tA - tB;
        });

        for (const msg of messages) {
          if (!msg.Timestamp) continue;

          const timestamp = new Date(msg.Timestamp.replace(" ", "T"));
          if (isNaN(timestamp.getTime())) continue;

          const hour = timestamp.getHours().toString().padStart(2, "0");
          const month = `${timestamp.getFullYear()}-${(timestamp.getMonth() + 1)
            .toString()
            .padStart(2, "0")}`;

          stats.hourly[hour] = (stats.hourly[hour] || 0) + 1;
          stats.monthly[month] = (stats.monthly[month] || 0) + 1;
          aggregateStats.hourly[hour] = (aggregateStats.hourly[hour] || 0) + 1;
          aggregateStats.monthly[month] =
            (aggregateStats.monthly[month] || 0) + 1;

          stats.messageCount++;
          aggregateStats.messageCount++;

          const currentTime = Math.floor(timestamp.getTime() / 1000);
          if (prevMessageTime !== null) {
            const gap = currentTime - prevMessageTime;
            if (gap > MESSAGE_GAP_THRESHOLD && gap < MESSAGE_GAP_IGNORED) {
              stats.totalGapTime += gap;
              stats.numGaps++;
              aggregateStats.totalGapTime += gap;
              aggregateStats.numGaps++;
            }
          }
          prevMessageTime = currentTime;

          messageDates.add(timestamp.toISOString().split("T")[0]);

          if (msg.Contents) {
            const result = sentiment.analyze(msg.Contents);
            if (!stats.sentiment) {
              stats.sentiment = {
                average: 0,
                positive: 0,
                negative: 0,
                neutral: 0,
              };
            }

            if (result.score > 0) stats.sentiment.positive++;
            else if (result.score < 0) stats.sentiment.negative++;
            else stats.sentiment.neutral++;

            stats.sentiment.average += result.score;
            aggregateStats.hourlySentimentTotal[hour] =
              (aggregateStats.hourlySentimentTotal[hour] || 0) + result.score;
            const words = msg.Contents.toLowerCase()
              .replace(/[^a-z0-9\s]/g, "")
              .split(/\s+/)
              .filter((word: string) => word && !STOP_WORDS.has(word));

            for (const word of words) {
              localWordFreq[word] = (localWordFreq[word] || 0) + 1;
              globalWordFreq[word] = (globalWordFreq[word] || 0) + 1;
            }
          }
        }
        if (stats.messageCount > 0 && stats.sentiment) {
          stats.sentiment.average /= stats.messageCount;
        }
        stats.averageGapBetweenMessages =
          stats.numGaps > 0 ? stats.totalGapTime / stats.numGaps : 0;

        if (channelType === "DM") {
          const channelFile = zip.file(
            new RegExp(`^Messages/c${channelId}/channel\\.json$`, "i")
          )?.[0];
          if (channelFile) {
            const channelData = JSON.parse(await channelFile.async("text"));
            const recipientId =
              channelData.recipients?.find((r: string) => r !== yourId) ||
              "unknown";

            let recipientName =
              userMapping[recipientId]?.username ||
              (await resolveUserName(zip, recipientId)) ||
              "Unknown" + ` (${recipientId})`;

            if (recipientName === "Deleted User") {
              deletedUserCountMap[recipientName] =
                (deletedUserCountMap[recipientName] || 0) + 1;
              recipientName = `Deleted User${deletedUserCountMap[recipientName]}`;
            }

            stats.recipientName = recipientName;
            stats.topWords = getTopWords(localWordFreq, 5);
            const streak = calculateStreak(messageDates);
            stats.longestStreak = streak.length;
            stats.streakStart = streak.start;
            stats.streakEnd = streak.end;

            channelStats[`dm_${channelId}`] = stats;
            channelStats[`dm_${channelId}`].firstMessageTimestamp = messageDates
              .values()
              .next().value;
            dmManifest.push(`dm_${channelId}.json`);
          }
        } else {
          const channelFile = zip.file(
            new RegExp(`^Messages/c${channelId}/channel\\.json$`, "i")
          )?.[0];
          if (channelFile) {
            const channelData = JSON.parse(await channelFile.async("text"));
            const channelName =
              channelData.name ||
              (channelType === "GROUP_DM"
                ? "Group DM" + ` (${channelId})`
                : "Unnamed Channel" + ` (${channelId})`);

            stats.recipientName = channelName;
            stats.topWords = getTopWords(localWordFreq, 5);
            const streak = calculateStreak(messageDates);
            stats.longestStreak = streak.length;
            stats.streakStart = streak.start;
            stats.streakEnd = streak.end;

            channelStats[`channel_${channelId}`] = stats;
          }
        }
      } catch (err) {
        console.warn(
          `Failed processing messages for file: ${messagesFile.name}`,
          err
        );
      }
    })
  );

  aggregateStats.averageGapBetweenMessages =
    aggregateStats.numGaps > 0
      ? aggregateStats.totalGapTime / aggregateStats.numGaps
      : 0;
  aggregateStats.topWords = getTopWords(globalWordFreq, 5);
  for (const hour in aggregateStats.hourly) {
    const count = aggregateStats.hourly[hour];
    const total = aggregateStats.hourlySentimentTotal[hour] || 0;
    aggregateStats.hourlySentimentAverage[hour] = count > 0 ? total / count : 0;
  }
  return { aggregateStats, channelStats, dmManifest };
}


async function resolveUserName(
  zip: JSZip,
  userId: string
): Promise<string | null> {
  const user = await searchUserInUsersJson(zip, userId);
  return user?.username || null;
}

async function searchUserInUsersJson(
  zip: JSZip,
  userId: string
): Promise<{ username: string; avatar: string } | null> {
  const usersFile = zip.file(/^Account\/users\.json$/i)?.[0];
  if (!usersFile) return null;

  const content = await usersFile.async("text");
  let data: any;
  try {
    data = JSON.parse(content);
  } catch {
    return null;
  }

  function recursiveSearch(
    obj: any
  ): { username: string; avatar: string } | null {
    if (!obj || typeof obj !== "object") return null;
    if (obj.id === userId && obj.username) {
      return { username: obj.username, avatar: obj.avatar || "" };
    }
    for (const key of Object.keys(obj)) {
      const result = recursiveSearch(obj[key]);
      if (result) return result;
    }
    return null;
  }

  return recursiveSearch(data);
}



export { processMessages };