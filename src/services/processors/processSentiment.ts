import SentimentWorker from "./workers/sentiment.worker.ts?worker";
import { Profiler } from "../../utils/serviceUtils/profiler";
import type {
  ChannelSentiment,
} from "../../types/discord";
import type { SentimentWorkerResponse } from "../../types/worker";

export interface SentimentResult {
  channels: ChannelSentiment[];
  hourlySentimentTotal: Record<string, number>;
  hourlyAnalyzedCount: Record<string, number>;
}

export function isWebGPUAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

function processSentiment(
  file: File | Blob,
  sampleRate: number,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
  onReady?: () => void,
  prof: Profiler = new Profiler(),
): Promise<SentimentResult> {
  return new Promise<SentimentResult>((resolve, reject) => {
    const worker = new SentimentWorker();
    let settled = false;

    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      if (signal) signal.removeEventListener("abort", onAbort);
      worker.terminate();
      action();
    };

    function onAbort() {
      finish(() => reject(new DOMException("Aborted", "AbortError")));
    }

    if (signal) {
      if (signal.aborted) {
        worker.terminate();
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", onAbort);
    }

    worker.onmessage = (ev: MessageEvent<SentimentWorkerResponse>) => {
      const m = ev.data;
      if (!m || settled) return;
      if (m.type === "progress") {
        onProgress?.(m.value);
      } else if (m.type === "ready") {
        onReady?.();
      } else if (m.type === "result") {
        prof.merge(m.profile, "sentiment/");
        finish(() =>
          resolve({
            channels: m.channels,
            hourlySentimentTotal: m.hourlySentimentTotal,
            hourlyAnalyzedCount: m.hourlyAnalyzedCount,
          }),
        );
      } else if (m.type === "error") {
        finish(() => reject(new Error(m.message)));
      }
    };

    worker.onerror = (err) => {
      finish(() =>
        reject(new Error(err.message || "Sentiment worker failed to start")),
      );
    };

    worker.postMessage({ type: "start", file, sampleRate });
  });
}

export { processSentiment };
