import { useState } from "react";
import type { FC } from "react";
import { TIER_STYLES } from "../types/styles";
import type { Achievement } from "../types/types";
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";

const AchievementBubble: FC<{ achievement: Achievement }> = ({
  achievement,
}) => {
  const [hovered, setHovered] = useState(false);
  const tier = TIER_STYLES[achievement.tier];
  const Icon = achievement.icon;

  if (!achievement.unlocked) {
    return (
      <div
        className="relative w-9 h-9 rounded-xl flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-600 opacity-30 select-none flex-shrink-0"
        title="Locked"
      >
        <Lock className="w-4 h-4 stroke-slate-400 dark:stroke-slate-500" />
      </div>
    );
  }

  return (
    <div
      className="relative flex-shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        whileHover={{ scale: 1.12, y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        className={`w-9 h-9 rounded-xl flex items-center justify-center border cursor-default select-none ${tier.bg} ${tier.border}`}
      >
        <Icon className={`w-4 h-4 ${achievement.iconColor}`} />
      </motion.div>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
            style={{ minWidth: 180, maxWidth: 240 }}
          >
            <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl px-3 py-2.5 shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${tier.dot}`}
                />
                <p className="text-xs font-semibold leading-tight">
                  {achievement.name}
                </p>
              </div>
              <p className="text-xs opacity-75 leading-relaxed">
                {achievement.description}
              </p>
            </div>
            <div className="flex justify-center">
              <div className="w-2 h-2 bg-slate-900 dark:bg-slate-100 rotate-45 -mt-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AchievementBubble;
