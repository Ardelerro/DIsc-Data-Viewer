import {
  BlobReader,
  ZipReader,
  TextWriter,
  configure,
  type FileEntry,
} from "@zip.js/zip.js";
import { calculateStreak } from "../../../utils/serviceUtils/streakUtils";
import { getTopWords, STOP_WORDS } from "../../../utils/serviceUtils/textUtils";
import { analyzeText, tokenizeWords } from "../../../utils/serviceUtils/sentimentAnalyzer";
import {
  classifyCompound,
  compoundToScore,
  lengthWeight,
} from "../../../utils/uiUtils/sentimentScale";
import { createStreamParser, parseTimestamp } from "../../../utils/serviceUtils/messageStream";
import { Profiler } from "../../../utils/serviceUtils/profiler";
import type {
  PartialAgg,
  ChannelStats,
} from "../../../types/discord";
import type { MessageWorkerResponse, MessageWorkerRequest } from "../../../types/worker";

configure({ useWebWorkers: false });

const MESSAGE_GAP_THRESHOLD_S = 30 * 60;

let streamThresholdBytes = 24 * 1024 * 1024;

const PROGRESS_BATCH_BYTES = 2 * 1024 * 1024;

const WORD_CAP = 200_000;

const post = (msg: MessageWorkerResponse) =>
  (postMessage as (m: MessageWorkerResponse) => void)(msg);

let reader: ZipReader<Blob> | null = null;
const entryByName = new Map<string, FileEntry>();
let channelMapping: Record<string, string> = {};
let aiMode = false;
let approxGlobalKeys = 0;
const prof = new Profiler();

const agg: PartialAgg = {
  hourly: {},
  monthly: {},
  daily: {},
  dailyHourly: {},
  hourlySentimentTotal: {},
  hourlyAnalyzedCount: {},
  globalWordFreq: {},
  totalGapTime: 0,
  numGaps: 0,
  messageCount: 0,
};
const channels: Array<{ channelId: string; stats: ChannelStats }> = [];

self.onmessage = async (ev: MessageEvent<MessageWorkerRequest>) => {
  const req = ev.data;
  if (!req) return;

  try {
    if (req.type === "init") {
      channelMapping = req.channelMapping;
      aiMode = req.aiMode;
      if (
        typeof req.streamThresholdBytes === "number" &&
        req.streamThresholdBytes > 0
      ) {
        streamThresholdBytes = req.streamThresholdBytes;
      }
      reader = new ZipReader(new BlobReader(req.file));
      const entries = await prof.timeAsync("init:getEntries", () =>
        reader!.getEntries(),
      );
      for (const e of entries) {
        if (!e.directory) entryByName.set(e.filename, e as FileEntry);
      }
      post({ type: "idle" });
    } else if (req.type === "file") {
      await processFile(req.filename);
      post({ type: "idle" });
    } else if (req.type === "stop") {
      if (reader) {
        try {
          await reader.close();
        } catch {
        }
      }
      post({ type: "result", agg, channels, profile: prof.export() });
      self.close();
    }
  } catch (err) {
    post({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
    self.close();
  }
};

self.addEventListener("error", (e) => {
  post({ type: "error", message: e.message || "Message worker error" });
});
self.addEventListener("unhandledrejection", (e) => {
  const reason = (e as PromiseRejectionEvent).reason;
  post({
    type: "error",
    message: reason instanceof Error ? reason.message : String(reason),
  });
});

interface ChannelAcc {
  hourly: Record<string, number>;
  monthly: Record<string, number>;
  daily: Record<string, number>;
  dailyHourly: Record<string, Record<string, number>>;
  localWordFreq: Record<string, number>;
  localHourlyAnalyzed: Record<string, number>;
  localHourlySentiment: Record<string, number>;
  messageDates: Set<string>;
  sentPos: number;
  sentNeg: number;
  sentNeu: number;
  sentAvgSum: number;
  sentWeightSum: number;
  messageCount: number;

  tsSec: Int32Array;
  tsLen: number;
  minTs: number;
  lastSec: number;
  alreadySorted: boolean;
}

function createAcc(): ChannelAcc {
  return {
    hourly: {},
    monthly: {},
    daily: {},
    dailyHourly: {},
    localWordFreq: {},
    localHourlyAnalyzed: {},
    localHourlySentiment: {},
    messageDates: new Set(),
    sentPos: 0,
    sentNeg: 0,
    sentNeu: 0,
    sentAvgSum: 0,
    sentWeightSum: 0,
    messageCount: 0,
    tsSec: new Int32Array(64),
    tsLen: 0,
    minTs: Infinity,
    lastSec: -Infinity,
    alreadySorted: true,
  };
}

async function processFile(filename: string) {
  const entry = entryByName.get(filename);
  const size = entry?.uncompressedSize ?? 0;
  let reported = 0;
  let pending = 0;
  const flush = () => {
    if (pending > 0) {
      post({ type: "progress", bytes: pending });
      pending = 0;
    }
  };
  const reportDelta = (bytes: number) => {
    if (bytes <= 0) return;
    reported += bytes;
    pending += bytes;
    if (pending >= PROGRESS_BATCH_BYTES) flush();
  };

  try {
    if (!entry) return;
    const channelMatch = filename.match(/c(\d+)\/messages\.json$/i);
    if (!channelMatch) return;
    const channelId = channelMatch[1];
    if (!channelMapping[channelId]) return;

    const acc = createAcc();
    if (size >= streamThresholdBytes) {
      await streamFile(entry, acc, reportDelta);
    } else {
      await parseWhole(entry, acc);
    }

    if (acc.messageCount > 0) {
      const stop = prof.start("finalizeChannel");
      const stats = finalizeChannel(acc);
      stop();
      channels.push({ channelId, stats });
    }

    if (approxGlobalKeys > WORD_CAP) {
      pruneHapax(agg.globalWordFreq);
      approxGlobalKeys = Object.keys(agg.globalWordFreq).length;
    }
  } catch (err) {
    console.warn(`Failed to process ${filename}`, err);
  } finally {
    if (size > reported) reportDelta(size - reported);
    flush();
  }
}

async function parseWhole(entry: FileEntry, acc: ChannelAcc) {
  let messages: unknown;
  try {
    const text = await prof.timeAsync("whole:getData(decompress)", () =>
      entry.getData(new TextWriter()),
    );
    messages = prof.time("whole:JSON.parse", () => JSON.parse(text));
  } catch (err) {
    console.warn("Failed to read/parse messages.json", err);
    return;
  }
  if (!Array.isArray(messages)) return;
  const stop = prof.start("whole:fold(analyze)");
  for (let i = 0; i < messages.length; i++) {
    const r = messages[i] as { Timestamp?: unknown; Contents?: unknown };
    if (r && r.Timestamp) foldMessage(r.Contents, String(r.Timestamp), acc);
  }
  stop();
}

async function streamFile(
  entry: FileEntry,
  acc: ChannelAcc,
  reportDelta: (bytes: number) => void,
) {
  const parser = createStreamParser((obj) => {
    if (obj.Timestamp) {
      foldMessage(obj.Contents, String(obj.Timestamp), acc);
    }
  });

  let feedMs = 0;
  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      const t0 = performance.now();
      parser.feed(chunk);
      feedMs += performance.now() - t0;
      reportDelta(chunk.byteLength);
    },
  });

  const stop = prof.start("stream:getData(decompress+parse+fold)");
  await entry.getData(writable);
  stop();
  prof.record("stream:parse+fold", feedMs);
}

function foldMessage(contents: unknown, timestampStr: string, acc: ChannelAcc) {
  const parsed = parseTimestamp(timestampStr);
  if (!parsed) return;
  const { ts, hour, month, date } = parsed;

  acc.hourly[hour] = (acc.hourly[hour] || 0) + 1;
  acc.monthly[month] = (acc.monthly[month] || 0) + 1;
  acc.daily[date] = (acc.daily[date] || 0) + 1;
  acc.messageCount++;
  const dhRow = acc.dailyHourly[date] || (acc.dailyHourly[date] = {});
  dhRow[hour] = (dhRow[hour] || 0) + 1;

  const sec = (ts / 1000) | 0;
  if (acc.tsLen === acc.tsSec.length) {
    const grown = new Int32Array(acc.tsSec.length * 2);
    grown.set(acc.tsSec);
    acc.tsSec = grown;
  }
  acc.tsSec[acc.tsLen++] = sec;
  if (sec < acc.lastSec) acc.alreadySorted = false;
  acc.lastSec = sec;
  if (ts < acc.minTs) acc.minTs = ts;
  acc.messageDates.add(date);

  if (typeof contents === "string" && contents.length > 0) {
    let words: string[];
    if (aiMode) {
      words = tokenizeWords(contents);
    } else {
      const result = analyzeText(contents);
      words = result.words;
      const compound = result.compound;
      const cls = classifyCompound(compound);
      if (cls === "positive") acc.sentPos++;
      else if (cls === "negative") acc.sentNeg++;
      else acc.sentNeu++;

      const score = compoundToScore(compound);
      const weight = lengthWeight(words.length);
      const weighted = score * weight;
      acc.sentAvgSum += weighted;
      acc.sentWeightSum += weight;
      acc.localHourlySentiment[hour] =
        (acc.localHourlySentiment[hour] || 0) + weighted;
      acc.localHourlyAnalyzed[hour] =
        (acc.localHourlyAnalyzed[hour] || 0) + weight;
    }

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      if (!STOP_WORDS.has(word)) {
        acc.localWordFreq[word] = (acc.localWordFreq[word] || 0) + 1;
      }
    }
  }
}

function finalizeChannel(acc: ChannelAcc): ChannelStats {
  const n = acc.tsLen;
  const tsSec = acc.tsSec;

  if (!acc.alreadySorted) tsSec.subarray(0, n).sort();

  let totalGapTime = 0;
  let numGaps = 0;
  let totalConversationTime = 0;
  let longestConversationTime = 0;
  let startSec = -1;
  let prevSec = -1;

  for (let i = 0; i < n; i++) {
    const sec = tsSec[i];
    if (startSec < 0) {
      startSec = sec;
    } else if (prevSec >= 0) {
      const gap = sec - prevSec;
      if (gap > MESSAGE_GAP_THRESHOLD_S) {
        const conv = prevSec - startSec;
        totalConversationTime += conv;
        if (conv > longestConversationTime) longestConversationTime = conv;
        const gapDelta = gap - MESSAGE_GAP_THRESHOLD_S;
        totalGapTime += gapDelta;
        numGaps++;
        startSec = sec;
      }
    }
    prevSec = sec;
  }
  if (startSec >= 0 && prevSec >= 0) {
    const conv = prevSec - startSec;
    totalConversationTime += conv;
    if (conv > longestConversationTime) longestConversationTime = conv;
  }

  agg.totalGapTime += totalGapTime;
  agg.numGaps += numGaps;

  agg.messageCount += acc.messageCount;
  for (const h in acc.hourly)
    agg.hourly[h] = (agg.hourly[h] || 0) + acc.hourly[h];
  for (const m in acc.monthly)
    agg.monthly[m] = (agg.monthly[m] || 0) + acc.monthly[m];
  for (const d in acc.daily) agg.daily[d] = (agg.daily[d] || 0) + acc.daily[d];
  for (const date in acc.dailyHourly) {
    const aggRow = agg.dailyHourly[date] || (agg.dailyHourly[date] = {});
    const accRow = acc.dailyHourly[date];
    for (const h in accRow) aggRow[h] = (aggRow[h] || 0) + accRow[h];
  }
  for (const h in acc.localHourlySentiment)
    agg.hourlySentimentTotal[h] =
      (agg.hourlySentimentTotal[h] || 0) + acc.localHourlySentiment[h];
  for (const h in acc.localHourlyAnalyzed)
    agg.hourlyAnalyzedCount[h] =
      (agg.hourlyAnalyzedCount[h] || 0) + acc.localHourlyAnalyzed[h];
  for (const word in acc.localWordFreq) {
    const cur = agg.globalWordFreq[word];
    if (cur === undefined) {
      agg.globalWordFreq[word] = acc.localWordFreq[word];
      approxGlobalKeys++;
    } else {
      agg.globalWordFreq[word] = cur + acc.localWordFreq[word];
    }
  }

  const hourlySentimentAverage: Record<string, number> = {};
  for (const hour in acc.hourly) {
    const an = acc.localHourlyAnalyzed[hour] || 0;
    const tot = acc.localHourlySentiment[hour] || 0;
    hourlySentimentAverage[hour] = an > 0 ? tot / an : 0;
  }

  const streak = calculateStreak(acc.messageDates);

  return {
    hourly: acc.hourly,
    monthly: acc.monthly,
    daily: acc.daily,
    dailyHourly: acc.dailyHourly,
    sentiment: {
      average: acc.sentWeightSum > 0 ? acc.sentAvgSum / acc.sentWeightSum : 0,
      positive: acc.sentPos,
      negative: acc.sentNeg,
      neutral: acc.sentNeu,
    },
    totalGapTime,
    numGaps,
    totalConversationTime,
    longestConversationTime,
    messageCount: acc.messageCount,
    averageGapBetweenMessages: numGaps > 0 ? totalGapTime / numGaps : 0,
    averageConversationTime:
      acc.messageCount > 0 ? totalConversationTime / (numGaps + 1) : 0,
    firstMessageTimestamp:
      acc.minTs === Infinity ? null : new Date(acc.minTs).toISOString(),
    hourlySentimentAverage,
    topWords: getTopWords(acc.localWordFreq, 50),
    longestStreak: streak.length,
    streakStart: streak.start,
    streakEnd: streak.end,
  };
}

function pruneHapax(freq: Record<string, number>) {
  for (const k in freq) {
    if (freq[k] <= 1) delete freq[k];
  }
}
