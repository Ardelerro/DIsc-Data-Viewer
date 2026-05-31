import { SCANNER_WASM_BASE64 } from "./scannerWasm";
import {
  ACTIVITY_PATTERN_DEFS,
  ACTIVITY_PATTERNS,
  buildAcTable,
  type ActivityKey,
} from "./acAutomaton";

interface ScannerExports {
  memory: WebAssembly.Memory;
  alloc(size: number): number;
  configure(nPtr: number, mPtr: number, cPtr: number, nCount: number): void;
  reset(): void;
  scan(ptr: number, len: number): void;
}

const SCRATCH = 1 << 20;

const COUNTER_KEYS: readonly ActivityKey[] = ACTIVITY_PATTERN_DEFS.map(
  (d) => d.key,
);

export class ByteScanner {
  private readonly ex: ScannerExports;
  private readonly counters: Int32Array;
  private readonly scratch: Uint8Array;
  private readonly scratchPtr: number;

  private constructor(
    ex: ScannerExports,
    countersPtr: number,
    scratchPtr: number,
    numCounters: number,
  ) {
    this.ex = ex;
    this.scratchPtr = scratchPtr;

    this.counters = new Int32Array(ex.memory.buffer, countersPtr, numCounters);
    this.scratch = new Uint8Array(ex.memory.buffer, scratchPtr, SCRATCH);
  }

  static async create(): Promise<ByteScanner | null> {
    if (typeof WebAssembly === "undefined") return null;
    try {
      const bytes = base64ToBytes(SCANNER_WASM_BASE64);
      const { instance } = await WebAssembly.instantiate(bytes, {});
      const ex = instance.exports as unknown as ScannerExports;

      const { next, match } = buildAcTable(ACTIVITY_PATTERNS);
      const n = ACTIVITY_PATTERN_DEFS.length;

      const nextPtr = ex.alloc(next.length * 4);
      const matchPtr = ex.alloc(match.length * 4);
      const countPtr = ex.alloc(n * 4);
      const scratchPtr = ex.alloc(SCRATCH);

      const buf = ex.memory.buffer;
      new Int32Array(buf, nextPtr, next.length).set(next);
      new Int32Array(buf, matchPtr, match.length).set(match);
      ex.configure(nextPtr, matchPtr, countPtr, n);

      return new ByteScanner(ex, countPtr, scratchPtr, n);
    } catch (err) {
      console.warn("WASM byte scanner unavailable; using regex fallback", err);
      return null;
    }
  }

  reset(): void {
    this.ex.reset();
  }

  scan(chunk: Uint8Array): void {
    const len = chunk.length;
    let off = 0;
    while (off < len) {
      const n = Math.min(SCRATCH, len - off);
      this.scratch.set(chunk.subarray(off, off + n), 0);
      this.ex.scan(this.scratchPtr, n);
      off += n;
    }
  }

  readInto(target: Record<ActivityKey, number>): void {
    for (let i = 0; i < COUNTER_KEYS.length; i++) {
      target[COUNTER_KEYS[i]] = this.counters[i];
    }
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const len = bin.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
  return out;
}
