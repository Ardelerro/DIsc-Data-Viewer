import { motion } from "framer-motion";
import type { FC, JSX } from "react";
import React from "react";
import Stat from "./Stat";

interface StaggeredStatGridProps {
  StatDisplays: Array<{
    icon: JSX.Element;
    label: string;
    value: any;
  }>;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
};
const StaggeredStatGrid: FC<StaggeredStatGridProps> = ({
  StatDisplays,
}) => {
  return (
            <div className="border-t border-[var(--color-border)] px-4 py-3 sm:px-5">
  
    <motion.div
      className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      viewport={{once: true}}
      
    >
      {StatDisplays.map((stat, i) => (
        <motion.div key={i} variants={itemVariants}>
          <Stat
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
          />
        </motion.div>
      ))}
    </motion.div>
    </div>
  );
};

export default React.memo(StaggeredStatGrid);