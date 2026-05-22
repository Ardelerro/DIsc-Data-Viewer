import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type FC,
  useMemo,
} from "react";
import {
  BlobReader,
  ZipReader,
  configure,
} from "@zip.js/zip.js";
import type {
  DataContextType,
  ProcessedData,
  UploadOptions,
} from "../types/discord";
import { processActivities } from "../services/activityProcessor";
import { processZipData } from "../services/zipProcessor";
import {
  processSentiment,
  type SentimentResult,
} from "../services/processSentiment";
import {
  getData as loadStoredData,
  saveData as persistData,
  clearData as clearStoredData,
} from "../services/dataStore";

configure({ useWebWorkers: true });

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};

async function validatePackageStructure(file: File | Blob) {
  const reader = new ZipReader(new BlobReader(file));
  try {
    const entries = await reader.getEntries();
    let hasAccount = false;
    let hasMessages = false;
    for (const e of entries) {
      if (!hasAccount && /^Account\//i.test(e.filename)) hasAccount = true;
      if (!hasMessages && /^Messages\//i.test(e.filename)) hasMessages = true;
      if (hasAccount && hasMessages) break;
    }
    if (!hasAccount || !hasMessages) {
      throw new Error("Invalid package structure");
    }
  } finally {
    await reader.close();
  }
}

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

const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadStoredData()
      .then((stored) => {
        if (!cancelled && stored) setData(stored);
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });
    return () => {
      cancelled = true;
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

    try {
      await validatePackageStructure(file);

     const useAI = options.aiSentiment;
      let msgPct = 0;
      let actPct = 0;
      let sentPct = 0;
      // AI sentiment dominates compute when enabled, so it carries most weight.
      const wMsg = useAI ? 0.3 : 0.8;
      const wAct = useAI ? 0.1 : 0.2;
      const wSent = useAI ? 0.6 : 0;
      const report = () => {
        const combined = msgPct * wMsg + actPct * wAct + sentPct * wSent;
        onProgress?.(Math.min(99, combined), "Processing your data...");
      };

     const sentimentPromise: Promise<SentimentResult | null> = useAI
        ? processSentiment(
            file,
            options.sampleRate,
            (p) => {
              sentPct = p;
              report();
            },
            signal,
          ).catch((err) => {
            if (err instanceof Error && err.name === "AbortError") throw err;
            console.error("AI sentiment failed; using lexicon sentiment:", err);
            return null;
          })
        : Promise.resolve(null);

      const [processed, activityStats, sentimentResult] = await Promise.all([
        processZipData(
          file,
          (p) => {
            msgPct = p;
            report();
          },
          signal,
        ),
        processActivities(
          file,
          (p) => {
            actPct = p;
            report();
          },
          signal,
        ),
        sentimentPromise,
      ]);

      const fullData: ProcessedData = {
        ...processed,
        activityStats,
        sentimentMethod: useAI && sentimentResult ? "ai" : "lexicon",
      };
      if (useAI && sentimentResult) {
        applySentiment(fullData, sentimentResult, options.sampleRate);
      }

      onProgress?.(99, "Saving data...");
      setData(fullData);

      try {
        await persistData(fullData);
      } catch (err) {
        console.error("Failed to persist processed data:", err);
      }

      onProgress?.(100, "Complete!");
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
    () => ({ data, isLoading, error, hydrating, uploadData, clearData }),
    [data, isLoading, error, hydrating],
  );
  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};
