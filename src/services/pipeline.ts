import type {
  ActivityStats,
  ProcessedData,
} from "../types/discord";
import { processActivities } from "./processors/activityProcessor";
import { processZipData } from "./processors/zipProcessor";
import { processSentiment, type SentimentResult } from "./processors/processSentiment";
import { saveData as persistData, saveProfile } from "./dataStore";
import { Profiler, logReport, type ProfileReport } from "../utils/serviceUtils/profiler";
import type { UploadOptions, PipelineEvent } from "../types/worker";

const ZERO_ACTIVITY: ActivityStats = {
  addReaction: 0,
  attachmentsSent: 0,
  joinVoice: 0,
  startCall: 0,
  joinCall: 0,
  appOpened: 0,
};

function applySentiment(
  data: ProcessedData,
  result: SentimentResult,
  sampleRate: number,
) {
  for (const cs of result.channels) {
    const type = data.channelMapping[cs.channelId];
    if (!type) continue;
    const key =
      type === "DM" ? `dm_${cs.channelId}` : `channel_${cs.channelId}`;
    const stats = data.channelStats[key];
    if (!stats) continue;
    stats.sentiment = cs.sentiment;
    stats.hourlySentimentAverage = cs.hourlySentimentAverage;
  }

  const agg = data.aggregateStats;
  agg.hourlySentimentTotal = result.hourlySentimentTotal;
  const avg: Record<string, number> = {};
  for (const h in result.hourlySentimentTotal) {
    const an = result.hourlyAnalyzedCount[h] || 0;
    avg[h] = an > 0 ? result.hourlySentimentTotal[h] / an : 0;
  }
  agg.hourlySentimentAverage = avg;
  data.sentimentSampleRate = sampleRate;
}

export async function runPipeline(
  file: File,
  options: UploadOptions,
  emit: (event: PipelineEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const prof = new Profiler();
  const stopTotal = prof.start("total");
  const stopPerceived = prof.start("orchestrator:perceived");

  try {
    const useAI = options.aiSentiment;
    let msgPct = 0;
    let sentPct = 0;

    const wMsg = useAI ? 0.4 : 1;
    const wSent = useAI ? 0.6 : 0;
    const report = () => {
      const combined = msgPct * wMsg + sentPct * wSent;
      emit({
        type: "progress",
        value: Math.min(99, combined),
        stage: "Processing your data...",
      });
    };

    let resolveReady!: (ok: boolean) => void;
    const modelReady = new Promise<boolean>((res) => (resolveReady = res));

    const sentimentPromise: Promise<SentimentResult | null> = useAI
      ? processSentiment(
          file,
          options.sampleRate,
          (p) => {
            sentPct = p;
            report();
          },
          signal,
          () => resolveReady(true),
          prof,
        ).catch((err) => {
          resolveReady(false);
          if (err instanceof Error && err.name === "AbortError") throw err;
          console.error("AI sentiment failed; using lexicon sentiment:", err);
          return null;
        })
      : Promise.resolve(null);

    const stopModelWait = prof.start("orchestrator:modelReadyWait");
    const aiMode = useAI ? await modelReady : false;
    stopModelWait();

    let current: ProcessedData | null = null;
    let persistTimer: ReturnType<typeof setTimeout> | undefined;
    signal.addEventListener("abort", () => clearTimeout(persistTimer), {
      once: true,
    });
    const onEnriched = () => {
      if (signal.aborted || !current) return;
      current = { ...current };
      emit({ type: "snapshot", data: current });
      const snapshot = current;
      clearTimeout(persistTimer);
      persistTimer = setTimeout(() => void persistData(snapshot), 1500);
    };

    const stopPromiseAll = prof.start("orchestrator:promiseAll");
    const [processed, sentimentResult] = await Promise.all([
      processZipData(
        file,
        (p) => {
          msgPct = p;
          report();
        },
        signal,
        aiMode,
        prof,
        onEnriched,
      ),
      sentimentPromise,
    ]);
    stopPromiseAll();

    const fullData: ProcessedData = {
      ...processed,
      activityStats: { ...ZERO_ACTIVITY },
      activityPending: true,
      sentimentMethod: useAI && sentimentResult ? "ai" : "lexicon",
    };
    if (useAI && sentimentResult) {
      applySentiment(fullData, sentimentResult, options.sampleRate);
    }
    current = fullData;

    emit({ type: "progress", value: 99, stage: "Saving data..." });
    emit({ type: "snapshot", data: fullData });

    try {
      await prof.timeAsync("orchestrator:persist", () => persistData(fullData));
    } catch (err) {
      console.error("Failed to persist processed data:", err);
    }

    emit({ type: "progress", value: 100, stage: "Complete!" });
    emit({ type: "done" });

    stopPerceived();

    const finalizeProfile = () => {
      stopTotal();
      const buckets = prof.export();
      const profileReport: ProfileReport = {
        timestamp: Date.now(),
        dateISO: new Date().toISOString(),
        fileSizeBytes: file.size,
        aiMode,
        sampleRate: options.sampleRate,
        messageCount: fullData.aggregateStats.messageCount,

        workerCount: buckets["zip/msgworker/init:getEntries"]?.count ?? 0,
        totalMs: buckets["total"]?.totalMs ?? 0,
        buckets,
      };
      logReport(profileReport);
      void saveProfile(profileReport);
    };

    emit({ type: "activityProgress", value: 0 });
    try {
      const activityStats = await processActivities(
        file,
        (p) => emit({ type: "activityProgress", value: p }),
        signal,
        prof,
      );
      current = {
        ...(current ?? fullData),
        activityStats,
        activityPending: false,
      };
      emit({ type: "activityProgress", value: null });
      emit({ type: "snapshot", data: current });
      try {
        await persistData(current);
      } catch (err) {
        console.error("Failed to persist activity stats:", err);
      }
      finalizeProfile();
    } catch (err) {
      emit({ type: "activityProgress", value: null });
      if (err instanceof Error && err.name === "AbortError") throw err;
      console.error("Activity processing failed; counts left at zero:", err);
      current = { ...(current ?? fullData), activityPending: false };
      emit({ type: "snapshot", data: current });
      finalizeProfile();
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    emit({
      type: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
    throw err;
  }
}
