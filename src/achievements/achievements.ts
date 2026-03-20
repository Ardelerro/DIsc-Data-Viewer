import type { ProcessedData } from "../types/discord";
import {
  MessageSquare,
  Users,
  Paperclip,
  Smile,
  Flame,
  Monitor,
  Phone,
  Globe,
  BookOpen,
  Calendar,
  Mic,
  Handshake,
  Moon,
  Archive,
  Diamond,
  Link,
  Waves,
  Timer,
  Map as MapIcon,
  Headphones,
  Sunrise,
  Target,
  CalendarCheck,
  MessageCircleOff,
  PartyPopper,
  Infinity,
  Bot,
  CloudMoon,
  Ghost,
  Scale,
} from "lucide-react";
import type {
  Achievement,
  AchievementTier,
  AchievementDef,
} from "../types/types";

function dmChannels(
  data: ProcessedData,
): [string, (typeof data.channelStats)[string]][] {
  return Object.entries(data.channelStats).filter(([key]) =>
    key.startsWith("dm_"),
  );
}

function serverChannels(
  data: ProcessedData,
): [string, (typeof data.channelStats)[string]][] {
  return Object.entries(data.channelStats).filter(([key]) =>
    key.startsWith("channel_"),
  );
}

function countMsgs(hourly: Record<string, number>): number {
  return Object.values(hourly).reduce((sum, c) => sum + c, 0);
}

function monthlyValues(data: ProcessedData): number[] {
  return Object.values(data.aggregateStats.monthly);
}

function yearsPresent(data: ProcessedData): number[] {
  const years = new Set<number>();
  for (const key of Object.keys(data.aggregateStats.monthly)) {
    const year = parseInt(key.split("-")[0], 10);
    if (!isNaN(year)) years.add(year);
  }
  return Array.from(years).sort();
}

function monthsForYear(
  data: ProcessedData,
  year: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(data.aggregateStats.monthly)) {
    if (key.startsWith(`${year}-`)) result[key] = val;
  }
  return result;
}

function activeServerIds(data: ProcessedData): Set<string> {
  const ids = new Set<string>();
  for (const [key] of serverChannels(data)) {
    const channelId = key.replace(/^channel_/, "");
    const serverId = data.serverMapping.channelToServer[channelId];
    if (serverId) ids.add(serverId);
  }
  return ids;
}

function serverTotals(data: ProcessedData): Map<string, number> {
  const totals = new Map<string, number>();
  for (const [key, stats] of serverChannels(data)) {
    const channelId = key.replace(/^channel_/, "");
    const serverId = data.serverMapping.channelToServer[channelId];
    if (!serverId) continue;
    const count = countMsgs(stats.hourly ?? {});
    totals.set(serverId, (totals.get(serverId) ?? 0) + count);
  }
  return totals;
}

function peakHour(hourly: Record<string, number>): string {
  let best = "00";
  let bestVal = -1;
  for (const [h, v] of Object.entries(hourly)) {
    if (v > bestVal) {
      bestVal = v;
      best = h;
    }
  }
  return best;
}

function fractionInHourRange(
  hourly: Record<string, number>,
  startH: number,
  endH: number,
): number {
  const total = countMsgs(hourly);
  if (total === 0) return 0;
  let sum = 0;
  for (let h = startH; h !== (endH + 1) % 24; h = (h + 1) % 24) {
    const key = h.toString().padStart(2, "0");
    sum += hourly[key] ?? 0;
    if (h === endH) break;
  }
  return sum / total;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance =
    arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "first_1000",
    name: "First 1,000",
    description: "Send your first 1,000 messages across all channels.",
    tier: "bronze",
    icon: MessageSquare,
    iconColor: "stroke-amber-600 dark:stroke-amber-400",
    check: (d) => d.aggregateStats.messageCount >= 1_000,
    progress: (d) => ({
      current: d.aggregateStats.messageCount as number,
      target: 1_000,
    }),
  },
  {
    id: "social_starter",
    name: "Social starter",
    description: "Have at least 5 DM contacts with 10 or more messages each.",
    tier: "bronze",
    icon: Users,
    iconColor: "stroke-amber-600 dark:stroke-amber-400",
    check: (d) =>
      dmChannels(d).filter(([, s]) => countMsgs(s.hourly ?? {}) >= 10).length >=
      5,
    progress: (d) => {
      const filtered = dmChannels(d).filter(
        ([, s]) => countMsgs(s.hourly ?? {}) >= 10,
      );
      return { current: filtered.length, target: 5 };
    },
  },
  {
    id: "show_dont_tell",
    name: "Show, don't tell",
    description: "Send your first 50 attachments.",
    tier: "bronze",
    icon: Paperclip,
    iconColor: "stroke-amber-600 dark:stroke-amber-400",
    check: (d) => d.activityStats.attachmentsSent >= 50,
    progress: (d) => ({
      current: d.activityStats.attachmentsSent as number,
      target: 50,
    }),
  },
  {
    id: "reactor_core",
    name: "Reactor core",
    description: "Add 100 reactions to messages.",
    tier: "bronze",
    icon: Smile,
    iconColor: "stroke-amber-600 dark:stroke-amber-400",
    check: (d) => d.activityStats.addReaction >= 100,
    progress: (d) => ({
      current: d.activityStats.addReaction as number,
      target: 100,
    }),
  },
  {
    id: "on_a_roll",
    name: "On a roll",
    description: "Maintain a 7-day messaging streak with anyone.",
    tier: "bronze",
    icon: Flame,
    iconColor: "stroke-amber-600 dark:stroke-amber-400",
    check: (d) => dmChannels(d).some(([, s]) => (s.longestStreak ?? 0) >= 7),
    progress: (d) => {
      const streaks = dmChannels(d).map(([, s]) => s.longestStreak ?? 0);
      const maxStreak = Math.max(...streaks);
      return { current: maxStreak, target: 7 };
    },
  },
  {
    id: "creature_of_habit",
    name: "Creature of habit",
    description: "Open Discord 30 or more times.",
    tier: "bronze",
    icon: Monitor,
    iconColor: "stroke-amber-600 dark:stroke-amber-400",
    check: (d) => d.activityStats.appOpened >= 30,
    progress: (d) => ({
      current: d.activityStats.appOpened as number,
      target: 30,
    }),
  },
  {
    id: "call_me",
    name: "Call me",
    description: "Make or join 10 calls.",
    tier: "bronze",
    icon: Phone,
    iconColor: "stroke-amber-600 dark:stroke-amber-400",
    check: (d) => d.activityStats.startCall + d.activityStats.joinCall >= 10,
    progress: (d) => ({
      current: (d.activityStats.startCall + d.activityStats.joinCall) as number,
      target: 10,
    }),
  },
  {
    id: "server_lurker",
    name: "Server lurker",
    description: "Message in at least 3 different servers.",
    tier: "bronze",
    icon: Globe,
    iconColor: "stroke-amber-600 dark:stroke-amber-400",
    check: (d) => activeServerIds(d).size >= 3,
    progress: (d) => ({ current: activeServerIds(d).size, target: 3 }),
  },

  {
    id: "novelist",
    name: "Novelist",
    description: "Send 10,000 messages total across all channels.",
    tier: "silver",
    icon: BookOpen,
    iconColor: "stroke-slate-500 dark:stroke-slate-300",
    check: (d) => d.aggregateStats.messageCount >= 10_000,
    progress: (d) => ({
      current: d.aggregateStats.messageCount as number,
      target: 10_000,
    }),
  },
  {
    id: "month_long_bond",
    name: "Month-long bond",
    description:
      "Maintain a 30-day consecutive messaging streak with a single person.",
    tier: "silver",
    icon: Calendar,
    iconColor: "stroke-slate-500 dark:stroke-slate-300",
    check: (d) => dmChannels(d).some(([, s]) => (s.longestStreak ?? 0) >= 30),
    progress: (d) => {
      const streaks = dmChannels(d).map(([, s]) => s.longestStreak ?? 0);
      const maxStreak = Math.max(...streaks);
      return { current: maxStreak, target: 30 };
    },
  },
  {
    id: "server_regular",
    name: "Server regular",
    description:
      "Message in 5 or more different servers with 100+ messages each.",
    tier: "silver",
    icon: Globe,
    iconColor: "stroke-slate-500 dark:stroke-slate-300",
    check: (d) => {
      const totals = serverTotals(d);
      return Array.from(totals.values()).filter((v) => v >= 100).length >= 5;
    },
    progress: (d) => {
      const totals = serverTotals(d);
      const qualifiedServers = Array.from(totals.values()).filter(
        (v) => v >= 100,
      );
      return { current: qualifiedServers.length, target: 5 };
    },
  },
  {
    id: "voice_of_reason",
    name: "Voice of reason",
    description: "Join voice channels 50 or more times.",
    tier: "silver",
    icon: Mic,
    iconColor: "stroke-slate-500 dark:stroke-slate-300",
    check: (d) => d.activityStats.joinVoice >= 50,
    progress: (d) => ({
      current: d.activityStats.joinVoice as number,
      target: 50,
    }),
  },
  {
    id: "inner_circle",
    name: "Inner circle",
    description:
      "Have 3 people you've each exchanged 1,000 or more messages with.",
    tier: "silver",
    icon: Handshake,
    iconColor: "stroke-slate-500 dark:stroke-slate-300",
    check: (d) =>
      dmChannels(d).filter(([, s]) => countMsgs(s.hourly ?? {}) >= 1_000)
        .length >= 3,
    progress: (d) => {
      const qualifiedDms = dmChannels(d).filter(
        ([, s]) => countMsgs(s.hourly ?? {}) >= 1_000,
      );
      return { current: qualifiedDms.length, target: 3 };
    },
  },
  {
    id: "night_shift",
    name: "Night shift",
    description: "Send 2,000 or more messages between midnight and 4am.",
    tier: "silver",
    icon: Moon,
    iconColor: "stroke-slate-500 dark:stroke-slate-300",
    check: (d) => {
      const h = d.aggregateStats.hourly;
      const nightCount = ["00", "01", "02", "03", "04"].reduce(
        (sum, k) => sum + (h[k] ?? 0),
        0,
      );
      return nightCount >= 2_000;
    },
    progress: (d) => {
      const h = d.aggregateStats.hourly;
      const nightCount = ["00", "01", "02", "03", "04"].reduce(
        (sum, k) => sum + (h[k] ?? 0),
        0,
      );
      return { current: nightCount, target: 2_000 };
    },
  },
  {
    id: "attachment_hoarder",
    name: "Attachment hoarder",
    description: "Send 500 or more attachments.",
    tier: "silver",
    icon: Archive,
    iconColor: "stroke-slate-500 dark:stroke-slate-300",
    check: (d) => d.activityStats.attachmentsSent >= 500,
    progress: (d) => ({
      current: d.activityStats.attachmentsSent as number,
      target: 500,
    }),
  },
  {
    id: "conversationalist",
    name: "Conversationalist",
    description: "Average conversation time of over 30 minutes.",
    tier: "silver",
    icon: MessageSquare,
    iconColor: "stroke-slate-500 dark:stroke-slate-300",
    check: (d) => (d.aggregateStats.averageConversationTime ?? 0) >= 1_800,
    progress: (d) => ({
      current: (d.aggregateStats.averageConversationTime as number) ?? 0,
      target: 1_800,
    }),
  },

  {
    id: "the_archive",
    name: "The archive",
    description:
      "Discord history spanning 3 or more calendar years of activity.",
    tier: "gold",
    icon: Archive,
    iconColor: "stroke-yellow-600 dark:stroke-yellow-400",
    check: (d) => {
      const years = yearsPresent(d);
      return years.length >= 1 && years[years.length - 1] - years[0] >= 2;
    },
    progress: (d) => {
      const years = yearsPresent(d);
      if (years.length === 0) return { current: 0, target: 3 };
      const span = years[years.length - 1] - years[0] + 1;
      return { current: span, target: 3 };
    },
  },
  {
    id: "hundred_k_club",
    name: "100K club",
    description: "Send 100,000 messages total. The top 1%.",
    tier: "gold",
    icon: Diamond,
    iconColor: "stroke-yellow-600 dark:stroke-yellow-400",
    check: (d) => d.aggregateStats.messageCount >= 100_000,
    progress: (d) => ({
      current: d.aggregateStats.messageCount as number,
      target: 100_000,
    }),
  },
  {
    id: "ride_or_die",
    name: "Ride or die",
    description:
      "One person has been in your top 3 DMs every year for 3 or more years.",
    tier: "gold",
    icon: Link,
    iconColor: "stroke-yellow-600 dark:stroke-yellow-400",
    check: (d) => {
      const years = yearsPresent(d);
      if (years.length < 3) return false;
      const topPerYear: Map<number, Set<string>> = new Map();
      for (const year of years) {
        const channelYearTotals: { key: string; count: number }[] = [];
        for (const [key, stats] of dmChannels(d)) {
          const yearCount = Object.entries(stats.monthly ?? {})
            .filter(([m]) => m.startsWith(`${year}-`))
            .reduce((sum, [, v]) => sum + v, 0);
          if (yearCount > 0) channelYearTotals.push({ key, count: yearCount });
        }
        channelYearTotals.sort((a, b) => b.count - a.count);
        topPerYear.set(
          year,
          new Set(channelYearTotals.slice(0, 3).map((c) => c.key)),
        );
      }
      const allDmKeys = dmChannels(d).map(([k]) => k);
      for (const key of allDmKeys) {
        let yearsInTop3 = 0;
        for (const [, top3] of topPerYear) {
          if (top3.has(key)) yearsInTop3++;
        }
        if (yearsInTop3 >= 3) return true;
      }
      return false;
    },
    progress: (d) => {
      const years = yearsPresent(d);
      if (years.length === 0) return { current: 0, target: 3 };

      const topPerYear: Map<number, Set<string>> = new Map();

      for (const year of years) {
        const channelYearTotals: { key: string; count: number }[] = [];

        for (const [key, stats] of dmChannels(d)) {
          const yearCount = Object.entries(stats.monthly ?? {})
            .filter(([m]) => m.startsWith(`${year}-`))
            .reduce((sum, [, v]) => sum + v, 0);

          if (yearCount > 0) {
            channelYearTotals.push({ key, count: yearCount });
          }
        }

        channelYearTotals.sort((a, b) => b.count - a.count);
        topPerYear.set(
          year,
          new Set(channelYearTotals.slice(0, 3).map((c) => c.key)),
        );
      }

      const allDmKeys = dmChannels(d).map(([k]) => k);

      let best = 0;

      for (const key of allDmKeys) {
        let yearsInTop3 = 0;

        for (const [, top3] of topPerYear) {
          if (top3.has(key)) yearsInTop3++;
        }

        best = Math.max(best, yearsInTop3);
      }

      return {
        current: best,
        target: 3,
      };
    },
  },
  {
    id: "tidal_wave",
    name: "The tidal wave",
    description:
      "Your busiest single month had 5× your average monthly message count.",
    tier: "gold",
    icon: Waves,
    iconColor: "stroke-yellow-600 dark:stroke-yellow-400",
    check: (d) => {
      const vals = monthlyValues(d).filter((v) => v > 0);
      if (vals.length < 3) return false;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const max = Math.max(...vals);
      return mean > 0 && max / mean >= 5;
    },
    progress: (d) => {      const vals = monthlyValues(d).filter((v) => v > 0);
      if (vals.length === 0) return { current: 0, target: 5 };
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const max = Math.max(...vals);
      const ratio = mean > 0 ? max / mean : 0;
      return { current: ratio, target: 5 };
    }
  },
  {
    id: "ten_thousand_hour_rule",
    name: "10,000-hour rule",
    description: "Your longest single conversation lasted more than 10 hours.",
    tier: "gold",
    icon: Timer,
    iconColor: "stroke-yellow-600 dark:stroke-yellow-400",
    check: (d) => (d.aggregateStats.longestConversationTime ?? 0) >= 36_000,
    progress: (d) => ({
      current: d.aggregateStats.longestConversationTime ?? 0,
      target: 36_000,
    }),
  },
  {
    id: "landlord",
    name: "Landlord",
    description: "Send messages across 20 or more distinct servers.",
    tier: "gold",
    icon: MapIcon,
    iconColor: "stroke-yellow-600 dark:stroke-yellow-400",
    check: (d) => activeServerIds(d).size >= 20,
    progress: (d) => ({ current: activeServerIds(d).size, target: 20 }),
  },
  {
    id: "voice_veteran",
    name: "Voice veteran",
    description: "Join voice channels 200 or more times.",
    tier: "gold",
    icon: Headphones,
    iconColor: "stroke-yellow-600 dark:stroke-yellow-400",
    check: (d) => d.activityStats.joinVoice >= 200,
    progress: (d) => ({
      current: d.activityStats.joinVoice as number,
      target: 200,
    }),
  },

  {
    id: "early_bird",
    name: "Early bird catches the DM",
    description: "Your most active messaging hour is 5am, 6am, or 7am.",
    tier: "secret",
    icon: Sunrise,
    iconColor: "stroke-purple-500 dark:stroke-purple-300",
    secret: true,
    check: (d) => {
      const peak = peakHour(d.aggregateStats.hourly);
      return ["05", "06", "07"].includes(peak);
    },
  },
  {
    id: "monomessenger",
    name: "Monomessenger",
    description: "One person accounts for 80% or more of all your DMs.",
    tier: "secret",
    icon: Target,
    iconColor: "stroke-purple-500 dark:stroke-purple-300",
    secret: true,
    check: (d) => {
      const dms = dmChannels(d);
      const total = dms.reduce(
        (sum, [, s]) => sum + countMsgs(s.hourly ?? {}),
        0,
      );
      if (total === 0) return false;
      const top = Math.max(...dms.map(([, s]) => countMsgs(s.hourly ?? {})));
      return top / total >= 0.8;
    },
  },
  {
    id: "no_days_off",
    name: "No days off",
    description: "Send at least 1 message in every month of a calendar year.",
    tier: "secret",
    icon: CalendarCheck,
    iconColor: "stroke-purple-500 dark:stroke-purple-300",
    secret: true,
    check: (d) => {
      for (const year of yearsPresent(d)) {
        const months = monthsForYear(d, year);
        const activeMonths = Object.values(months).filter((v) => v > 0).length;
        if (activeMonths === 12) return true;
      }
      return false;
    },
  },
  {
    id: "strong_silent_type",
    name: "Strong silent type",
    description:
      "Average gap between messages over 24 hours, yet more than 500 total messages.",
    tier: "secret",
    icon: MessageCircleOff,
    iconColor: "stroke-purple-500 dark:stroke-purple-300",
    secret: true,
    check: (d) =>
      d.aggregateStats.averageGapBetweenMessages > 86_400 &&
      d.aggregateStats.messageCount > 500,
  },
  {
    id: "comeback_kid",
    name: "The comeback kid",
    description:
      "A month with zero messages followed immediately by your personal best month.",
    tier: "secret",
    icon: PartyPopper,
    iconColor: "stroke-purple-500 dark:stroke-purple-300",
    secret: true,
    check: (d) => {
      const monthly = d.aggregateStats.monthly;
      const keys = Object.keys(monthly).sort();
      if (keys.length < 2) return false;
      const max = Math.max(...(Object.values(monthly) as number[]));
      for (let i = 1; i < keys.length; i++) {
        if (monthly[keys[i - 1]] === 0 && monthly[keys[i]] === max) return true;
      }
      return false;
    },
  },
  {
    id: "eternal_streak",
    name: "The eternal streak",
    description: "A 365-day consecutive messaging streak with one person.",
    tier: "secret",
    icon: Infinity,
    iconColor: "stroke-purple-500 dark:stroke-purple-300",
    secret: true,
    check: (d) => dmChannels(d).some(([, s]) => (s.longestStreak ?? 0) >= 365),
  },
  {
    id: "reaction_machine",
    name: "Reaction machine",
    description: "Add more reactions than you send messages.",
    tier: "secret",
    icon: Bot,
    iconColor: "stroke-purple-500 dark:stroke-purple-300",
    secret: true,
    check: (d) => d.activityStats.addReaction > d.aggregateStats.messageCount,
  },
  {
    id: "insomniac",
    name: "Insomniac",
    description: "More than 25% of all your messages sent between 2am and 5am.",
    tier: "secret",
    icon: CloudMoon,
    iconColor: "stroke-purple-500 dark:stroke-purple-300",
    secret: true,
    check: (d) => fractionInHourRange(d.aggregateStats.hourly, 2, 4) >= 0.25,
  },
  {
    id: "ghost",
    name: "The ghost",
    description:
      "Extreme messaging variance — your busiest month is 10× your median month.",
    tier: "secret",
    icon: Ghost,
    iconColor: "stroke-purple-500 dark:stroke-purple-300",
    secret: true,
    check: (d) => {
      const vals = monthlyValues(d)
        .filter((v) => v > 0)
        .sort((a, b) => a - b);
      if (vals.length < 4) return false;
      const median = vals[Math.floor(vals.length / 2)];
      const max = vals[vals.length - 1];
      return median > 0 && max / median >= 10;
    },
  },
  {
    id: "perfectly_balanced",
    name: "Perfectly balanced",
    description:
      "Your hourly message distribution has a coefficient of variation below 0.3.",
    tier: "secret",
    icon: Scale,
    iconColor: "stroke-purple-500 dark:stroke-purple-300",
    secret: true,
    check: (d) => {
      const vals = Object.values(d.aggregateStats.hourly) as number[];
      if (vals.every((v) => v === 0)) return false;
      const mean =
        vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
      if (mean === 0) return false;
      return stdDev(vals) / mean < 0.3;
    },
  },
];

export function computeAchievements(data: ProcessedData): Achievement[] {
  return ACHIEVEMENT_DEFS.map(({ check, progress, ...def }) => ({
    ...def,
    unlocked: (() => {
      try {
        return check(data);
      } catch {
        return false;
      }
    })(),
    progress: progress
      ? (() => {
          try {
            return progress(data);
          } catch {
            return undefined;
          }
        })()
      : undefined,
  }));
}

export function unlockedAchievements(data: ProcessedData): Achievement[] {
  const tierOrder: AchievementTier[] = ["gold", "silver", "bronze", "secret"];
  return computeAchievements(data)
    .filter((a) => a.unlocked)
    .sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));
}

export function achievementSummary(
  data: ProcessedData,
): Record<AchievementTier | "total", { unlocked: number; total: number }> {
  const all = computeAchievements(data);
  const tiers: AchievementTier[] = ["bronze", "silver", "gold", "secret"];
  const summary = Object.fromEntries(
    tiers.map((tier) => {
      const forTier = all.filter((a) => a.tier === tier);
      return [
        tier,
        {
          unlocked: forTier.filter((a) => a.unlocked).length,
          total: forTier.length,
        },
      ];
    }),
  ) as Record<AchievementTier, { unlocked: number; total: number }>;

  return {
    ...summary,
    total: {
      unlocked: all.filter((a) => a.unlocked).length,
      total: all.length,
    },
  };
}
