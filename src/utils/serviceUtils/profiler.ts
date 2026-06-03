export interface ProfileBucket {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
}

export type ProfileBuckets = Record<string, ProfileBucket>;

export interface ProfileReport {
  timestamp: number;
  dateISO: string;
  fileSizeBytes: number;
  aiMode: boolean;
  sampleRate: number;
  messageCount: number;
  workerCount: number;

  totalMs: number;

  buckets: ProfileBuckets;
}

function addTo(buckets: ProfileBuckets, label: string, ms: number) {
  let b = buckets[label];
  if (!b) {
    b = buckets[label] = { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0 };
  }
  b.count++;
  b.totalMs += ms;
  if (ms < b.minMs) b.minMs = ms;
  if (ms > b.maxMs) b.maxMs = ms;
}

export function mergeBuckets(
  target: ProfileBuckets,
  src: ProfileBuckets,
  prefix = "",
) {
  for (const k in src) {
    const label = prefix ? prefix + k : k;
    const s = src[k];
    let b = target[label];
    if (!b) {
      b = target[label] = { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0 };
    }
    b.count += s.count;
    b.totalMs += s.totalMs;
    if (s.minMs < b.minMs) b.minMs = s.minMs;
    if (s.maxMs > b.maxMs) b.maxMs = s.maxMs;
  }
}

export class Profiler {
  private buckets: ProfileBuckets = {};

  start(label: string): () => void {
    const t0 = performance.now();
    return () => addTo(this.buckets, label, performance.now() - t0);
  }

  record(label: string, ms: number) {
    addTo(this.buckets, label, ms);
  }

  async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const stop = this.start(label);
    try {
      return await fn();
    } finally {
      stop();
    }
  }

  time<T>(label: string, fn: () => T): T {
    const stop = this.start(label);
    try {
      return fn();
    } finally {
      stop();
    }
  }

  merge(src: ProfileBuckets, prefix = "") {
    mergeBuckets(this.buckets, src, prefix);
  }

  export(): ProfileBuckets {
    return this.buckets;
  }
}

export function logReport(report: ProfileReport) {
  const total = report.totalMs || 1;
  const rows = Object.entries(report.buckets)
    .sort((a, b) => b[1].totalMs - a[1].totalMs)
    .map(([label, b]) => ({
      label,
      "total ms": +b.totalMs.toFixed(1),
      "% of run": +((b.totalMs / total) * 100).toFixed(1),
      count: b.count,
      "avg ms": +(b.totalMs / b.count).toFixed(2),
      "min ms": +b.minMs.toFixed(2),
      "max ms": +b.maxMs.toFixed(2),
    }));

  const mb = (report.fileSizeBytes / (1024 * 1024)).toFixed(1);
  console.groupCollapsed(
    `[profile] ${report.totalMs.toFixed(0)}ms · ${report.messageCount.toLocaleString()} msgs · ${mb}MB · ${report.aiMode ? "AI" : "lexicon"} · ${report.workerCount} workers`,
  );
  console.table(rows);
  console.groupEnd();
}
