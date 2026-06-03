import type { FC } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useData } from "../context/DataContext";

const GlobalProcessingIndicator: FC = () => {
  const { isLoading, progress, stage, activityProgress } = useData();
  const { pathname } = useLocation();

  const pageHasOwnIndicator = pathname === "/upload" || pathname === "/";
  const showMain = isLoading && !pageHasOwnIndicator;
  const showActivity =
    !isLoading && activityProgress !== null && !pageHasOwnIndicator;
  const visible = showMain || showActivity;

  const pct = showMain ? progress : (activityProgress ?? 0);
  const label = showMain
    ? stage || "Processing your data..."
    : "Counting activity...";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-4 right-4 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="truncate text-xs font-medium text-[var(--color-text-2)]">
              {label}
            </span>
            <span className="text-xs font-semibold text-[var(--color-accent)]">
              {pct.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--color-surface)]">
            <motion.div
              className="h-2 rounded-full bg-[var(--color-accent)]"
              animate={{ width: `${Math.min(100, pct)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalProcessingIndicator;
