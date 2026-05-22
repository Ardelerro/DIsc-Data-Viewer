import type { FC } from "react";
import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import * as Switch from "@radix-ui/react-switch";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { generateMockDiscordData } from "../utils/mockData";
import { saveData } from "../services/dataStore";
import { isWebGPUAvailable } from "../services/processSentiment";
import type { ProcessedData } from "../types/discord";
import { FEEDBACK } from "../config/theme";

const UploadPage: FC = () => {
  const { uploadData, isLoading } = useData();

  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const [aiSentiment, setAiSentiment] = useState(false);
  const [samplePct, setSamplePct] = useState(25);

  const startTimeRef = useRef<number | null>(null);
  const samplesRef = useRef<Array<{ p: number; t: number }>>([]);
  const lastEtaTickRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const webGPU = useMemo(() => isWebGPUAvailable(), []);
  const navigate = useNavigate();

  const resetTracking = () => {
    startTimeRef.current = null;
    samplesRef.current = [];
    lastEtaTickRef.current = 0;
  };

  const onProgress = (newProgress: number) => {
    const now = performance.now();
    const p = Math.max(0, Math.min(100, newProgress));

    if (startTimeRef.current === null) startTimeRef.current = now;
    setProgress(p);

    if (p >= 100) {
      setEta(0);
      return;
    }

    const elapsed = now - startTimeRef.current;
    // Need a tiny bit of data before guessing — show "calculating" instead of a lie.
    if (elapsed < 400 || p < 0.5) {
      setEta(null);
      return;
    }

    // Maintain a sliding ~3s window of samples for the recent-rate estimate.
    const samples = samplesRef.current;
    samples.push({ p, t: now });
    while (samples.length > 0 && now - samples[0].t > 3000) samples.shift();

    // %/ms across the whole upload (stable).
    const cumulativeRate = p / elapsed;

    // %/ms across just the recent window (responsive).
    let recentRate = cumulativeRate;
    if (samples.length >= 2) {
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dp = last.p - first.p;
      const dt = last.t - first.t;
      if (dt > 150 && dp > 0) recentRate = dp / dt;
    }

    // Blend: trust the recent window more once it has matured (>=1.5s of data).
    const windowSpan = samples.length > 0 ? now - samples[0].t : 0;
    const recentWeight = Math.min(1, windowSpan / 1500);
    const rate =
      recentWeight * recentRate + (1 - recentWeight) * cumulativeRate;

    const remainingMs = rate > 0 ? (100 - p) / rate : 0;

    // Throttle ETA display updates to ~4Hz to keep the number readable.
    if (now - lastEtaTickRef.current < 250) return;
    lastEtaTickRef.current = now;
    setEta(Math.max(0, remainingMs / 1000));
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".zip")) {
      setError("Please select a valid ZIP file");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setError(null);
      setProgress(0);
      setEta(null);
      resetTracking();

      await uploadData(
        file,
        { aiSentiment: aiSentiment && webGPU, sampleRate: samplePct / 100 },
        onProgress,
        controller.signal,
      );
      setProgress(100);
      setEta(0);

      setTimeout(() => navigate("/"), 500);
    } catch (err) {
      // AbortError = user cancelled: reset quietly, no error banner.
      if (!(err instanceof Error && err.name === "AbortError")) {
        setError(err instanceof Error ? err.message : "Failed to process file");
      }
      setProgress(0);
      setEta(null);
      resetTracking();
    } finally {
      abortRef.current = null;
      // Clear the input so the same file can be re-selected after a cancel.
      e.target.value = "";
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handlePrecomputedUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".json")) {
      setError("Please select a valid JSON file");
      return;
    }

    try {
      setError(null);
      const text = await file.text();
      const parsed = JSON.parse(text) as ProcessedData;
      await saveData(parsed);
      setProgress(100);
      setEta(0);
      setTimeout(() => window.location.replace("/"), 300);
    } catch {
      setError("Invalid precomputed data file");
    }
  };

  const formatETA = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return "";
    if (seconds < 1) return "less than a second";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  return (
    <div className="relative min-h-screen w-full bg-[var(--color-bg)] overflow-x-hidden flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full"
      >
        <div className="p-8 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
          <h1 className="text-3xl font-bold mb-2 text-[var(--color-text-1)]">
            Upload Your Discord Data
          </h1>
          <p className="text-[var(--color-text-2)] mb-6">
            Choose whether to upload your full Discord ZIP or a precomputed JSON
            export. All processing happens locally in your browser.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 items-stretch">
            {isLoading ? (
              <div className="col-span-1 md:col-span-2 flex justify-center items-center h-48">
                <svg
                  className="animate-spin h-12 w-12 text-[var(--color-accent)]"
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span className="ml-3 text-[var(--color-accent)] font-medium">
                  Uploading...
                </span>
              </div>
            ) : (
              <>
                <label className="block cursor-pointer h-full">
                  <div className="border-2 border-dashed border-[var(--color-border-solid)] rounded-xl p-8 text-center flex flex-col justify-center hover:border-[var(--color-accent)] transition-colors h-full">
                    <svg
                      className="w-10 h-10 mx-auto mb-3 text-[var(--color-text-3)]"
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
                    <p className="text-lg font-medium mb-1 text-[var(--color-text-1)]">
                      Upload Raw Discord ZIP
                    </p>
                    <p className="text-sm text-[var(--color-text-3)]">
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
                  <div className="border-2 border-dashed border-[var(--color-border-solid)] rounded-xl p-8 text-center flex flex-col justify-center hover:border-[var(--color-accent)] transition-colors h-full">
                    <svg
                      className="w-10 h-10 mx-auto mb-3 text-[var(--color-text-3)]"
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
                    <p className="text-lg font-medium mb-1 text-[var(--color-text-1)]">
                      Upload Precomputed Data
                    </p>
                    <p className="text-sm text-[var(--color-text-3)]">
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
            <div className="col-span-1 md:col-span-2">
              <button
                onClick={async () => {
                  const mock = generateMockDiscordData();
                  await saveData(mock);
                  window.location.replace("/");
                }}
                className="w-full py-3 rounded-xl bg-[var(--color-accent)] hover:opacity-90 text-white font-medium transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                Use Mock Data
              </button>
            </div>
          </div>

          {!isLoading && (
            <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--color-text-1)]">
                    AI sentiment analysis
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-3)]">
                    Analyzes message mood with an in-browser language model —
                    far more accurate than the default on slang, sarcasm and
                    negation. Applies to raw ZIP uploads only.
                    {webGPU
                      ? " Downloads a ~250MB model on first use and is noticeably slower."
                      : " Unavailable: this browser has no WebGPU support."}
                  </p>
                </div>
                <Switch.Root
                  checked={aiSentiment && webGPU}
                  onCheckedChange={setAiSentiment}
                  disabled={!webGPU}
                  className="relative mt-0.5 h-5 w-9 shrink-0 cursor-pointer rounded-full bg-[var(--color-border-solid)] transition-colors data-[state=checked]:bg-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Switch.Thumb className="absolute top-1/2 left-[2px] block h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200 data-[state=checked]:translate-x-[16px]" />
                </Switch.Root>
              </div>

              {aiSentiment && webGPU && (
                <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="sample-rate"
                      className="text-xs font-medium text-[var(--color-text-2)]"
                    >
                      Messages analyzed
                    </label>
                    <span className="text-xs font-semibold text-[var(--color-accent)]">
                      {samplePct}%
                    </span>
                  </div>
                  <input
                    id="sample-rate"
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={samplePct}
                    onChange={(ev) => setSamplePct(Number(ev.target.value))}
                    className="mt-2 w-full cursor-pointer accent-[var(--color-accent)]"
                  />
                  <p className="mt-1.5 text-xs text-[var(--color-text-3)]">
                    {samplePct >= 100
                      ? "Every message analyzed — most accurate, slowest."
                      : `Roughly 1 in ${Math.round(
                          100 / samplePct,
                        )} messages analyzed — lower is faster, less precise.`}
                  </p>
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-[var(--color-text-2)]">
                  Processing your data...
                </span>
                <span className="text-sm font-medium text-[var(--color-text-2)]">
                  {progress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-[var(--color-surface-raised)] rounded-full h-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="bg-[var(--color-accent)] h-3 rounded-full transition-all duration-300"
                />
              </div>
              <p className="text-center text-sm text-[var(--color-text-3)] mt-3">
                {eta === null
                  ? "Calculating time remaining..."
                  : progress >= 100
                    ? "Finishing up..."
                    : eta < 1
                      ? "Almost done..."
                      : `Estimated time remaining: ${formatETA(eta)}`}
              </p>
              <button
                onClick={handleCancel}
                className="mx-auto mt-4 block rounded-lg border border-[var(--color-border-solid)] px-4 py-2 text-sm font-medium text-[var(--color-text-2)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-1)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {error && (
            <div className={`p-4 mt-4 ${FEEDBACK.error.container}`}>
              <p className={`mb-1 ${FEEDBACK.error.title}`}>Error:</p>
              <p className={`mb-3 ${FEEDBACK.error.body}`}>{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setProgress(0);
                  setEta(null);
                }}
                className={FEEDBACK.error.link}
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
