import type JSZip from "jszip";
import { calculateStreak } from "../utils/streakUtils";
import { getTopWords, STOP_WORDS } from "../utils/textUtils";
import Sentiment from "sentiment";
import type { AggregateStats, ChannelStats } from "../types/discord";

async function processMessages(
  zip: JSZip,
  userMapping: Record<string, any>,
  yourId: string,
  onProgress: (msgProgress: number) => void,
) {
  const sentiment = new Sentiment();
  const MESSAGE_GAP_THRESHOLD_S = 30 * 60;

  // --- Pre-index all channel.json files in one pass ---
  const channelJsonFiles = zip.file(/^Messages\/c\d+\/channel\.json$/i);
  const channelDataMap = new Map<string, any>();
  const channelMapping: Record<string, string> = {};
  const channelNaming: Record<string, string> = {};

  await Promise.all(
    channelJsonFiles.map(async (f) => {
      try {
        const data = JSON.parse(await f.async("text"));
        if (!data?.id) return;

        let type: "DM" | "GROUP_DM" | "GUILD_TEXT" | "GUILD_VOICE" | "PUBLIC_THREAD" = "GUILD_TEXT";
        if (data.type === "DM") type = "DM";
        else if (data.type === "GROUP_DM") type = "GROUP_DM";
        else if (data.type === 13) type = "PUBLIC_THREAD";
        else if (data.type === "GUILD_VOICE") type = "GUILD_VOICE";

        channelMapping[data.id] = type;
        if (data.name) channelNaming[data.id] = data.name;
        channelDataMap.set(data.id, data);
      } catch {
        // skip unreadable channel metadata
      }
    }),
  );

  const aggregateStats: AggregateStats = {
    hourly: {},
    monthly: {},
    topWords: [],
    totalGapTime: 0,
    numGaps: 0,
    messageCount: 0,
    averageGapBetweenMessages: 0,
    averageConversationTime: 0,
    longestConversationTime: 0,
    hourlySentimentTotal: {},
    hourlySentimentAverage: {},
  };

  const channelStats: Record<string, ChannelStats> = {};
  const dmManifest: string[] = [];
  const channelManifest: string[] = [];
  const globalWordFreq: Record<string, number> = {};
  const globalHourlyAnalyzedCount: Record<string, number> = {};
  const deletedUserCountMap: Record<string, number> = {};

  const messageFiles = zip.file(/^Messages\/c\d+\/messages\.json$/i) ?? [];
  const totalFiles = messageFiles.length;
  let processedFiles = 0;

  for (const messagesFile of messageFiles) {
    onProgress(((++processedFiles / totalFiles) * 100) | 0);

    try {
      const channelIdMatch = messagesFile.name.match(/c(\d+)/);
      if (!channelIdMatch) continue;
      const channelId = channelIdMatch[1];
      const channelType = channelMapping[channelId];
      if (!channelType) continue;

      const messages: any[] = JSON.parse(await messagesFile.async("text"));
      if (!messages.length) continue;

      const stats: any = {
        hourly: {},
        monthly: {},
        sentiment: { average: 0, positive: 0, negative: 0, neutral: 0 },
        totalGapTime: 0,
        numGaps: 0,
        totalConversationTime: 0,
        longestConversationTime: 0,
        messageCount: 0,
        averageGapBetweenMessages: 0,
        averageConversationTime: 0,
        firstMessageTimestamp: null,
      };

      const localWordFreq: Record<string, number> = {};
      const messageDates = new Set<string>();
      let prevMessageTime: number | null = null;
      let startTime: number | null = null;
      let analyzedCount = 0;
      const hourlyAnalyzedCount: Record<string, number> = {};
      const localHourlySentimentTotal: Record<string, number> = {};

      messages.sort((a: any, b: any) => {
        const tA = a.Timestamp ? new Date(a.Timestamp.replace(" ", "T")).getTime() : 0;
        const tB = b.Timestamp ? new Date(b.Timestamp.replace(" ", "T")).getTime() : 0;
        return tA - tB;
      });

      for (const msg of messages) {
        if (!msg.Timestamp) continue;
        const timestamp = new Date(msg.Timestamp.replace(" ", "T"));
        if (isNaN(timestamp.getTime())) continue;

        const currentTime = (timestamp.getTime() / 1000) | 0;
        const hour = timestamp.getHours().toString().padStart(2, "0");
        const month = `${timestamp.getFullYear()}-${(timestamp.getMonth() + 1).toString().padStart(2, "0")}`;

        stats.hourly[hour] = (stats.hourly[hour] || 0) + 1;
        stats.monthly[month] = (stats.monthly[month] || 0) + 1;
        aggregateStats.hourly[hour] = (aggregateStats.hourly[hour] || 0) + 1;
        aggregateStats.monthly[month] = (aggregateStats.monthly[month] || 0) + 1;
        stats.messageCount++;
        aggregateStats.messageCount++;

        if (startTime === null) {
          startTime = currentTime;
        } else if (prevMessageTime !== null) {
          const gap = currentTime - prevMessageTime;
          if (gap > MESSAGE_GAP_THRESHOLD_S) {
            const conversationDuration = prevMessageTime - startTime;
            stats.totalConversationTime += conversationDuration;
            if (conversationDuration > stats.longestConversationTime) {
              stats.longestConversationTime = conversationDuration;
            }
            stats.totalGapTime += gap - MESSAGE_GAP_THRESHOLD_S;
            stats.numGaps++;
            aggregateStats.totalGapTime += gap - MESSAGE_GAP_THRESHOLD_S;
            aggregateStats.numGaps++;
            startTime = currentTime;
          }
        }

        prevMessageTime = currentTime;
        const dateStr = timestamp.toISOString().slice(0, 10);
        messageDates.add(dateStr);

        // Capture first message timestamp from the earliest sorted message
        if (stats.firstMessageTimestamp === null) {
          stats.firstMessageTimestamp = timestamp.toISOString();
        }

        if (msg.Contents) {
          const result = sentiment.analyze(msg.Contents);
          if (result.score > 0) stats.sentiment.positive++;
          else if (result.score < 0) stats.sentiment.negative++;
          else stats.sentiment.neutral++;

          stats.sentiment.average += result.score;
          analyzedCount++;

          aggregateStats.hourlySentimentTotal[hour] =
            (aggregateStats.hourlySentimentTotal[hour] || 0) + result.score;
          localHourlySentimentTotal[hour] =
            (localHourlySentimentTotal[hour] || 0) + result.score;
          hourlyAnalyzedCount[hour] = (hourlyAnalyzedCount[hour] || 0) + 1;
          globalHourlyAnalyzedCount[hour] =
            (globalHourlyAnalyzedCount[hour] || 0) + 1;

          const words = msg.Contents.toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .split(/\s+/);
          for (const word of words) {
            if (word && !STOP_WORDS.has(word)) {
              localWordFreq[word] = (localWordFreq[word] || 0) + 1;
              globalWordFreq[word] = (globalWordFreq[word] || 0) + 1;
            }
          }
        }
      }

      // Final conversation segment
      if (startTime !== null && prevMessageTime !== null) {
        const conversationDuration = prevMessageTime - startTime;
        stats.totalConversationTime += conversationDuration;
        if (conversationDuration > stats.longestConversationTime) {
          stats.longestConversationTime = conversationDuration;
        }
      }

      if (analyzedCount > 0) stats.sentiment.average /= analyzedCount;
      stats.averageGapBetweenMessages =
        stats.numGaps > 0 ? stats.totalGapTime / stats.numGaps : 0;
      stats.averageConversationTime =
        stats.messageCount > 0
          ? stats.totalConversationTime / (stats.numGaps + 1)
          : 0;

      const channelHourlySentimentAverage: Record<string, number> = {};
      for (const hour in stats.hourly) {
        const analyzed = hourlyAnalyzedCount[hour] || 0;
        const total = localHourlySentimentTotal[hour] || 0;
        channelHourlySentimentAverage[hour] = analyzed > 0 ? total / analyzed : 0;
      }
      stats.hourlySentimentAverage = channelHourlySentimentAverage;

      stats.topWords = getTopWords(localWordFreq, 50);
      const streak = calculateStreak(messageDates);
      stats.longestStreak = streak.length;
      stats.streakStart = streak.start;
      stats.streakEnd = streak.end;

      const channelData = channelDataMap.get(channelId);
      if (!channelData) continue;

      if (channelType === "DM") {
        const recipientId =
          channelData.recipients?.find((r: string) => r !== yourId) ?? "unknown";

        let recipientName =
          userMapping[recipientId]?.username ?? `Unknown (${recipientId})`;

        if (recipientName === "Deleted User") {
          deletedUserCountMap["Deleted User"] =
            (deletedUserCountMap["Deleted User"] || 0) + 1;
          recipientName = `Deleted User${deletedUserCountMap["Deleted User"]}`;
        }

        stats.recipientName = recipientName;
        channelStats[`dm_${channelId}`] = stats;
        dmManifest.push(`dm_${channelId}.json`);
      } else {
        stats.recipientName =
          channelData.name ||
          (channelType === "GROUP_DM"
            ? `Group DM (${channelId})`
            : `Unnamed Channel (${channelId})`);
        channelStats[`channel_${channelId}`] = stats;
        channelManifest.push(`channel_${channelId}.json`);
      }
    } catch (err) {
      console.warn(`Failed processing messages for file: ${messagesFile.name}`, err);
    }
  }

  aggregateStats.averageGapBetweenMessages =
    aggregateStats.numGaps > 0
      ? aggregateStats.totalGapTime / aggregateStats.numGaps
      : 0;
  aggregateStats.topWords = getTopWords(globalWordFreq, 50);

  for (const hour in aggregateStats.hourly) {
    const total = aggregateStats.hourlySentimentTotal[hour] || 0;
    const analyzed = globalHourlyAnalyzedCount[hour] || 0;
    aggregateStats.hourlySentimentAverage[hour] =
      analyzed > 0 ? total / analyzed : 0;
  }

  return {
    aggregateStats,
    channelStats,
    channelMapping,
    channelNaming,
    channelManifest,
    dmManifest,
  };
}

export { processMessages };