
export interface SelfUser {
  id: string;
  username: string;
  avatar_hash: string;
}

export interface UserEntry {
  username: string;
  avatar: string;
}

export type ChannelType =
  | "DM"
  | "GROUP_DM"
  | "GUILD_TEXT"
  | "PUBLIC_THREAD"
  | "GUILD_VOICE";

export interface SentimentStats {
  average: number;
  positive: number;
  negative: number;
  neutral: number;
}

export interface ChannelStats {
  hourly: Record<string, number>;
  monthly: Record<string, number>;
  sentiment: SentimentStats;
  totalGapTime: number;
  numGaps: number;
  totalConversationTime: number;
  longestConversationTime: number;
  messageCount: number;
  averageGapBetweenMessages: number;
  averageConversationTime: number;
  topWords: string[];
  longestStreak: number;
  streakStart: string;
  streakEnd: string;
  recipientName: string;
  firstMessageTimestamp: string;
}

export interface AggregateStats {
  hourly: Record<string, number>;
  monthly: Record<string, number>;
  topWords: string[];
  totalGapTime: number;
  numGaps: number;
  messageCount: number;
  averageGapBetweenMessages: number;
  averageConversationTime: number;
  longestConversationTime: number;
  hourlySentimentTotal: Record<string, number>;
  hourlySentimentAverage: Record<string, number>;
}

export interface ServerMapping {
  channelToServer: Record<string, string>;
  serverNames: Record<string, string>;
}

export interface ActivityStats {
  addReaction: number;
  attachmentsSent: number;
  joinVoice: number;
  startCall: number;
  joinCall: number;
  appOpened: number;
}

export interface ProcessedData {
  self: SelfUser;
  userMapping: Record<string, UserEntry>;
  channelMapping: Record<string, ChannelType>;
  channelNaming: Record<string, string>;
  channelManifest: string[];
  serverMapping: ServerMapping;
  aggregateStats: AggregateStats;
  channelStats: Record<string, ChannelStats>;
  dmManifest: string[];
  activityStats: ActivityStats;
}

export interface GeneratorOptions {
  users?: number;
  channels?: number;
  dms?: number;
  servers?: number;
  seed?: number;
}


function makePrng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rand: () => number = Math.random;

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return rand() * (max - min) + min;
}

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function randChoiceWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randSample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

const DISCORD_EPOCH_MS = new Date("2015-05-13T00:00:00Z").getTime();

const DISCORD_WORDS = [
  "lol", "bro", "ngl", "fr", "based", "cringe", "sus", "gg", "ez",
  "pog", "poggers", "kek", "rip", "f", "w", "l", "ratio", "cope",
  "seethe", "touch", "grass", "vibes", "lowkey", "highkey", "literally",
  "actually", "yeah", "nah", "wait", "bruh", "omg", "wtf", "lmao",
  "lmfao", "irl", "afk", "gtg", "smh", "imo", "tbh", "idk", "nvm",
  "rn", "btw", "fyi", "dm", "ping", "bot", "server", "channel",
  "role", "mod", "admin", "ban", "mute", "kick", "thread", "voice",
];

const FAKE_WORDS = [
  "shadow", "ember", "frost", "storm", "pixel", "nova", "echo", "drift",
  "cipher", "nexus", "quasar", "vector", "pulse", "glitch", "forge", "haven",
  "surge", "phantom", "orbit", "relay", "vertex", "flux", "zenith", "prism",
  "torrent", "static", "hollow", "beacon", "crest", "vortex",
];

const FIRST_NAMES = [
  "alex", "jordan", "morgan", "taylor", "riley", "casey", "skyler", "drew",
  "quinn", "avery", "parker", "reese", "sage", "blake", "charlie", "finley",
];

const LAST_NAMES = [
  "smith", "jones", "brown", "davis", "miller", "wilson", "moore", "taylor",
  "anderson", "thomas", "jackson", "white", "harris", "martin", "garcia",
];

const CHANNEL_PREFIXES = [
  "general", "memes", "off-topic", "gaming", "music", "art",
  "help", "announcements", "bot-commands", "spam", "tech",
  "nsfw", "politics", "science", "food", "pets", "sports",
];

const CHANNEL_SUFFIXES = ["", "-chat", "-lounge", "-hub", "-zone", "-central", "-only"];

const GUILD_TYPES = new Set<ChannelType>(["GUILD_TEXT", "PUBLIC_THREAD", "GUILD_VOICE"]);
const DM_TYPES    = new Set<ChannelType>(["DM", "GROUP_DM"]);

function md5like(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(rand() * 16).toString(16)
  ).join("");
}

function snowflake(): string {
  const nowMs = Date.now();
  const discordMs = Math.max(nowMs - DISCORD_EPOCH_MS - randInt(0, 3 * 365 * 24 * 3600 * 1000), 0);
  const worker    = randInt(0, 31);
  const process   = randInt(0, 31);
  const increment = randInt(0, 4095);
  const id = (BigInt(discordMs) << 22n) | (BigInt(worker) << 17n) | (BigInt(process) << 12n) | BigInt(increment);
  return id.toString();
}

function isoDate(startYearsAgo = 3.0): string {
  const startMs = Date.now() - startYearsAgo * 365 * 24 * 3600 * 1000;
  const ms = startMs + rand() * (Date.now() - startMs);
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

function dateStr(startYearsAgo = 3.0): string {
  const startMs = Date.now() - startYearsAgo * 365 * 24 * 3600 * 1000;
  const ms = startMs + rand() * (Date.now() - startMs);
  return new Date(ms).toISOString().slice(0, 10);
}

function fakeWord(): string {
  return randChoice(FAKE_WORDS);
}

function makeUsername(): string {
  const styles = [
    () => randChoice(FIRST_NAMES) + randInt(100, 9999),
    () => fakeWord() + "_" + fakeWord(),
    () => randChoice(LAST_NAMES) + randInt(10, 999),
    () => randChoice(FIRST_NAMES) + "_" + randChoice(LAST_NAMES),
  ];
  return randChoice(styles)();
}

function makeChannelName(): string {
  return randChoice(CHANNEL_PREFIXES) + randChoice(CHANNEL_SUFFIXES);
}

function makeServerName(): string {
  const templates = [
    () => fakeWord().charAt(0).toUpperCase() + fakeWord().slice(1) + " Community",
    () => fakeWord().charAt(0).toUpperCase() + fakeWord().slice(1) + " Server",
    () => randChoice(FIRST_NAMES) + "'s Discord",
    () =>
      fakeWord().charAt(0).toUpperCase() +
      fakeWord().slice(1) +
      " " +
      fakeWord().charAt(0).toUpperCase() +
      fakeWord().slice(1),
  ];
  return randChoice(templates)();
}

function makeHourly(): Record<string, number> {
  const h: Record<string, number> = {};
  for (let i = 0; i < 24; i++) h[String(i).padStart(2, "0")] = randInt(0, 500);
  return h;
}

function makeMonthly(): Record<string, number> {
  const months: Record<string, number> = {};
  const now = new Date();
  const count = randInt(6, 36);
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getTime() - i * 30 * 24 * 3600 * 1000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    months[key] = randInt(10, 5000);
  }
  return months;
}

function makeTopWords(n = 50): string[] {
  const pool = [...DISCORD_WORDS, ...Array.from({ length: 20 }, fakeWord)];
  return randSample(pool, Math.min(n, pool.length));
}

function makeSentiment(): SentimentStats {
  const total = randInt(100, 50_000);
  const pos   = randInt(0, total);
  const neg   = randInt(0, total - pos);
  const neu   = total - pos - neg;
  return {
    average:  parseFloat(randFloat(-2.0, 2.0).toFixed(4)),
    positive: pos,
    negative: neg,
    neutral:  neu,
  };
}

function makeChannelStats(channelType: ChannelType, recipientName: string): ChannelStats {
  const hourly     = makeHourly();
  const monthly    = makeMonthly();
  const msgCount   = randInt(50, 50_000);
  const numGaps    = randInt(1, 500);
  const totalGap   = numGaps * randInt(1800, 7200);
  const totalConv  = randInt(600, 3600 * 8);
  const streakLen  = randInt(0, 365);
  const streakStart = dateStr(2.0);
  const streakEnd   = dateStr(0.1);

  const firstMessageTimestamp = DM_TYPES.has(channelType)
    ? dateStr(2.5)
    : isoDate(3.0);

  return {
    hourly,
    monthly,
    sentiment: makeSentiment(),
    totalGapTime:             totalGap,
    numGaps,
    totalConversationTime:    totalConv,
    longestConversationTime:  randInt(600, 3600 * 24),
    messageCount:             msgCount,
    averageGapBetweenMessages: parseFloat((totalGap / Math.max(numGaps, 1)).toFixed(2)),
    averageConversationTime:   parseFloat((totalConv / Math.max(numGaps + 1, 1)).toFixed(2)),
    topWords:    makeTopWords(50),
    longestStreak: streakLen,
    streakStart,
    streakEnd,
    recipientName,
    firstMessageTimestamp,
  };
}

function makeAggregateStats(channelStatsMap: Record<string, ChannelStats>): AggregateStats {
  const hourly   = makeHourly();
  const monthly  = makeMonthly();
  const totalMsgs = Object.values(channelStatsMap).reduce((s, v) => s + v.messageCount, 0);
  const numGaps   = randInt(100, 5000);
  const totalGap  = numGaps * randInt(1800, 7200);

  const hourlySentimentTotal: Record<string, number> = {};
  const hourlySentimentAverage: Record<string, number> = {};
  for (const [h, count] of Object.entries(hourly)) {
    const t = parseFloat(randFloat(-count, count).toFixed(2));
    hourlySentimentTotal[h]   = t;
    hourlySentimentAverage[h] = count > 0 ? parseFloat((t / count).toFixed(4)) : 0;
  }

  return {
    hourly,
    monthly,
    topWords: makeTopWords(50),
    totalGapTime: totalGap,
    numGaps,
    messageCount: totalMsgs || randInt(10_000, 500_000),
    averageGapBetweenMessages: parseFloat((totalGap / Math.max(numGaps, 1)).toFixed(2)),
    averageConversationTime:   parseFloat(randFloat(300, 7200).toFixed(2)),
    longestConversationTime:   randInt(3600, 3600 * 48),
    hourlySentimentTotal,
    hourlySentimentAverage,
  };
}
export function generateMockDiscordData(options: GeneratorOptions = {}): ProcessedData {
  const {
    users    = 300,
    channels = 40,
    dms      = 80,
    servers  = 10,
    seed,
  } = options;

  rand = seed !== undefined ? makePrng(seed) : Math.random;

  const allUserIds   = Array.from({ length: users },    snowflake);
  const guildChanIds = Array.from({ length: channels }, snowflake);
  const dmChanIds    = Array.from({ length: dms },      snowflake);
  const allChanIds   = [...guildChanIds, ...dmChanIds];

  const selfObj: SelfUser = {
    id:          snowflake(),
    username:    makeUsername(),
    avatar_hash: md5like(),
  };

  const channelMapping: Record<string, ChannelType> = {};
  for (const cid of guildChanIds) {
    channelMapping[cid] = randChoiceWeighted(
      ["GUILD_TEXT", "PUBLIC_THREAD", "GUILD_VOICE"] as ChannelType[],
      [70, 20, 10],
    );
  }
  for (const cid of dmChanIds) {
    channelMapping[cid] = randChoiceWeighted(
      ["DM", "GROUP_DM"] as ChannelType[],
      [85, 15],
    );
  }

  const channelNaming: Record<string, string> = {};
  for (const cid of allChanIds) {
    if (GUILD_TYPES.has(channelMapping[cid])) channelNaming[cid] = makeChannelName();
  }

  const userMapping: Record<string, UserEntry> = {};
  for (const uid of allUserIds) {
    userMapping[uid] = { username: makeUsername(), avatar: md5like() };
  }

  const serverIds = Array.from({ length: servers }, snowflake);
  const serverNames: Record<string, string> = {};
  for (const sid of serverIds) serverNames[sid] = makeServerName();

  const channelToServer: Record<string, string> = {};
  for (const cid of allChanIds) {
    if (GUILD_TYPES.has(channelMapping[cid])) channelToServer[cid] = randChoice(serverIds);
  }
  const serverMapping: ServerMapping = { channelToServer, serverNames };

  const channelStats: Record<string, ChannelStats> = {};
  const channelManifest: string[] = [];
  const dmManifest: string[]      = [];

  for (const cid of allChanIds) {
    const t = channelMapping[cid];

    if (t === "DM") {
      const uid   = randChoice(allUserIds);
      const rname = userMapping[uid]?.username ?? makeUsername();
      const key   = `dm_${cid}`;
      channelStats[key] = makeChannelStats("DM", rname);
      dmManifest.push(`${key}.json`);

    } else if (t === "GROUP_DM") {
      const key = `dm_${cid}`;
      channelStats[key] = makeChannelStats("GROUP_DM", `Group DM (${cid})`);
      dmManifest.push(`${key}.json`);

    } else {
      const rname = channelNaming[cid] ?? `Unnamed Channel (${cid})`;
      const key   = `channel_${cid}`;
      channelStats[key] = makeChannelStats(t, rname);
      channelManifest.push(`${key}.json`);
    }
  }

  return {
    self:            selfObj,
    userMapping,
    channelMapping,
    channelNaming,
    channelManifest,
    serverMapping,
    aggregateStats:  makeAggregateStats(channelStats),
    channelStats,
    dmManifest,
    activityStats: {
      addReaction:     randInt(0, 50_000),
      attachmentsSent: randInt(0, 10_000),
      joinVoice:       randInt(0, 5_000),
      startCall:       randInt(0, 2_000),
      joinCall:        randInt(0, 3_000),
      appOpened:       randInt(500, 100_000),
    },
  };
}