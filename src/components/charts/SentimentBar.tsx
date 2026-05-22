import { AnimatePresence, motion } from "framer-motion";
import type { FC } from "react";
import { useState, useMemo } from "react";
import type { SentimentStats } from "../../types/discord";
import { SENTIMENT } from "../../config/theme";

const bars = [
  { label: "negative", ...SENTIMENT.negative, direction: "down" as const },
  { label: "neutral",  ...SENTIMENT.neutral,  direction: "up"   as const },
  { label: "positive", ...SENTIMENT.positive, direction: "down" as const },
] as const;

const SentimentBar: FC<{ sentiment: SentimentStats }> = ({ sentiment }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const mapSentimentToLogScale = (value: number): number => {
    const clamped = Math.max(-100, Math.min(100, value));
    const negThreshold = -5;
    const posThreshold = 5;
    const absVal = Math.abs(clamped);
    const absThreshold = 5;
    const norm =
      absVal > absThreshold
        ? (absVal - absThreshold) / (100 - absThreshold)
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
    [sentiment.average],
  );

  const counts: Record<string, number> = {
    negative: sentiment.negative,
    neutral:  sentiment.neutral,
    positive: sentiment.positive,
  };

  const badgeClass =
    sentiment.average > 5
      ? SENTIMENT.positive.badge
      : sentiment.average < -5
      ? SENTIMENT.negative.badge
      : SENTIMENT.neutral.badge;

  return (
    <div className="relative w-full overflow-visible">
      <div className="w-full h-4 rounded-full flex relative overflow-visible">
        {bars.map(({ label, bar, tooltip, direction }) => (
          <div
            key={label}
            className={`flex-1 ${bar} relative`}
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
                    className={`absolute left-1/2 -translate-x-1/2 text-xs font-medium rounded-md px-2 py-1 shadow-md whitespace-nowrap ${tooltip}`}
                  >
                    {counts[label]} messages
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        ))}

        <div
          className={`absolute top-0 bottom-0 w-[2px] z-20 ${SENTIMENT.indicator}`}
          style={{ left: `${averageLeft}%`, transition: "left 0.3s ease" }}
        />

        <div
          className="absolute -top-7 transform -translate-x-1/2 z-30"
          style={{ left: `${averageLeft}%`, transition: "left 0.3s ease" }}
        >
          <span className={`text-sm font-semibold px-2 py-1 rounded-md shadow-md ${badgeClass}`}>
            {Math.round(sentiment.average)}
          </span>
        </div>
      </div>

      <div className={`flex justify-between text-xs mt-1 ${SENTIMENT.label}`}>
        <span>Negative</span>
        <span>Neutral</span>
        <span>Positive</span>
      </div>
    </div>
  );
};

export default SentimentBar;
