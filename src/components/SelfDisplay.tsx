import type { FC } from "react";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";
import { User, MessageSquare, Users, Paperclip, Smile, PhoneCall, Headphones, Monitor, BookUser } from "lucide-react";

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

  if (!self) {
    return (
      <p className="px-4 text-red-600 dark:text-red-400">
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
  const avgPerPerson = (
    totalMessages / Object.keys(data.userMapping || {}).length
  ).toFixed(1);

  const activity = data.activityStats;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 rounded-2xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-700"
    >
      <div className="flex items-center gap-4 mb-6">
        <motion.img
          src={avatarUrl(self)}
          alt={`${self.username}'s avatar`}
          className="w-16 h-16 rounded-full ring-2 ring-indigo-400 dark:ring-indigo-600"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        />
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {self.username}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your overall activity overview
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <Stat icon={<MessageSquare />} label="Avg. per day" value={avgPerDay} />
        <Stat icon={<Users />} label="Avg. per person" value={avgPerPerson} />
        <Stat
          icon={<User />}
          label="Total messages"
          value={totalMessages.toLocaleString()}
        />
      </div>

      {activity && <div className="border-t border-slate-200 dark:border-slate-700 my-5" />}

      {activity && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-slate-700 dark:text-slate-300">
          <Stat icon={<Paperclip />} label="Attachments sent" value={activity.attachmentsSent} />
          <Stat icon={<Smile />} label="Reactions added" value={activity.addReaction} />
          <Stat icon={<Headphones />} label="Voice channels joined" value={activity.joinVoice} />
          <Stat icon={<PhoneCall />} label="DM calls" value={activity.joinCall + activity.startCall} />
          <Stat icon={<Monitor />} label="Discord opened" value={activity.appOpened} />
          <Stat icon={<BookUser />} label="Total channels" value={totalChannels.toLocaleString()} />
        </div>
      )}
    </motion.div>
  );
};

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

const Stat: FC<StatProps> = ({ icon, label, value }) => (
  <motion.div
    whileHover={{ scale: 1.03, y: -2 }}
    transition={{ type: "spring", stiffness: 200 }}
    className="flex items-center gap-3 rounded-lg bg-white/60 dark:bg-slate-700/50 p-3 shadow-sm"
  >
    <div className="text-indigo-600 dark:text-indigo-400">{icon}</div>
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  </motion.div>
);

export default SelfDisplay;
