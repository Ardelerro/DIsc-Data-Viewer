
export function createObjectStreamParser(onObject: (objText: string) => void) {
  let inObject = false;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let pending = ""; 

  function feed(text: string): void {
    const n = text.length;
    let i = 0;
    let objStart = inObject ? 0 : -1;

    while (i < n) {
      if (!inObject) {
        const open = text.indexOf("{", i);
        if (open === -1) return;
        inObject = true;
        depth = 1;
        inString = false;
        escaped = false;
        objStart = open;
        i = open + 1;
      }

      let closed = false;
      for (; i < n; i++) {
        const c = text.charCodeAt(i);
        if (inString) {
          if (escaped) escaped = false;
          else if (c === 92) escaped = true;
          else if (c === 34) inString = false;
          continue;
        }
        if (c === 34) {
          inString = true;
          continue;
        }
        if (c === 123) {
          depth++; // {
        } else if (c === 125) {
          depth--; // }
          if (depth === 0) {
            onObject(pending + text.slice(objStart, i + 1));
            pending = "";
            inObject = false;
            i++;
            closed = true;
            break;
          }
        }
      }

      if (!closed && inObject) {
        pending += text.slice(objStart);
        return;
      }
    }
  }

  return { feed };
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
      raw.charCodeAt(4) === 45 && // -
      raw.charCodeAt(7) === 45 && // -
      (sep === 32 || sep === 84) && // space or T
      raw.charCodeAt(13) === 58 && // :
      raw.charCodeAt(16) === 58 // :
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
  // Fallback: let the engine handle anything non-standard.
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
