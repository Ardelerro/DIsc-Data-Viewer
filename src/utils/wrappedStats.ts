import type { ProcessedData } from "../types/discord";
import type { Personality } from "../types/types";
import { computePersonality } from "../achievements/computePersonality";
import { calculateStreak } from "./streakUtils";

export interface WrappedTopPerson {
  name: string;
  count: number;
}

export interface WrappedSentiment {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  /** Share of analysed messages that are positive, 0–100. */
  positivityPct: number;
  moodLabel: string;
}

export interface WrappedStats {
  self: { id: string; username: string; avatarHash?: string };
  yearRange: string;
  totalMessages: number;
  /** Distinct calendar days with at least one message. */
  activeDays: number;
  /** Calendar span (first → last active day), in days. */
  daySpan: number;
  dailyAverage: number;
  peakHour: { label: string; count: number };
  /** 24 message counts, index = hour 0–23. */
  hourly: number[];
  busiestWeekday: string;
  topPeople: WrappedTopPerson[];
  topWords: string[];
  streak: { length: number; start: string | null; end: string | null };
  sentiment: WrappedSentiment | null;
  activity: {
    reactions: number;
    voice: number;
    calls: number;
    attachments: number;
  };
  topServer: { name: string; count: number } | null;
  biggestMonth: { label: string; count: number } | null;
  personality: Personality;
}

const GUILD_TYPES = ["GUILD_TEXT", "PUBLIC_THREAD", "GUILD_VOICE"];
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function sumValues(rec: Record<string, number> = {}): number {
  let total = 0;
  for (const k in rec) total += rec[k] ?? 0;
  return total;
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${ampm}`;
}

function peakHour(hourly: Record<string, number> = {}): {
  label: string;
  count: number;
} {
  let bestHour = -1;
  let bestCount = -1;
  for (const [h, c] of Object.entries(hourly)) {
    if ((c ?? 0) > bestCount) {
      bestCount = c ?? 0;
      bestHour = parseInt(h, 10);
    }
  }
  if (bestHour < 0) return { label: "—", count: 0 };
  return { label: formatHour(bestHour), count: bestCount };
}

function hourlyArray(hourly: Record<string, number> = {}): number[] {
  const arr = new Array(24).fill(0);
  for (const [h, c] of Object.entries(hourly)) {
    const idx = parseInt(h, 10);
    if (idx >= 0 && idx < 24) arr[idx] = c ?? 0;
  }
  return arr;
}

/** Parse a "YYYY-MM-DD" key into a local Date (avoids UTC weekday drift). */
function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function busiestWeekday(daily: Record<string, number> = {}): string {
  const buckets = new Array(7).fill(0);
  for (const [key, count] of Object.entries(daily)) {
    const day = parseDay(key).getDay();
    if (day >= 0 && day < 7) buckets[day] += count ?? 0;
  }
  let best = 0;
  for (let i = 1; i < 7; i++) if (buckets[i] > buckets[best]) best = i;
  return buckets[best] > 0 ? WEEKDAYS[best] : "—";
}

function activeDaySpan(daily: Record<string, number> = {}): {
  span: number;
  active: number;
} {
  const days = Object.keys(daily).filter((k) => (daily[k] ?? 0) > 0);
  if (!days.length) return { span: 1, active: 0 };
  let min = Infinity;
  let max = -Infinity;
  for (const key of days) {
    const t = parseDay(key).getTime();
    if (t < min) min = t;
    if (t > max) max = t;
  }
  const span = Math.max(1, Math.round((max - min) / 86400000) + 1);
  return { span, active: days.length };
}

/** Fallback span from per-channel monthly buckets when daily is unavailable. */
function monthlySpan(data: ProcessedData): number {
  let min = Infinity;
  let max = -Infinity;
  for (const key in data.channelStats) {
    const monthly = data.channelStats[key].monthly ?? {};
    for (const month in monthly) {
      const [y, mo] = month.split("-").map(Number);
      const t = new Date(y, (mo || 1) - 1, 1).getTime();
      if (t < min) min = t;
      if (t > max) max = t;
    }
  }
  if (!isFinite(min) || !isFinite(max)) return 1;
  return Math.max(1, Math.round((max - min) / 86400000) + 30);
}

function yearRange(
  daily: Record<string, number> = {},
  monthly: Record<string, number> = {},
): string {
  const years: number[] = [];
  for (const key in daily) {
    if ((daily[key] ?? 0) > 0) years.push(parseDay(key).getFullYear());
  }
  if (!years.length) {
    for (const key in monthly) {
      const y = parseInt(key.split("-")[0], 10);
      if (!Number.isNaN(y)) years.push(y);
    }
  }
  if (!years.length) return `${new Date().getFullYear()}`;
  const lo = Math.min(...years);
  const hi = Math.max(...years);
  return lo === hi ? `${lo}` : `${lo} – ${hi}`;
}

function topPeople(data: ProcessedData): WrappedTopPerson[] {
  const people: WrappedTopPerson[] = [];
  for (const [key, stats] of Object.entries(data.channelStats)) {
    if (!key.startsWith("dm_") || !stats.recipientName) continue;
    const count = stats.messageCount ?? sumValues(stats.hourly);
    if (count <= 0) continue;
    people.push({ name: stats.recipientName, count });
  }
  people.sort((a, b) => b.count - a.count);
  return people.slice(0, 10);
}

function topServerAndMonth(data: ProcessedData): {
  topServer: { name: string; count: number } | null;
  biggestMonth: { label: string; count: number } | null;
} {
  const serverTotals: Record<string, { name: string; count: number }> = {};
  for (const [key, stats] of Object.entries(data.channelStats)) {
    if (!key.startsWith("channel_")) continue;
    const channelId = key.replace(/^channel_/, "");
    const type = data.channelMapping[channelId];
    if (!GUILD_TYPES.includes(type)) continue;
    const count = stats.messageCount ?? sumValues(stats.hourly);
    const serverId =
      data.serverMapping.channelToServer[channelId] ?? `unknown_${channelId}`;
    if (!serverTotals[serverId]) {
      serverTotals[serverId] = {
        name: data.serverMapping.serverNames[serverId] ?? "Unknown Server",
        count: 0,
      };
    }
    serverTotals[serverId].count += count;
  }
  let topServer: { name: string; count: number } | null = null;
  for (const s of Object.values(serverTotals)) {
    if (!topServer || s.count > topServer.count) topServer = s;
  }

  let biggestMonth: { label: string; count: number } | null = null;
  for (const [month, count] of Object.entries(data.aggregateStats.monthly)) {
    if (!biggestMonth || count > biggestMonth.count) {
      const [y, mo] = month.split("-").map(Number);
      const label = new Date(y, (mo || 1) - 1, 1).toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      biggestMonth = { label, count };
    }
  }

  return { topServer, biggestMonth };
}

function moodLabel(net: number): string {
  if (net >= 0.3) return "Radiating positivity";
  if (net >= 0.12) return "Mostly upbeat";
  if (net > -0.12) return "Pretty balanced";
  if (net > -0.3) return "A little salty";
  return "Mostly negative";
}

function sentimentSummary(data: ProcessedData): WrappedSentiment | null {
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  for (const stats of Object.values(data.channelStats)) {
    const s = stats.sentiment;
    if (!s) continue;
    positive += s.positive ?? 0;
    negative += s.negative ?? 0;
    neutral += s.neutral ?? 0;
  }
  const total = positive + negative + neutral;
  if (total <= 0) return null;
  const net = (positive - negative) / total;
  return {
    positive,
    negative,
    neutral,
    total,
    positivityPct: Math.round((positive / total) * 100),
    moodLabel: moodLabel(net),
  };
}

export function deriveWrappedStats(data: ProcessedData): WrappedStats {
  const agg = data.aggregateStats;
  const daily = agg.daily ?? {};

  const { span, active } = activeDaySpan(daily);
  const daySpan = active > 0 ? span : monthlySpan(data);
  const totalMessages = agg.messageCount ?? 0;

  const activeDates = Object.keys(daily).filter((k) => (daily[k] ?? 0) > 0);
  const streak = calculateStreak(new Set(activeDates));

  const { topServer, biggestMonth } = topServerAndMonth(data);

  const a = data.activityStats ?? {
    addReaction: 0,
    attachmentsSent: 0,
    joinVoice: 0,
    startCall: 0,
    joinCall: 0,
    appOpened: 0,
  };

  return {
    self: {
      id: data.self.id,
      username: data.self.username,
      avatarHash: data.self.avatar_hash,
    },
    yearRange: yearRange(daily, agg.monthly),
    totalMessages,
    activeDays: active,
    daySpan,
    dailyAverage: Math.max(1, Math.round(totalMessages / Math.max(daySpan, 1))),
    peakHour: peakHour(agg.hourly),
    hourly: hourlyArray(agg.hourly),
    busiestWeekday: busiestWeekday(daily),
    topPeople: topPeople(data),
    topWords: (agg.topWords ?? []).slice(0, 24),
    streak: {
      length: streak.length,
      start: streak.start,
      end: streak.end,
    },
    sentiment: sentimentSummary(data),
    activity: {
      reactions: a.addReaction ?? 0,
      voice: a.joinVoice ?? 0,
      calls: (a.joinCall ?? 0) + (a.startCall ?? 0),
      attachments: a.attachmentsSent ?? 0,
    },
    topServer,
    biggestMonth,
    personality: computePersonality(data),
  };
}
