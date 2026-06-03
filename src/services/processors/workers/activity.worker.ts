import {
  BlobReader,
  ZipReader,
  configure,
  type FileEntry,
} from "@zip.js/zip.js";
import { Profiler } from "../../../utils/serviceUtils/profiler";
import { ByteScanner } from "../../../wasm/byteScanner";
import {
  ACTIVITY_PATTERN_DEFS,
  ACTIVITY_PATTERNS,
  type ActivityKey,
} from "../../../wasm/acAutomaton";
import type {
  ActivityStats,
} from "../../../types/discord";
import type { ActivityWorkerResponse, ActivityWorkerRequest } from "../../../types/worker";

configure({ useWebWorkers: false });

const ZERO: ActivityStats = {
  addReaction: 0,
  attachmentsSent: 0,
  joinVoice: 0,
  startCall: 0,
  joinCall: 0,
  appOpened: 0,
};

const totals: ActivityStats = { ...ZERO };

const fileCounts: ActivityStats = { ...ZERO };

const MAX_PATTERN_LEN = Math.max(...ACTIVITY_PATTERNS.map((p) => p.length));
const OVERLAP = MAX_PATTERN_LEN - 1;

const COMBINED_RE = new RegExp(
  ACTIVITY_PATTERNS.slice()
    .sort((a, b) => b.length - a.length)
    .join("|"),
  "g",
);
const patternToKey: Record<string, ActivityKey> = {};
for (const d of ACTIVITY_PATTERN_DEFS) patternToKey[d.pattern] = d.key;

function countUpTo(text: string, limit: number) {
  COMBINED_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = COMBINED_RE.exec(text)) !== null) {
    if (m.index >= limit) break;
    fileCounts[patternToKey[m[0]]]++;
  }
}

const post = (msg: ActivityWorkerResponse) =>
  (postMessage as (m: ActivityWorkerResponse) => void)(msg);

const prof = new Profiler();

let scannerPromise: Promise<ByteScanner | null> | null = null;
function getScanner(): Promise<ByteScanner | null> {
  if (!scannerPromise) scannerPromise = ByteScanner.create();
  return scannerPromise;
}

async function rawEntryBytes(
  file: File | Blob,
  entry: FileEntry,
): Promise<{ blob: Blob; method: number } | null> {
  const headerBuf = await file
    .slice(entry.offset, entry.offset + 30)
    .arrayBuffer();
  if (headerBuf.byteLength < 30) return null;
  const dv = new DataView(headerBuf);
  if (dv.getUint32(0, true) !== 0x04034b50) return null;
  const method = dv.getUint16(8, true);
  const nameLen = dv.getUint16(26, true);
  const extraLen = dv.getUint16(28, true);
  const dataStart = entry.offset + 30 + nameLen + extraLen;
  const blob = file.slice(dataStart, dataStart + entry.compressedSize);
  return { blob, method };
}

async function scanEntry(file: File | Blob, entry: FileEntry): Promise<void> {
  for (const k in fileCounts) fileCounts[k as ActivityKey] = 0;

  const scanner = await getScanner();
  const useWasm = scanner !== null;
  if (useWasm) scanner!.reset();

  let decoder = new TextDecoder("utf-8", { fatal: false });

  let leftover = "";

  const SCAN_BLOCK = 4 * 1024 * 1024;
  let pending = "";
  let scanMs = 0;
  let bytesSincePost = 0;

  function scanBlock(final: boolean) {
    const combined = leftover + pending;
    pending = "";
    if (final) {
      if (combined.length > 0) countUpTo(combined, combined.length);
      leftover = "";
      return;
    }
    const limit = combined.length - OVERLAP;
    if (limit > 0) {
      countUpTo(combined, limit);
      leftover = combined.slice(limit);
    } else {
      leftover = combined;
    }
  }

  function consume(chunk: Uint8Array) {
    const t0 = performance.now();
    if (useWasm) {
      scanner!.scan(chunk);
    } else {
      pending += decoder.decode(chunk, { stream: true });
      if (pending.length >= SCAN_BLOCK) scanBlock(false);
    }
    scanMs += performance.now() - t0;
  }

  function finishConsume() {
    if (useWasm) return;
    const t0 = performance.now();
    pending += decoder.decode();
    scanBlock(true);
    scanMs += performance.now() - t0;
  }

  function resetScan() {
    for (const k in fileCounts) fileCounts[k as ActivityKey] = 0;
    if (useWasm) {
      scanner!.reset();
    } else {
      decoder = new TextDecoder("utf-8", { fatal: false });
      leftover = "";
      pending = "";
    }
    scanMs = 0;
  }

  function makeWritable(): WritableStream<Uint8Array> {
    return new WritableStream<Uint8Array>({
      write(chunk) {
        consume(chunk);
        bytesSincePost += chunk.byteLength;
        if (bytesSincePost >= 1 << 20) {
          post({ type: "progress", bytes: bytesSincePost });
          bytesSincePost = 0;
        }
      },
      close() {
        finishConsume();
        if (bytesSincePost > 0)
          post({ type: "progress", bytes: bytesSincePost });
      },
    });
  }

  const stop = prof.start("stream:inflate+scan");
  let usedNative = false;

  try {
    if (typeof DecompressionStream !== "undefined" && !entry.encrypted) {
      const raw = await rawEntryBytes(file, entry);
      if (raw && (raw.method === 8 || raw.method === 0)) {
        const byteStream =
          raw.method === 8
            ? raw.blob
                .stream()
                .pipeThrough(new DecompressionStream("deflate-raw"))
            : raw.blob.stream();
        await byteStream.pipeTo(makeWritable());
        usedNative = true;
      }
    }
  } catch (err) {
    console.warn("Native inflate failed; falling back to zip.js", err);
    resetScan();
  }

  if (!usedNative) {
    await entry.getData(makeWritable());
  }
  stop();
  prof.record("stream:decode+match", scanMs);

  if (useWasm) scanner!.readInto(fileCounts);

  for (const k in fileCounts) {
    totals[k as ActivityKey] += fileCounts[k as ActivityKey];
  }
}

let reader: ZipReader<unknown> | null = null;
let srcFile: File | Blob | null = null;
const entryByName = new Map<string, FileEntry>();

self.onmessage = async (ev: MessageEvent<ActivityWorkerRequest>) => {
  const req = ev.data;
  if (!req) return;

  try {
    if (req.type === "init") {
      srcFile = req.file;
      reader = new ZipReader(new BlobReader(req.file));
      const entries = await prof.timeAsync("init:getEntries", () =>
        reader!.getEntries(),
      );
      for (const e of entries) {
        if (!e.directory)
          entryByName.set((e as FileEntry).filename, e as FileEntry);
      }
      post({ type: "idle" });
    } else if (req.type === "file") {
      const entry = entryByName.get(req.filename);
      if (entry && srcFile) {
        try {
          await scanEntry(srcFile, entry);
        } catch (err) {
          console.error("Activity scan error", req.filename, err);
        }
      }
      post({ type: "idle" });
    } else if (req.type === "stop") {
      if (reader) {
        try {
          await reader.close();
        } catch {
          /* reader already closed / nothing to flush */
        }
      }
      post({ type: "result", counters: { ...totals }, profile: prof.export() });
    }
  } catch (err) {
    post({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

// Backstops for failures that escape the handler above.
self.addEventListener("error", (e) => {
  post({ type: "error", message: e.message || "Activity worker error" });
});
self.addEventListener("unhandledrejection", (e) => {
  const reason = (e as PromiseRejectionEvent).reason;
  post({
    type: "error",
    message: reason instanceof Error ? reason.message : String(reason),
  });
});
