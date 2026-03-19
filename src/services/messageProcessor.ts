import type JSZip from "jszip";
import { calculateStreak } from "../utils/streakUtils";
import { getTopWords, STOP_WORDS } from "../utils/textUtils";
import Sentiment from "sentiment";
import type { AggregateStats } from "../types/discord";
import type { ChannelStats } from "../types/discord";

async function processMessages(
  zip: JSZip,
  channelMapping: Record<string, string>,
  userMapping: Record<string, any>,
  yourId: string,
  p0: (msgProgress: number) => void,
) {
  const sentiment = new Sentiment();
  const MESSAGE_GAP_THRESHOLD_S = 30 * 60; // pre-multiply once

  /*
  const aggregateStats = {
    hourly: {} as Record<string, number>,
    monthly: {} as Record<string, number>,
    topWords: [] as string[],
    totalGapTime: 0,
    numGaps: 0,
    messageCount: 0,
    averageGapBetweenMessages: 0,
    averageConversationTime: 0,
    longestConversationTime: 0,
    hourlySentimentTotal: {} as Record<string, number>,
    hourlySentimentAverage: {} as Record<string, number>,
  };
  */
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
  const globalWordFreq: Record<string, number> = {};
  const deletedUserCountMap: Record<string, number> = {};

  const messageFiles = zip.file(/^Messages\/c\d+\/messages\.json$/i) || [];
  const totalFiles = messageFiles.length;
  let processedFiles = 0;

  // Sequential — avoids parallel decompression memory spikes
  for (const messagesFile of messageFiles) {
    p0(((++processedFiles / totalFiles) * 100) | 0);

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
      };

      const localWordFreq: Record<string, number> = {};
      const messageDates = new Set<string>();
      let prevMessageTime: number | null = null;
      let startTime: number | null = null;

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
            stats.totalConversationTime += prevMessageTime - startTime;
            stats.totalGapTime += gap - MESSAGE_GAP_THRESHOLD_S;
            stats.numGaps++;
            aggregateStats.totalGapTime += gap - MESSAGE_GAP_THRESHOLD_S;
            aggregateStats.numGaps++;
            startTime = currentTime;
          }
        }

        prevMessageTime = currentTime;
        messageDates.add(timestamp.toISOString().slice(0, 10)); // avoids split() array alloc

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
            .split(/\s+/);
          for (const word of words) {
            if (word && !STOP_WORDS.has(word)) {
              localWordFreq[word] = (localWordFreq[word] || 0) + 1;
              globalWordFreq[word] = (globalWordFreq[word] || 0) + 1;
            }
          }
        }
      }

      if (startTime !== null && prevMessageTime !== null) {
        stats.totalConversationTime += prevMessageTime - startTime;
      }
      if (stats.messageCount > 0) {
        stats.sentiment.average /= stats.messageCount;
      }
      stats.averageGapBetweenMessages =
        stats.numGaps > 0 ? stats.totalGapTime / stats.numGaps : 0;
      stats.averageConversationTime =
        stats.messageCount > 0
          ? stats.totalConversationTime / (stats.numGaps + 1)
          : 0;

      const topWords = getTopWords(localWordFreq, 5);
      const streak = calculateStreak(messageDates);

      // Read channel.json once, handle both DM and non-DM
      const channelFile = zip.file(
        new RegExp(`^Messages/c${channelId}/channel\\.json$`, "i"),
      )?.[0];
      if (!channelFile) continue;

      const channelData = JSON.parse(await channelFile.async("text"));

      stats.topWords = topWords;
      stats.longestStreak = streak.length;
      stats.streakStart = streak.start;
      stats.streakEnd = streak.end;

      if (channelType === "DM") {
        const recipientId =
          channelData.recipients?.find((r: string) => r !== yourId) ?? "unknown";

        // Uses pre-built userMapping — no per-DM users.json re-reads
        let recipientName =
          userMapping[recipientId]?.username ?? `Unknown (${recipientId})`;

        if (recipientName === "Deleted User") {
          deletedUserCountMap["Deleted User"] =
            (deletedUserCountMap["Deleted User"] || 0) + 1;
          recipientName = `Deleted User${deletedUserCountMap["Deleted User"]}`;
        }

        stats.recipientName = recipientName;
        stats.firstMessageTimestamp = messageDates.values().next().value ?? null;
        channelStats[`dm_${channelId}`] = stats;
        dmManifest.push(`dm_${channelId}.json`);
      } else {
        stats.recipientName =
          channelData.name ||
          (channelType === "GROUP_DM"
            ? `Group DM (${channelId})`
            : `Unnamed Channel (${channelId})`);
        channelStats[`channel_${channelId}`] = stats;
      }
    } catch (err) {
      console.warn(`Failed processing messages for file: ${messagesFile.name}`, err);
    }
  }

  aggregateStats.averageGapBetweenMessages =
    aggregateStats.numGaps > 0
      ? aggregateStats.totalGapTime / aggregateStats.numGaps
      : 0;
  aggregateStats.topWords = getTopWords(globalWordFreq, 5);

  for (const hour in aggregateStats.hourly) {
    const count = aggregateStats.hourly[hour];
    aggregateStats.hourlySentimentAverage[hour] =
      count > 0 ? (aggregateStats.hourlySentimentTotal[hour] || 0) / count : 0;
  }

  return { aggregateStats, channelStats, dmManifest };
}

export { processMessages };