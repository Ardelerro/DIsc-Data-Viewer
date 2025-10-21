import type { FC } from "react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";

const UploadPage: FC = () => {
  const navigate = useNavigate();
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
        const alpha = 0.15;
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
      setProgress(0);
      setEta(null);
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
            All processing happens locally in your browser. Your data never
            leaves your device.
          </p>

          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-2">
              📁 Your ZIP file should contain:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-400 list-disc list-inside space-y-1">
              <li>Account/user.json</li>
              <li>Messages/ (with channel folders)</li>
              <li>Servers/ (optional)</li>
            </ul>
          </div>

          {!isLoading && !error && (
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-12 text-center hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-slate-400"
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
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Click to select your Discord data package
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  ZIP file only
                </p>
              </div>
              <input
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          )}

          {isLoading && (
            <div>
              <div className="mb-4">
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
              </div>

              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
                {eta !== null && eta > 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Estimated time remaining: <strong>{formatETA(eta)}</strong>
                  </p>
                )}
              </div>

              <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                This may take a minute for large data packages...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UploadPage;
