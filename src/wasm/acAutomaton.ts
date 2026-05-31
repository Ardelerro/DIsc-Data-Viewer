import type { ActivityStats } from "../types/discord";

export type ActivityKey = keyof ActivityStats;

export const ACTIVITY_PATTERN_DEFS: ReadonlyArray<{
  key: ActivityKey;
  pattern: string;
}> = [
  { key: "addReaction", pattern: "add_reaction" },
  { key: "attachmentsSent", pattern: "message_sent_with_attachments" },
  { key: "joinVoice", pattern: "join_voice_channel" },
  { key: "startCall", pattern: "start_call" },
  { key: "joinCall", pattern: "join_call" },
  { key: "appOpened", pattern: "app_opened" },
];

export const ACTIVITY_PATTERNS: readonly string[] = ACTIVITY_PATTERN_DEFS.map(
  (d) => d.pattern,
);

export interface AcTable {
  next: Int32Array;

  match: Int32Array;
  numStates: number;
}

export function buildAcTable(patterns: readonly string[]): AcTable {
  const goto: Int32Array[] = [new Int32Array(256).fill(-1)];
  const match: number[] = [-1];

  for (let pi = 0; pi < patterns.length; pi++) {
    const pat = patterns[pi];
    let s = 0;
    for (let i = 0; i < pat.length; i++) {
      const c = pat.charCodeAt(i);
      if (c > 0xff) throw new Error(`non-ASCII byte in pattern: ${pat}`);
      if (goto[s][c] === -1) {
        goto[s][c] = goto.length;
        goto.push(new Int32Array(256).fill(-1));
        match.push(-1);
      }
      s = goto[s][c];
    }

    if (match[s] !== -1) {
      throw new Error(`duplicate / colliding pattern terminal: ${pat}`);
    }
    match[s] = pi;
  }

  const numStates = goto.length;
  const fail = new Int32Array(numStates);
  const next = new Int32Array(numStates * 256);

  const queue: number[] = [];
  const root0 = goto[0];
  for (let c = 0; c < 256; c++) {
    const t = root0[c];
    if (t === -1) {
      next[c] = 0;
    } else {
      fail[t] = 0;
      next[c] = t;
      queue.push(t);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const s = queue[head];

    if (match[s] === -1 && match[fail[s]] !== -1) match[s] = match[fail[s]];
    const gs = goto[s];
    const fs = fail[s] * 256;
    for (let c = 0; c < 256; c++) {
      const t = gs[c];
      if (t === -1) {
        next[s * 256 + c] = next[fs + c];
      } else {
        fail[t] = next[fs + c];
        next[s * 256 + c] = t;
        queue.push(t);
      }
    }
  }

  return { next, match: Int32Array.from(match), numStates };
}
