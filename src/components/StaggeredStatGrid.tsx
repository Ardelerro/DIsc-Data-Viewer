import { motion } from "framer-motion";
import type { FC, ReactNode } from "react";
import React from "react";

interface StaggeredStatGridProps {
  children: ReactNode;
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

/**
 * Wraps a stat grid with a staggered animated entry.
 * Each direct child receives a cascaded fade-in with a slight upward slide.
 *
 * Usage:
 *   <StaggeredStatGrid className="grid grid-cols-3 gap-4">
 *     <Stat ... />
 *     <Stat ... />
 *   </StaggeredStatGrid>
 */
const StaggeredStatGrid: FC<StaggeredStatGridProps> = ({
  children,
  className = "",
}) => {
  const items = React.Children.toArray(children);

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      viewport={{once: true}}
      
    >
      {items.map((child, i) => (
        <motion.div key={i} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

export default React.memo(StaggeredStatGrid);