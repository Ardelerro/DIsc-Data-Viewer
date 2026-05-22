export type TimePreset = "all" | "7d" | "30d" | "365d" | "custom";
export type DateRange = { start: string; end: string }; // YYYY-MM-DD

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

// anchorDate: YYYY-MM-DD to anchor the window to (e.g. last message date). Defaults to today.
export function getPresetRange(
  preset: Exclude<TimePreset, "all" | "custom">,
  anchorDate?: string
): DateRange {
  let end: Date;
  if (anchorDate) {
    const [y, m, d] = anchorDate.split("-").map(Number);
    end = new Date(y, m - 1, d);
  } else {
    end = new Date();
  }
  const start = new Date(end);

  if (preset === "7d") start.setDate(start.getDate() - 6);
  else if (preset === "30d") start.setDate(start.getDate() - 29);
  else start.setFullYear(start.getFullYear() - 1);

  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end),
  };
}

function sumDailyInRange(
  daily: Record<string, number>,
  range: DateRange
): number {
  const { start, end } = range;
  let total = 0;
  for (const [date, count] of Object.entries(daily)) {
    if (date >= start && date <= end) total += count;
  }
  return total;
}

function sumMonthlyInRange(monthly: Record<string, number>, range: DateRange): number {
  const startMonth = range.start.slice(0, 7);
  const endMonth = range.end.slice(0, 7);
  let total = 0;
  for (const [month, count] of Object.entries(monthly)) {
    if (month >= startMonth && month <= endMonth) total += count;
  }
  return total;
}

export function countInRange(
  stats: { daily?: Record<string, number>; monthly: Record<string, number> },
  range: DateRange | null,
): number {
  if (range === null) {
    return Object.values(stats.monthly).reduce((a, b) => a + b, 0);
  }
  if (stats.daily) {
    return sumDailyInRange(stats.daily, range);
  }
  return sumMonthlyInRange(stats.monthly, range);
}

export function filterMonthly(
  monthly: Record<string, number>,
  range: DateRange | null,
): Record<string, number> {
  if (!range) return monthly;
  const startMonth = range.start.slice(0, 7);
  const endMonth = range.end.slice(0, 7);
  return Object.fromEntries(
    Object.entries(monthly).filter(([m]) => m >= startMonth && m <= endMonth),
  );
}
