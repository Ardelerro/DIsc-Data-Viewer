import type { FC } from "react";
import { useState, useMemo } from "react";
import HourlyChart from "../components/HourlyChart";
import MonthlyChart from "../components/MonthlyChart";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";
import { BookUser, MessageSquare, Clock, Calendar } from "lucide-react";
import Stat from "./Stat";
import type { ChannelStats, TopChannel } from "../types/discord";

const ServerSearch: FC = () => {
  const { data } = useData();
  const [selectedServer, setSelectedServer] = useState<string | null>(null);

  const rankedServers = useMemo(() => {
    if (!data) return [];

    const serverTotals = Object.entries(data.serverMapping.serverNames).map(
      ([id, name]) => {
        const channels = Object.entries(data.serverMapping.channelToServer)
          .filter(([_, sid]) => sid === id)
          .map(([channelId]) => data.channelStats[`channel_${channelId}`])
          .filter(Boolean) as ChannelStats[];

        const total = channels.reduce(
          (sum, c) =>
            sum + Object.values(c.hourly || {}).reduce((a, b) => a + b, 0),
          0
        );

        return { id, name, total };
      }
    );

    serverTotals.sort((a, b) => b.total - a.total);
    return serverTotals.map((s, i) => ({ ...s, rank: i + 1 }));
  }, [data]);

  const serverOptions = useMemo(
    () =>
      rankedServers.map(({ id, name, rank }) => (
        <option key={id} value={id}>
          #{rank} — {name}
        </option>
      )),
    [rankedServers]
  );

  const { aggregateData, topChannels } = useMemo(() => {
    if (!data || !selectedServer)
      return { aggregateData: null, topChannels: [] };

    const channelsInServer = Object.entries(data.serverMapping.channelToServer)
      .filter(([_, sid]) => sid === selectedServer)
      .map(([channelId]) => channelId);

    const allData: ChannelStats[] = [];
    for (const channelId of channelsInServer) {
      const stats = data.channelStats[`channel_${channelId}`];
      console.log("Channel stats for", channelId, ":", stats);
      if (stats) {
        allData.push({
          ...stats,
          recipientName:
            data.channelNaming[channelId] ||
            stats.recipientName ||
            `#${channelId}`,
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

    const topChannels: TopChannel[] = allData
      .map((d) => ({
        name: d.recipientName ?? "Unknown",
        totalMessages: Object.values(d.hourly || {}).reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.totalMessages - a.totalMessages)
      .slice(0, 10);

    return { aggregateData: merged, topChannels };
  }, [data, selectedServer]);

  const totalMessages = useMemo(() => {
    if (!aggregateData) return 0;
    return Object.values(aggregateData.hourly).reduce((a, b) => a + b, 0);
  }, [aggregateData]);

  const selectedName = useMemo(() => {
    const match = rankedServers.find((s) => s.id === selectedServer);
    return match ? match.name : null;
  }, [rankedServers, selectedServer]);

  const serverRank = useMemo(() => {
    const match = rankedServers.find((s) => s.id === selectedServer);
    return match ? match.rank : null;
  }, [rankedServers, selectedServer]);

  if (!data)
    return (
      <div className="px-4 py-8 text-center text-slate-600 dark:text-slate-300">
        No data loaded. Please upload your Discord ZIP file first.
      </div>
    );

  function getAllianceDurationMessage(firstTimestamp?: string): string | null {
    if (!firstTimestamp) return null;
    const first = new Date(firstTimestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)
    );

    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const weeks = Math.floor((diffDays % 30) / 7);

    if (years > 1)
      return `You've been in this server for ${years} years${
        months > 0 ? ` and ${months} months` : ""
      }.`;
    if (years === 1)
      return `You've been in this server for 1 year${
        months > 0 ? ` and ${months} months` : ""
      }.`;
    if (months > 2) return `You've been in this server for ${months} months.`;
    if (months >= 1) return `You've been in this server for about a month.`;
    if (weeks > 1) return `You've been in this server for ${weeks} weeks.`;
    if (weeks === 1) return `You've been in this server for a week.`;
    if (diffDays > 2) return `You've been in this server for ${diffDays} days.`;
    if (diffDays === 1) return `You joined yesterday.`;
    return `You just joined!`;
  }

  function getFirstTimestampFromChannels(): string | null {
    if (!data || !selectedServer) return null;
    
    const channelsInServer = Object.entries(data.serverMapping.channelToServer)
      .filter(([_, sid]) => sid === selectedServer)
      .map(([channelId]) => {
        const statsKey = `channel_${channelId}`;
        const stats = data.channelStats[statsKey];
        console.log(`Channel ${channelId} (${statsKey}):`, {
          exists: !!stats,
          firstMessageTimestamp: stats?.firstMessageTimestamp,
          recipientName: stats?.recipientName
        });
        return stats;
      })
      .filter(Boolean) as ChannelStats[];
    
    
    const timestamps = channelsInServer
      .map((c) => c.firstMessageTimestamp)
      .filter((ts): ts is string => {
        const isValid = Boolean(ts);
        if (!isValid) console.log("Filtered out null/undefined timestamp");
        return isValid;
      });
    
    
    const firstTimestamp = timestamps
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
    
    return firstTimestamp;
  }

  return (
    <div className="max-w-5xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="p-6 rounded-2xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-700"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <BookUser size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Search Servers
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Explore your message history by server
            </p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block mb-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
            Select a server
          </label>
          <motion.select
            value={selectedServer ?? ""}
            onChange={(e) => setSelectedServer(e.target.value || null)}
            className="w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:outline-none transition-all"
            whileFocus={{ scale: 1.02 }}
          >
            <option value="" disabled>
              Choose a server
            </option>
            {serverOptions}
          </motion.select>
        </div>

        {aggregateData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {selectedName}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Rank #{serverRank} —{" "}
                {getAllianceDurationMessage(
                  getFirstTimestampFromChannels() || undefined
                ) || "No messages found in this server."}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Stat
                icon={<MessageSquare />}
                label="Total Messages"
                value={totalMessages.toLocaleString()}
              />
              <Stat
                icon={<Clock />}
                label="Active Channels"
                value={topChannels.length.toLocaleString()}
              />
              {aggregateData.monthly && (
                <Stat
                  icon={<Calendar />}
                  label="Months Active"
                  value={Object.keys(aggregateData.monthly).length.toString()}
                />
              )}
            </div>

            <HourlyChart data={aggregateData.hourly} />
            <MonthlyChart data={aggregateData.monthly} />

            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                Top Channels
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto text-sm text-slate-700 dark:text-slate-200">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-700/40 text-left">
                      <th className="px-4 py-2 font-medium">Rank</th>
                      <th className="px-4 py-2 font-medium">Channel</th>
                      <th className="px-4 py-2 font-medium">Messages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topChannels.map((c, i) => (
                      <motion.tr
                        key={c.name}
                        className="even:bg-white/50 dark:even:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                        whileHover={{ scale: 1.01 }}
                      >
                        <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">
                          #{i + 1}
                        </td>
                        <td className="px-6 py-3">{c.name}</td>
                        <td className="px-6 py-3 text-indigo-600 dark:text-indigo-400 font-medium">
                          {c.totalMessages.toLocaleString()}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ServerSearch;
