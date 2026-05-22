import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { type FC, useState } from "react";
import { PERSONALITY, TOOLTIP } from "../config/theme";

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
        className={PERSONALITY.badge}
      >
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className={PERSONALITY.text}>{name}</span>
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
            <div className={TOOLTIP.panel}>
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
              <div className={TOOLTIP.arrow} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PersonalityBadge;
