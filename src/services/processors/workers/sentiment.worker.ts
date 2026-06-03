import {
  BlobReader,
  ZipReader,
  configure,
  type FileEntry,
} from "@zip.js/zip.js";
import { pipeline, env } from "@huggingface/transformers";
import type { ChannelSentiment } from "../../../types/discord";
import type { SentimentWorkerResponse, SentimentWorkerRequest } from "../../../types/worker";
import { createStreamParser, parseTimestamp } from "../../../utils/serviceUtils/messageStream";
import { compoundToScore, lengthWeight, classifyCompound } from "../../../utils/uiUtils/sentimentScale";
import { Profiler } from "../../../utils/serviceUtils/profiler";



configure({ useWebWorkers: false });

env.allowLocalModels = false;

const MODEL_ID = "Xenova/twitter-roberta-base-sentiment-latest";
const BATCH_SIZE = 32;

const MAX_TEXT_LEN = 1200;

const post = (m: SentimentWorkerResponse) =>
  (postMessage as (m: SentimentWorkerResponse) => void)(m);

const prof = new Profiler();

function countWords(s: string): number {
  const m = s.match(/\S+/g);
  return m ? m.length : 0;
}

type ClassPrediction = { label: string; score: number };
type Classifier = (
  texts: string[],
  opts: { top_k: number },
) => Promise<ClassPrediction[][]>;

self.onmessage = async (ev: MessageEvent<SentimentWorkerRequest>) => {
  const req = ev.data;
  if (!req || req.type !== "start") return;
  try {
    await run(req.file, req.sampleRate);
  } catch (err) {
    post({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

let lastReported = -1;
function reportProgress(value: number) {
  const v = value < 0 ? 0 : value > 100 ? 100 : value;
  const intV = v | 0;
  if (intV === lastReported) return;
  lastReported = intV;
  post({ type: "progress", value: v });
}

async function loadModel(): Promise<Classifier> {
  const pipe = await pipeline("sentiment-analysis", MODEL_ID, {
    device: "webgpu",
    dtype: "fp16",

    progress_callback: (p: any) => {
      if (p && p.status === "progress" && typeof p.progress === "number") {
        reportProgress(p.progress * 0.1);
      }
    },
  });
  return pipe as unknown as Classifier;
}

interface SentAcc {
  pos: number;
  neg: number;
  neu: number;

  avgSum: number;
  weightSum: number;
  hourlySentiment: Record<string, number>;
  hourlyWeight: Record<string, number>;
  sampleAcc: number;
}

function createAcc(): SentAcc {
  return {
    pos: 0,
    neg: 0,
    neu: 0,
    avgSum: 0,
    weightSum: 0,
    hourlySentiment: {},
    hourlyWeight: {},
    sampleAcc: 0,
  };
}

function scoreOf(entries: ClassPrediction[]): number {
  let pPos = 0;
  let pNeg = 0;
  let pNeu = 0;
  for (const e of entries) {
    const l = e.label.toLowerCase();
    if (l.includes("pos") || l === "label_2") pPos = e.score;
    else if (l.includes("neg") || l === "label_0") pNeg = e.score;
    else pNeu = e.score;
  }
  if (pNeu >= pPos && pNeu >= pNeg) return 0;
  return pPos - pNeg;
}

async function run(file: File | Blob, sampleRate: number) {
  const classifier = await prof.timeAsync("loadModel", () => loadModel());

  post({ type: "ready" });
  reportProgress(10);

  const reader = new ZipReader(new BlobReader(file));
  const entries = await prof.timeAsync("getEntries", () => reader.getEntries());

  const messageEntries: FileEntry[] = [];
  for (const e of entries) {
    if (e.directory) continue;
    const fe = e as FileEntry;
    if (/^Messages\/c\d+\/messages\.json$/i.test(fe.filename)) {
      messageEntries.push(fe);
    }
  }
  messageEntries.sort(
    (a, b) => (b.uncompressedSize || 0) - (a.uncompressedSize || 0),
  );
  let totalBytes = 0;
  for (const e of messageEntries) totalBytes += e.uncompressedSize || 0;
  if (totalBytes <= 0) totalBytes = 1;

  const channels: ChannelSentiment[] = [];
  const hourlySentimentTotal: Record<string, number> = {};
  const hourlyAnalyzedCount: Record<string, number> = {};
  let processedBytes = 0;
  const bumpProgress = () =>
    reportProgress(10 + (processedBytes / totalBytes) * 90);

  for (const entry of messageEntries) {
    const m = entry.filename.match(/c(\d+)\/messages\.json$/i);
    const before = processedBytes;
    const full = entry.uncompressedSize || 0;

    if (m) {
      const channelId = m[1];
      const acc = createAcc();
      try {
        await processEntry(entry, acc, sampleRate, classifier, (bytes) => {
          processedBytes += bytes;
          bumpProgress();
        });
      } catch (err) {
        console.warn(`Sentiment: failed on ${entry.filename}`, err);
      }
      if (acc.weightSum > 0) {
        channels.push(finalizeChannel(channelId, acc, sampleRate));
        for (const h in acc.hourlySentiment) {
          hourlySentimentTotal[h] =
            (hourlySentimentTotal[h] || 0) + acc.hourlySentiment[h];
          hourlyAnalyzedCount[h] =
            (hourlyAnalyzedCount[h] || 0) + acc.hourlyWeight[h];
        }
      }
    }

    const counted = processedBytes - before;
    if (counted < full) {
      processedBytes += full - counted;
      bumpProgress();
    }
  }

  await reader.close();
  reportProgress(100);
  post({
    type: "result",
    channels,
    hourlySentimentTotal,
    hourlyAnalyzedCount,
    profile: prof.export(),
  });
}

async function processEntry(
  entry: FileEntry,
  acc: SentAcc,
  sampleRate: number,
  classifier: Classifier,
  reportDelta: (bytes: number) => void,
) {
  const batchText: string[] = [];
  const batchHour: string[] = [];
  const batchLen: number[] = [];

  const runBatch = async () => {
    const n = batchText.length < BATCH_SIZE ? batchText.length : BATCH_SIZE;
    if (n === 0) return;
    const texts = batchText.splice(0, n);
    const hours = batchHour.splice(0, n);
    const lens = batchLen.splice(0, n);
    const out = await prof.timeAsync("inference:classifier", () =>
      classifier(texts, { top_k: 3 }),
    );
    for (let i = 0; i < texts.length; i++) {
      const compound = scoreOf(out[i]);
      const score = compoundToScore(compound);
      const weight = lengthWeight(lens[i]);
      const weighted = score * weight;
      acc.avgSum += weighted;
      acc.weightSum += weight;
      const cls = classifyCompound(compound);
      if (cls === "positive") acc.pos++;
      else if (cls === "negative") acc.neg++;
      else acc.neu++;
      const h = hours[i];
      acc.hourlySentiment[h] = (acc.hourlySentiment[h] || 0) + weighted;
      acc.hourlyWeight[h] = (acc.hourlyWeight[h] || 0) + weight;
    }
  };

  const parser = createStreamParser((obj) => {
    if (!obj.Timestamp) return;
    const contents = obj.Contents;
    if (typeof contents !== "string") return;
    const text = contents.trim();
    if (text.length < 2) return;
    acc.sampleAcc += sampleRate;
    if (acc.sampleAcc < 1) return;
    acc.sampleAcc -= 1;
    const parsed = parseTimestamp(String(obj.Timestamp));
    if (!parsed) return;
    batchText.push(
      text.length > MAX_TEXT_LEN ? text.slice(0, MAX_TEXT_LEN) : text,
    );
    batchHour.push(parsed.hour);
    batchLen.push(countWords(text));
  });

  const writable = new WritableStream<Uint8Array>({
    async write(chunk) {
      const t0 = performance.now();
      parser.feed(chunk);
      prof.record("stream:parse+sample", performance.now() - t0);
      while (batchText.length >= BATCH_SIZE) await runBatch();
      reportDelta(chunk.byteLength);
    },
    async close() {
      while (batchText.length > 0) await runBatch();
    },
  });

  await entry.getData(writable);
}

function finalizeChannel(
  channelId: string,
  acc: SentAcc,
  sampleRate: number,
): ChannelSentiment {
  const hourlySentimentAverage: Record<string, number> = {};
  for (const h in acc.hourlySentiment) {
    const wt = acc.hourlyWeight[h] || 0;
    hourlySentimentAverage[h] = wt > 0 ? acc.hourlySentiment[h] / wt : 0;
  }
  const scale = sampleRate > 0 ? 1 / sampleRate : 1;
  return {
    channelId,
    sentiment: {
      average: acc.weightSum > 0 ? acc.avgSum / acc.weightSum : 0,
      positive: Math.round(acc.pos * scale),
      negative: Math.round(acc.neg * scale),
      neutral: Math.round(acc.neu * scale),
    },
    hourlySentimentAverage,
  };
}
