import { AnimatePresence, motion } from "framer-motion";
import * as Switch from "@radix-ui/react-switch";
import type { SettingsModalProps } from "../types/types";

const SettingsModal: React.FC<SettingsModalProps> = ({
  showSettings,
  theme,
  showElements,
  setShowSettings,
  toggleTheme,
  setShowElements,
  handleDownloadData,
}) => {
  return (
    <AnimatePresence>
      {showSettings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowSettings(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl ring-1 ring-slate-200 dark:ring-slate-700"
          >
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
              Settings
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Dark Mode
                </span>
                <Switch.Root
                  checked={theme === "dark"}
                  onCheckedChange={toggleTheme}
                  className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border border-transparent bg-slate-300 dark:bg-slate-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 data-[state=checked]:bg-indigo-600"
                >
                  <Switch.Thumb className="absolute top-1/2 left-[2px] block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 -translate-y-1/2 data-[state=checked]:translate-x-[22px]" />
                </Switch.Root>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    Visible Elements
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 dark:text-slate-400 text-sm">
                      All
                    </span>
                    <Switch.Root
                      checked={Object.values(showElements).every(Boolean)}
                      onCheckedChange={(checked) =>
                        setShowElements(
                          Object.fromEntries(
                            Object.keys(showElements).map((key) => [
                              key,
                              checked,
                            ])
                          ) as typeof showElements
                        )
                      }
                      className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border border-transparent bg-slate-300 dark:bg-slate-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 data-[state=checked]:bg-indigo-600"
                    >
                      <Switch.Thumb className="absolute top-1/2 left-[2px] block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 -translate-y-1/2 data-[state=checked]:translate-x-[22px]" />
                    </Switch.Root>
                  </div>
                </div>

                <div className="space-y-2">
                  {Object.entries(showElements).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center py-1"
                    >
                      <span className="capitalize text-slate-600 dark:text-slate-400">
                        {key.replace(/([A-Z])/g, " $1")}
                      </span>
                      <Switch.Root
                        checked={value}
                        onCheckedChange={() =>
                          setShowElements((prev) => ({
                            ...prev,
                            [key]: !prev[key as keyof typeof prev],
                          }))
                        }
                        className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border border-transparent bg-slate-300 dark:bg-slate-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 data-[state=checked]:bg-indigo-600"
                      >
                        <Switch.Thumb className="absolute top-1/2 left-[2px] block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 -translate-y-1/2 data-[state=checked]:translate-x-[22px]" />
                      </Switch.Root>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={handleDownloadData}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
              >
                Download Data
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
