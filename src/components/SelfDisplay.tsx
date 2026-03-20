import type { FC } from "react";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";
import {
  User,
  MessageSquare,
  Users,
  Paperclip,
  Smile,
  PhoneCall,
  Headphones,
  Monitor,
  BookUser,
} from "lucide-react";
import React, { useMemo } from "react";
import Stat from "./Stat";
import { computePersonality } from "../achievements/computePersonality";
import {
  computeAchievements,
  achievementSummary,
} from "../achievements/achievements";
import AchievementBubble from "../achievements/AchievementBubble";
import { TIER_STYLES } from "../types/styles";
import type { AchievementTier } from "../types/types";
import PersonalityBadge from "../achievements/PersonalityBadge";
import StaggeredStatGrid from "./StaggeredStatGrid";

const SelfDisplay: FC = () => {
  const { data } = useData();

  const personality = useMemo(
    () => (data ? computePersonality(data) : null),
    [data],
  );

  const achievements = useMemo(
    () => (data ? computeAchievements(data) : []),
    [data],
  );

  const summary = useMemo(
    () => (data ? achievementSummary(data) : null),
    [data],
  );

  const unlockedAchs = useMemo(
    () => achievements.filter((a) => a.unlocked),
    [achievements],
  );
  const lockedAchs = useMemo(
    () => achievements.filter((a) => !a.unlocked).slice(0, 8),
    [achievements],
  );
  const displayAchs = [...unlockedAchs, ...lockedAchs];

  if (!data) {
    return (
      <div className="px-4 text-center py-8 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
        No profile data loaded. Please upload your Discord ZIP first.
      </div>
    );
  }

  const self = data.self;
  const { aggregateStats, channelStats } = data;

  if (!self) {
    return (
      <p className="px-4 text-red-600 dark:text-red-400 text-sm sm:text-base">
        Failed to load your profile.
      </p>
    );
  }

  const avatarUrl = (u: typeof self) => {
    if (u?.id && u.avatar_hash) {
      return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar_hash}.png?size=128`;
    }
    if (u?.id) {
      return `https://cdn.discordapp.com/embed/avatars/${Number(u.id) % 5}.png`;
    }
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  };

  const totalMessages = aggregateStats?.messageCount ?? 0;
  const totalChannels = Object.keys(channelStats).length;
  let minDate = Infinity;
  let maxDate = -Infinity;

  for (const key in channelStats) {
    const stats = channelStats[key];
    for (const month in stats.monthly) {
      const [year, mon] = month.split("-").map(Number);
      const date = new Date(year, mon - 1, 1).getTime();
      if (date < minDate) minDate = date;
      if (date > maxDate) maxDate = date;
    }
  }

  const daysActive =
    minDate < maxDate
      ? Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24))
      : 1;

  const avgPerDay = (totalMessages / daysActive).toFixed(1);

  const usersWithMessages = Object.entries(channelStats)
    .filter(([key]) => key.startsWith("dm_"))
    .filter(([_, stats]) => {
      const total = Object.values(stats.hourly || {}).reduce(
        (sum, c) => sum + c,
        0,
      );
      return total > 0;
    }).length;

  const avgPerPerson = (totalMessages / (usersWithMessages || 1)).toFixed(1);
  const activity = data.activityStats;
  const progressPct = summary
    ? Math.round((summary.total.unlocked / summary.total.total) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="p-4 sm:p-6 rounded-2xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-700"
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-5 mb-6 text-center sm:text-left">
        <motion.div
          className="relative flex-shrink-0 w-20 h-20 sm:w-16 sm:h-16 rounded-full p-[2.5px]"
          style={{
            background:
              "conic-gradient(from 0deg, #6366f1, #8b5cf6, #a855f7, #14b8a6, #6366f1)",
          }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 p-[2px]">
            <img
              src={avatarUrl(self)}
              alt={`${self.username}'s avatar`}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {self.username}
            </h2>
            {personality && (
              <PersonalityBadge
                icon={personality.icon}
                iconColor={personality.iconColor}
                name={personality.name}
                signals={personality.signals}
              />
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {personality?.tagline ?? "Your overall activity overview"}
          </p>
        </div>
      </div>

      <StaggeredStatGrid className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-sm">
        <Stat icon={<MessageSquare />} label="Avg. per day" value={avgPerDay} />
        <Stat icon={<Users />} label="Avg. per person" value={avgPerPerson} />
        <Stat
          icon={<User />}
          label="Total messages"
          value={totalMessages.toLocaleString()}
        />
      </StaggeredStatGrid>

      {activity && (
        <>
          <div className="border-t border-slate-200 dark:border-slate-700 my-5 sm:my-6" />
          <StaggeredStatGrid className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm text-slate-700 dark:text-slate-300">
            <Stat
              icon={<Paperclip />}
              label="Attachments sent"
              value={activity.attachmentsSent}
            />
            <Stat
              icon={<Smile />}
              label="Reactions added"
              value={activity.addReaction}
            />
            <Stat
              icon={<Headphones />}
              label="Voice channels joined"
              value={activity.joinVoice}
            />
            <Stat
              icon={<PhoneCall />}
              label="DM calls"
              value={activity.joinCall + activity.startCall}
            />
            <Stat
              icon={<Monitor />}
              label="Discord opened"
              value={activity.appOpened}
            />
            <Stat
              icon={<BookUser />}
              label="Total channels"
              value={totalChannels.toLocaleString()}
            />
          </StaggeredStatGrid>
        </>
      )}

      {achievements.length > 0 && (
        <>
          <div className="border-t border-slate-200 dark:border-slate-700 my-5 sm:my-6" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Achievements
                </p>
                {summary && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {summary.total.unlocked} of {summary.total.total} unlocked
                  </p>
                )}
              </div>

              {summary && (
                <div className="hidden sm:flex items-center gap-2">
                  {(
                    ["gold", "silver", "bronze", "secret"] as AchievementTier[]
                  ).map((tier) => {
                    const t = summary[tier];
                    if (t.total === 0) return null;
                    const style = TIER_STYLES[tier];
                    return (
                      <span
                        key={tier}
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${style.bg} ${style.text} ${style.border}`}
                      >
                        {tier} {t.unlocked}/{t.total}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {summary && (
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mb-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {displayAchs.map((ach) => (
                <AchievementBubble key={ach.id} achievement={ach} />
              ))}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default React.memo(SelfDisplay);
