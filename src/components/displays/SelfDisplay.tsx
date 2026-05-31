import type { FC } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "../../context/DataContext";
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
  CalendarDays,
  Globe,
  UserRound,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { computePersonality } from "../../achievements/computePersonality";
import {
  computeAchievements,
  achievementSummary,
} from "../../achievements/achievements";
import AchievementBubble from "../../achievements/AchievementBubble";
import { TIER_STYLES } from "../../types/styles";
import type { AchievementTier } from "../../types/types";
import PersonalityBadge from "../../achievements/PersonalityBadge";
import StaggeredStatGrid from "../stats/StaggeredStatGrid";
import Avatar from "../Avatar";

function formatEta(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `~${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `~${m}m ${rem}s` : `~${m}m`;
}

const SelfDisplay: FC = () => {
  const { data, activityProgress } = useData();
  const [shouldAnimateAchs, setShouldAnimateAchs] = useState(false);
  const [achsAnimating, setAchsAnimating] = useState(false);
  const [etaMs, setEtaMs] = useState<number | null>(null);
  const activityStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!data) return;
    const key = "achievements_seen_v5";
    const seen = localStorage.getItem(key);
    if (!seen) {
      setShouldAnimateAchs(true);
      localStorage.setItem(key, "true");
    }
  }, [data]);

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

  useEffect(() => {
    if (activityProgress === null) {
      activityStartRef.current = null;
      setEtaMs(null);
      return;
    }
    if (activityStartRef.current === null)
      activityStartRef.current = Date.now();
    const elapsed = Date.now() - activityStartRef.current;
    const p = activityProgress;
    if (p > 2 && elapsed > 400) {
      setEtaMs((elapsed / p) * (100 - p));
    } else {
      setEtaMs(null);
    }
  }, [activityProgress]);

  useEffect(() => {
    if (!shouldAnimateAchs || unlockedAchs.length === 0) return;
    setAchsAnimating(true);

    const totalMs = unlockedAchs.length * 80 + 700;
    const id = setTimeout(() => setAchsAnimating(false), totalMs);
    return () => clearTimeout(id);
  }, [shouldAnimateAchs, unlockedAchs.length]);

  if (!data) {
    return (
      <div className="px-4 text-center py-8 text-xs text-[var(--color-text-3)]">
        No profile data loaded. Please upload your Discord ZIP first.
      </div>
    );
  }

  const self = data.self;
  const { aggregateStats, channelStats } = data;

  if (!self) {
    return (
      <p className="px-4 text-xs text-[var(--color-negative)]">
        Failed to load your profile.
      </p>
    );
  }

  const totalMessages = aggregateStats?.messageCount ?? 0;
  const totalChannels = Object.keys(channelStats).length;
  let minDate = Infinity;
  let maxDate = -Infinity;

  const dmChannelsPerDay = new Map<string, Set<string>>();
  for (const [key, stats] of Object.entries(channelStats)) {
    if (!key.startsWith("dm_")) continue;
    for (const date in stats.daily) {
      if ((stats.daily[date] ?? 0) > 0) {
        if (!dmChannelsPerDay.has(date)) dmChannelsPerDay.set(date, new Set());
        dmChannelsPerDay.get(date)!.add(key);
      }
    }
  }
  const dmDayCount = dmChannelsPerDay.size;
  let dmChannelDaySum = 0;
  for (const s of dmChannelsPerDay.values()) dmChannelDaySum += s.size;
  const avgPeoplePerDay =
    dmDayCount > 0 ? (dmChannelDaySum / dmDayCount).toFixed(1) : "0";

  const totalServers = Object.keys(data.serverMapping.serverNames).length;
  const daysActiveCount = Object.keys(aggregateStats.daily || {}).filter(
    (d) => (aggregateStats.daily![d] ?? 0) > 0,
  ).length;

  const ActivityIcons = [
    <Paperclip />,
    <Smile />,
    <Headphones />,
    <PhoneCall />,
    <Monitor />,
    <BookUser />,
    <UserRound />,
    <Globe />,
    <CalendarDays />,
  ];
  const ActivityLabels = [
    "Attachments sent",
    "Reactions added",
    "Voice channels joined",
    "DM calls",
    "Discord opened",
    "Total channels",
    "Avg. people/day",
    "Total servers",
    "Days active",
  ];

  const actPending = data.activityPending === true;
  const av = (n: number) => (actPending ? "…" : n);
  const ActivityStats = [
    av(data.activityStats.attachmentsSent),
    av(data.activityStats.addReaction),
    av(data.activityStats.joinVoice),
    av(data.activityStats.joinCall),
    av(data.activityStats.appOpened),
    totalChannels,
    avgPeoplePerDay,
    totalServers,
    daysActiveCount,
  ];
  const ActivityStatDisplays = ActivityIcons.map((icon, index) => ({
    icon: icon,
    label: ActivityLabels[index],
    value: ActivityStats[index],
  }));

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
  const CoreStatIcons = [<MessageSquare />, <Users />, <User />];
  const CoreStatLabels = ["Avg. per day", "Avg. per person", "Total messages"];
  const CoreStats = [avgPerDay, avgPerPerson, totalMessages.toLocaleString()];
  const CoreStatDisplays = CoreStatIcons.map((icon, index) => ({
    icon: icon,
    label: CoreStatLabels[index],
    value: CoreStats[index],
  }));
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      {/* Profile header */}
      <div className="px-4 py-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 text-center sm:text-left">
        <div className="relative flex-shrink-0 w-12 h-12 rounded-full border border-[var(--color-border)] overflow-hidden">
          <Avatar
            userId={self.id}
            avatarHash={self.avatar_hash}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-center justify-center sm:justify-start gap-2 mb-0.5">
            <h2 className="text-base font-semibold text-[var(--color-text-1)] truncate">
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
          <p className="text-xs text-[var(--color-text-3)]">
            {personality?.tagline ?? "Your overall activity overview"}
          </p>
        </div>

        <AnimatePresence>
          {actPending && (
            <motion.div
              key="activity-eta"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 flex flex-col items-end gap-1"
            >
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin flex-shrink-0" />
                <p className="text-sm text-[var(--color-text-3)] whitespace-nowrap">
                  Calculating activity…
                </p>
              </div>
              {activityProgress !== null && activityProgress > 0 && (
                <div className="flex items-center gap-0.5">
                  <div className="w-30 h-0.5 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[var(--color-accent)]"
                      animate={{ width: `${activityProgress}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                  <span className="inline-block w-8 text-right text-xs text-[var(--color-text-3)] tabular-nums whitespace-nowrap">
                    {etaMs !== null ? formatEta(etaMs) : "…"}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Core stats */}
      <StaggeredStatGrid StatDisplays={CoreStatDisplays}></StaggeredStatGrid>

      {/* Activity stats */}
      {activity && <StaggeredStatGrid StatDisplays={ActivityStatDisplays} />}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="border-t border-[var(--color-border)] px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-[var(--color-text-1)]">
                  Achievements
                </p>
                <AnimatePresence>
                  {achsAnimating && (
                    <motion.span
                      key="ach-spinner"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="inline-block w-3 h-3 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin"
                    />
                  )}
                </AnimatePresence>
              </div>
              {summary && (
                <p className="text-[10px] text-[var(--color-text-3)] mt-0.5">
                  {summary.total.unlocked} of {summary.total.total} unlocked
                </p>
              )}
            </div>

            {summary && (
              <div className="hidden sm:flex items-center gap-1.5">
                {(
                  ["gold", "silver", "bronze", "secret"] as AchievementTier[]
                ).map((tier) => {
                  const t = summary[tier];
                  if (t.total === 0) return null;
                  const style = TIER_STYLES[tier];
                  return (
                    <span
                      key={tier}
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize ${style.bg} ${style.text} ${style.border}`}
                    >
                      {tier[0].toUpperCase()}
                      {tier.slice(1)} {t.unlocked}/{t.total}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {summary && (
            <div className="w-full h-1 rounded-full bg-[var(--color-surface-raised)] mb-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
                className="h-full rounded-full bg-[var(--color-accent)]"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
            {displayAchs.map((ach, i) => (
              <AchievementBubble
                key={ach.id}
                achievement={ach}
                animate={shouldAnimateAchs}
                index={i}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(SelfDisplay);
