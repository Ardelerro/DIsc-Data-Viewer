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
    firstMessageTimestamp: null as string | null,
  };

  const channelFiles = zip.file(/^Messages\/c\d+\/channel\.json$/i);

  // Phase 1: read all channel.json files in parallel (small files, safe)
  const channelDataList = await Promise.all(
    channelFiles.map(async (channelFile) => {
      try {
        const content = await channelFile.async("text");
        return JSON.parse(content);
      } catch {
        return null;
      }
    })
  );

  for (const channelData of channelDataList) {
    if (!channelData?.id) continue;

    let type: "DM" | "GROUP_DM" | "GUILD_TEXT" | "GUILD_VOICE" | "PUBLIC_THREAD" = "GUILD_TEXT";
    if (channelData.type === "DM") type = "DM";
    else if (channelData.type === "GROUP_DM") type = "GROUP_DM";
    else if (channelData.type === 13) type = "PUBLIC_THREAD";
    else if (channelData.type === "GUILD_VOICE") type = "GUILD_VOICE";

    channelMapping[channelData.id] = type;
    if (channelData.name) channelNaming[channelData.id] = channelData.name;
  }

  // Phase 2: process only GUILD_TEXT / PUBLIC_THREAD message files sequentially (memory safety)
  const relevantChannels = channelDataList.filter(
    (d) => d?.id && (channelMapping[d.id] === "GUILD_TEXT" || channelMapping[d.id] === "PUBLIC_THREAD")
  );

  for (const channelData of relevantChannels) {
    try {
      const messageFile = zip.file(
        new RegExp(`^Messages/c${channelData.id}/messages\\.json$`, "i")
      )?.[0];
      if (!messageFile) continue;

      const messages: any[] = JSON.parse(await messageFile.async("text"));
      if (!messages.length) continue;

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

      messages.sort((a, b) => {
        const tA = a.Timestamp ? new Date(a.Timestamp.replace(" ", "T")).getTime() : 0;
        const tB = b.Timestamp ? new Date(b.Timestamp.replace(" ", "T")).getTime() : 0;
        return tA - tB;
      });

      for (const msg of messages) {
        if (!msg.Timestamp) continue;
        const timestamp = new Date(msg.Timestamp.replace(" ", "T"));
        if (isNaN(timestamp.getTime())) continue;

        const hour = timestamp.getHours().toString().padStart(2, "0");
        const month = `${timestamp.getFullYear()}-${(timestamp.getMonth() + 1).toString().padStart(2, "0")}`;

        stats.hourly[hour] = (stats.hourly[hour] || 0) + 1;
        stats.monthly[month] = (stats.monthly[month] || 0) + 1;
        aggregateStats.hourly[hour] = (aggregateStats.hourly[hour] || 0) + 1;
        aggregateStats.monthly[month] = (aggregateStats.monthly[month] || 0) + 1;
        stats.messageCount++;
        aggregateStats.messageCount++;

        const currentTime = (timestamp.getTime() / 1000) | 0;
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
        messageDates.add(timestamp.toISOString().slice(0, 10));

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

      if (stats.messageCount > 0) stats.sentiment.average /= stats.messageCount;
      stats.averageGapBetweenMessages = stats.numGaps > 0 ? stats.totalGapTime / stats.numGaps : 0;
      stats.topWords = getTopWords(localWordFreq, 5);
      const streak = calculateStreak(messageDates);
      stats.longestStreak = streak.length;
      stats.streakStart = streak.start;
      stats.streakEnd = streak.end;
      stats.recipientName = channelData.name || `Channel ${channelData.id}`;

      if (messages.length > 0) {
        const firstTs = messages[0].Timestamp ?? null;
        stats.firstMessageTimestamp = firstTs
          ? new Date(firstTs.replace(" ", "T")).toISOString()
          : null;
      }

      channelStats[`channel_${channelData.id}`] = stats;
      channelManifest.push(`channel_${channelData.id}.json`);
    } catch (err) {
      console.warn(`Failed to process channel ${channelData.id}:`, err);
    }
  }

  aggregateStats.averageGapBetweenMessages =
    aggregateStats.numGaps > 0 ? aggregateStats.totalGapTime / aggregateStats.numGaps : 0;
  aggregateStats.topWords = getTopWords(globalWordFreq, 5);

  for (const hour in aggregateStats.hourly) {
    const count = aggregateStats.hourly[hour];
    const total = aggregateStats.hourlySentimentTotal[hour] || 0;
    aggregateStats.hourlySentimentAverage[hour] = count > 0 ? total / count : 0;
  }

  return { aggregateStats, channelStats, channelMapping, channelNaming, channelManifest };
}

export { processChannels };