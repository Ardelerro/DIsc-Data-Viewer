import type { FC } from "react";
import { useState, useMemo } from "react";
import HourlyChart from "../components/HourlyChart";
import MonthlyChart from "../components/MonthlyChart";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";

interface ChannelStats {
  hourly: Record<string, number>;
  monthly: Record<string, number>;
  recipientName?: string;
}

interface TopChannel {
  name: string;
  totalMessages: number;
}

const ServerSearch: FC = () => {
  const { data } = useData();
  const [selectedServer, setSelectedServer] = useState<string | null>(null);

    const serverOptions = useMemo(() => {
    if (!data) return [];

    return Object.entries(data.serverMapping.serverNames)
        .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB))
        .map(([id, name]) => (
        <option key={id} value={id}>
            {name}
        </option>
        ));
    }, [data]);

  const { aggregateData, topChannels } = useMemo(() => {
    if (!data || !selectedServer) return { aggregateData: null, topChannels: [] };

    const channelsInServer = Object.entries(data.serverMapping.channelToServer)
      .filter(([_, sid]) => sid === selectedServer)
      .map(([channelId]) => channelId);

    const allData: ChannelStats[] = [];
    for (const channelId of channelsInServer) {
      const stats = data.channelStats[`channel_${channelId}`];
      if (stats) {
        allData.push({
          ...stats,
          recipientName:
            data.channelNaming[channelId] || stats.recipientName || `#${channelId}`,
        });
      }
    }

    const merged: ChannelStats = { hourly: {}, monthly: {} };
    for (const d of allData) {
      for (const [hour, count] of Object.entries(d.hourly)) {
        merged.hourly[hour] = (merged.hourly[hour] || 0) + count;
      }
      for (const [month, count] of Object.entries(d.monthly)) {
        merged.monthly[month] = (merged.monthly[month] || 0) + count;
      }
    }

    const channelTotals: TopChannel[] = allData
      .map((d) => ({
        name: d.recipientName ?? "Unknown",
        totalMessages: Object.values(d.hourly || {}).reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.totalMessages - a.totalMessages)
      .slice(0, 10);

    return { aggregateData: merged, topChannels: channelTotals };
  }, [data, selectedServer]);

  if (!data)
    return (
      <div className="text-center text-slate-600 dark:text-slate-300">
        No data loaded. Please upload your Discord ZIP file first.
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        Search Server Statistics
      </h1>

      <div className="mb-6">
        <label className="block mb-2 text-slate-700 dark:text-slate-300 font-medium">
          Select a server:
        </label>
        <select
          value={selectedServer ?? ""}
          onChange={(e) => setSelectedServer(e.target.value || null)}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          <option value="" disabled>
            -- Choose a server --
          </option>
          {serverOptions}
        </select>
      </div>

      {aggregateData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Aggregate Stats for{" "}
            <span className="text-indigo-600 dark:text-indigo-400">
              {data.serverMapping.serverNames[selectedServer!]}
            </span>
          </h2>

          <HourlyChart data={aggregateData.hourly} />
          <MonthlyChart data={aggregateData.monthly} />

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Top Channels
            </h3>
            <table className="min-w-full table-auto text-base text-slate-700 dark:text-slate-200">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700/40 text-left text-lg">
                  <th className="px-4 py-2 font-medium">Rank</th>
                  <th className="px-4 py-2 font-medium">Channel</th>
                  <th className="px-4 py-2 font-medium">Messages</th>
                </tr>
              </thead>
              <tbody>
                {topChannels.map((c, i) => (
                  <tr
                    key={c.name}
                    className="even:bg-slate-50 dark:even:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-6 py-3 font-semibold text-lg">#{i + 1}</td>
                    <td className="px-6 py-3">{c.name}</td>
                    <td className="px-6 py-3 text-indigo-600 dark:text-indigo-400 text-lg">
                      {c.totalMessages.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ServerSearch;
