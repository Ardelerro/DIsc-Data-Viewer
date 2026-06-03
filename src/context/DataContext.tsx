import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type FC,
  useMemo,
} from "react";
import type {
  DataContextType,
  ProcessedData,
  UploadOptions,
} from "../types/discord";
import { refreshUserNames } from "../services/zipProcessor";
import {
  getData as loadStoredData,
  saveData as persistData,
} from "../services/dataStore";
import {
  subscribe,
  start as startJob,
  cancelUpload as cancelJob,
  clearJob,
  requestState,
} from "../services/orchestratorClient";

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
  const [activityProgress, setActivityProgress] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [hydrating, setHydrating] = useState(true);

  const dataRef = useRef<ProcessedData | null>(null);
  dataRef.current = data;

  useEffect(() => {
    let cancelled = false;
    let hydrateStarted = false;
    const enrichController = new AbortController();

    const hydrateFromIDB = () => {
      if (hydrateStarted) return;
      hydrateStarted = true;
      loadStoredData()
        .then((stored) => {
          if (cancelled) return;
          if (!stored) {
            setHydrating(false);
            return;
          }
          if (!dataRef.current) setData(stored);
          setHydrating(false);

          const reRender = () => {
            if (!cancelled) setData({ ...stored });
          };
          refreshUserNames(stored, enrichController.signal, reRender)
            .then((changed) => {
              if (cancelled || !changed) return;
              const refreshed = { ...stored };
              setData(refreshed);
              void persistData(refreshed);
            })
            .catch((err) => {
              if (err instanceof DOMException && err.name === "AbortError")
                return;
              console.warn("Username refresh on load failed:", err);
            });
        })
        .catch(() => {
          if (!cancelled) setHydrating(false);
        });
    };

    const unsubscribe = subscribe((event) => {
      if (cancelled) return;
      switch (event.type) {
        case "progress":
          setProgress(event.value);
          setStage(event.stage);
          break;
        case "snapshot":
          setData(event.data);
          break;
        case "activityProgress":
          setActivityProgress(event.value);
          break;
        case "done":
          setIsLoading(false);
          break;
        case "error":
          setError(event.message);
          setIsLoading(false);
          break;
        case "state": {
          const s = event.state;
          if (s.status === "running") {
            hydrateStarted = true; 
            setIsLoading(!s.mainDone);
            setProgress(s.progress);
            setStage(s.stage);
            setActivityProgress(s.activityProgress);
            if (s.snapshot) setData(s.snapshot);
            setHydrating(false);
          } else if (s.status === "done") {
            setIsLoading(false);
            setActivityProgress(s.activityProgress);
            if (s.snapshot) {
              hydrateStarted = true;
              setData(s.snapshot);
              setHydrating(false);
            } else {
              hydrateFromIDB();
            }
          } else if (s.status === "error") {
            setIsLoading(false);
            if (s.errorMessage) setError(s.errorMessage);
            hydrateFromIDB();
          } else {
            // idle
            setIsLoading(false);
            setActivityProgress(null);
            hydrateFromIDB();
          }
          break;
        }
      }
    });

    requestState();

    const timer = setTimeout(() => {
      if (!cancelled) hydrateFromIDB();
    }, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      enrichController.abort();
      unsubscribe();
    };
  }, []);

  const uploadData = async (file: File, options: UploadOptions) => {
    setError(null);
    setProgress(0);
    setStage("Processing your data...");
    setIsLoading(true);
    await startJob(file, options);
  };

  const cancelUpload = () => {
    cancelJob();
  };

  const clearData = () => {
    setData(null);
    setProgress(0);
    setError(null);
    setActivityProgress(null);
    clearJob();
  };

  const contextValue = useMemo(
    () => ({
      data,
      isLoading,
      error,
      hydrating,
      activityProgress,
      progress,
      stage,
      uploadData,
      cancelUpload,
      clearData,
    }),
    [data, isLoading, error, hydrating, activityProgress, progress, stage],
  );
  return (
    <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>
  );
};
