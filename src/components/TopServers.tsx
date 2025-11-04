import type { FC } from "react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";

interface ServerStats {
  serverId: string;
  name: string;
  totalMessages: number;
}

const TopServers: FC<{ className?: string }> = ({ className = "" }) => {
  const { data, isLoading } = useData();

  const topServers = useMemo(() => {
    if (!data) return [];

    const { channelStats, serverMapping } = data;
    const serverCounts: Record<string, number> = {};

    for (const [key, stats] of Object.entries(channelStats)) {
      if (!key.startsWith("channel_")) continue;
      
      const channelId = key.replace(/^channel_/, "");
      const total = Object.values(stats.hourly || {}).reduce(
        (sum, val) => sum + (val ?? 0),
        0
      );
      const type = data.channelMapping[channelId];
      if (type !== "GUILD_TEXT" && type !== "PUBLIC_THREAD" && type !== "GUILD_VOICE") continue;
      const serverId = serverMapping.channelToServer[channelId] ?? "unknown" + ` (${channelId})`;
      serverCounts[serverId] = (serverCounts[serverId] || 0) + total;
    }

    const serverStats: ServerStats[] = Object.entries(serverCounts).map(
      ([serverId, totalMessages]) => ({
        serverId,
        name: serverMapping.serverNames[serverId] ?? "Unknown Server" + ` (${serverId})`,
        totalMessages,
      })
    );

    return [...serverStats]
      .sort((a, b) => b.totalMessages - a.totalMessages)
      .slice(0, 10);
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`rounded-3xl ring-1 ring-slate-200 dark:ring-slate-700 bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl shadow-lg p-6 ${className}`}
    >
      <h2 className="mb-4 text-lg font-semibold leading-none text-slate-900 dark:text-slate-100">
        Top&nbsp;10&nbsp;Servers
      </h2>

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : !data ? (
        <div className="flex justify-center items-center h-32 text-slate-600 dark:text-slate-300">
          No data loaded.
        </div>
      ) : topServers.length === 0 ? (
        <div className="flex justify-center items-center h-32 text-slate-600 dark:text-slate-300">
          No servers found.
        </div>
      ) : (
        <table className="min-w-full table-auto text-base text-slate-700 dark:text-slate-200">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-700/40 text-left text-lg">
              <th className="px-4 py-2 font-medium">Rank</th>
              <th className="px-4 py-2 font-medium">Server</th>
              <th className="px-4 py-2 font-medium text-right">Messages</th>
            </tr>
          </thead>
          <tbody>
            {topServers.map((s, i) => (
              <tr
                key={s.serverId}
                className="even:bg-slate-50 dark:even:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <td className="px-6 py-3 font-semibold text-lg">#{i + 1}</td>
                <td className="px-6 py-3">{s.name}</td>
                <td className="px-6 py-3 text-indigo-600 dark:text-indigo-400 text-lg text-right">
                  {s.totalMessages.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </motion.div>
  );
};

export default TopServers;
