import type { FC } from "react";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";

const SelfDisplay: FC = () => {
  const { data } = useData();

  if (!data) {
    return (
      <div className="px-4 text-center py-8 text-slate-600 dark:text-slate-300">
        No profile data loaded. Please upload your Discord ZIP first.
      </div>
    );
  }

  const self = data.self;
  const { aggregateStats, channelStats } = data;

  const avatarUrl = (u: typeof self) => {
    if (u?.id && u.avatar_hash) {
      return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar_hash}.png?size=64`;
    }
    if (u?.id) {
      return `https://cdn.discordapp.com/embed/avatars/${Number(u.id) % 5}.png`;
    }
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  };

  if (!self) {
    return (
      <p className="px-4 text-red-600 dark:text-red-400">
        Failed to load your profile.
      </p>
    );
  }

  const totalMessages = aggregateStats?.messageCount ?? 0;

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
  const avgPerPerson = (
    totalMessages /
    Object.keys(data.userMapping || {}).length
  ).toFixed(1);

  return (
    <div className="px-4">
      <motion.div
        className="p-6 rounded-lg shadow-md bg-white dark:bg-slate-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center space-x-4 mb-4">
          <img
            src={avatarUrl(self)}
            alt={`${self.username}'s avatar`}
            className="w-12 h-12 rounded-full"
          />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {self.username}
          </h2>
        </div>

        <div className="text-slate-700 dark:text-slate-300 space-y-1 text-sm">
          <p>
            <span className="font-medium">Average messages per day:</span>{" "}
            {avgPerDay}
          </p>
          <p>
            <span className="font-medium">Average messages per person:</span>{" "}
            {avgPerPerson}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SelfDisplay;
