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
  recipientName?: string;
  averageGapBetweenMessages?: number;
  averageConversationTime?: number;
  topWords?: string[];
  longestStreak?: number;
  streakStart?: string | null;
  streakEnd?: string | null;
  sentiment?: SentimentStats;
  firstMessageTimestamp?: string | null;
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
}
interface AggregateStats {
  hourly: Record<string, number>;
  monthly: Record<string, number>;
  topWords: string[];
  totalGapTime: number;
  numGaps: number;
  messageCount: number;
  averageGapBetweenMessages: number;
  averageConversationTime?: number;
  longestConversationTime?: number;
  hourlySentimentTotal: Record<string, number>;
  hourlySentimentAverage: Record<string, number>;
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
  uploadData: (
    file: File,
    onProgress: (progress: number, stage: string, eta?: number) => void
  ) => Promise<void>;
  clearData: () => void;
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
  ChannelStats,
  ServerMapping,
  ProcessedData,
  ActivityStats,
  DataContextType,
  TopChannel,
  UserStats,
  StreakStats,
  ServerStats,
  ChannelInfo,
  AggregateStats,
  WrappedCardData
};
