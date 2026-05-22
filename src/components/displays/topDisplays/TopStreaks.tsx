import type { FC } from "react";
import { useMemo } from "react";
import { useData } from "../../../context/DataContext";
import React from "react";
import TopDisplay from "./TopDisplay";
import MarqueeText from "../../text/MarqueeText";
import type { StreakStats } from "../../../types/discord";
import Avatar from "../../Avatar";
import type { DateRange } from "../../../utils/timeFilterUtils";
import { calculateStreak } from "../../../utils/streakUtils";

const TopStreaks: FC<{ className?: string; dateRange?: DateRange | null }> = ({ className = "", dateRange = null }) => {
  const { data } = useData();

  const streakStats = useMemo<StreakStats[]>(() => {
    if (!data) return [];
    const results: StreakStats[] = [];
    for (const [key, stats] of Object.entries(data.channelStats)) {
      if (!stats.recipientName || !key.startsWith("dm_")) continue;

      let longestStreak: number;
      let streakStart: string | null;
      let streakEnd: string | null;

      if (dateRange && stats.daily) {
        const filteredDates = new Set(
          Object.keys(stats.daily).filter(d => d >= dateRange.start && d <= dateRange.end)
        );
        const streak = calculateStreak(filteredDates);
        longestStreak = streak.length;
        streakStart = streak.start;
        streakEnd = streak.end;
      } else {
        longestStreak = stats.longestStreak ?? 0;
        streakStart = stats.streakStart ?? null;
        streakEnd = stats.streakEnd ?? null;
      }

      if (longestStreak <= 1) continue;

      const channelId = key.replace(/^dm_|\.json$/g, "");
      const userEntry = Object.entries(data.userMapping || {}).find(
        ([, info]) => info.username === stats.recipientName,
      );
      const userId = userEntry?.[0];
      const avatar = userId ? data.userMapping?.[userId]?.avatar || undefined : undefined;
      results.push({
        channelId,
        userId,
        name: stats.recipientName,
        avatar,
        longestStreak,
        streakStart: streakStart ?? "",
        streakEnd: streakEnd ?? "",
      });
    }
    return results
      .sort(
        (a, b) =>
          b.longestStreak - a.longestStreak ||
          new Date(b.streakEnd).getTime() - new Date(a.streakEnd).getTime(),
      )
      .slice(0, 10);
  }, [data, dateRange]);

  const rows = streakStats.map((s, i) => (
    <tr
      key={s.channelId}
      className="hover:bg-[var(--color-surface-raised)] transition-colors duration-100"
    >
      <td className="px-3 py-2.5 text-xs text-[var(--color-text-3)] tabular-nums whitespace-nowrap">
        {i + 1}
      </td>
      <td className="px-3 py-2.5 overflow-hidden min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            userId={s.userId}
            avatarHash={s.avatar}
            username={s.name}
            className="w-6 h-6 rounded-full shrink-0"
          />
          <div className="min-w-0 flex-1 overflow-hidden">
            <MarqueeText text={s.name} rotation="hover" className="text-sm text-[var(--color-text-1)]" />
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-[var(--color-accent)] font-mono tabular-nums whitespace-nowrap">
        {s.longestStreak}d
      </td>
      <td className="px-3 py-2.5 overflow-hidden min-w-0">
        <MarqueeText
          text={`${s.streakStart} → ${s.streakEnd}`}
          className="text-xs text-[var(--color-text-3)] font-mono"
          rotation="hover"
        />
      </td>
    </tr>
  ));

  return (
    <TopDisplay
      title="Top 10 Message Streaks"
      headers={["#", "User", "Days", "Range"]}
      colWidths={["12%", "auto", "14%", "auto"]}
      rows={rows}
      className={className}
      emptyMessage="No streaks found."
      noDataMessage="No data loaded. Please upload your Discord ZIP file first."
    />
  );
};

export default React.memo(TopStreaks);
