/*
const RAW = {
  light: {
    bg:                '#f8fafc',
    surface:           '#ffffff',
    surfaceRaised:     '#f1f5f9',
    border:            'rgba(0,0,0,0.08)',
    borderHover:       'rgba(0,0,0,0.16)',
    borderSolid:       '#e2e8f0',
    text1:             '#0f172a',
    text2:             '#475569',
    text3:             '#7f8ea3',
    accent:            '#2563eb',
    accentSoft:        'rgba(37,99,235,0.10)',
    positive:          '#15803d',
    negative:          '#b91c1c',
    tooltipBg:         '#0f172a',
    tooltipText:       '#ffffff',
    personalityBg:     '#eef2ff',
    personalityBorder: '#c7d2fe',
    personalityText:   '#4338ca',
    scrollbar:         'rgba(100,116,139,0.25)',
    scrollbarHover:    'rgba(100,116,139,0.45)',
  },
  dark: {
    bg:                '#0c1015',
    surface:           '#141f2b',
    surfaceRaised:     '#1a2638',
    border:            'rgba(255,255,255,0.06)',
    borderHover:       'rgba(255,255,255,0.13)',
    borderSolid:       '#2d3748',
    text1:             '#f1f5f9',
    text2:             '#94a3b8',
    text3:             '#64748b',
    accent:            '#3b82f6',
    accentSoft:        'rgba(59,130,246,0.10)',
    positive:          '#22c55e',
    negative:          '#ef4444',
    tooltipBg:         '#f1f5f9',
    tooltipText:       '#0f172a',
    personalityBg:     'rgba(67,56,202,0.15)',
    personalityBorder: '#3730a3',
    personalityText:   '#a5b4fc',
    scrollbar:         'rgba(100,116,139,0.25)',
    scrollbarHover:    'rgba(100,116,139,0.45)',
  },
};
*/
const RAW = {
  light: {
    bg: "#f9fafb",
    surface: "#ffffff",
    surfaceRaised: "#f3f4f8",

    border: "rgba(0,0,0,0.08)",
    borderHover: "rgba(0,0,0,0.16)",
    borderSolid: "#dde0e7",

    text1: "#0c1322",
    text2: "#5b6477",
    text3: "#8f96a8",

    accent: "#6b48d6",
    accentHover: "#7d5be1",
    accentActive: "#5e3bc6",
    accentSoft: "rgba(107,72,214,0.10)",
    accentText: "#502aab",
    accentBorder: "rgba(107,72,214,0.30)",

    positive: "#1ea05a",
    warning: "#c98a1d",
    negative: "#d3422b",

    personalityBg: "rgba(81,55,196,0.10)",
    personalityBorder: "rgba(81,55,196,0.30)",
    personalityText: "#3a1ea4",

    tooltipBg: "#0c1322",
    tooltipText: "#f1f2f7",
    scrollbar: "rgba(143,150,168,0.25)",
    scrollbarHover: "rgba(143,150,168,0.45)",
  },

  dark: {
    bg: "#16191f",
    surface: "#20242d",
    surfaceRaised: "#2a2f3a",

    border: "rgba(255,255,255,0.07)",
    borderHover: "rgba(255,255,255,0.14)",
    borderSolid: "#363b48",

    text1: "#f1f2f7",
    text2: "#a8aebd",
    text3: "#6d7488",

    accent: "#9572e8",
    accentHover: "#a684ee",
    accentActive: "#7d5be1",
    accentSoft: "rgba(149,114,232,0.18)",
    accentText: "#bba1f0",
    accentBorder: "rgba(149,114,232,0.40)",

    positive: "#3ec27d",
    warning: "#e2a956",
    negative: "#ea6749",

    personalityBg: "rgba(116,89,224,0.18)",
    personalityBorder: "rgba(116,89,224,0.45)",
    personalityText: "#b09ee9",

    tooltipBg: "#f1f2f7",
    tooltipText: "#0c1322",
    scrollbar: "rgba(109,116,136,0.25)",
    scrollbarHover: "rgba(109,116,136,0.45)",
  },
};

const FONT = {
  family: '"DM Sans", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',

  size: {
    "2xs": "0.72rem",
    xs: "0.82rem",
    sm: "0.94rem",
    base: "1.05rem",
    lg: "1.16rem",
    xl: "1.32rem",
    "2xl": "1.62rem",
    "3xl": "2rem",
  },
};
module.exports = { RAW, FONT };
