import type { SentimentMethod } from "./worker";

interface Self {
  id: string;
  username: string;
  avatar_hash?: string;
}
interface SentimentStats {
  average: number;
  positive: number;
  negative: number;
  neutral: number;
}
interface ChannelStats {
  hourly: Record<string, number>;
  monthly: Record<string, number>;
  daily?: Record<string, number>;
  dailyHourly?: Record<string, Record<string, number>>;
  recipientName?: string;
  recipientId?: string;
  averageGapBetweenMessages?: number;
  averageConversationTime?: number;
  topWords?: string[];
  longestStreak?: number;
  streakStart?: string | null;
  streakEnd?: string | null;
  sentiment?: SentimentStats;
  firstMessageTimestamp?: string | null;
  hourlySentimentAverage?: Record<string, number>;
  totalGapTime?: number;
  numGaps?: number;
  totalConversationTime?: number;
  longestConversationTime?: number;
  messageCount?: number;
}
interface TopChannel {
  name: string;
  totalMessages: number;
}

interface ServerMapping {
  channelToServer: Record<string, string>;
  serverNames: Record<string, string>;
}


interface ProcessedData {
  self: Self;
  userMapping: Record<string, { username: string; avatar: string }>;
  channelMapping: Record<string, string>;
  channelNaming: Record<string, string>;
  channelManifest: string[];
  serverMapping: ServerMapping;
  aggregateStats: AggregateStats;
  channelStats: Record<string, ChannelStats>;
  dmManifest: string[];
  activityStats: ActivityStats;

  activityPending?: boolean;

  sentimentMethod?: SentimentMethod;

  sentimentSampleRate?: number;
}


interface AggregateStats {
  hourly: Record<string, number>;
  monthly: Record<string, number>;
  daily?: Record<string, number>;
  dailyHourly?: Record<string, Record<string, number>>;
  topWords: string[];
  totalGapTime: number;
  numGaps: number;
  messageCount: number;
  averageGapBetweenMessages: number;
  averageConversationTime?: number;
  longestConversationTime?: number;
  hourlySentimentTotal: Record<string, number>;
  hourlySentimentAverage: Record<string, number>;
  usersPerDay: Record<string, number>;
}

interface PartialAgg {
  hourly: Record<string, number>;
  monthly: Record<string, number>;
  daily: Record<string, number>;
  dailyHourly: Record<string, Record<string, number>>;

  hourlySentimentTotal: Record<string, number>;
  hourlyAnalyzedCount: Record<string, number>;
  globalWordFreq: Record<string, number>;
  totalGapTime: number;
  numGaps: number;
  messageCount: number;
}
interface ActivityStats {
  addReaction: number;
  attachmentsSent: number;
  joinVoice: number;
  startCall: number;
  joinCall: number;
  appOpened: number;
}

interface ChannelSentiment {
  channelId: string;
  sentiment: SentimentStats;
  hourlySentimentAverage: Record<string, number>;
}

interface UserStats {
  channelId: string;
  userId?: string;
  name: string;
  avatar?: string;
  count: number;
}

interface StreakStats {
  channelId: string;
  userId?: string;
  name: string;
  avatar?: string;
  longestStreak: number;
  streakStart: string;
  streakEnd: string;
}

interface ServerStats {
  serverId: string;
  name: string;
  totalMessages: number;
}

interface ChannelInfo {
  channelId: string;
  name: string;
  totalMessages: number;
  serverName: string;
}

export type {
  Self,
  SentimentStats,
  ChannelStats,
  ServerMapping,
  ProcessedData,
  ActivityStats,
  TopChannel,
  UserStats,
  StreakStats,
  ServerStats,
  ChannelInfo,
  AggregateStats,
  PartialAgg,
  ChannelSentiment,
};
