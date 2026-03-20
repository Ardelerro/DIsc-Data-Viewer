import type { ProcessedData } from "../types/discord";
import {
  Moon,
  Zap,
  Radio,
  Lock,
  BookOpen,
  Ghost,
  Smile,
  Mic,
  Scale,
} from "lucide-react";

import type {
  PersonalityId,
  Personality,
  PersonalityDef,
} from "../types/types";

function countMsgs(hourly: Record<string, number>): number {
  return Object.values(hourly).reduce((sum, c) => sum + c, 0);
}

function dmChannels(data: ProcessedData) {
  return Object.entries(data.channelStats).filter(([key]) =>
    key.startsWith("dm_"),
  );
}

function fractionInHours(
  hourly: Record<string, number>,
  start: number,
  end: number,
): number {
  const total = countMsgs(hourly);
  if (total === 0) return 0;
  let sum = 0;
  for (let h = start; h <= end; h++) {
    sum += hourly[h.toString().padStart(2, "0")] ?? 0;
  }
  return sum / total;
}

function nightFraction(hourly: Record<string, number>): number {
  const total = countMsgs(hourly);
  if (total === 0) return 0;
  const nightHours = [22, 23, 0, 1, 2, 3, 4];
  const sum = nightHours.reduce(
    (acc, h) => acc + (hourly[h.toString().padStart(2, "0")] ?? 0),
    0,
  );
  return sum / total;
}

function peakHourInt(hourly: Record<string, number>): number {
  let best = 0;
  let bestVal = -1;
  for (const [h, v] of Object.entries(hourly)) {
    if (v > bestVal) {
      bestVal = v;
      best = parseInt(h, 10);
    }
  }
  return best;
}

function monthlyCV(data: ProcessedData): number {
  const vals = Object.values(data.aggregateStats.monthly).filter((v) => v > 0);
  if (vals.length < 2) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean === 0) return 0;
  const variance =
    vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
  return Math.sqrt(variance) / mean;
}

function disappearanceEvents(data: ProcessedData): number {
  const monthly = data.aggregateStats.monthly;
  const keys = Object.keys(monthly).sort();
  if (keys.length < 3) return 0;
  let count = 0;
  for (let i = 1; i < keys.length - 1; i++) {
    if (
      monthly[keys[i]] === 0 &&
      monthly[keys[i - 1]] > 0 &&
      monthly[keys[i + 1]] > 0
    ) {
      count++;
    }
  }
  return count;
}

const PERSONALITY_DEFS: PersonalityDef[] = [
  {
    id: "night_owl",
    name: "The Night Owl",
    tagline: "Discord comes alive after midnight.",
    icon: Moon,

    iconColor: "stroke-indigo-500 dark:stroke-indigo-300",
    score: (data) => {
      let points = 0;
      const signals: string[] = [];
      const hourly = data.aggregateStats.hourly;

      const night = nightFraction(hourly);
      if (night >= 0.5) {
        points += 4;
        signals.push(`${Math.round(night * 100)}% of messages sent at night`);
      } else if (night >= 0.4) {
        points += 3;
        signals.push(`${Math.round(night * 100)}% of messages sent at night`);
      } else if (night >= 0.28) {
        points += 1;
      }

      const peak = peakHourInt(hourly);
      if (peak >= 23 || peak <= 3) {
        points += 3;
        const display = peak === 0 ? "midnight" : `${peak}am`;
        signals.push(`Peak activity at ${display}`);
      } else if (peak >= 21 || peak <= 5) {
        points += 1;
      }

      const morning = fractionInHours(hourly, 7, 11);
      if (morning >= 0.35) points -= 2;

      return { points: Math.max(0, points), signals };
    },
  },

  {
    id: "quick_draw",
    name: "The Quick Draw",
    tagline: "Replies before others finish typing.",
    icon: Zap,
    iconColor: "stroke-amber-500 dark:stroke-amber-300",
    score: (data) => {
      let points = 0;
      const signals: string[] = [];
      const gap = data.aggregateStats.averageGapBetweenMessages;

      if (gap > 0 && gap <= 120) {
        points += 5;
        signals.push(`Average reply gap: ${Math.round(gap / 60)} min`);
      } else if (gap <= 300) {
        points += 3;
        signals.push(`Average reply gap: ${Math.round(gap / 60)} min`);
      } else if (gap <= 600) {
        points += 1;
      }

      const avgConv = data.aggregateStats.averageConversationTime ?? 0;
      if (avgConv >= 3_600 && gap <= 300) {
        points += 2;
        signals.push(`Avg conversation runs ${Math.round(avgConv / 60)} min`);
      }

      const dmCount = dmChannels(data).filter(
        ([, s]) => countMsgs(s.hourly ?? {}) >= 10,
      ).length;
      if (dmCount >= 5 && gap <= 300) {
        points += 1;
        signals.push(`Active across ${dmCount} DM conversations`);
      }

      return { points, signals };
    },
  },

  {
    id: "broadcaster",
    name: "The Broadcaster",
    tagline: "A wide net, shallow depth.",
    icon: Radio,

    iconColor: "stroke-cyan-500 dark:stroke-cyan-300",
    score: (data) => {
      let points = 0;
      const signals: string[] = [];

      const dms = dmChannels(data);
      const activeDms = dms.filter(([, s]) => countMsgs(s.hourly ?? {}) >= 10);
      const totalDmMsgs = dms.reduce(
        (sum, [, s]) => sum + countMsgs(s.hourly ?? {}),
        0,
      );
      const avgPerPerson =
        activeDms.length > 0 ? totalDmMsgs / activeDms.length : 0;

      if (activeDms.length >= 80) {
        points += 4;
        signals.push(`${activeDms.length} DM contacts`);
      } else if (activeDms.length >= 50) {
        points += 3;
        signals.push(`${activeDms.length} DM contacts`);
      } else if (activeDms.length >= 25) {
        points += 1;
      }

      if (avgPerPerson <= 200 && activeDms.length >= 20) {
        points += 3;
        signals.push(`Avg ${Math.round(avgPerPerson)} messages per person`);
      } else if (avgPerPerson <= 500 && activeDms.length >= 15) {
        points += 1;
      }

      if (activeDms.length > 0 && totalDmMsgs > 0) {
        const topCount = Math.max(
          ...dms.map(([, s]) => countMsgs(s.hourly ?? {})),
        );
        if (topCount / totalDmMsgs >= 0.6) points -= 3;
      }

      return { points: Math.max(0, points), signals };
    },
  },

  {
    id: "loyalist",
    name: "The Loyalist",
    tagline: "Few people. All of the words.",
    icon: Lock,

    iconColor: "stroke-emerald-500 dark:stroke-emerald-300",
    score: (data) => {
      let points = 0;
      const signals: string[] = [];

      const dms = dmChannels(data);
      const activeDms = dms.filter(([, s]) => countMsgs(s.hourly ?? {}) >= 10);
      const totalDmMsgs = dms.reduce(
        (sum, [, s]) => sum + countMsgs(s.hourly ?? {}),
        0,
      );

      if (activeDms.length <= 5 && activeDms.length > 0) {
        points += 3;
        signals.push(`Only ${activeDms.length} DM contacts`);
      } else if (activeDms.length <= 10) {
        points += 1;
      }

      if (totalDmMsgs > 0) {
        const topCount = Math.max(
          ...dms.map(([, s]) => countMsgs(s.hourly ?? {})),
        );
        const fraction = topCount / totalDmMsgs;
        if (fraction >= 0.8) {
          points += 4;
          signals.push(`${Math.round(fraction * 100)}% of DMs with one person`);
        } else if (fraction >= 0.6) {
          points += 2;
          signals.push(`${Math.round(fraction * 100)}% of DMs with one person`);
        }
      }

      const avgPerPerson =
        activeDms.length > 0 ? totalDmMsgs / activeDms.length : 0;
      if (avgPerPerson >= 2_000) {
        points += 2;
        signals.push(
          `Avg ${Math.round(avgPerPerson).toLocaleString()} messages per person`,
        );
      }

      return { points, signals };
    },
  },

  {
    id: "novelist",
    name: "The Novelist",
    tagline: "Why use one message when five will do.",
    icon: BookOpen,

    iconColor: "stroke-purple-500 dark:stroke-purple-300",
    score: (data) => {
      let points = 0;
      const signals: string[] = [];

      const msgCount = data.aggregateStats.messageCount;

      if (msgCount >= 100_000) {
        points += 5;
        signals.push(`${msgCount.toLocaleString()} total messages`);
      } else if (msgCount >= 50_000) {
        points += 4;
        signals.push(`${msgCount.toLocaleString()} total messages`);
      } else if (msgCount >= 20_000) {
        points += 3;
        signals.push(`${msgCount.toLocaleString()} total messages`);
      } else if (msgCount >= 10_000) {
        points += 1;
      }

      const avgConv = data.aggregateStats.averageConversationTime ?? 0;
      if (avgConv >= 7_200) {
        points += 2;
        signals.push(
          `Avg conversation: ${Math.round((avgConv / 3600) * 10) / 10}h`,
        );
      } else if (avgConv >= 3_600) {
        points += 1;
      }

      const topWords = data.aggregateStats.topWords ?? [];
      if (topWords.length >= 50) {
        points += 1;
        signals.push(`${topWords.length} distinct frequent words`);
      }

      return { points, signals };
    },
  },

  {
    id: "ghost",
    name: "The Ghost",
    tagline: "Active in bursts. Vanishes for weeks.",
    icon: Ghost,

    iconColor: "stroke-slate-500 dark:stroke-slate-300",
    score: (data) => {
      let points = 0;
      const signals: string[] = [];

      const cv = monthlyCV(data);
      if (cv >= 1.5) {
        points += 4;
        signals.push(`Highly irregular monthly activity (CV ${cv.toFixed(1)})`);
      } else if (cv >= 1.2) {
        points += 2;
        signals.push(`Irregular monthly activity (CV ${cv.toFixed(1)})`);
      } else if (cv >= 0.8) {
        points += 1;
      }

      const disappearances = disappearanceEvents(data);
      if (disappearances >= 3) {
        points += 3;
        signals.push(
          `${disappearances} disappearance events (months with 0 messages)`,
        );
      } else if (disappearances >= 1) {
        points += Math.min(2, disappearances);
        signals.push(
          `${disappearances} disappearance event${disappearances > 1 ? "s" : ""}`,
        );
      }

      const gap = data.aggregateStats.averageGapBetweenMessages;
      if (gap >= 86_400) {
        points += 2;
        signals.push(
          `Average gap between messages: ${Math.round(gap / 3600)}h`,
        );
      }

      return { points: Math.min(10, points), signals };
    },
  },

  {
    id: "reactor",
    name: "The Reactor",
    tagline: "More reactions than actual words.",
    icon: Smile,

    iconColor: "stroke-pink-500 dark:stroke-pink-300",
    score: (data) => {
      let points = 0;
      const signals: string[] = [];

      const reactions = data.activityStats.addReaction;
      const msgs = data.aggregateStats.messageCount;
      if (msgs === 0) return { points: 0, signals };

      const ratio = reactions / msgs;

      if (ratio >= 1.0) {
        points += 5;
        signals.push(
          `More reactions than messages (${ratio.toFixed(1)}× ratio)`,
        );
      } else if (ratio >= 0.5) {
        points += 4;
        signals.push(`${ratio.toFixed(1)} reactions per message`);
      } else if (ratio >= 0.3) {
        points += 2;
        signals.push(`${ratio.toFixed(1)} reactions per message`);
      } else if (ratio >= 0.15) {
        points += 1;
      }

      if (reactions >= 1_000) {
        points += 2;
        signals.push(`${reactions.toLocaleString()} total reactions`);
      } else if (reactions >= 500) {
        points += 1;
      }

      return { points: Math.min(10, points), signals };
    },
  },

  {
    id: "voice_first",
    name: "The Voice-First",
    tagline: "Text is a last resort.",
    icon: Mic,

    iconColor: "stroke-blue-500 dark:stroke-blue-300",
    score: (data) => {
      let points = 0;
      const signals: string[] = [];

      const voice = data.activityStats.joinVoice;
      const calls = data.activityStats.joinCall + data.activityStats.startCall;
      const msgs = data.aggregateStats.messageCount;

      if (voice >= 200) {
        points += 4;
        signals.push(`${voice} voice channel joins`);
      } else if (voice >= 100) {
        points += 3;
        signals.push(`${voice} voice channel joins`);
      } else if (voice >= 50) {
        points += 2;
        signals.push(`${voice} voice channel joins`);
      }

      if (calls >= 50) {
        points += 3;
        signals.push(`${calls} calls made or joined`);
      } else if (calls >= 20) {
        points += 2;
        signals.push(`${calls} calls made or joined`);
      } else if (calls >= 10) {
        points += 1;
      }

      if (msgs > 0 && voice > 0) {
        const vtRatio = voice / msgs;
        if (vtRatio >= 0.05) {
          points += 2;
          signals.push(`Voice/text ratio: ${(vtRatio * 100).toFixed(1)}%`);
        }
      }

      return { points: Math.min(10, points), signals };
    },
  },
];

const BALANCED_PERSONALITY: Personality = {
  id: "balanced",
  name: "The Balanced Type",
  tagline: "No strong patterns. A little bit of everything.",
  icon: Scale,

  iconColor: "stroke-teal-500 dark:stroke-teal-300",
  signals: ["No dominant messaging patterns detected"],
};

const MIN_SCORE_THRESHOLD = 3;

export function computePersonality(data: ProcessedData): Personality {
  let bestId: PersonalityId | null = null;
  let bestScore = 0;
  let bestSignals: string[] = [];

  for (const def of PERSONALITY_DEFS) {
    const { points, signals } = (() => {
      try {
        return def.score(data);
      } catch {
        return { points: 0, signals: [] };
      }
    })();

    if (points > bestScore) {
      bestScore = points;
      bestId = def.id;
      bestSignals = signals;
    }
  }

  if (!bestId || bestScore < MIN_SCORE_THRESHOLD) {
    return BALANCED_PERSONALITY;
  }

  const def = PERSONALITY_DEFS.find((d) => d.id === bestId)!;
  return {
    id: def.id,
    name: def.name,
    tagline: def.tagline,
    icon: def.icon,
    iconColor: def.iconColor,
    signals: bestSignals.slice(0, 3),
  };
}

export function computeAllPersonalityScores(
  data: ProcessedData,
): {
  personality: Omit<Personality, "signals">;
  score: number;
  signals: string[];
}[] {
  return PERSONALITY_DEFS.map((def) => {
    const { points, signals } = (() => {
      try {
        return def.score(data);
      } catch {
        return { points: 0, signals: [] };
      }
    })();
    return {
      personality: {
        id: def.id,
        name: def.name,
        tagline: def.tagline,
        icon: def.icon,
        iconColor: def.iconColor,
      },
      score: points,
      signals,
    };
  }).sort((a, b) => b.score - a.score);
}
