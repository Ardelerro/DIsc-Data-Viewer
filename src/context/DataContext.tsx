import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type FC,
  useMemo,
} from "react";
import JSZip from "jszip";
import type { DataContextType, ProcessedData } from "../types/discord";
import { processActivities } from "../services/activityProcessor";
import { processZipData } from "../services/zipProcessor";
import { map, smoothProgress } from "../utils/progressUtils";

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};

export const DataProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<ProcessedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("discord-processed-data");
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to load stored data:", err);
        localStorage.removeItem("discord-processed-data");
      }
    }
  }, []);

  const uploadData = async (
    file: File,
    onProgress?: (progress: number, stage: string, eta?: number) => void
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const zip = await JSZip.loadAsync(file);

      const hasAccount = zip.file(/^Account\//i).length > 0;
      const hasMessages = zip.file(/^Messages\//i).length > 0;
      if (!hasAccount || !hasMessages) {
        throw new Error("Invalid package structure");
      }

      const processedData = await processZipData(zip, (progress) => {
        const adjusted = map(smoothProgress(progress), 0, 100, 0, 4);
        onProgress?.(adjusted, "Processing channels and messages...");
      });

      const activityStats = await processActivities(file, (progress) => {
        const adjusted = map(progress, 0, 100, 4, 99);
        onProgress?.(adjusted, "Processing activity data...");
      });

      processedData.activityStats = activityStats;

      onProgress?.(99, "Saving data...");
      setData(processedData);
      localStorage.setItem(
        "discord-processed-data",
        JSON.stringify(processedData)
      );

      onProgress?.(100, "Complete!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearData = () => {
    setData(null);
    localStorage.removeItem("discord-processed-data");
  };
  const contextValue = useMemo(
    () => ({ data, isLoading, error, uploadData, clearData }),
    [data, isLoading, error]
  );
  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};





