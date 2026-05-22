// Single source of truth for raw design token values.
// The Vite plugin reads this (via require) to regenerate generated-tokens.css
// whenever you save. Edit here to change colors and font sizes globally.
//
// This file MUST be .cjs so Node.js treats it as CommonJS even though the
// project has "type":"module". ESM export syntax prevents require() cache
// invalidation in the Vite plugin.
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
    // ── Surfaces ─────────────────────────────────────────────────────────
    bg:                '#f9fafb',  // oklch(0.985 0.008 255)
    surface:           '#ffffff',  // oklch(1.000 0.000 255)
    surfaceRaised:     '#f3f4f8',  // oklch(0.975 0.012 255)
 
    // ── Borders (alpha-based, adapt to any surface) ──────────────────────
    border:            'rgba(0,0,0,0.08)',
    borderHover:       'rgba(0,0,0,0.16)',
    borderSolid:       '#dde0e7',  // oklch(0.910 0.016 255)
 
    // ── Text hierarchy ───────────────────────────────────────────────────
    text1:             '#0c1322',  // oklch(0.180 0.040 255)
    text2:             '#5b6477',  // oklch(0.480 0.032 255)
    text3:             '#8f96a8',  // oklch(0.640 0.026 255)
 
    // ── Accent (violet, H = 285°) ────────────────────────────────────────
    accent:            '#6b48d6',  // oklch(0.550 0.210 285)
    accentHover:       '#7d5be1',  // oklch(0.600 0.200 285)
    accentActive:      '#5e3bc6',  // oklch(0.490 0.220 285)
    accentSoft:        'rgba(107,72,214,0.10)',
    accentText:        '#502aab',  // oklch(0.420 0.220 285)
    accentBorder:      'rgba(107,72,214,0.30)',
 
    // ── Semantic ─────────────────────────────────────────────────────────
    positive:          '#1ea05a',  // oklch(0.620 0.170 150)
    warning:           '#c98a1d',  // oklch(0.720 0.160 75)
    negative:          '#d3422b',  // oklch(0.580 0.200 25)
 
    // ── Personality (indigo, H = 270°, separate identity) ────────────────
    personalityBg:     'rgba(81,55,196,0.10)',
    personalityBorder: 'rgba(81,55,196,0.30)',
    personalityText:   '#3a1ea4',  // oklch(0.420 0.200 270)
 
    // ── Utility ──────────────────────────────────────────────────────────
    tooltipBg:         '#0c1322',  // = dark text1
    tooltipText:       '#f1f2f7',  // = dark text1 inverted
    scrollbar:         'rgba(143,150,168,0.25)',
    scrollbarHover:    'rgba(143,150,168,0.45)',
  },
 
  dark: {
    // ── Surfaces ─────────────────────────────────────────────────────────
    bg:                '#16191f',  // oklch(0.155 0.018 255)
    surface:           '#20242d',  // oklch(0.220 0.020 255)
    surfaceRaised:     '#2a2f3a',  // oklch(0.275 0.024 255)
 
    // ── Borders (alpha-based) ────────────────────────────────────────────
    border:            'rgba(255,255,255,0.07)',
    borderHover:       'rgba(255,255,255,0.14)',
    borderSolid:       '#363b48',  // oklch(0.330 0.024 255)
 
    // ── Text hierarchy ───────────────────────────────────────────────────
    text1:             '#f1f2f7',  // oklch(0.960 0.012 255)
    text2:             '#a8aebd',  // oklch(0.700 0.022 255)
    text3:             '#6d7488',  // oklch(0.500 0.024 255)
 
    // ── Accent (violet, brighter for dark) ───────────────────────────────
    accent:            '#9572e8',  // oklch(0.650 0.200 285)
    accentHover:       '#a684ee',  // oklch(0.700 0.190 285)
    accentActive:      '#7d5be1',  // oklch(0.590 0.210 285)
    accentSoft:        'rgba(149,114,232,0.18)',
    accentText:        '#bba1f0',  // oklch(0.780 0.170 285)
    accentBorder:      'rgba(149,114,232,0.40)',
 
    // ── Semantic (brighter, slightly less saturated for dark) ────────────
    positive:          '#3ec27d',  // oklch(0.720 0.160 150)
    warning:           '#e2a956',  // oklch(0.800 0.140 75)
    negative:          '#ea6749',  // oklch(0.680 0.190 25)
 
    // ── Personality (indigo, dark variant) ───────────────────────────────
    personalityBg:     'rgba(116,89,224,0.18)',
    personalityBorder: 'rgba(116,89,224,0.45)',
    personalityText:   '#b09ee9',  // oklch(0.780 0.160 270)
 
    // ── Utility ──────────────────────────────────────────────────────────
    tooltipBg:         '#f1f2f7',  // = light text1
    tooltipText:       '#0c1322',  // = light text1 inverted
    scrollbar:         'rgba(109,116,136,0.25)',
    scrollbarHover:    'rgba(109,116,136,0.45)',
  },
};

const FONT = {
  family:
    '"DM Sans", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',

  size: {
    '2xs': '0.72rem',   // metadata, timestamps
    "xs":    '0.82rem',   // secondary labels
    "sm":    '0.94rem',   // compact UI text
    "base":  '1.05rem',   // main readable body text
    "lg":    '1.16rem',   // emphasized body
    "xl":    '1.32rem',   // section headers
    '2xl': '1.62rem',   // major headers
    '3xl': '2rem',      // hero/title
  },
};
module.exports = { RAW, FONT };
