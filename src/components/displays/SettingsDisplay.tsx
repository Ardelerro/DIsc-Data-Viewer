import { AnimatePresence, motion } from "framer-motion";
import * as Switch from "@radix-ui/react-switch";
import type { SettingsModalProps } from "../../types/types";
import { createPortal } from "react-dom";

const SettingsModal = <T extends Record<string, boolean>>({
  showSettings,
  showElements,
  setShowSettings,
  setShowElements,
}: SettingsModalProps<T>) => {
  const allEnabled = Object.values(showElements).every(Boolean);

  const toggleAll = (checked: boolean) => {
    setShowElements(
      (prev) =>
        Object.fromEntries(Object.keys(prev).map((key) => [key, checked])) as T,
    );
  };

  const toggleOne = (key: keyof T) => {
    setShowElements((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {showSettings && (
        <motion.div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]"
          onClick={() => setShowSettings(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 w-full max-w-sm"
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <h2 className="text-sm font-semibold text-[var(--color-text-1)] mb-4">
              Display settings
            </h2>

            <div className="space-y-1">
              {/* All toggle */}
              <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)] mb-2">
                <span className="text-xs font-medium text-[var(--color-text-2)]">
                  All panels
                </span>
                <Switch.Root
                  checked={allEnabled}
                  onCheckedChange={toggleAll}
                  className="relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] transition-colors duration-200 focus:outline-none data-[state=checked]:bg-[var(--color-accent)]"
                >
                  <Switch.Thumb className="absolute top-1/2 left-[2px] block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 -translate-y-1/2 data-[state=checked]:translate-x-[16px]" />
                </Switch.Root>
              </div>

              {Object.entries(showElements).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-1.5">
                  <span className="text-xs text-[var(--color-text-2)] capitalize">
                    {key.replace(/([A-Z])/g, " $1")}
                  </span>
                  <Switch.Root
                    checked={value}
                    onCheckedChange={() => toggleOne(key as keyof T)}
                    className="relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] transition-colors duration-200 focus:outline-none data-[state=checked]:bg-[var(--color-accent)]"
                  >
                    <Switch.Thumb className="absolute top-1/2 left-[2px] block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 -translate-y-1/2 data-[state=checked]:translate-x-[16px]" />
                  </Switch.Root>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default SettingsModal;
