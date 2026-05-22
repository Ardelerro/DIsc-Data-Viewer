import {
  BlobReader,
  ZipReader,
  configure,
  type FileEntry,
} from "@zip.js/zip.js";

configure({ useWebWorkers: false });

const patterns = {
  addReaction: "add_reaction",
  attachmentsSent: "message_sent_with_attachments",
  joinVoice: "join_voice_channel",
  startCall: "start_call",
  joinCall: "join_call",
  appOpened: "app_opened",
} as const;

type CounterKey = keyof typeof patterns;

const counters: Record<CounterKey, number> = {
  addReaction: 0,
  attachmentsSent: 0,
  joinVoice: 0,
  startCall: 0,
  joinCall: 0,
  appOpened: 0,
};

// Longest pattern: a match can span at most this many characters, so carrying
// the last (max - 1) characters between chunks is enough to catch any pattern
// straddling a chunk boundary — no dependency on the file being newline-delimited.
const MAX_PATTERN_LEN = Math.max(
  ...Object.values(patterns).map((p) => p.length),
);
const OVERLAP = MAX_PATTERN_LEN - 1;

const post = (msg: unknown) => (postMessage as (m: unknown) => void)(msg);

self.onmessage = async (ev: MessageEvent<{ type: "process"; file: File | Blob }>) => {
  const req = ev.data;
  if (!req || req.type !== "process") return;

  const reader = new ZipReader(new BlobReader(req.file));
  const entries = await reader.getEntries();

  const fileEntries = entries.filter((e) => !e.directory) as FileEntry[];
  const activityEntry: FileEntry | undefined =
    fileEntries.find((e) => /Activity\/Analytics\/[^/]+\.json$/i.test(e.filename)) ||
    fileEntries.find((e) => /Account\/activity\.json$/i.test(e.filename));

  if (!activityEntry) {
    await reader.close();
    post({ type: "complete", data: { ...counters } });
    return;
  }

  const totalBytes = activityEntry.uncompressedSize || 1;
  let processedBytes = 0;
  let lastProgress = 0;

  const decoder = new TextDecoder("utf-8", { fatal: false });
  // Tail of the previous chunk whose start positions haven't been counted yet;
  // never longer than OVERLAP characters.
  let leftover = "";

  function countUpTo(text: string, limit: number) {
    for (const key in patterns) {
      const pat = patterns[key as CounterKey];
      let idx = 0;
      let n = 0;
      while ((idx = text.indexOf(pat, idx)) !== -1 && idx < limit) {
        n++;
        idx += pat.length;
      }
      counters[key as CounterKey] += n;
    }
  }

  function processChunk(chunk: Uint8Array) {
    const combined = leftover + decoder.decode(chunk, { stream: true });
    const limit = combined.length - OVERLAP;
    if (limit > 0) {
      countUpTo(combined, limit);
      leftover = combined.slice(limit);
    } else {
      leftover = combined;
    }
  }

  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      processChunk(chunk);
      processedBytes += chunk.byteLength;
      const progress = Math.min(100, (processedBytes / totalBytes) * 100);
      if (progress - lastProgress > 1 || processedBytes >= totalBytes) {
        lastProgress = progress;
        post({ type: "progress", data: progress });
      }
    },
    close() {
      const tail = leftover + decoder.decode();
      if (tail.length > 0) countUpTo(tail, tail.length);
    },
  });

  try {
    await activityEntry.getData(writable);
  } catch (err) {
    console.error("Activity stream error", err);
  }

  await reader.close();
  post({ type: "complete", data: { ...counters } });
};
