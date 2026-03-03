import { AnimatePresence, motion } from "framer-motion";
import * as Switch from "@radix-ui/react-switch";
import type { SettingsModalProps } from "../types/types";

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
    setShowElements((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (

    <AnimatePresence>
      {showSettings && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowSettings(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
              Settings
            </h2>

            <div className="flex justify-between items-center mb-4">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                All
              </span>
              <Switch.Root
                checked={allEnabled}
                onCheckedChange={toggleAll}
                className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border border-transparent bg-slate-300 dark:bg-slate-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 data-[state=checked]:bg-indigo-600"
              >
                <Switch.Thumb className="absolute top-1/2 left-[2px] block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 -translate-y-1/2 data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>

            <div className="space-y-3">
              {Object.entries(showElements).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="capitalize text-slate-700 dark:text-slate-200">
                    {key.replace(/([A-Z])/g, " $1")}
                  </span>

                  <Switch.Root
                    checked={value}
                    onCheckedChange={() => toggleOne(key as keyof T)}
                    className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border border-transparent bg-slate-300 dark:bg-slate-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 data-[state=checked]:bg-indigo-600"
                  >
                    <Switch.Thumb className="absolute top-1/2 left-[2px] block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 -translate-y-1/2 data-[state=checked]:translate-x-[22px]" />
                  </Switch.Root>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
