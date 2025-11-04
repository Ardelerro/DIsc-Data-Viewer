import type { FC } from "react";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";

const UploadPage: FC = () => {
  const { uploadData, isLoading } = useData();

  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState<number | null>(null);

  const lastProgressRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  const progressHistory = useRef<{ progress: number; time: number }[]>([]);
  const smoothedMsPerPercent = useRef<number | null>(null);

  const onProgress = (newProgress: number) => {
    const now = performance.now();
    if (newProgress < 0) newProgress = 0;
    if (newProgress > 100) newProgress = 100;

    if (newProgress < 5) {
      setProgress(newProgress);
      setEta(120);
      progressHistory.current = [];
      smoothedMsPerPercent.current = null;
      return;
    }

    progressHistory.current.push({ progress: newProgress, time: now });
    if (progressHistory.current.length > 3) progressHistory.current.shift();

    const first = progressHistory.current[0];
    const deltaProgress = newProgress - first.progress;
    const deltaTime = now - first.time;

    if (deltaProgress > 0) {
      const avgMsPerPercent = deltaTime / deltaProgress;
      if (smoothedMsPerPercent.current == null) {
        smoothedMsPerPercent.current = avgMsPerPercent;
      } else {
        const alpha = 0.1;
        smoothedMsPerPercent.current =
          alpha * avgMsPerPercent + (1 - alpha) * smoothedMsPerPercent.current;
      }

      const msPerPercent = smoothedMsPerPercent.current!;
      const remaining = 100 - newProgress;
      const etaMs = msPerPercent * remaining;
      setEta(etaMs > 1000 ? etaMs / 1000 : 0);
    }

    setProgress(newProgress);
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".zip")) {
      setError("Please select a valid ZIP file");
      return;
    }

    try {
      setError(null);
      setProgress(0);
      setEta(null);
      lastProgressRef.current = 0;
      lastTimeRef.current = performance.now();

      await uploadData(file, onProgress);
      setProgress(100);
      setEta(0);

      setTimeout(() => window.location.replace("/"), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
      setProgress(0);
      setEta(null);
    }
  };

  const handlePrecomputedUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".json")) {
      setError("Please select a valid JSON file");
      return;
    }

    try {
      setError(null);
      const text = await file.text();
      const parsed = JSON.parse(text);
      localStorage.setItem("discord-processed-data", JSON.stringify(parsed));
      setProgress(100);
      setEta(0);
      setTimeout(() => window.location.replace("/"), 300);
    } catch (err) {
      setError("Invalid precomputed data file");
    }
  };

  const formatETA = (seconds: number) => {
    if (seconds < 0) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full"
      >
        <div className="p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">
            Upload Your Discord Data
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Choose whether to upload your full Discord ZIP or a precomputed JSON
            export. All processing happens locally in your browser.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 items-stretch">
            {isLoading ? (
              <div className="col-span-1 md:col-span-2 flex justify-center items-center h-48">
                <svg
                  className="animate-spin h-12 w-12 text-indigo-600 dark:text-indigo-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                <span className="ml-3 text-indigo-600 dark:text-indigo-400 font-medium">
                  Uploading...
                </span>
              </div>
            ) : (
              <>
                <label className="block cursor-pointer h-full">
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center flex flex-col justify-center hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors h-full">
                    <svg
                      className="w-10 h-10 mx-auto mb-3 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-lg font-medium mb-1 text-slate-700 dark:text-slate-300">
                      Upload Raw Discord ZIP
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      ZIP package from Discord export
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleZipUpload}
                    className="hidden"
                  />
                </label>

                <label className="block cursor-pointer h-full">
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center flex flex-col justify-center hover:border-teal-500 dark:hover:border-teal-400 transition-colors h-full">
                    <svg
                      className="w-10 h-10 mx-auto mb-3 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <p className="text-lg font-medium mb-1 text-slate-700 dark:text-slate-300">
                      Upload Precomputed Data
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      JSON file (exported earlier)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handlePrecomputedUpload}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>

          {isLoading && (
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Processing your data...
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {progress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                />
              </div>
              {eta && eta > 0 && (
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-3">
                  Estimated time remaining: {formatETA(eta)}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-300 font-medium mb-1">
                Error:
              </p>
              <p className="text-red-600 dark:text-red-400 text-sm mb-3">
                {error}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  setProgress(0);
                  setEta(null);
                }}
                className="text-sm text-red-700 dark:text-red-300 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default UploadPage;
