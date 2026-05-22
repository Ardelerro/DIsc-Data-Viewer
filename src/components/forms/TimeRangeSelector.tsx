import type { FC } from "react";
import { useState } from "react";
import { TIME_PILL } from "../../config/theme";
import { type TimePreset, type DateRange, getPresetRange } from "../../utils/timeFilterUtils";
const PRESETS: { key: TimePreset; label: string; needsDaily: boolean }[] = [
  { key: "all",  label: "All time", needsDaily: false },
  { key: "7d",   label: "7 days",   needsDaily: true  },
  { key: "30d",  label: "30 days",  needsDaily: true  },
  { key: "365d", label: "1 year",   needsDaily: false },
  { key: "custom", label: "Custom",   needsDaily: true },
];

const TimeRangeSelector: FC<{
  hasDaily: boolean;
  anchorDate?: string;
  onChange: (range: DateRange | null) => void;
}> = ({ hasDaily, anchorDate, onChange }) => {
  const [activePreset, setActivePreset] = useState<TimePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const handlePreset = (key: TimePreset) => {
    setActivePreset(key);
    if (key === "all") {
      onChange(null);
    } else if (key !== "custom") {
      onChange(getPresetRange(key, anchorDate));
    }
  };

  const applyCustom = () => {
    if (customStart && customEnd && customStart <= customEnd) {
      setActivePreset("custom");
      onChange({ start: customStart, end: customEnd });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-[var(--color-text-2)] shrink-0">
        Filter:
      </span>

      {PRESETS.map(({ key, label, needsDaily }) => {
        const disabled = needsDaily && !hasDaily;
        const active = activePreset === key;
        return (
          <button
            key={key}
            disabled={disabled}
            onClick={() => !disabled && handlePreset(key)}
            title={disabled ? "Re-upload your data to enable sub-monthly filters" : undefined}
            className={`${TIME_PILL.base} ${active ? TIME_PILL.active : disabled ? TIME_PILL.disabled : TIME_PILL.inactive}`}
          >
            {label}
          </button>
        );
      })}

      {activePreset === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1 text-sm rounded-lg border border-[var(--color-border-solid)] bg-[var(--color-surface)] text-[var(--color-text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <span className="text-[var(--color-text-3)] text-sm">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1 text-sm rounded-lg border border-[var(--color-border-solid)] bg-[var(--color-surface)] text-[var(--color-text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <button
            onClick={applyCustom}
            disabled={!customStart || !customEnd || customStart > customEnd}
            className="px-3 py-1 rounded-lg bg-[var(--color-accent)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm transition-opacity"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

export default TimeRangeSelector;
