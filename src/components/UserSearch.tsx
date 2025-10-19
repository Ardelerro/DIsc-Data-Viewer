import type { FC } from "react";
import { useState, useMemo } from "react";
import HourlyChart from "../components/HourlyChart";
import MonthlyChart from "../components/MonthlyChart";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";

interface ChannelStats {
  hourly: Record<string, number>;
  monthly: Record<string, number>;
  recipientName: string;
  averageGapBetweenMessages?: number;
}

const UserSearch: FC = () => {
  const { data } = useData();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const userOptions = useMemo(() => {
    if (!data) return [];

    return Object.entries(data.channelStats)
      .filter(([_, entry]) => entry.recipientName)
      .map(([key, entry]) => ({
        key,
        name: entry.recipientName,
      }))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")) 
      .map(({ key, name }) => (
        <option key={key} value={key}>
          {name}
        </option>
      ));
  }, [data]);

  const channelData = useMemo<ChannelStats | null>(() => {
    if (!data || !selectedUser) return null;
    return (data.channelStats[selectedUser] as ChannelStats) || null;
  }, [data, selectedUser]);

  const totalMessages = useMemo(() => {
    if (!channelData) return 0;
    return Object.values(channelData.hourly).reduce((sum, count) => sum + count, 0);
  }, [channelData]);

  if (!data)
    return (
      <div className="text-center text-slate-600 dark:text-slate-300">
        No data loaded. Please upload your Discord ZIP file first.
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto px-4">
      <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-8">
        Search Direct Messages by User
      </h1>

      <div className="mb-8">
        <label className="block mb-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
          Select a user
        </label>
        <select
          value={selectedUser ?? ""}
          onChange={(e) => setSelectedUser(e.target.value || null)}
          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-shadow"
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
          <h2 className="text-2xl font-medium text-slate-800 dark:text-slate-100">
            DM with{" "}
            <span className="text-indigo-600 dark:text-indigo-400">
              {channelData.recipientName}
            </span>
          </h2>

          {channelData.averageGapBetweenMessages && (
            <div className="pt-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Average Time Between Messages:{" "}
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {Math.round(channelData.averageGapBetweenMessages / 60)} minutes
                </span>
              </p>
            </div>
          )}

          <div className="pt-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Total Messages Sent:{" "}
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {totalMessages}
              </span>
            </p>
          </div>

          <HourlyChart data={channelData.hourly} />
          <MonthlyChart data={channelData.monthly} />
        </motion.div>
      )}
    </div>
  );
};

export default UserSearch;
