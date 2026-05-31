const STOP_WORDS = new Set([
  "i",
  "you",
  "me",
  "he",
  "she",
  "it",
  "we",
  "they",
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "to",
  "of",
  "in",
  "on",
  "for",
  "is",
  "am",
  "are",
  "was",
  "were",
  "be",
  "been",
  "this",
  "that",
  "these",
  "those",
  "my",
  "your",
  "his",
  "her",
  "their",
  "our",
  "at",
  "by",
  "with",
  "about",
  "as",
  "then",
  "do",
  "does",
  "did",
  "doing",
  "so",
  "than",
  "too",
  "very",
  "can",
  "will",
  "just",
  "dont",
  "didnt",
  "im",
  "ive",
  "youre",
  "hes",
  "shes",
  "theyre",
  "i've",
  "you're",
  "he's",
  "she's",
  "they're",
]);

function getTopWords(freqMap: Record<string, number>, n: number): string[] {
  if (n <= 0) return [];

  const word: string[] = [];
  const count: number[] = [];
  const idx: number[] = [];

  const worse = (i: number, j: number) =>
    count[i] < count[j] || (count[i] === count[j] && idx[i] > idx[j]);

  const swap = (i: number, j: number) => {
    const w = word[i];
    word[i] = word[j];
    word[j] = w;
    const c = count[i];
    count[i] = count[j];
    count[j] = c;
    const x = idx[i];
    idx[i] = idx[j];
    idx[j] = x;
  };

  const up = (i: number) => {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!worse(i, p)) break;
      swap(i, p);
      i = p;
    }
  };

  const down = (size: number) => {
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < size && worse(l, m)) m = l;
      if (r < size && worse(r, m)) m = r;
      if (m === i) break;
      swap(i, m);
      i = m;
    }
  };

  let it = 0;
  for (const w in freqMap) {
    const c = freqMap[w];
    const i = it++;
    if (word.length < n) {
      word.push(w);
      count.push(c);
      idx.push(i);
      up(word.length - 1);
    } else if (c > count[0] || (c === count[0] && i < idx[0])) {
      word[0] = w;
      count[0] = c;
      idx[0] = i;
      down(word.length);
    }
  }

  const order = word.map((_, k) => k);
  order.sort((a, b) => count[b] - count[a] || idx[a] - idx[b]);
  return order.map((k) => word[k]);
}

export { STOP_WORDS, getTopWords };
