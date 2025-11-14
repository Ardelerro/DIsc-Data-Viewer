import type { FC } from "react";
import { useMemo } from "react";
import { useData } from "../../context/DataContext";
import React from "react";
import TopDisplay from "./TopDisplay";
import type { UserStats } from "../../types/discord";

const TopUsers: FC<{ className?: string }> = ({ className = "" }) => {
  const { data } = useData();

  const userStats = useMemo<UserStats[]>(() => {
    if (!data) return [];

    const results: UserStats[] = [];
    for (const [key, stats] of Object.entries(data.channelStats)) {
      if (!stats.recipientName || !key.startsWith("dm_")) continue;

      const totalMessages = Object.values(stats.hourly || {}).reduce((a, b) => a + b, 0);
      const channelId = key.replace(/^dm_|\.json$/g, "");
      const userId = Object.entries(data.userMapping || {}).find(
        ([, info]) => info.username === stats.recipientName
      )?.[0];
      const avatar = userId ? data.userMapping?.[userId]?.avatar : undefined;

      results.push({ channelId, userId, name: stats.recipientName, avatar, count: totalMessages });
    }

    return results.sort((a, b) => b.count - a.count).slice(0, 10);
  }, [data]);

  const avatarUrl = (u: UserStats) => {
    if (u.userId && u.avatar)
      return `https://cdn.discordapp.com/avatars/${u.userId}/${u.avatar}.png?size=128`;
    if (u.userId)
      return `https://cdn.discordapp.com/embed/avatars/${Number(u.userId) % 5}.png`;
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  };

  const rows =
    userStats.length > 0
      ? userStats.map((u, i) => (
          <tr
            key={u.channelId}
            className="even:bg-slate-50 dark:even:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <td className="px-6 py-3 font-semibold text-lg">#{i + 1}</td>
            <td className="px-6 py-3 whitespace-nowrap">
              <div className="flex items-center gap-4">
                <img
                  src={avatarUrl(u)}
                  alt={`${u.name}'s avatar`}
                  className="w-12 h-12 rounded-full shrink-0"
                  loading="lazy"
                />
                <span className="text-lg">{u.name}</span>
              </div>
            </td>
            <td className="px-6 py-3 text-indigo-600 dark:text-indigo-400 text-lg text-right">
              {u.count.toLocaleString()}
            </td>
          </tr>
        ))
      : [];

  return (
    <TopDisplay
      title="Top 10 Messaged Users"
      headers={["Rank", "User", "Messages"]}
      rows={rows}
      className={className}
      emptyMessage="No DM stats found."
      noDataMessage="No data loaded. Please upload your Discord ZIP file first."
    />
  );
};

export default React.memo(TopUsers);
