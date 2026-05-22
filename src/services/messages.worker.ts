import {
  BlobReader,
  ZipReader,
  TextWriter,
  configure,
  type FileEntry,
} from "@zip.js/zip.js";
import { calculateStreak } from "../utils/streakUtils";
import { getTopWords, STOP_WORDS } from "../utils/textUtils";
import { analyzeText } from "../utils/sentimentAnalyzer";
import {
  classifyCompound,
  compoundToScore,
  lengthWeight,
} from "../utils/sentimentScale";
import { createObjectStreamParser, parseTimestamp } from "./messageStream";
import type {
  PartialAgg,
  ChannelStats,
  MessageWorkerRequest,
  MessageWorkerResponse,
} from "../types/discord";

configure({ useWebWorkers: false });

const MESSAGE_GAP_THRESHOLD_S = 30 * 60;

// messages.json files at or above this uncompressed size are read with the
// streaming structural scanner; smaller ones use one-shot JSON.parse (faster
// for the common case). Streaming sidesteps V8's ~512MB string cap and keeps
// memory bounded to one message object at a time.
const STREAM_THRESHOLD_BYTES = 96 * 1024 * 1024;

// Distinct-key ceiling for the worker's global word map before hapax (count-1)
// pruning runs — bounds memory on huge, highly varied vocabularies.
const WORD_CAP = 200_000;

const post = (msg: MessageWorkerResponse) =>
  (postMessage as (m: MessageWorkerResponse) => void)(msg);

// --- worker-global state (this worker handles many files over its lifetime) ---

let reader: ZipReader<Blob> | null = null;
const entryByName = new Map<string, FileEntry>();
let channelMapping: Record<string, string> = {};
let approxGlobalKeys = 0;

const agg: PartialAgg = {
  hourly: {},
  monthly: {},
  daily: {},
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

  if (req.type === "init") {
    channelMapping = req.channelMapping;
    reader = new ZipReader(new BlobReader(req.file));
    const entries = await reader.getEntries();
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
        /* reader already closed / nothing to flush */
      }
    }
    post({ type: "result", agg, channels });
    self.close();
  }
};

// --- per-channel accumulators ---------------------------------------------

interface ChannelAcc {
  hourly: Record<string, number>;
  monthly: Record<string, number>;
  daily: Record<string, number>;
  localWordFreq: Record<string, number>;
  localHourlyAnalyzed: Record<string, number>;
  localHourlySentiment: Record<string, number>;
  messageDates: Set<string>;
  sentPos: number;
  sentNeg: number;
  sentNeu: number;
  // sentAvgSum: Σ(score × length-weight); sentWeightSum: Σ(length-weight).
  // Channel average = sentAvgSum / sentWeightSum — a length-weighted mean.
  sentAvgSum: number;
  sentWeightSum: number;
  messageCount: number;
  tsList: number[];
  minTs: number;
  lastTs: number;
  alreadySorted: boolean;
}

function createAcc(): ChannelAcc {
  return {
    hourly: {},
    monthly: {},
    daily: {},
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
    tsList: [],
    minTs: Infinity,
    lastTs: -Infinity,
    alreadySorted: true,
  };
}

async function processFile(filename: string) {
  const entry = entryByName.get(filename);
  const size = entry?.uncompressedSize ?? 0;
  let reported = 0;
  const reportDelta = (bytes: number) => {
    if (bytes <= 0) return;
    reported += bytes;
    post({ type: "progress", bytes });
  };

  try {
    if (!entry) return;
    const channelMatch = filename.match(/c(\d+)\/messages\.json$/i);
    if (!channelMatch) return;
    const channelId = channelMatch[1];
    if (!channelMapping[channelId]) return;

    const acc = createAcc();
    if (size >= STREAM_THRESHOLD_BYTES) {
      await streamFile(entry, acc, reportDelta);
    } else {
      await parseWhole(entry, acc);
    }

    if (acc.messageCount > 0) {
      channels.push({ channelId, stats: finalizeChannel(acc) });
    }

    if (approxGlobalKeys > WORD_CAP) {
      pruneHapax(agg.globalWordFreq);
      approxGlobalKeys = Object.keys(agg.globalWordFreq).length;
    }
  } catch (err) {
    console.warn(`Failed to process ${filename}`, err);
  } finally {
    // Always report the file's full byte weight (even on skip/error) so the
    // main-thread progress total reliably reaches 100%.
    if (size > reported) reportDelta(size - reported);
  }
}

// Small file: decompress fully and hand the whole array to native JSON.parse.
async function parseWhole(entry: FileEntry, acc: ChannelAcc) {
  let messages: unknown;
  try {
    const text = await entry.getData(new TextWriter());
    messages = JSON.parse(text);
  } catch (err) {
    console.warn("Failed to read/parse messages.json", err);
    return;
  }
  if (!Array.isArray(messages)) return;
  for (let i = 0; i < messages.length; i++) {
    const r = messages[i] as { Timestamp?: unknown; Contents?: unknown };
    if (r && r.Timestamp) foldMessage(r.Contents, String(r.Timestamp), acc);
  }
}

// Large file: stream decompressed bytes and extract each top-level {...} object
// as a complete substring, parsing one message at a time. Only a single object
// is buffered, so memory stays bounded regardless of file size.
async function streamFile(
  entry: FileEntry,
  acc: ChannelAcc,
  reportDelta: (bytes: number) => void,
) {
  const decoder = new TextDecoder("utf-8", { fatal: false });

  const parser = createObjectStreamParser((objText) => {
    try {
      const obj = JSON.parse(objText) as {
        Timestamp?: unknown;
        Contents?: unknown;
      };
      if (obj && obj.Timestamp) {
        foldMessage(obj.Contents, String(obj.Timestamp), acc);
      }
    } catch {
      /* skip a malformed object rather than failing the whole file */
    }
  });

  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      parser.feed(decoder.decode(chunk, { stream: true }));
      reportDelta(chunk.byteLength);
    },
    close() {
      const tail = decoder.decode();
      if (tail) parser.feed(tail);
    },
  });

  await entry.getData(writable);
}

// --- per-message fold ------------------------------------------------------

function foldMessage(contents: unknown, timestampStr: string, acc: ChannelAcc) {
  const parsed = parseTimestamp(timestampStr);
  if (!parsed) return;
  const { ts, hour, month, date } = parsed;

  acc.hourly[hour] = (acc.hourly[hour] || 0) + 1;
  acc.monthly[month] = (acc.monthly[month] || 0) + 1;
  acc.daily[date] = (acc.daily[date] || 0) + 1;
  agg.hourly[hour] = (agg.hourly[hour] || 0) + 1;
  agg.monthly[month] = (agg.monthly[month] || 0) + 1;
  agg.daily[date] = (agg.daily[date] || 0) + 1;
  acc.messageCount++;
  agg.messageCount++;

  acc.tsList.push(ts);
  if (ts < acc.lastTs) acc.alreadySorted = false;
  acc.lastTs = ts;
  if (ts < acc.minTs) acc.minTs = ts;
  acc.messageDates.add(date);

  if (typeof contents === "string" && contents.length > 0) {
    const result = analyzeText(contents);
    const compound = result.compound;
    const cls = classifyCompound(compound);
    if (cls === "positive") acc.sentPos++;
    else if (cls === "negative") acc.sentNeg++;
    else acc.sentNeu++;
    // score: compound [-1,+1] → [-100,+100]. weight: longer messages count
    // somewhat more, sub-linearly (see lengthWeight). Hourly totals carry the
    // same weighting so every average stays a length-weighted mean.
    const score = compoundToScore(compound);
    const weight = lengthWeight(result.words.length);
    const weighted = score * weight;
    acc.sentAvgSum += weighted;
    acc.sentWeightSum += weight;
    agg.hourlySentimentTotal[hour] =
      (agg.hourlySentimentTotal[hour] || 0) + weighted;
    acc.localHourlySentiment[hour] =
      (acc.localHourlySentiment[hour] || 0) + weighted;
    acc.localHourlyAnalyzed[hour] =
      (acc.localHourlyAnalyzed[hour] || 0) + weight;
    agg.hourlyAnalyzedCount[hour] =
      (agg.hourlyAnalyzedCount[hour] || 0) + weight;

    // result.words are lowercased content words with code blocks / URLs /
    // mentions already stripped — reused here instead of re-tokenizing.
    const words = result.words;
    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      if (!STOP_WORDS.has(word)) {
        acc.localWordFreq[word] = (acc.localWordFreq[word] || 0) + 1;
        const cur = agg.globalWordFreq[word];
        if (cur === undefined) {
          agg.globalWordFreq[word] = 1;
          approxGlobalKeys++;
        } else {
          agg.globalWordFreq[word] = cur + 1;
        }
      }
    }
  }
}

// --- finalization ----------------------------------------------------------

function finalizeChannel(acc: ChannelAcc): ChannelStats {
  // Gap / conversation timing needs chronological order; sort the buffered
  // numeric timestamps only when the stream wasn't already ordered.
  const ts = acc.tsList;
  if (!acc.alreadySorted) ts.sort((a, b) => a - b);

  let totalGapTime = 0;
  let numGaps = 0;
  let totalConversationTime = 0;
  let longestConversationTime = 0;
  let startSec = -1;
  let prevSec = -1;

  for (let i = 0; i < ts.length; i++) {
    const sec = (ts[i] / 1000) | 0;
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
    sentiment: {
      average:
        acc.sentWeightSum > 0 ? acc.sentAvgSum / acc.sentWeightSum : 0,
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
