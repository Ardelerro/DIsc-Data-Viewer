import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type FC,
  useMemo,
} from "react";
import { configure } from "@zip.js/zip.js";
import type {
  ActivityStats,
  DataContextType,
  ProcessedData,
  UploadOptions,
} from "../types/discord";
import { processActivities } from "../services/activityProcessor";
import { processZipData, refreshUserNames } from "../services/zipProcessor";
import {
  processSentiment,
  type SentimentResult,
} from "../services/processSentiment";
import {
  getData as loadStoredData,
  saveData as persistData,
  clearData as clearStoredData,
  saveProfile,
} from "../services/dataStore";
import { Profiler, logReport, type ProfileReport } from "../services/profiler";

configure({ useWebWorkers: true });

const DataContext = createContext<DataContextType | undefined>(undefined);

const ZERO_ACTIVITY: ActivityStats = {
  addReaction: 0,
  attachmentsSent: 0,
  joinVoice: 0,
  startCall: 0,
  joinCall: 0,
  appOpened: 0,
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
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

export const DataProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<ProcessedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityProgress, setActivityProgress] = useState<number | null>(null);

  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    loadStoredData()
      .then((stored) => {
        if (cancelled || !stored) return;
        setData(stored);
        refreshUserNames(stored, controller.signal)
          .then((changed) => {
            if (cancelled || !changed) return;
            const refreshed = { ...stored };
            setData(refreshed);
            void persistData(refreshed);
          })
          .catch((err) => {
            if (err instanceof DOMException && err.name === "AbortError") return;
            console.warn("Username refresh on load failed:", err);
          });
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const uploadData = async (
    file: File,
    options: UploadOptions,
    onProgress?: (progress: number, stage: string, eta?: number) => void,
    signal?: AbortSignal,
  ) => {
    setIsLoading(true);
    setError(null);

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
        onProgress?.(Math.min(99, combined), "Processing your data...");
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

      onProgress?.(99, "Saving data...");
      setData(fullData);

      try {
        await prof.timeAsync("orchestrator:persist", () =>
          persistData(fullData),
        );
      } catch (err) {
        console.error("Failed to persist processed data:", err);
      }

      onProgress?.(100, "Complete!");

      stopPerceived();

      setActivityProgress(0);
      const activityPromise = processActivities(
        file,
        (p) => setActivityProgress(p),
        signal,
        prof,
      );

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

      activityPromise
        .then(async (activityStats) => {
          setActivityProgress(null);
          const patched: ProcessedData = {
            ...fullData,
            activityStats,
            activityPending: false,
          };
          setData(patched);
          try {
            await persistData(patched);
          } catch (err) {
            console.error("Failed to persist activity stats:", err);
          }
          finalizeProfile();
        })
        .catch((err) => {
          setActivityProgress(null);
          if (err instanceof Error && err.name === "AbortError") return;
          console.error(
            "Activity processing failed; counts left at zero:",
            err,
          );
          setData({ ...fullData, activityPending: false });
          finalizeProfile();
        });
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearData = () => {
    setData(null);
    void clearStoredData();
  };
  const contextValue = useMemo(
    () => ({
      data,
      isLoading,
      error,
      hydrating,
      activityProgress,
      uploadData,
      clearData,
    }),
    [data, isLoading, error, hydrating, activityProgress],
  );
  return (
    <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>
  );
};
