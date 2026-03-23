import type { FC } from "react";
import { useMemo } from "react";
import { useData } from "../../context/DataContext";
import React from "react";
import TopDisplay from "./TopDisplay";
import MarqueeText from "../text/MarqueeText";
import type { StreakStats } from "../../types/discord";
import Avatar from "../Avatar";

const TopStreaks: FC<{ className?: string }> = ({ className = "" }) => {
  const { data } = useData();

  const streakStats = useMemo<StreakStats[]>(() => {
    if (!data) return [];
    const results: StreakStats[] = [];
    for (const [key, stats] of Object.entries(data.channelStats)) {
      if (!stats.recipientName || !key.startsWith("dm_")) continue;
      const longestStreak = stats.longestStreak ?? 0;
      if (longestStreak <= 0) continue;
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
        streakStart: stats.streakStart ?? "",
        streakEnd: stats.streakEnd ?? "",
      });
    }
    return results
      .sort(
        (a, b) =>
          b.longestStreak - a.longestStreak ||
          new Date(b.streakEnd).getTime() - new Date(a.streakEnd).getTime(),
      )
      .slice(0, 10);
  }, [data]);

  const rows = streakStats.map((s, i) => (
    <tr
      key={s.channelId}
      className="even:bg-slate-50 dark:even:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <td className="px-4 py-3 font-semibold text-lg whitespace-nowrap">
        #{i + 1}
      </td>
      <td className="px-4 py-3 overflow-hidden min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            userId={s.userId}
            avatarHash={s.avatar}
            username={s.name}
            className="w-10 h-10 rounded-full shrink-0"
          />
          <div className="min-w-0 flex-1 overflow-hidden">
            <MarqueeText text={s.name} rotation="hover" className="text-base" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 text-base whitespace-nowrap pl-6">
        {s.longestStreak}
      </td>
      <td className="px-4 py-3 overflow-hidden min-w-0">
        <MarqueeText
          text={`${s.streakStart} → ${s.streakEnd}`}
          className="text-sm text-slate-600 dark:text-slate-300"
          rotation="hover"
        />
      </td>
    </tr>
  ));

  return (
    <TopDisplay
      title="Top 10 Message Streaks"
      headers={["Rank", "User", "Days", "Range"]}
      colWidths={["15%", "auto", "15%", "auto"]}
      rows={rows}
      className={className}
      emptyMessage="No streaks found."
      noDataMessage="No data loaded. Please upload your Discord ZIP file first."
    />
  );
};

export default React.memo(TopStreaks);