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
  // How sentiment was computed. Absent on data processed before AI sentiment
  // existed — treat as "lexicon".
  sentimentMethod?: SentimentMethod;
  // Fraction (0..1) of messages analyzed when sentimentMethod === "ai".
  sentimentSampleRate?: number;
}

// Options chosen on the upload screen, threaded into uploadData.
interface UploadOptions {
  aiSentiment: boolean;
  // Fraction of messages (0..1) the AI model analyzes; 1 = every message.
  sampleRate: number;
}
interface AggregateStats {
  hourly: Record<string, number>;
  monthly: Record<string, number>;
  daily?: Record<string, number>;
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
  // hourlySentimentTotal: Σ(score × length-weight) per hour; hourlyAnalyzedCount:
  // Σ(length-weight) per hour. Their ratio is the length-weighted hourly mean.
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
  uploadData: (
    file: File,
    options: UploadOptions,
    onProgress: (progress: number, stage: string, eta?: number) => void,
    signal?: AbortSignal
  ) => Promise<void>;
  clearData: () => void;
}

// Per-channel sentiment produced by the AI sentiment worker. Merged back into
// ChannelStats, overwriting the lexicon-computed values.
interface ChannelSentiment {
  channelId: string;
  sentiment: SentimentStats;
  hourlySentimentAverage: Record<string, number>;
}

// Single-shot protocol for the AI sentiment worker: main posts `start` once,
// worker streams `progress` then a final `result` (or `error`).
type SentimentWorkerRequest = {
  type: "start";
  file: File | Blob;
  sampleRate: number;
};

type SentimentWorkerResponse =
  | { type: "progress"; value: number }
  | {
      type: "result";
      channels: ChannelSentiment[];
      // Σ(score × length-weight) and Σ(length-weight) per hour; their ratio is
      // the length-weighted hourly mean (same convention as PartialAgg).
      hourlySentimentTotal: Record<string, number>;
      hourlyAnalyzedCount: Record<string, number>;
    }
  | { type: "error"; message: string };

// Work-stealing protocol between zipProcessor (main thread) and messages.worker.
// Main posts `init` once, then answers each `idle` with a `file` or `stop`.
type MessageWorkerRequest =
  | { type: "init"; file: File | Blob; channelMapping: Record<string, string> }
  | { type: "file"; filename: string }
  | { type: "stop" };

type MessageWorkerResponse =
  | { type: "idle" }
  | { type: "progress"; bytes: number }
  | {
      type: "result";
      agg: PartialAgg;
      channels: Array<{ channelId: string; stats: ChannelStats }>;
    };

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
  ChannelSentiment,
  SentimentWorkerRequest,
  SentimentWorkerResponse
};
