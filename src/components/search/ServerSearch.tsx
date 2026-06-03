import type { FC } from "react";
import { useState, useMemo } from "react";
import HourlyChart from "../charts/HourlyChart";
import MonthlyChart from "../charts/MonthlyChart";
import { motion } from "framer-motion";
import { useData } from "../../context/DataContext";
import { BookUser, MessageSquare, Clock, Calendar } from "lucide-react";
import type { ChannelStats, TopChannel } from "../../types/discord";
import StaggeredStatGrid from "../stats/StaggeredStatGrid";
import TimeRangeSelector from "../forms/TimeRangeSelector";
import {
  type DateRange,
  countInRange,
  filterMonthly,
  filterHourlyByRange,
} from "../../utils/uiUtils/timeFilterUtils";
import Search from "./Search";

const ServerSearch: FC = () => {
  const { data } = useData();
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

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
          0,
        );

        return { id, name, total };
      },
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
    [rankedServers],
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

    const merged: ChannelStats = { hourly: {}, monthly: {}, dailyHourly: {} };
    for (const d of allData) {
      for (const [hour, count] of Object.entries(d.hourly)) {
        merged.hourly[hour] = (merged.hourly[hour] || 0) + count;
      }
      for (const [month, count] of Object.entries(d.monthly)) {
        merged.monthly[month] = (merged.monthly[month] || 0) + count;
      }
      if (d.dailyHourly) {
        for (const [date, hours] of Object.entries(d.dailyHourly)) {
          const row =
            merged.dailyHourly![date] || (merged.dailyHourly![date] = {});
          for (const [h, c] of Object.entries(hours)) {
            row[h] = (row[h] || 0) + c;
          }
        }
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
    return countInRange(aggregateData, dateRange);
  }, [aggregateData, dateRange]);

  const filteredMonthly = useMemo(
    () =>
      aggregateData ? filterMonthly(aggregateData.monthly, dateRange) : {},
    [aggregateData, dateRange],
  );

  const filteredHourly = useMemo(() => {
    if (!aggregateData) return {};
    if (!dateRange) return aggregateData.hourly;
    const dh = aggregateData.dailyHourly;
    if (!dh) return aggregateData.hourly;
    return filterHourlyByRange(dh, dateRange);
  }, [aggregateData, dateRange]);

  const lastDataDate = useMemo(() => {
    if (!aggregateData) return undefined;
    const keys = Object.keys(aggregateData.monthly).sort();
    return keys.length > 0 ? `${keys[keys.length - 1]}-01` : undefined;
  }, [aggregateData]);

  const selectedName = useMemo(() => {
    return rankedServers.find((s) => s.id === selectedServer)?.name ?? null;
  }, [rankedServers, selectedServer]);

  const serverRank = useMemo(() => {
    return rankedServers.find((s) => s.id === selectedServer)?.rank ?? null;
  }, [rankedServers, selectedServer]);

  if (!data)
    return (
      <div className="px-4 py-8 text-center text-[var(--color-text-2)]">
        No data loaded. Please upload your Discord ZIP file first.
      </div>
    );

  function getAllianceDurationMessage(firstTimestamp?: string): string | null {
    if (!firstTimestamp) return null;
    const first = new Date(firstTimestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24),
    );
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const weeks = Math.floor((diffDays % 30) / 7);
    if (years > 1)
      return `You've been in this server for ${years} years${months > 0 ? ` and ${months} months` : ""}.`;
    if (years === 1)
      return `You've been in this server for 1 year${months > 0 ? ` and ${months} months` : ""}.`;
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
      .map(([channelId]) => data.channelStats[`channel_${channelId}`])
      .filter(Boolean) as ChannelStats[];

    const timestamps = channelsInServer
      .map((c) => c.firstMessageTimestamp)
      .filter((ts): ts is string => Boolean(ts));

    return timestamps.sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    )[0];
  }

  return (
    <Search
      icon={<BookUser size={24} />}
      title="Search Servers"
      subtitle="Explore your message history by server"
      animationKey={selectedServer}
    >
      <div className="mb-6">
        <label className="block mb-3 text-sm text-[var(--color-text-2)] font-medium">
          Select a server
        </label>
        <motion.select
          value={selectedServer ?? ""}
          onChange={(e) => setSelectedServer(e.target.value || null)}
          className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-solid)] text-[var(--color-text-1)] focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none transition-all"
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
            <h2 className="text-2xl font-semibold text-[var(--color-text-1)]">
              {selectedName}
            </h2>
            <p className="text-sm text-[var(--color-text-3)]">
              Rank #{serverRank} —{" "}
              {getAllianceDurationMessage(
                getFirstTimestampFromChannels() || undefined,
              ) || "No messages found in this server."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TimeRangeSelector
              hasDaily={false}
              anchorDate={lastDataDate}
              onChange={setDateRange}
            />
          </div>

          <StaggeredStatGrid
            StatDisplays={[
              {
                icon: <MessageSquare />,
                label: "Total Messages",
                value: totalMessages.toLocaleString(),
              },
              {
                icon: <Clock />,
                label: "Active Channels",
                value: topChannels.length.toLocaleString(),
              },
              {
                icon: <Calendar />,
                label: "Months Active",
                value: Object.keys(filteredMonthly).length.toString(),
              },
            ]}
          />

          <HourlyChart data={filteredHourly} />
          <MonthlyChart data={filteredMonthly} />

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-1)] mb-4">
              Top Channels
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto text-sm text-[var(--color-text-1)]">
                <thead>
                  <tr className="bg-[var(--color-surface-raised)] text-left">
                    <th className="px-4 py-2 font-medium">Rank</th>
                    <th className="px-4 py-2 font-medium">Channel</th>
                    <th className="px-4 py-2 font-medium">Messages</th>
                  </tr>
                </thead>
                <tbody>
                  {topChannels.map((c, i) => (
                    <motion.tr
                      key={c.name}
                      className="hover:bg-[var(--color-accent-soft)] transition-colors cursor-pointer"
                      whileHover={{ scale: 1.01 }}
                    >
                      <td className="px-6 py-3 font-semibold text-[var(--color-text-2)]">
                        #{i + 1}
                      </td>
                      <td className="px-6 py-3">{c.name}</td>
                      <td className="px-6 py-3 text-[var(--color-accent)] font-medium">
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
    </Search>
  );
};

export default ServerSearch;
