export type SentimentClass = "positive" | "negative" | "neutral";

export const POS_THRESHOLD = 0.05;
export const NEG_THRESHOLD = -0.05;

export function classifyCompound(c: number): SentimentClass {
  if (c >= POS_THRESHOLD) return "positive";
  if (c <= NEG_THRESHOLD) return "negative";
  return "neutral";
}

export function compoundToScore(c: number): number {
  return c * 100;
}

const LEN_WEIGHT_MIN = 0.6;
const LEN_WEIGHT_MAX = 2.2;

export function lengthWeight(wordCount: number): number {
  const w = 0.45 + 0.32 * Math.log1p(wordCount > 0 ? wordCount : 0);
  return w < LEN_WEIGHT_MIN
    ? LEN_WEIGHT_MIN
    : w > LEN_WEIGHT_MAX
      ? LEN_WEIGHT_MAX
      : w;
}
