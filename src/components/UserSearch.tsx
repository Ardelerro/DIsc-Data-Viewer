import type { FC } from "react";
import { useState, useMemo } from "react";
import HourlyChart from "./charts/HourlyChart";
import MonthlyChart from "./charts/MonthlyChart";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";
import { User, MessageSquare, Clock, Calendar, Settings } from "lucide-react";
import Stat from "./Stat";
import SentimentBar from "./charts/SentimentBar";
import type { ChannelStats } from "../types/discord";
import SettingsModal from "./SettingsModal";
import StaggeredStatGrid from "./StaggeredStatGrid";
import UserCombobox from "./UserComboBox";
import Avatar from "./Avatar";

const UserSearch: FC = () => {
  const { data } = useData();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [rankingType, setRankingType] = useState<"messages" | "sentiment">(
    "messages",
  );
  const [minMessages, setMinMessages] = useState<number>(100);
  const [showSettings, setShowSettings] = useState(false);
  const [showElements, setShowElements] = useState({
    hourly: true,
    monthly: true,
    sentiment: true,
  });

  const rankedUsers = useMemo(() => {
    if (!data) return [];

    // Build a reverse map: username -> { userId, avatarHash }
    const usernameToUser: Record<string, { userId: string; avatarHash?: string }> = {};
    for (const [userId, info] of Object.entries(data.userMapping || {})) {
      usernameToUser[info.username] = { userId, avatarHash: info.avatar || undefined };
    }

    let users: {
      key: string;
      userId?: string;
      avatarHash?: string;
      name: string | undefined;
      total: number;
      messageCount?: number;
    }[] = [];

    if (rankingType === "messages") {
      users = Object.entries(data.channelStats)
        .filter(([key]) => key.startsWith("dm_"))
        .filter(([_, entry]) => entry.recipientName)
        .map(([key, entry]) => {
          const total = Object.values(entry.hourly || {}).reduce(
            (sum, c) => sum + c,
            0,
          );
          const mapped = entry.recipientName
            ? usernameToUser[entry.recipientName]
            : undefined;
          return {
            key,
            userId: mapped?.userId,
            avatarHash: mapped?.avatarHash,
            name: entry.recipientName,
            total,
          };
        });
    } else {
      users = Object.entries(data.channelStats)
        .filter(([key]) => key.startsWith("dm_"))
        .filter(([_, entry]) => entry.recipientName)
        .map(([key, entry]) => {
          const messageCount = Object.values(entry.hourly || {}).reduce(
            (sum, c) => sum + c,
            0,
          );
          const mapped = entry.recipientName
            ? usernameToUser[entry.recipientName]
            : undefined;
          return {
            key,
            userId: mapped?.userId,
            avatarHash: mapped?.avatarHash,
            name: entry.recipientName,
            total: entry.sentiment?.average ?? 0,
            messageCount,
          };
        })
        .filter((user) => (user.messageCount ?? 0) >= minMessages);
    }

    users.sort((a, b) => b.total - a.total);

    return users.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
  }, [data, rankingType, minMessages]);

  const channelData = useMemo<ChannelStats | null>(() => {
    if (!data || !selectedUser) return null;
    return (data.channelStats[selectedUser] as ChannelStats) || null;
  }, [data, selectedUser]);

  const totalMessages = useMemo(() => {
    if (!channelData) return 0;
    return Object.values(channelData.hourly).reduce((sum, c) => sum + c, 0);
  }, [channelData]);

  const selectedUserInfo = useMemo(() => {
    return rankedUsers.find((u) => u.key === selectedUser) ?? null;
  }, [rankedUsers, selectedUser]);

  const userRank = selectedUserInfo?.rank ?? null;

  if (!data)
    return (
      <div className="px-4 py-8 text-center text-slate-600 dark:text-slate-300">
        No data loaded. Please upload your Discord ZIP file first.
      </div>
    );

  function getFriendshipDurationMessage(
    firstTimestamp?: string | null,
  ): string | null {
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
      return `You've known them for ${years} years${months > 0 ? ` and ${months} months` : ""}.`;
    if (years === 1)
      return `You've known them for 1 year${months > 0 ? ` and ${months} months` : ""}.`;
    if (months > 2) return `You've known them for ${months} months.`;
    if (months >= 1) return `You've known them for about a month.`;
    if (weeks > 1) return `You've known them for ${weeks} weeks.`;
    if (weeks === 1) return `You've known them for a week.`;
    if (diffDays > 2) return `You've known them for ${diffDays} days.`;
    if (diffDays === 1) return `You started chatting yesterday.`;
    return `You just started chatting!`;
  }

  return (
    <>
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          key={selectedUser}
          className="p-6 rounded-2xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-700"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4 mb-6 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {selectedUserInfo ? (
                <Avatar
                  userId={selectedUserInfo.userId}
                  avatarHash={selectedUserInfo.avatarHash}
                  username={selectedUserInfo.name}
                  className="w-10 h-10 rounded-full"
                  size={128}
                />
              ) : (
                <User size={30} className="text-indigo-600 dark:text-indigo-400" />
              )}

              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Search Direct Messages
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Explore your message history by user
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
              <div onClick={() => setShowSettings(true)} className="cursor-pointer">
                {selectedUser && (
                  <Settings className="w-6 h-6 stroke-indigo-500 hover:stroke-indigo-600 dark:stroke-indigo-300 dark:hover:stroke-indigo-200 transition-colors" />
                )}
              </div>

              <select
                value={rankingType}
                onChange={(e) =>
                  setRankingType(e.target.value as "messages" | "sentiment")
                }
                className="px-3 py-2 rounded-lg text-sm bg-white/60 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
              >
                <option value="messages">Rank by Messages</option>
                <option value="sentiment">Rank by Avg Sentiment</option>
              </select>

              {rankingType === "sentiment" && (
                <input
                  type="number"
                  value={minMessages}
                  min={0}
                  onChange={(e) => setMinMessages(Number(e.target.value))}
                  className="w-24 px-3 py-2 rounded-lg text-sm bg-white/60 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  placeholder="Min msgs"
                />
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block mb-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
              Select a user
            </label>
            <UserCombobox
              users={rankedUsers}
              selected={selectedUser}
              onChange={setSelectedUser}
              rankingType={rankingType}
            />
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
                  {getFriendshipDurationMessage(channelData.firstMessageTimestamp)}
                </p>
              </div>

              <StaggeredStatGrid className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <Stat
                  icon={<MessageSquare />}
                  label="Total Messages"
                  value={totalMessages.toLocaleString()}
                />
                {channelData.averageGapBetweenMessages && (
                  <Stat
                    icon={<Clock />}
                    label="Avg. Gap (min) | Avg. Conversation Time (min)"
                    value={`${Math.round(channelData.averageGapBetweenMessages / 60)} | ${Math.round(channelData.averageConversationTime! / 60)}`}
                  />
                )}
                {channelData.firstMessageTimestamp && (
                  <Stat
                    icon={<Calendar />}
                    label="First Message"
                    value={new Date(channelData.firstMessageTimestamp).toLocaleDateString()}
                  />
                )}
              </StaggeredStatGrid>

              {channelData.sentiment && showElements.sentiment && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
                    Sentiment Overview
                  </h3>
                  <SentimentBar sentiment={channelData.sentiment} />
                </div>
              )}

              {showElements.hourly && <HourlyChart data={channelData.hourly} />}
              {showElements.monthly && <MonthlyChart data={channelData.monthly} />}
            </motion.div>
          )}
        </motion.div>
      </div>
      <SettingsModal
        showSettings={showSettings}
        showElements={showElements}
        setShowSettings={setShowSettings}
        setShowElements={setShowElements}
      />
    </>
  );
};

export default UserSearch;