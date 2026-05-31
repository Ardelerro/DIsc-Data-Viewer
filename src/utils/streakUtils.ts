function nextDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}-${(next.getMonth() + 1).toString().padStart(2, "0")}-${next.getDate().toString().padStart(2, "0")}`;
}

function calculateStreak(dates: Set<string>) {
  if (dates.size === 0) return { length: 0, start: null, end: null };

  const sorted = Array.from(dates).sort();
  let longest = 1,
    current = 1;
  let start = sorted[0],
    tempStart = start,
    end = start;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === nextDay(sorted[i - 1])) {
      current++;
      if (current > longest) {
        longest = current;
        start = tempStart;
        end = sorted[i];
      }
    } else {
      current = 1;
      tempStart = sorted[i];
    }
  }

  return { length: longest, start, end };
}

export { calculateStreak };
