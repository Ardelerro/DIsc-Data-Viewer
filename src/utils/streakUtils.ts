function calculateStreak(dates: Set<string>) {
  if (dates.size === 0) return { length: 0, start: null, end: null };

  const sorted = Array.from(dates).sort();
  let longest = 1,
    current = 1;
  let start = sorted[0],
    tempStart = start,
    end = start;

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1]);
    const currDate = new Date(sorted[i]);
    const dayDiff = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDiff === 1) {
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