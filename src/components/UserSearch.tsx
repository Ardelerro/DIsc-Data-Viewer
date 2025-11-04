import type { FC } from "react";
import { useState, useMemo } from "react";
import HourlyChart from "../components/HourlyChart";
import MonthlyChart from "../components/MonthlyChart";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";
import { User, MessageSquare, Clock, Calendar } from "lucide-react";
import Stat from "./Stat";
import SentimentBar from "./SentimentBar";

interface SentimentStats {
  average: number;
  positive: number;
  negative: number;
  neutral: number;
}

interface ChannelStats {
  hourly: Record<string, number>;
  monthly: Record<string, number>;
  recipientName: string;
  averageGapBetweenMessages?: number;
  sentiment?: SentimentStats;
  firstMessageTimestamp?: string;
}

const UserSearch: FC = () => {
  const { data } = useData();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const rankedUsers = useMemo(() => {
    if (!data) return [];

    const users = Object.entries(data.channelStats)
      .filter(([key]) => key.startsWith("dm_"))
      .filter(([_, entry]) => entry.recipientName)
      .map(([key, entry]) => {
        const total = Object.values(entry.hourly || {}).reduce(
          (sum, c) => sum + c,
          0
        );
        return { key, name: entry.recipientName, total };
      });

    users.sort((a, b) => b.total - a.total);

    return users.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
  }, [data]);

  const userOptions = useMemo(() => {
    return rankedUsers.map(({ key, name, rank }) => (
      <option key={key} value={key}>
        #{rank} — {name}
      </option>
    ));
  }, [rankedUsers]);

  const channelData = useMemo<ChannelStats | null>(() => {
    if (!data || !selectedUser) return null;
    return (data.channelStats[selectedUser] as ChannelStats) || null;
  }, [data, selectedUser]);

  const totalMessages = useMemo(() => {
    if (!channelData) return 0;
    return Object.values(channelData.hourly).reduce((sum, c) => sum + c, 0);
  }, [channelData]);

  const userRank = useMemo(() => {
    const user = rankedUsers.find((u) => u.key === selectedUser);
    return user ? user.rank : null;
  }, [rankedUsers, selectedUser]);

  if (!data)
    return (
      <div className="px-4 py-8 text-center text-slate-600 dark:text-slate-300">
        No data loaded. Please upload your Discord ZIP file first.
      </div>
    );

  function getFriendshipDurationMessage(
    firstTimestamp?: string
  ): string | null {
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
      return `You’ve known them for ${years} years${
        months > 0 ? ` and ${months} months` : ""
      }.`;
    if (years === 1)
      return `You’ve known them for 1 year${
        months > 0 ? ` and ${months} months` : ""
      }.`;
    if (months > 2) return `You’ve known them for ${months} months.`;
    if (months >= 1) return `You’ve known them for about a month.`;
    if (weeks > 1) return `You’ve known them for ${weeks} weeks.`;
    if (weeks === 1) return `You’ve known them for a week.`;
    if (diffDays > 2) return `You’ve known them for ${diffDays} days.`;
    if (diffDays === 1) return `You started chatting yesterday.`;
    return `You just started chatting!`;
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
            <User size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Search Direct Messages
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Explore your message history by user
            </p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block mb-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
            Select a user
          </label>
          <select
            value={selectedUser ?? ""}
            onChange={(e) => setSelectedUser(e.target.value || null)}
            className="w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:outline-none transition-all"
          >
            <option value="" disabled>
              Choose a user
            </option>
            {userOptions}
          </select>
        </div>

        {channelData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {channelData.recipientName}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Rank #{userRank} —{" "}
                {getFriendshipDurationMessage(
                  channelData.firstMessageTimestamp
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Stat
                icon={<MessageSquare />}
                label="Total Messages"
                value={totalMessages.toLocaleString()}
              />
              {channelData.averageGapBetweenMessages && (
                <Stat
                  icon={<Clock />}
                  label="Avg. Gap (min)"
                  value={Math.round(channelData.averageGapBetweenMessages / 60)}
                />
              )}
              {channelData.firstMessageTimestamp && (
                <Stat
                  icon={<Calendar />}
                  label="First Message"
                  value={new Date(
                    channelData.firstMessageTimestamp
                  ).toLocaleDateString()}
                />
              )}
            </div>

            {channelData.sentiment && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
                  Sentiment Overview
                </h3>

                <SentimentBar sentiment={channelData.sentiment} />
              </div>
            )}

            <HourlyChart data={channelData.hourly} />
            <MonthlyChart data={channelData.monthly} />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default UserSearch;
