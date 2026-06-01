import type { ProfileBuckets } from "../services/profiler";

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

type SentimentMethod = "lexicon" | "ai";

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

interface UploadOptions {
  aiSentiment: boolean;

  sampleRate: number;
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

interface DataContextType {
  data: ProcessedData | null;
  isLoading: boolean;
  error: string | null;
  hydrating: boolean;
  activityProgress: number | null;
  uploadData: (
    file: File,
    options: UploadOptions,
    onProgress: (progress: number, stage: string, eta?: number) => void,
    signal?: AbortSignal,
  ) => Promise<void>;
  clearData: () => void;
}

interface ChannelSentiment {
  channelId: string;
  sentiment: SentimentStats;
  hourlySentimentAverage: Record<string, number>;
}

type SentimentWorkerRequest = {
  type: "start";
  file: File | Blob;
  sampleRate: number;
};

type SentimentWorkerResponse =
  | { type: "progress"; value: number }
  | { type: "ready" }
  | {
      type: "result";
      channels: ChannelSentiment[];

      hourlySentimentTotal: Record<string, number>;
      hourlyAnalyzedCount: Record<string, number>;

      profile: ProfileBuckets;
    }
  | { type: "error"; message: string };

type MessageWorkerRequest =
  | {
      type: "init";
      file: File | Blob;
      channelMapping: Record<string, string>;

      aiMode: boolean;
    }
  | { type: "file"; filename: string }
  | { type: "stop" };

type MessageWorkerResponse =
  | { type: "idle" }
  | { type: "progress"; bytes: number }
  | {
      type: "result";
      agg: PartialAgg;
      channels: Array<{ channelId: string; stats: ChannelStats }>;

      profile: ProfileBuckets;
    };

type ActivityWorkerRequest =
  | { type: "init"; file: File | Blob }
  | { type: "file"; filename: string }
  | { type: "stop" };

type ActivityWorkerResponse =
  | { type: "idle" }
  | { type: "progress"; bytes: number }
  | { type: "result"; counters: ActivityStats; profile: ProfileBuckets };

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

interface WrappedCardData {
  self: {
    id: string;
    username: string;
    avatar_hash?: string;
  };
  aggregateStats: {
    messageCount: number;
    hourly: Record<string, number>;
    monthly: Record<string, number>;
    topWords: string[];
  };
  channelStats: Record<
    string,
    {
      monthly?: Record<string, number>;
      hourly?: Record<string, number>;
      name?: string;
    }
  >;
  activityStats: {
    attachmentsSent: number;
    addReaction: number;
    joinVoice: number;
    joinCall: number;
    startCall: number;
    appOpened: number;
  };
  topUsers: Array<{ username: string; messageCount: number }>;
  serverStats: Record<string, { name?: string; messageCount: number }>;
}

export type {
  Self,
  SentimentStats,
  SentimentMethod,
  ChannelStats,
  ServerMapping,
  ProcessedData,
  UploadOptions,
  ActivityStats,
  DataContextType,
  TopChannel,
  UserStats,
  StreakStats,
  ServerStats,
  ChannelInfo,
  AggregateStats,
  PartialAgg,
  WrappedCardData,
  MessageWorkerRequest,
  MessageWorkerResponse,
  ActivityWorkerRequest,
  ActivityWorkerResponse,
  ChannelSentiment,
  SentimentWorkerRequest,
  SentimentWorkerResponse,
};
