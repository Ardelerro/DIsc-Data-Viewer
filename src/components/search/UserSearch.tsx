import type { FC } from "react";
import { useState, useMemo } from "react";
import HourlyChart from "../charts/HourlyChart";
import MonthlyChart from "../charts/MonthlyChart";
import { motion } from "framer-motion";
import { useData } from "../../context/DataContext";
import {
  User,
  MessageSquare,
  Clock,
  Calendar,
  Settings,
  Flame,
  Sun,
  CalendarCheck,
} from "lucide-react";
import SentimentBar from "../charts/SentimentBar";
import type { ChannelStats } from "../../types/discord";
import SettingsModal from "../displays/SettingsDisplay";
import StaggeredStatGrid from "../stats/StaggeredStatGrid";
import UserCombobox from "../forms/UserComboBox";
import Avatar from "../Avatar";
import TimeRangeSelector from "../forms/TimeRangeSelector";
import {
  type DateRange,
  countInRange,
  filterMonthly,
} from "../../utils/timeFilterUtils";
import Search from "./Search";

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
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const rankedUsers = useMemo(() => {
    if (!data) return [];

    const usernameToUser: Record<
      string,
      { userId: string; avatarHash?: string }
    > = {};
    for (const [userId, info] of Object.entries(data.userMapping || {})) {
      usernameToUser[info.username] = {
        userId,
        avatarHash: info.avatar || undefined,
      };
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
    return users.map((user, index) => ({ ...user, rank: index + 1 }));
  }, [data, rankingType, minMessages]);

  const channelData = useMemo<ChannelStats | null>(() => {
    if (!data || !selectedUser) return null;
    return (data.channelStats[selectedUser] as ChannelStats) || null;
  }, [data, selectedUser]);

  const totalMessages = useMemo(() => {
    if (!channelData) return 0;
    return countInRange(channelData, dateRange);
  }, [channelData, dateRange]);

  const filteredMonthly = useMemo(
    () => (channelData ? filterMonthly(channelData.monthly, dateRange) : {}),
    [channelData, dateRange],
  );

  const hasDaily = !!(
    channelData?.daily && Object.keys(channelData.daily).length > 0
  );
  const lastDataDate = useMemo(() => {
    if (!channelData) return undefined;
    const keys = [
      ...Object.keys(channelData.daily ?? {}),
      ...Object.keys(channelData.monthly).map((m) => `${m}-01`),
    ].sort();
    return keys.length > 0 ? keys[keys.length - 1] : undefined;
  }, [channelData]);

  const peakHour = useMemo(() => {
    if (!channelData) return null;
    const entries = Object.entries(channelData.hourly);
    if (!entries.length) return null;
    const [hour] = entries.reduce((max, cur) => (cur[1] > max[1] ? cur : max));
    const h = parseInt(hour, 10);
    return h === 0
      ? "12 AM"
      : h < 12
        ? `${h} AM`
        : h === 12
          ? "12 PM"
          : `${h - 12} PM`;
  }, [channelData]);

  const lastMessaged = useMemo(() => {
    if (!channelData) return null;
    const keys = Object.keys(channelData.monthly);
    if (!keys.length) return null;
    const sorted = keys.sort();
    const latest = sorted[sorted.length - 1];
    const [year, month] = latest.split("-");
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
      undefined,
      { month: "short", year: "numeric" },
    );
  }, [channelData]);

  const selectedUserInfo = useMemo(() => {
    return rankedUsers.find((u) => u.key === selectedUser) ?? null;
  }, [rankedUsers, selectedUser]);

  const userRank = selectedUserInfo?.rank ?? null;

  if (!data)
    return (
      <div className="px-4 py-8 text-center text-[var(--color-text-2)]">
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

  const UserStatDisplays = [
    {
      icon: <MessageSquare />,
      label: "Total Messages",
      value: totalMessages.toLocaleString(),
    },
    {
      icon: <Clock />,
      label: "Avg. Gap (min) | Avg. Conversation Time (min)",
      value: channelData?.averageGapBetweenMessages
        ? `${Math.round(channelData.averageGapBetweenMessages / 60)} | ${Math.round(channelData.averageConversationTime! / 60)}`
        : "N/A",
    },
    {
      icon: <Calendar />,
      label: "First Message",
      value: channelData?.firstMessageTimestamp
        ? new Date(channelData.firstMessageTimestamp).toLocaleDateString()
        : "N/A",
    },
    {
      icon: <Flame />,
      label: "Longest Streak (days)",
      value:
        channelData?.longestStreak != null && channelData.longestStreak > 0
          ? channelData.longestStreak.toLocaleString()
          : "N/A",
    },
    { icon: <Sun />, label: "Most Active Hour", value: peakHour ?? "N/A" },
    {
      icon: <CalendarCheck />,
      label: "Last Messaged",
      value: lastMessaged ?? "N/A",
    },
  ];

  const icon = selectedUserInfo ? (
    <Avatar
      userId={selectedUserInfo.userId}
      avatarHash={selectedUserInfo.avatarHash}
      username={selectedUserInfo.name}
      className="w-12 h-12 object-cover"
      size={256}
    />
  ) : (
    <User size={24} />
  );

  return (
    <>
      <Search
        icon={icon}
        title="Search Direct Messages"
        subtitle="Explore your message history by user"
        animationKey={selectedUser}
      >
        <div className="flex flex-wrap items-center justify-end gap-3 mb-6">
          <div onClick={() => setShowSettings(true)} className="cursor-pointer">
            {selectedUser && (
              <Settings className="w-6 h-6 text-[var(--color-accent)] hover:opacity-75 transition-opacity" />
            )}
          </div>
          <select
            value={rankingType}
            onChange={(e) =>
              setRankingType(e.target.value as "messages" | "sentiment")
            }
            className="px-3 py-2 rounded-lg text-sm bg-[var(--color-surface-raised)] border border-[var(--color-border-solid)] text-[var(--color-text-1)]"
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
              className="w-24 px-3 py-2 rounded-lg text-sm bg-[var(--color-surface-raised)] border border-[var(--color-border-solid)] text-[var(--color-text-1)]"
              placeholder="Min msgs"
            />
          )}
        </div>

        <div className="mb-6">
          <label className="block mb-3 text-sm text-[var(--color-text-2)] font-medium">
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
              <h2 className="text-2xl font-semibold text-[var(--color-text-1)]">
                {channelData.recipientName}
              </h2>
              <p className="text-sm text-[var(--color-text-3)]">
                Rank #{userRank} —{" "}
                {getFriendshipDurationMessage(
                  channelData.firstMessageTimestamp,
                )}
              </p>
            </div>

            <StaggeredStatGrid StatDisplays={UserStatDisplays} />

            {channelData.sentiment && showElements.sentiment && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-1)] mb-3">
                  Sentiment Overview
                </h3>
                <SentimentBar sentiment={channelData.sentiment} />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <TimeRangeSelector
                hasDaily={hasDaily}
                anchorDate={lastDataDate}
                onChange={setDateRange}
              />
            </div>

            {showElements.hourly && <HourlyChart data={channelData.hourly} />}
            {showElements.monthly && <MonthlyChart data={filteredMonthly} />}
          </motion.div>
        )}
      </Search>

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
