import { BlobReader, ZipReader, type FileEntry } from "@zip.js/zip.js";
import type {
  ActivityStats,
  ActivityWorkerRequest,
  ActivityWorkerResponse,
} from "../types/discord";
import { Profiler } from "./profiler";
import ActivityWorker from "./activity.worker.ts?worker";

const MAX_ACTIVITY_WORKERS = Math.max(
  2,
  Math.min(
    (typeof navigator !== "undefined"
      ? navigator.hardwareConcurrency || 4
      : 4) - 1,
    10,
  ),
);

const ZERO: ActivityStats = {
  addReaction: 0,
  attachmentsSent: 0,
  joinVoice: 0,
  startCall: 0,
  joinCall: 0,
  appOpened: 0,
};

type CounterKey = keyof ActivityStats;

async function processActivities(
  zipFile: File | Blob,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
  prof: Profiler = new Profiler(),
): Promise<ActivityStats> {
  const ap = new Profiler();

  const reader = new ZipReader(new BlobReader(zipFile));
  const entries = await ap.timeAsync("coord:getEntries", () =>
    reader.getEntries(),
  );

  const analytics: FileEntry[] = [];
  let legacy: FileEntry | undefined;
  for (const e of entries) {
    if (e.directory) continue;
    const fe = e as FileEntry;
    if (/Activity\/Analytics\/[^/]+\.json$/i.test(fe.filename)) {
      analytics.push(fe);
    } else if (/Account\/activity\.json$/i.test(fe.filename)) {
      legacy = fe;
    }
  }
  await reader.close();

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const targets = analytics.length > 0 ? analytics : legacy ? [legacy] : [];
  if (targets.length === 0) {
    prof.merge(ap.export(), "activity/");
    return { ...ZERO };
  }

  const sizeByName = new Map<string, number>();
  for (const e of targets) sizeByName.set(e.filename, e.uncompressedSize || 0);
  const queue = targets
    .map((e) => e.filename)
    .sort((a, b) => (sizeByName.get(b) || 0) - (sizeByName.get(a) || 0));

  let totalBytes = 0;
  for (const s of sizeByName.values()) totalBytes += s;
  if (totalBytes <= 0) totalBytes = 1;

  let qi = 0;
  let processedBytes = 0;
  let lastReported = -1;
  const reportProgress = () => {
    const pct = (processedBytes / totalBytes) * 100;
    const intPct = pct | 0;
    if (intPct === lastReported) return;
    lastReported = intPct;
    onProgress?.(Math.min(99, pct));
  };

  const totals: ActivityStats = { ...ZERO };
  const workerCount = Math.min(MAX_ACTIVITY_WORKERS, queue.length);

  const stopPool = ap.start("workerPool:wall");
  await Promise.all(
    Array.from(
      { length: workerCount },
      () =>
        new Promise<void>((resolve, reject) => {
          const worker = new ActivityWorker();
          let done = false;

          const send = (req: ActivityWorkerRequest) => worker.postMessage(req);

          const onAbort = () => {
            if (done) return;
            done = true;
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

          worker.onmessage = (ev: MessageEvent<ActivityWorkerResponse>) => {
            const m = ev.data;
            if (!m || done) return;
            if (m.type === "idle") {
              if (qi < queue.length) {
                send({ type: "file", filename: queue[qi++] });
              } else {
                send({ type: "stop" });
              }
            } else if (m.type === "progress") {
              processedBytes += m.bytes;
              reportProgress();
            } else if (m.type === "result") {
              for (const k in totals) {
                totals[k as CounterKey] += m.counters[k as CounterKey];
              }

              ap.merge(m.profile);
              done = true;
              signal?.removeEventListener("abort", onAbort);
              worker.terminate();
              resolve();
            }
          };
          worker.onerror = (err) => {
            if (done) return;
            done = true;
            signal?.removeEventListener("abort", onAbort);
            console.error("Activity worker error", err);
            worker.terminate();
            reject(err);
          };
          send({ type: "init", file: zipFile });
        }),
    ),
  );
  stopPool();

  prof.merge(ap.export(), "activity/");
  return totals;
}

export { processActivities };
