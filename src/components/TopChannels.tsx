import type { FC } from "react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";

interface ChannelInfo {
  channelId: string;
  name: string;
  totalMessages: number;
  serverName: string;
}

const TopChannels: FC<{ className?: string }> = ({ className = "" }) => {
  const { data } = useData();

  const topChannels = useMemo<ChannelInfo[]>(() => {
    if (!data?.channelStats || !data?.serverMapping) return [];

    const results: ChannelInfo[] = [];

    for (const [key, stats] of Object.entries(data.channelStats)) {
      if (!key.startsWith("channel_")) continue;

      const total = Object.values(stats.hourly || {}).reduce((a, b) => a + b, 0);
      const channelId = key.replace(/^channel_|\.json$/g, "");

      const serverId = data.serverMapping.channelToServer[channelId];
      const serverName = data.serverMapping.serverNames[serverId] || "";

      const resolvedName =
        (data.channelNaming && data.channelNaming[channelId]) ||
        stats.recipientName ||
        `#${channelId}`;

      results.push({
        channelId,
        name: resolvedName,
        totalMessages: total,
        serverName,
      });
    }

    return results
      .slice()
      .sort((a, b) => b.totalMessages - a.totalMessages)
      .slice(0, 10);
  }, [data]);

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
        Top&nbsp;10&nbsp;Channels
      </h2>

      {topChannels.length === 0 ? (
        <div className="flex justify-center items-center h-32 text-slate-600 dark:text-slate-300">
          No channels found.
        </div>
      ) : (
        <table className="min-w-full table-auto text-base text-slate-700 dark:text-slate-200">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-700/40 text-left text-lg">
              <th className="px-4 py-2 font-medium">Rank</th>
              <th className="px-4 py-2 font-medium">Channel</th>
              <th className="px-4 py-2 font-medium">Server</th>
              <th className="px-4 py-2 font-medium text-right">Messages</th>
            </tr>
          </thead>
          <tbody>
            {topChannels.map((c, i) => (
              <tr
                key={c.channelId}
                className="even:bg-slate-50 dark:even:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <td className="px-6 py-3 font-semibold text-lg">#{i + 1}</td>
                <td className="px-6 py-3">{c.name}</td>
                <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                  {c.serverName || ""}
                </td>
                <td className="px-6 py-3 text-indigo-600 dark:text-indigo-400 text-right text-lg">
                  {c.totalMessages.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </motion.div>
  );
};

export default TopChannels;
