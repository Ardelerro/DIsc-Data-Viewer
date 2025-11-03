import type { FC } from "react";
import { useState, useMemo } from "react";
import HourlyChart from "../components/HourlyChart";
import MonthlyChart from "../components/MonthlyChart";
import { AnimatePresence, motion } from "framer-motion";
import { useData } from "../context/DataContext";

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
}

const UserSearch: FC = () => {
  const { data } = useData();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

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
      <div className="text-center text-slate-600 dark:text-slate-300">
        No data loaded. Please upload your Discord ZIP file first.
      </div>
    );
  function mapSentimentToLogScale(value: number): number {
    const clamped = Math.max(-1, Math.min(1, value));

    const negThreshold = -0.15;
    const posThreshold = 0.15;

    const absVal = Math.abs(clamped);
    const absThreshold = 0.15;

    const norm =
      absVal > absThreshold
        ? (absVal - absThreshold) / (1 - absThreshold)
        : absVal / absThreshold;

    const logScaled = Math.log10(1 + 9 * norm) / Math.log10(10);

    if (clamped < negThreshold) {
      return 36.5 * (1 - logScaled); // 0–36.5%
    }

    if (clamped > posThreshold) {
      return 63.5 + 36.5 * logScaled; // 63.5–100%
    }

    const neutralNorm =
      (clamped - negThreshold) / (posThreshold - negThreshold);
    return 36.5 + neutralNorm * (63.5 - 36.5);
  }
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
            </span>{" "}
            {userRank && (
              <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">
                (Rank #{userRank})
              </span>
            )}
          </h2>

          {channelData.averageGapBetweenMessages && (
            <div className="pt-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Average Time Between Messages:{" "}
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {Math.round(channelData.averageGapBetweenMessages / 60)}{" "}
                  minutes
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

          {channelData.sentiment && (
            <div className="pt-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Sentiment Overview
              </h3>

              <div className="relative w-full overflow-visible">
                <div className="w-full h-4 rounded-full flex relative overflow-visible">
                  <div
                    className="flex-[0.365] bg-red-500 dark:bg-red-700 relative z-10"
                    onMouseEnter={() => setHovered("negative")}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <motion.div
                      className="absolute left-1/2 -translate-x-1/2"
                      initial={false}
                    >
                      <AnimatePresence>
                        {hovered === "negative" && (
                          <motion.div
                            key="neg"
                            initial={{ opacity: 0, y: 0 }}
                            animate={{ opacity: 1, y: 20 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            className="absolute left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-medium rounded-md px-2 py-1 shadow-md whitespace-nowrap"
                          >
                            {channelData.sentiment?.negative} messages
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>

                  <div
                    className="flex-[0.27] bg-yellow-400 dark:bg-yellow-600 relative z-10"
                    onMouseEnter={() => setHovered("neutral")}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <motion.div
                      className="absolute left-1/2 -translate-x-1/2"
                      initial={false}
                    >
                      <AnimatePresence>
                        {hovered === "neutral" && (
                          <motion.div
                            key="neu"
                            initial={{ opacity: 0, y: 0}}
                            animate={{ opacity: 1, y: -28 }}
                            exit={{ opacity: 0, y: 0 }}
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            className="absolute left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-xs font-medium rounded-md px-2 py-1 shadow-md whitespace-nowrap"
                          >
                            {channelData.sentiment?.neutral} messages
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>

                  <div
                    className="flex-[0.365] bg-green-500 dark:bg-green-700 relative z-10"
                    onMouseEnter={() => setHovered("positive")}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <motion.div
                      className="absolute left-1/2 -translate-x-1/2"
                      initial={false}
                    >
                      <AnimatePresence>
                        {hovered === "positive" && (
                          <motion.div
                            key="pos"
                            initial={{ opacity: 0, y: -6}}
                            animate={{ opacity: 1, y: 20 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            className="absolute left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-medium rounded-md px-2 py-1 shadow-md whitespace-nowrap"
                          >
                            {channelData.sentiment?.positive} messages
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                </div>

                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-black dark:bg-white"
                  style={{
                    left: `${mapSentimentToLogScale(
                      channelData.sentiment.average
                    )}%`,
                    transition: "left 0.3s ease",
                  }}
                ></div>

                <div
                  className="absolute -top-7 transform -translate-x-1/2"
                  style={{
                    left: `${mapSentimentToLogScale(
                      channelData.sentiment.average
                    )}%`,
                    transition: "left 0.3s ease",
                  }}
                >
                  <span
                    className={`text-sm font-semibold px-2 py-1 rounded-md shadow-md ${
                      channelData.sentiment.average > 0.15
                        ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                        : channelData.sentiment.average < -0.15
                        ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                        : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                    }`}
                  >
                    {channelData.sentiment.average.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mt-1">
                <span>Negative</span>
                <span>Neutral</span>
                <span>Positive</span>
              </div>
            </div>
          )}

          <HourlyChart data={channelData.hourly} />
          <MonthlyChart data={channelData.monthly} />
        </motion.div>
      )}
    </div>
  );
};

export default UserSearch;
