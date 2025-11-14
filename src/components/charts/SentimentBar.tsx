import { AnimatePresence, motion } from "framer-motion";
import type { FC } from "react";
import { useState, useMemo } from "react";
import type { SentimentStats } from "../../types/discord";



const SentimentBar: FC<{ sentiment: SentimentStats }> = ({ sentiment }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const mapSentimentToLogScale = (value: number): number => {
    const clamped = Math.max(-1, Math.min(1, value));
    const negThreshold = -0.15;
    const posThreshold = 0.15;
    const absVal = Math.abs(clamped);
    const absThreshold = 0.15;
    const norm =
      absVal > absThreshold
        ? (absVal - absThreshold) / (1 - absThreshold)
        : absVal / absThreshold;
    const logScaled = Math.log10(1 + 9 * norm) / Math.log10(10);

    if (clamped < negThreshold) return 36.5 * (1 - logScaled);
    if (clamped > posThreshold) return 63.5 + 36.5 * logScaled;
    const neutralNorm =
      (clamped - negThreshold) / (posThreshold - negThreshold);
    return 36.5 + neutralNorm * (63.5 - 36.5);
  };

  const averageLeft = useMemo(
    () => mapSentimentToLogScale(sentiment.average),
    [sentiment.average]
  );

  const bars = [
    {
      label: "negative",
      color: "bg-red-500 dark:bg-red-700",
      count: sentiment.negative,
      direction: "down",
    },
    {
      label: "neutral",
      color: "bg-yellow-400 dark:bg-yellow-600",
      count: sentiment.neutral,
      direction: "up",
    },
    {
      label: "positive",
      color: "bg-green-500 dark:bg-green-700",
      count: sentiment.positive,
      direction: "down",
    },
  ];

  return (
    <div className="relative w-full overflow-visible">
      <div className="w-full h-4 rounded-full flex relative overflow-visible">
        {bars.map(({ label, color, count, direction }) => (
          <div
            key={label}
            className={`flex-1 ${color} relative`}
            onMouseEnter={() => setHovered(label)}
            onMouseLeave={() => setHovered(null)}
          >
            <motion.div
              className="absolute left-1/2 -translate-x-1/2"
              initial={false}
            >
              <AnimatePresence>
                {hovered === label && (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: direction === "up" ? 0 : -6 }}
                    animate={{ opacity: 1, y: direction === "up" ? -28 : 20 }}
                    exit={{ opacity: 0, y: direction === "up" ? 0 : -6 }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    className={`absolute left-1/2 -translate-x-1/2 text-white text-xs font-medium rounded-md px-2 py-1 shadow-md whitespace-nowrap ${
                      color.includes("red")
                        ? "bg-red-600"
                        : color.includes("yellow")
                        ? "bg-yellow-500"
                        : "bg-green-600"
                    }`}
                  >
                    {count} messages
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        ))}

        <div
          className="absolute top-0 bottom-0 w-[2px] bg-black dark:bg-white z-20"
          style={{
            left: `${averageLeft}%`,
            transition: "left 0.3s ease",
          }}
        ></div>

        <div
          className="absolute -top-7 transform -translate-x-1/2 z-30"
          style={{
            left: `${averageLeft}%`,
            transition: "left 0.3s ease",
          }}
        >
          <span
            className={`text-sm font-semibold px-2 py-1 rounded-md shadow-md ${
              sentiment.average > 0.15
                ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                : sentiment.average < -0.15
                ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
            }`}
          >
            {sentiment.average.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mt-1">
        <span>Negative</span>
        <span>Neutral</span>
        <span>Positive</span>
      </div>
    </div>
  );
};

export default SentimentBar;
