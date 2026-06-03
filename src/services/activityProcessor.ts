import { BlobReader, ZipReader, type FileEntry } from "@zip.js/zip.js";
import type {
  ActivityStats,
  ActivityWorkerRequest,
  ActivityWorkerResponse,
} from "../types/discord";
import { Profiler } from "./profiler";
import { getDeviceTuning } from "../utils/deviceProfile";
import ActivityWorker from "./activity.worker.ts?worker";

const WORKER_SILENCE_TIMEOUT_MS = 60_000;

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
  const tuning = getDeviceTuning();

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
  const workerCount = Math.min(tuning.maxWorkers, queue.length);

  const stopPool = ap.start("workerPool:wall");
  await Promise.all(
    Array.from(
      { length: workerCount },
      () =>
        new Promise<void>((resolve, reject) => {
          const worker = new ActivityWorker();
          let done = false;
          let watchdog: ReturnType<typeof setTimeout>;

          const send = (req: ActivityWorkerRequest) => worker.postMessage(req);

          const cleanup = () => {
            clearTimeout(watchdog);
            signal?.removeEventListener("abort", onAbort);
          };
          const fail = (err: Error) => {
            if (done) return;
            done = true;
            cleanup();
            worker.terminate();
            reject(err);
          };
          const armWatchdog = () => {
            clearTimeout(watchdog);
            watchdog = setTimeout(() => {
              fail(
                new Error(
                  `Activity worker stalled for ${
                    WORKER_SILENCE_TIMEOUT_MS / 1000
                  }s — the device likely ran out of memory.`,
                ),
              );
            }, WORKER_SILENCE_TIMEOUT_MS);
          };

          const onAbort = () =>
            fail(new DOMException("Aborted", "AbortError") as unknown as Error);
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
            armWatchdog();
            if (m.type === "idle") {
              if (qi < queue.length) {
                send({ type: "file", filename: queue[qi++] });
              } else {
                send({ type: "stop" });
              }
            } else if (m.type === "progress") {
              processedBytes += m.bytes;
              reportProgress();
            } else if (m.type === "error") {
              console.error("Activity worker reported failure:", m.message);
              fail(new Error(m.message));
            } else if (m.type === "result") {
              for (const k in totals) {
                totals[k as CounterKey] += m.counters[k as CounterKey];
              }

              ap.merge(m.profile);
              done = true;
              cleanup();
              worker.terminate();
              resolve();
            }
          };
          worker.onerror = (err) => {
            console.error("Activity worker error", err);
            fail(new Error(err.message || "Activity worker crashed"));
          };
          armWatchdog();
          send({ type: "init", file: zipFile });
        }),
    ),
  );
  stopPool();

  prof.merge(ap.export(), "activity/");
  return totals;
}

export { processActivities };
