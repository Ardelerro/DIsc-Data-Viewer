
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
  topWords?: string[];
  longestStreak?: number;
  streakStart?: string | null;
  streakEnd?: string | null;
  sentiment?: SentimentStats;
  firstMessageTimestamp?: string;
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
  aggregateStats: any;
  channelStats: Record<string, ChannelStats>;
  dmManifest: string[];
  activityStats: ActivityStats;
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

export type {
  Self,
  SentimentStats,
  ChannelStats,
  ServerMapping,
  ProcessedData,
  ActivityStats,
  DataContextType,
};