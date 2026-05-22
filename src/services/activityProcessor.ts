import type { ActivityStats } from "../types/discord";
import ActivityWorker from "./activity.worker.ts?worker";

async function processActivities(
  zipFile: File | Blob,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<ActivityStats> {
  const worker = new ActivityWorker();

  return new Promise<ActivityStats>((resolve, reject) => {
    let settled = false;

    const onAbort = () => {
      if (settled) return;
      settled = true;
      worker.terminate();
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    worker.onmessage = (ev) => {
      if (settled) return;
      const { type, data } = ev.data ?? {};
      if (type === "progress") {
        onProgress?.(data);
      } else if (type === "complete") {
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        resolve(data);
        worker.terminate();
      }
    };
    worker.onerror = (err) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      console.error("Error in activity worker:", err);
      reject(err);
      worker.terminate();
    };
    worker.postMessage({ type: "process", file: zipFile });
  });
}

export { processActivities };
