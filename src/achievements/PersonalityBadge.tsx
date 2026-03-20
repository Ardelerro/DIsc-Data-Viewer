import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { type FC, useState } from "react";

const PersonalityBadge: FC<{
  icon: LucideIcon;
  iconColor: string;
  name: string;
  signals: string[];
}> = ({ icon: Icon, iconColor, name, signals }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        whileHover={{ scale: 1.04 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 cursor-default select-none"
      >
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
          {name}
        </span>
      </motion.div>

      <AnimatePresence>
        {hovered && signals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 z-50 pointer-events-none"
            style={{ minWidth: 200, maxWidth: 260 }}
          >
            <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl px-3 py-2.5 shadow-xl">
              <p className="text-xs font-semibold mb-2 opacity-50 uppercase tracking-wide">
                Why you got this
              </p>
              <ul className="space-y-1">
                {signals.map((s, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5">
                    <span className="opacity-40 mt-0.5">·</span>
                    <span className="opacity-90">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end pr-4">
              <div className="w-2 h-2 bg-slate-900 dark:bg-slate-100 rotate-45 -mt-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PersonalityBadge;