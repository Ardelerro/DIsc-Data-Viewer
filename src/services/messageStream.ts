import { JSONParser } from "@streamparser/json";

export function createStreamParser(
  onObject: (obj: Record<string, unknown>) => void,
): { feed(chunk: Uint8Array): void } {
  const parser = new JSONParser({ paths: ["$.*"], keepStack: false });

  parser.onValue = ({ value }) => {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      onObject(value as Record<string, unknown>);
    }
  };

  parser.onError = (err) => {
    throw err;
  };

  return {
    feed(chunk: Uint8Array): void {
      parser.write(chunk);
    },
  };
}

export interface ParsedTs {
  ts: number;
  hour: string;
  month: string;
  date: string;
}

const d2 = (n: number) => (n < 10 ? "0" + n : "" + n);

export function parseTimestamp(raw: string): ParsedTs | null {
  if (raw.length >= 19) {
    const sep = raw.charCodeAt(10);
    if (
      raw.charCodeAt(4) === 45 &&
      raw.charCodeAt(7) === 45 &&
      (sep === 32 || sep === 84) &&
      raw.charCodeAt(13) === 58 &&
      raw.charCodeAt(16) === 58
    ) {
      const y = +raw.slice(0, 4);
      const mo = +raw.slice(5, 7);
      const d = +raw.slice(8, 10);
      const h = +raw.slice(11, 13);
      const mi = +raw.slice(14, 16);
      const s = +raw.slice(17, 19);
      if (
        !Number.isNaN(y) &&
        !Number.isNaN(mo) &&
        !Number.isNaN(d) &&
        !Number.isNaN(h) &&
        !Number.isNaN(mi) &&
        !Number.isNaN(s)
      ) {
        const month = `${y}-${d2(mo)}`;
        return {
          ts: Date.UTC(y, mo - 1, d, h, mi, s),
          hour: d2(h),
          month,
          date: `${month}-${d2(d)}`,
        };
      }
    }
  }

  const dt = new Date(String(raw).replace(" ", "T"));
  const t = dt.getTime();
  if (Number.isNaN(t)) return null;
  const y = dt.getFullYear();
  const month = `${y}-${d2(dt.getMonth() + 1)}`;
  return {
    ts: t,
    hour: d2(dt.getHours()),
    month,
    date: `${month}-${d2(dt.getDate())}`,
  };
}
