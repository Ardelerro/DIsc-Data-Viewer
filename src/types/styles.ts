import type { AchievementTier } from "./types";

const TIER_STYLES: Record<
  AchievementTier,
  { bg: string; text: string; border: string; dot: string }
> = {
  bronze: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  silver: {
    bg: "bg-slate-100 dark:bg-slate-700/50",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-600",
    dot: "bg-slate-400",
  },
  gold: {
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-800",
    dot: "bg-yellow-400",
  },
  secret: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    dot: "bg-purple-500",
  },
};

export { TIER_STYLES };