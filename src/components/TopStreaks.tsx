import type { FC } from "react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";
import React from "react";
import type { StreakStats } from "../types/discord";

const TopStreaks: FC<{ className?: string }> = ({ className = "" }) => {
  const { data } = useData();

  const streakStats = useMemo<StreakStats[]>(() => {
    if (!data) return [];

    const results: StreakStats[] = [];

    for (const [key, stats] of Object.entries(data.channelStats)) {
      if (!stats.recipientName) continue;

      const longestStreak = stats.longestStreak ?? 0;
      if (longestStreak <= 0) continue;

      if (!key.startsWith("dm_")) continue;

      const channelId = key.replace(/^dm_|\.json$/g, "");

      const userId = Object.entries(data.userMapping || {}).find(
        ([, info]) => info.username === stats.recipientName
      )?.[0];

      const avatar =
        userId && data.userMapping
          ? data.userMapping[userId]?.avatar
          : undefined;

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
      .slice()
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
      return `https://cdn.discordapp.com/embed/avatars/${
        Number(u.userId) % 5
      }.png`;
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  };

  if (!data)
    return (
      <div className="text-center text-slate-600 dark:text-slate-300 py-8">
        No data loaded. Please upload your Discord ZIP file first.
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`rounded-3xl ring-1 ring-slate-200 dark:ring-slate-700 bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl shadow-lg p-6 ${className}`}
    >
      <h2 className="mb-4 text-lg font-semibold leading-none text-slate-900 dark:text-slate-100">
        Top&nbsp;10&nbsp;Message&nbsp;Streaks
      </h2>

      {streakStats.length === 0 ? (
        <div className="flex justify-center items-center h-32 text-slate-600 dark:text-slate-300">
          No streaks found.
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="min-w-full table-fixed text-base text-slate-700 dark:text-slate-200">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-700/40 text-left text-lg">
                <th className="px-4 py-2 font-medium w-16">Rank</th>
                <th className="px-4 py-2 font-medium w-[16rem]">User</th>
                <th className="px-4 py-2 font-medium w-24">Days</th>
                <th className="px-4 py-2 font-medium w-[14rem]">Range</th>
              </tr>
            </thead>
            <tbody>
              {streakStats.map((s, i) => (
                <tr
                  key={s.channelId}
                  className="even:bg-slate-50 dark:even:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-6 py-3 font-semibold text-lg whitespace-nowrap">
                    #{i + 1}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap overflow-hidden text-ellipsis">
                    <div className="flex items-center gap-4">
                      <img
                        src={avatarUrl(s)}
                        alt={`${s.name}'s avatar`}
                        className="w-12 h-12 rounded-full shrink-0"
                        loading="lazy"
                      />
                      <span className="text-lg truncate block max-w-[10rem]">
                        {s.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-indigo-600 dark:text-indigo-400 text-lg whitespace-nowrap">
                    {s.longestStreak}
                  </td>
                  <td
                    className="px-6 py-3 text-slate-600 dark:text-slate-300 text-sm whitespace-nowrap overflow-hidden text-ellipsis"
                    title={`${s.streakStart} → ${s.streakEnd}`}
                  >
                    {s.streakStart} → {s.streakEnd}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(TopStreaks);
