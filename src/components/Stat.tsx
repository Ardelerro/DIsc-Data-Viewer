import { motion } from "framer-motion";
import type { FC } from "react";

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

export default Stat;