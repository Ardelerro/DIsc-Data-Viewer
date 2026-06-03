import type { ProfileBuckets } from "../utils/serviceUtils/profiler";
import type { ActivityStats, ChannelSentiment, ChannelStats, PartialAgg, ProcessedData } from "./discord";

interface DataContextType {
  data: ProcessedData | null;
  isLoading: boolean;
  error: string | null;
  hydrating: boolean;
  activityProgress: number | null;
  progress: number;
  stage: string;
  uploadData: (file: File, options: UploadOptions) => Promise<void>;
  cancelUpload: () => void;
  clearData: () => void;
}

type PipelineEvent =
  | { type: "progress"; value: number; stage: string }
  | { type: "snapshot"; data: ProcessedData }
  | { type: "activityProgress"; value: number | null }
  | { type: "done" }
  | { type: "error"; message: string };

type JobStatus = "idle" | "running" | "done" | "error";

interface JobState {
  status: JobStatus;
  mainDone: boolean;
  progress: number;
  stage: string;
  activityProgress: number | null;
  snapshot: ProcessedData | null;
  errorMessage: string | null;
}

type OrchestratorRequest =
  | { type: "start"; file: File; options: UploadOptions }
  | { type: "cancel" }
  | { type: "getState" }
  | { type: "clear" };

type OrchestratorEvent = PipelineEvent | { type: "state"; state: JobState };

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
      streamThresholdBytes?: number;
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
    }
  | { type: "error"; message: string };

type ActivityWorkerRequest =
  | { type: "init"; file: File | Blob }
  | { type: "file"; filename: string }
  | { type: "stop" };

type ActivityWorkerResponse =
  | { type: "idle" }
  | { type: "progress"; bytes: number }
  | { type: "result"; counters: ActivityStats; profile: ProfileBuckets }
  | { type: "error"; message: string };

interface UploadOptions {
  aiSentiment: boolean;
  sampleRate: number;
}

type SentimentMethod = "lexicon" | "ai";

export type {
    DataContextType,
    PipelineEvent,
    JobState,
    JobStatus,
    OrchestratorEvent,
    OrchestratorRequest,
    UploadOptions,
    SentimentMethod,
    ActivityWorkerRequest,
    ActivityWorkerResponse,
    MessageWorkerRequest,
    MessageWorkerResponse,
    SentimentWorkerRequest,
    SentimentWorkerResponse,
};
