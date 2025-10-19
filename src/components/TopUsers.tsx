import type { FC } from "react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";

interface UserStats {
  channelId: string;
  userId?: string;
  name: string;
  avatar?: string;
  count: number;
}

const TopUsers: FC<{ className?: string }> = ({ className = "" }) => {
  const { data } = useData();

  const userStats = useMemo<UserStats[]>(() => {
    if (!data) return [];

    const results: UserStats[] = [];

    for (const [key, stats] of Object.entries(data.channelStats)) {
      if (!stats.recipientName) continue;

      if (!key.startsWith("dm_")) continue;

      const totalMessages = Object.values(stats.hourly || {}).reduce(
        (a, b) => a + b,
        0
      );

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
        count: totalMessages,
      });
    }

    return results;
  }, [data]);

  const topUsers = useMemo(() => {
    return userStats
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [userStats]);

  const avatarUrl = (u: UserStats): string => {
    if (u.userId && u.avatar)
      return `https://cdn.discordapp.com/avatars/${u.userId}/${u.avatar}.png?size=128`;
    if (u.userId)
      return `https://cdn.discordapp.com/embed/avatars/${Number(u.userId) % 5}.png`;
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
        Top&nbsp;10&nbsp;Messaged&nbsp;Users
      </h2>

      {topUsers.length === 0 ? (
        <div className="flex justify-center items-center h-32 text-slate-600 dark:text-slate-300">
          No DM stats found.
        </div>
      ) : (
        <table className="min-w-full table-auto text-base text-slate-700 dark:text-slate-200">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-700/40 text-left text-lg">
              <th className="px-4 py-2 font-medium">Rank</th>
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium text-right">Messages</th>
            </tr>
          </thead>
          <tbody>
            {topUsers.map((u, i) => (
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
            ))}
          </tbody>
        </table>
      )}
    </motion.div>
  );
};

export default TopUsers;