
export interface SentimentResult {
  compound: number;
  pos: number;
  neg: number;
  neu: number;
  words: string[];
}

const NEGATION_DAMPING = 0.74;
const ALL_CAPS_BOOST = 0.733;
const EXCLAMATION_PER = 0.292;
const QUESTION_PER = 0.18;
const MAX_PUNC = 4;
const NEG_WINDOW = 3;
const COMPOUND_ALPHA = 15;
const BUT_PRIOR_WEIGHT = 0.5;
const BUT_LATER_WEIGHT = 1.5;

const EMOJI_DAMP = 0.55;
const EMOJI_DIMINISH = 0.7;

const NEGATORS: ReadonlySet<string> = new Set([
  "not", "no", "never", "none", "nobody", "nothing", "neither", "nor",
  "cant", "cannot", "wont", "wouldnt", "shouldnt", "couldnt", "doesnt",
  "dont", "didnt", "isnt", "wasnt", "arent", "werent", "hasnt", "havent",
  "hadnt", "aint", "without", "lacks", "lacking",
]);

const INTENSIFIERS: Readonly<Record<string, number>> = {
  absolutely: 0.293, amazingly: 0.293, completely: 0.293, considerably: 0.293,
  decidedly: 0.293, deeply: 0.293, effing: 0.293, enormously: 0.293,
  entirely: 0.293, especially: 0.293, exceptionally: 0.293, extremely: 0.5,
  fabulously: 0.293, flippin: 0.293, flipping: 0.293, frickin: 0.293,
  fricking: 0.293, fucking: 0.5, fully: 0.293, greatly: 0.293,
  hella: 0.293, highly: 0.293, hugely: 0.293, incredibly: 0.5,
  intensely: 0.293, majorly: 0.293, mighty: 0.293, more: 0.18,
  most: 0.18, particularly: 0.293, purely: 0.293, quite: 0.18,
  really: 0.293, remarkably: 0.293, so: 0.18, substantially: 0.293,
  super: 0.293, thoroughly: 0.293, totally: 0.293, tremendously: 0.293,
  uber: 0.293, unbelievably: 0.5, unusually: 0.293, utterly: 0.293,
  very: 0.293, mega: 0.293, ultra: 0.293,
  almost: -0.18, barely: -0.293, hardly: -0.293, kinda: -0.18,
  less: -0.18, marginally: -0.18, occasionally: -0.18, partly: -0.18,
  scarcely: -0.293, slightly: -0.293, somewhat: -0.18, sorta: -0.18,
};

const EMOTICONS: Readonly<Record<string, number>> = {
  ":)": 2.0, ":-)": 2.0, ":]": 1.5, "(:": 2.0, "(-:": 2.0,
  ":D": 2.5, ":-D": 2.5, "xD": 2.0, "XD": 2.0, "xd": 1.6,
  ":P": 1.2, ":-P": 1.2, ":p": 1.2, ":-p": 1.2,
  ";)": 1.5, ";-)": 1.5, ";D": 1.8, ";P": 1.5,
  "<3": 2.5, "</3": -2.5, "<33": 2.8,
  ":(": -2.0, ":-(": -2.0, ":[": -1.5, "):": -2.0,
  ":'(": -2.5, ":'-(": -2.5, ":'D": 1.5,
  ":/": -1.0, ":-/": -1.0, ":\\": -1.0, ":|": -0.5, ":-|": -0.5,
  ">:(": -2.5, ">:-(": -2.5, ">:)": 0.5, ">:D": 1.0,
  "T_T": -2.0, "T.T": -2.0, ";_;": -2.0, "._.": -1.0,
  "o_O": -0.3, "O_o": -0.3, "o_o": -0.3,
  ":3": 1.5, ":>": 1.0, ":<": -1.0,
  "uwu": 1.5, "UwU": 1.8, "owo": 1.0, "OwO": 1.2,
  ">_<": -0.8, "^_^": 2.0, "^^": 1.5, ">.<": -0.8,
};

const EMOJI: Readonly<Record<string, number>> = {
  "😀": 2.0, "😁": 2.5, "😂": 2.8, "🤣": 2.8, "😃": 2.0, "😄": 2.5,
  "😅": 0.8, "😆": 2.5, "😉": 1.5, "😊": 2.5, "😋": 2.0, "😎": 2.0,
  "😍": 3.0, "🥰": 3.0, "😘": 2.5, "🥳": 2.5, "🤗": 2.0, "🤩": 2.5,
  "🙂": 1.5, "🙃": 0.3, "😇": 1.5, "😏": 0.8,
  "💖": 2.5, "❤": 2.5, "❤️": 2.5, "💕": 2.5, "💗": 2.5, "💞": 2.5,
  "💛": 2.0, "💚": 2.0, "💙": 2.0, "💜": 2.0, "🧡": 2.0, "🤍": 1.5,
  "🖤": 0.3, "💯": 2.5, "🔥": 2.0, "✨": 1.5, "🎉": 2.5, "🎊": 2.2,
  "👍": 2.0, "👌": 1.5, "🙌": 2.0, "💪": 1.5, "🥇": 2.0, "🏆": 2.2,
  "👏": 1.8, "🤝": 1.2, "💐": 1.8, "🌹": 1.8, "🌟": 1.8, "⭐": 1.5,
  "😢": -2.5, "😭": -2.5, "😞": -2.0, "😔": -2.0, "😟": -1.5, "😕": -1.0,
  "🙁": -1.5, "☹": -1.5, "☹️": -1.5, "😣": -2.0, "😖": -2.0,
  "😩": -2.0, "😫": -2.5, "😤": -1.5, "😠": -2.5, "😡": -3.0, "🤬": -3.5,
  "🤢": -2.0, "🤮": -2.5, "💔": -2.5, "👎": -2.0, "💀": -0.8, "☠": -1.5,
  "☠️": -1.5, "😬": -1.0, "🥺": -0.3, "😒": -1.5, "😑": -1.0, "😐": -0.3,
  "😶": -0.2, "🤷": -0.3, "🤔": -0.2, "😨": -1.8, "😱": -1.5, "🥶": -1.5,
  "😴": -0.5, "🤧": -0.8, "🤒": -1.5, "🤕": -1.5, "😪": -1.0,
};

const LEXICON: Readonly<Record<string, number>> = {
  lol: 1.4, lmao: 2.0, lmfao: 2.2, rofl: 2.0, haha: 1.6, hehe: 1.4,
  hahaha: 1.8, hehehe: 1.5, kek: 1.0, lulz: 1.2, lel: 1.0,
  pog: 2.5, poggers: 2.8, pogchamp: 2.8, based: 1.6, goated: 3.0,
  gg: 1.5, ez: 1.0, ezpz: 1.2, w: 1.8, dub: 1.5, dubs: 1.5,
  fire: 2.2, lit: 2.0, slaps: 2.0, dope: 2.0, banger: 2.2,
  vibes: 1.5, vibing: 1.8, vibe: 1.4, gucci: 1.8, clean: 1.0,
  hype: 2.0, hyped: 2.2, peak: 2.0, cracked: 2.0, bussin: 2.5,
  legend: 2.5, legendary: 2.8, king: 1.8, queen: 1.8, chad: 1.8,
  yas: 1.5, yass: 1.6, yasss: 1.8, woo: 1.8, woohoo: 2.2, yeet: 0.8,
  wholesome: 2.0, blessed: 2.0, neat: 1.5, sick: 1.8,

  cringe: -2.2, cringey: -2.0, cringy: -2.0, sus: -1.4, sussy: -1.4,
  cope: -1.8, copium: -1.5, seethe: -2.0, ratio: -1.5, ratiod: -1.8,
  l: -1.8, rip: -0.8, smh: -1.6, mid: -1.6, trash: -2.5,
  garbage: -2.5, yikes: -1.8, oof: -1.2, bruh: -0.5,
  sucks: -2.5, suck: -2.0, sucky: -2.0, lame: -2.0, ugh: -1.5,
  meh: -0.8, eh: -0.4, nah: -0.5, nope: -0.8, npc: -1.0,
  bait: -1.0, brainrot: -1.5, malding: -2.0, salty: -1.5,
  toxic: -2.5, cancelled: -2.0, cursed: -1.5,

  love: 3.0, loved: 2.8, loving: 2.8, lovely: 2.5, adore: 3.0, adored: 3.0,
  amazing: 3.5, awesome: 3.5, brilliant: 3.0, excellent: 3.0,
  fantastic: 3.5, wonderful: 3.5, perfect: 3.0, best: 2.7, beautiful: 3.0,
  great: 2.5, good: 2.0, nice: 2.0, cool: 2.0, sweet: 2.0, fab: 2.5,
  happy: 2.5, glad: 2.0, joy: 2.5, joyful: 2.8, cheerful: 2.5,
  excited: 2.5, thrilled: 3.0, ecstatic: 3.5, delighted: 3.0,
  proud: 2.5, grateful: 2.5, thankful: 2.5, thanks: 2.0, thank: 2.0,
  ty: 1.5, tysm: 2.0, tyvm: 2.0, appreciate: 2.0, appreciated: 2.0,
  congrats: 2.5, congratulations: 2.5, gratz: 2.2,
  yay: 2.5, hooray: 2.5, win: 2.0, winner: 2.0, winning: 2.0,
  fun: 2.5, funny: 2.0, hilarious: 3.0, laughing: 2.0,
  enjoy: 2.0, enjoyed: 2.0, enjoying: 2.0, fav: 2.0, favorite: 2.0,
  favourite: 2.0, smart: 2.0, clever: 2.0, genius: 2.5, talented: 2.5,
  skilled: 2.0, helpful: 2.0, kind: 1.8, kindness: 2.0, friendly: 2.0,
  please: 0.6, pls: 0.4, plz: 0.4, welcome: 1.5,
  agree: 1.5, agreed: 1.5, correct: 1.5, true: 0.8,
  hope: 1.2, hopeful: 2.0, optimistic: 2.5, peaceful: 2.0,
  comfort: 1.8, comfortable: 1.8, cozy: 2.0, safe: 1.0,
  ok: 0.4, okay: 0.4, alright: 0.6, fine: 0.5, decent: 1.0,
  yeah: 0.3, yep: 0.3, yup: 0.3, yes: 1.0,
  wow: 1.5, woah: 1.0, whoa: 1.0, omg: 0.4, omgg: 0.5,

  hate: -3.0, hated: -2.8, hating: -2.8, despise: -3.5, despised: -3.5,
  awful: -3.0, terrible: -3.0, horrible: -3.5, horrendous: -3.5,
  worst: -3.0, bad: -2.0, poor: -1.2, ugly: -2.0,
  dumb: -2.0, stupid: -2.5, idiot: -2.5, idiotic: -2.5,
  moron: -2.5, moronic: -2.5, foolish: -2.0, ignorant: -2.0,
  angry: -2.5, mad: -2.0, furious: -3.0, pissed: -2.5, annoyed: -2.0,
  annoying: -2.0, irritating: -2.0, frustrated: -2.5, frustrating: -2.5,
  upset: -2.0, depressed: -3.0, depressing: -2.5, miserable: -2.8,
  cry: -1.8, crying: -2.0, tears: -1.2, sob: -2.0, sobbing: -2.2,
  hurt: -2.0, hurting: -2.0, pain: -2.0, painful: -2.2,
  suffer: -2.5, suffering: -2.5, sad: -2.0, sadness: -2.2, lonely: -2.2,
  sorry: -0.6, regret: -1.8, mistake: -1.5,
  fail: -2.0, failed: -2.0, failure: -2.5,
  lose: -1.2, lost: -1.2, losing: -1.2, loser: -2.5,
  scared: -2.0, afraid: -2.0, fear: -2.0, fearful: -2.0, terrified: -3.0,
  worried: -2.0, worry: -1.8, anxious: -2.0, anxiety: -2.0, nervous: -1.5,
  bored: -1.5, boring: -1.8, tired: -1.2, exhausted: -2.0, drained: -1.8,
  ill: -1.2, dying: -1.2, dead: -1.0, kill: -1.5, killed: -1.5,
  broken: -1.8, broke: -0.8, ruined: -2.5, destroyed: -2.5,
  wrong: -1.5, fake: -1.5, lying: -2.0, lied: -2.0, liar: -2.5,
  scam: -2.5, scammed: -2.5, fraud: -2.5,
  disgusting: -3.0, gross: -2.0, nasty: -2.5, vile: -3.0,
  refuse: -1.0, reject: -1.0, rejected: -1.5, denied: -1.0,
  problem: -0.8, issue: -0.6, bug: -0.8, crash: -1.2, crashed: -1.2,
  miss: -0.8, missed: -0.8, missing: -0.8,

  fuck: -2.2, fucked: -2.2, fucks: -1.8, fk: -1.4, fck: -1.6,
  shit: -1.8, shitty: -2.4, shite: -2.0, crap: -1.4, crappy: -2.0,
  damn: -1.0, hell: -0.8, bitch: -2.5, bastard: -2.5,
  wtf: -1.2, omfg: -0.8, ffs: -2.0, stfu: -2.5, gtfo: -2.5,
  fml: -2.5, kys: -3.5,
};

interface MessageMeta {
  exclaim: number;
  question: number;
  mixedCase: boolean;
  hasNonAscii: boolean;
}

const NOISE_RE =
  /```[\s\S]*?```|`[^`]*`|<a?:\w+:\d+>|<@!?\d+>|<@&\d+>|<#\d+>|https?:\/\/\S+|\|\|/g;

function scanMeta(text: string): MessageMeta {
  let exclaim = 0;
  let question = 0;
  let hasUpper = false;
  let hasLower = false;
  let hasNonAscii = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 33) exclaim++;
    else if (c === 63) question++;
    else if (c >= 65 && c <= 90) hasUpper = true;
    else if (c >= 97 && c <= 122) hasLower = true;
    else if (c > 127) hasNonAscii = true;
  }
  return {
    exclaim: exclaim > MAX_PUNC ? MAX_PUNC : exclaim,
    question: question > MAX_PUNC ? MAX_PUNC : question,
    mixedCase: hasUpper && hasLower,
    hasNonAscii,
  };
}

function extractEmojiValence(text: string): number {
  let sum = 0;
  let n = 0;
  for (const ch of text) {
    const v = EMOJI[ch];
    if (v !== undefined) {
      sum += v * EMOJI_DAMP * Math.pow(EMOJI_DIMINISH, n);
      n++;
    }
  }
  return sum;
}

function isAllCapsToken(t: string): boolean {
  let hasLetter = false;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (c >= 97 && c <= 122) return false;
    if (c >= 65 && c <= 90) hasLetter = true;
  }
  return hasLetter;
}

function tokenize(cleaned: string): { tokens: string[]; words: string[] } {
  const tokens: string[] = [];
  const words: string[] = [];
  const parts = cleaned.split(/\s+/);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (EMOTICONS[part] !== undefined) {
      tokens.push(part);
      continue;
    }
    const stripped = part.replace(/^[.,]+/, "").replace(/[.,!?]+$/, "");
    if (stripped && EMOTICONS[stripped] !== undefined) {
      tokens.push(stripped);
      continue;
    }
    const word = stripped.replace(/[^A-Za-z0-9]+/g, "");
    if (word) {
      tokens.push(word);
      words.push(word.toLowerCase());
    }
  }
  return { tokens, words };
}

export function analyzeText(text: string): SentimentResult {
  if (!text || typeof text !== "string") {
    return { compound: 0, pos: 0, neg: 0, neu: 1, words: [] };
  }

  const meta = scanMeta(text);
  const emojiValence = meta.hasNonAscii ? extractEmojiValence(text) : 0;
  const cleaned = text.replace(NOISE_RE, " ");
  const { tokens, words } = tokenize(cleaned);

  if (tokens.length === 0 && emojiValence === 0) {
    return { compound: 0, pos: 0, neg: 0, neu: 1, words };
  }

  const valences = new Array<number>(tokens.length).fill(0);

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    let v = EMOTICONS[tok];
    if (v === undefined) v = LEXICON[tok.toLowerCase()] ?? 0;
    if (v === 0) continue;

    if (meta.mixedCase && isAllCapsToken(tok)) {
      v += v > 0 ? ALL_CAPS_BOOST : -ALL_CAPS_BOOST;
    }

    for (let j = 1; j <= NEG_WINDOW && i - j >= 0; j++) {
      const prev = tokens[i - j].toLowerCase();
      if (NEGATORS.has(prev)) {
        v *= -NEGATION_DAMPING;
        break;
      }
      const intensity = INTENSIFIERS[prev];
      if (intensity !== undefined) {
        const decay = j === 1 ? 1 : j === 2 ? 0.95 : 0.9;
        v += Math.abs(v) * intensity * decay * (v >= 0 ? 1 : -1);
      }
    }

    valences[i] = v;
  }

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].toLowerCase() === "but") {
      for (let k = 0; k < i; k++) valences[k] *= BUT_PRIOR_WEIGHT;
      for (let k = i + 1; k < valences.length; k++) valences[k] *= BUT_LATER_WEIGHT;
      break;
    }
  }

  let sumValence = emojiValence;
  for (let i = 0; i < valences.length; i++) sumValence += valences[i];

  const puncBoost = meta.exclaim * EXCLAMATION_PER + meta.question * QUESTION_PER;
  if (sumValence > 0) sumValence += puncBoost;
  else if (sumValence < 0) sumValence -= puncBoost;

  const compound = sumValence / Math.sqrt(sumValence * sumValence + COMPOUND_ALPHA);

  let posSum = 0;
  let negSum = 0;
  let neuCount = 0;
  for (let i = 0; i < valences.length; i++) {
    const v = valences[i];
    if (v > 0) posSum += v + 1;
    else if (v < 0) negSum += -v + 1;
    else neuCount += 1;
  }
  if (emojiValence > 0) posSum += emojiValence + 1;
  else if (emojiValence < 0) negSum += -emojiValence + 1;
  if (sumValence > 0) posSum += puncBoost;
  else if (sumValence < 0) negSum += puncBoost;

  const total = posSum + negSum + neuCount;
  if (total === 0) return { compound: 0, pos: 0, neg: 0, neu: 1, words };

  return {
    compound: compound > 1 ? 1 : compound < -1 ? -1 : compound,
    pos: posSum / total,
    neg: negSum / total,
    neu: neuCount / total,
    words,
  };
}
