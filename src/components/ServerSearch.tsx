import type { FC } from "react";
import { useState, useMemo } from "react";
import HourlyChart from "../components/HourlyChart";
import MonthlyChart from "../components/MonthlyChart";
import { motion, AnimatePresence } from "framer-motion";
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

  const selectedName =
    selectedServer && data.serverMapping.serverNames[selectedServer]
      ? data.serverMapping.serverNames[selectedServer]
      : null;

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-8">
        Server Statistics
      </h1>

      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <label className="block mb-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
          Select a server
        </label>
        <motion.select
          value={selectedServer ?? ""}
          onChange={(e) => setSelectedServer(e.target.value || null)}
          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-indigo-500"
          whileFocus={{ scale: 1.02 }}
        >
          <option value="" disabled>
            -- Choose a server --
          </option>
          {serverOptions}
        </motion.select>

        <AnimatePresence mode="wait">
          {selectedName && (
            <motion.p
              key={selectedName}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
              className="mt-2 text-sm text-slate-500 dark:text-slate-400"
            >
              Viewing stats for <span className="font-medium">{selectedName}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {aggregateData && (
          <motion.div
            key="charts"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                Aggregate Activity for{" "}
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {selectedName}
                </span>
              </h2>
            </div>

            <motion.div
              className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl shadow-sm p-4 hover:shadow-md transition-all"
              whileHover={{ scale: 1.01 }}
            >
              <HourlyChart data={aggregateData.hourly} />
            </motion.div>

            <motion.div
              className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl shadow-sm p-4 hover:shadow-md transition-all"
              whileHover={{ scale: 1.01 }}
            >
              <MonthlyChart data={aggregateData.monthly} />
            </motion.div>

            <motion.div
              className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl shadow-sm p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
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
                    <motion.tr
                      key={c.name}
                      className="even:bg-slate-50 dark:even:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      whileHover={{ scale: 1.01 }}
                    >
                      <td className="px-6 py-3 font-semibold text-lg text-slate-600 dark:text-slate-300">
                        #{i + 1}
                      </td>
                      <td className="px-6 py-3">{c.name}</td>
                      <td className="px-6 py-3 text-indigo-600 dark:text-indigo-400 text-lg font-medium">
                        {c.totalMessages.toLocaleString()}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServerSearch;
