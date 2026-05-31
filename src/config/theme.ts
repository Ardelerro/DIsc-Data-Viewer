import type { AchievementTier } from "../types/types";

export const C = {
  bg: "var(--color-bg)",
  surface: "var(--color-surface)",
  surfaceRaised: "var(--color-surface-raised)",
  border: "var(--color-border)",
  borderHover: "var(--color-border-hover)",
  borderSolid: "var(--color-border-solid)",
  text1: "var(--color-text-1)",
  text2: "var(--color-text-2)",
  text3: "var(--color-text-3)",
  accent: "var(--color-accent)",
  accentSoft: "var(--color-accent-soft)",
  positive: "var(--color-positive)",
  negative: "var(--color-negative)",
  tooltipBg: "var(--color-tooltip-bg)",
  tooltipText: "var(--color-tooltip-text)",
  personalityBg: "var(--color-personality-bg)",
  personalityBorder: "var(--color-personality-border)",
  personalityText: "var(--color-personality-text)",
} as const;

export const FONT = {
  family: '"DM Sans", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  size: {
    "2xs": "var(--font-size-2xs)",
    xs: "var(--font-size-xs)",
    sm: "var(--font-size-sm)",
    base: "var(--font-size-base)",
    xl: "var(--font-size-xl)",
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const ICON = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
  xl: "w-8 h-8",
} as const;

export const RADIUS = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  full: "rounded-full",
} as const;

export const TIER_STYLES: Record<
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

export const SENTIMENT = {
  negative: {
    bar: "bg-red-500 dark:bg-red-700",
    tooltip: "bg-red-600 text-white",
    badge: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  },
  neutral: {
    bar: "bg-yellow-400 dark:bg-yellow-600",
    tooltip: "bg-yellow-500 text-white",
    badge:
      "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  },
  positive: {
    bar: "bg-green-500 dark:bg-green-700",
    tooltip: "bg-green-600 text-white",
    badge:
      "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  },
  indicator: "bg-black dark:bg-white",
  label: "text-[var(--color-text-2)]",
} as const;

export const FEEDBACK = {
  error: {
    container:
      "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg",
    title: "text-red-800 dark:text-red-300 font-medium",
    body: "text-red-600 dark:text-red-400 text-sm",
    link: "text-red-700 dark:text-red-300 underline hover:no-underline",
  },
} as const;

/** Pop-over tooltip — inverted surface (dark bg in light mode, light in dark) */
export const TOOLTIP = {
  panel:
    "bg-[var(--color-tooltip-bg)] text-[var(--color-tooltip-text)] rounded-xl px-3 py-2.5 shadow-xl",
  arrow: "w-2 h-2 bg-[var(--color-tooltip-bg)] rotate-45 -mt-1",
} as const;

/** Personality archetype badge */
export const PERSONALITY = {
  badge:
    "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-personality-bg)] border border-[var(--color-personality-border)] cursor-default select-none",
  text: "text-xs font-semibold text-[var(--color-personality-text)] whitespace-nowrap",
} as const;

/** Time-range filter pill */
export const TIME_PILL = {
  base: "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
  active: "bg-[var(--color-accent)] text-white shadow-sm",
  inactive:
    "bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-2)] hover:border-[var(--color-border-hover)] cursor-pointer",
  disabled:
    "bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-3)] cursor-not-allowed",
} as const;

/** Standard icon button (header toolbar, nav) */
export const ICON_BTN =
  "p-1.5 rounded-md text-[var(--color-text-3)] hover:text-[var(--color-text-2)] hover:bg-[var(--color-surface-raised)] transition-all duration-150 cursor-pointer" as const;

/** Decorative gradient background used by Search/ServerSearch pages */
export const SEARCH_PAGE_BG =
  "bg-gradient-to-br from-indigo-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30" as const;

/** Glassmorphism card used by Search/ServerSearch content panels */
export const GLASS_CARD =
  "rounded-2xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-700" as const;

/** Recharts tooltip contentStyle — use as contentStyle={CHART_TOOLTIP_STYLE} */
export const CHART_TOOLTIP_STYLE = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: "8px",
  fontSize: FONT.size.xs,
  padding: "6px 10px",
  color: C.text1,
  boxShadow: "none",
} as const;
