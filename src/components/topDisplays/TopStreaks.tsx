import type { FC } from "react";
import { useMemo } from "react";
import { useData } from "../../context/DataContext";
import React from "react";
import TopDisplay from "./TopDisplay";
import type { StreakStats } from "../../types/discord";

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
      const userId = Object.entries(data.userMapping || {}).find(
        ([, info]) => info.username === stats.recipientName
      )?.[0];
      const avatar = userId ? data.userMapping?.[userId]?.avatar : undefined;

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
          new Date(b.streakEnd).getTime() - new Date(a.streakEnd).getTime()
      )
      .slice(0, 10);
  }, [data]);

  const avatarUrl = (u: StreakStats) => {
    if (u.userId && u.avatar)
      return `https://cdn.discordapp.com/avatars/${u.userId}/${u.avatar}.png?size=128`;
    if (u.userId)
      return `https://cdn.discordapp.com/embed/avatars/${Number(u.userId) % 5}.png`;
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  };

  const rows =
    streakStats.length > 0
      ? streakStats.map((s, i) => (
          <tr
            key={s.channelId}
            className="even:bg-slate-50 dark:even:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <td className="px-6 py-3 font-semibold text-lg whitespace-nowrap">#{i + 1}</td>
            <td className="px-6 py-3 whitespace-nowrap">
              <div className="flex items-center gap-4">
                <img
                  src={avatarUrl(s)}
                  alt={`${s.name}'s avatar`}
                  className="w-12 h-12 rounded-full shrink-0"
                  loading="lazy"
                />
                <span className="text-lg truncate block max-w-[10rem]">{s.name}</span>
              </div>
            </td>
            <td className="px-6 py-3 text-indigo-600 dark:text-indigo-400 text-lg whitespace-nowrap">
              {s.longestStreak}
            </td>
            <td
              className="px-6 py-3 text-slate-600 dark:text-slate-300 text-sm whitespace-nowrap"
              title={`${s.streakStart} → ${s.streakEnd}`}
            >
              {s.streakStart} → {s.streakEnd}
            </td>
          </tr>
        ))
      : [];

  return (
    <TopDisplay
      title="Top 10 Message Streaks"
      headers={["Rank", "User", "Days", "Range"]}
      rows={rows}
      className={className}
      emptyMessage="No streaks found."
      noDataMessage="No data loaded. Please upload your Discord ZIP file first."
    />
  );
};

export default React.memo(TopStreaks);
