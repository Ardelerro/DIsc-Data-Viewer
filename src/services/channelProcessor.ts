import type JSZip from "jszip";
import Sentiment from "sentiment";
import { getTopWords, STOP_WORDS } from "../utils/textUtils";
import { calculateStreak } from "../utils/streakUtils";
import type { ChannelStats } from "../types/discord";

async function processChannels(zip: JSZip) {
  const sentiment = new Sentiment();
  const MESSAGE_GAP_THRESHOLD = 30;
  const MESSAGE_GAP_IGNORED = 259200;

  const channelMapping: Record<string, string> = {};
  const channelNaming: Record<string, string> = {};
  const channelStats: Record<string, ChannelStats> = {};
  const channelManifest: string[] = [];

  const globalWordFreq: Record<string, number> = {};
  const aggregateStats = {
    hourly: {} as Record<string, number>,
    monthly: {} as Record<string, number>,
    hourlySentimentTotal: {} as Record<string, number>,
    hourlySentimentAverage: {} as Record<string, number>,
    totalGapTime: 0,
    numGaps: 0,
    messageCount: 0,
    averageGapBetweenMessages: 0,
    topWords: [] as string[],
    firstMessageTimestamp: null,
  };

  const channelFiles = zip.file(/^Messages\/c\d+\/channel\.json$/i);

  for (const channelFile of channelFiles) {
    try {
      const content = await channelFile.async("text");
      const channelData = JSON.parse(content);
      if (!channelData.id) continue;

      let type:
        | "DM"
        | "GROUP_DM"
        | "GUILD_TEXT"
        | "GUILD_VOICE"
        | "PUBLIC_THREAD" = "GUILD_TEXT";

      if (channelData.type === "DM") type = "DM";
      else if (channelData.type === "GROUP_DM") type = "GROUP_DM";
      else if (channelData.type === 13) type = "PUBLIC_THREAD";
      else if (channelData.type === "GUILD_VOICE") type = "GUILD_VOICE";

      channelMapping[channelData.id] = type;
      if (channelData.name) channelNaming[channelData.id] = channelData.name;

      if (type !== "GUILD_TEXT" && type !== "PUBLIC_THREAD") continue;

      const messageFile = zip.file(
        new RegExp(`^Messages/c${channelData.id}/messages\\.json$`, "i")
      )?.[0];
      if (!messageFile) continue;

      const messageContent = await messageFile.async("text");
      const messages = JSON.parse(messageContent);
      if (!Array.isArray(messages) || messages.length === 0) continue;

      const stats: any = {
        hourly: {},
        monthly: {},
        sentiment: { average: 0, positive: 0, negative: 0, neutral: 0 },
        totalGapTime: 0,
        numGaps: 0,
        messageCount: 0,
        averageGapBetweenMessages: 0,
        firstMessageTimestamp: null,
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

      if (stats.messageCount > 0) {
        stats.sentiment.average /= stats.messageCount;
      }
      stats.averageGapBetweenMessages =
        stats.numGaps > 0 ? stats.totalGapTime / stats.numGaps : 0;

      stats.topWords = getTopWords(localWordFreq, 5);
      const streak = calculateStreak(messageDates);
      stats.longestStreak = streak.length;
      stats.streakStart = streak.start;
      stats.streakEnd = streak.end;
      stats.recipientName = channelData.name || `Channel ${channelData.id}`;
      if (messages.length > 0) {
        const first = messages[0];
        const firstTs =
          first.Timestamp || first.timestamp || first.date || null;
        stats.firstMessageTimestamp = firstTs
          ? new Date(firstTs.replace(" ", "T")).toISOString()
          : null;
          console.log(`Channel ${channelData.id} first message timestamp: ${stats.firstMessageTimestamp}`);
      }

      channelStats[`channel_${channelData.id}`] = stats;
      channelManifest.push(`channel_${channelData.id}.json`);
    } catch (err) {
      console.warn(`Failed to process ${channelFile.name}:`, err);
    }
  }

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
  console.log(channelStats);
  return {
    aggregateStats,
    channelStats,
    channelMapping,
    channelNaming,
    channelManifest,
  };
}

export { processChannels };
