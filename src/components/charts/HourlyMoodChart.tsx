import type { FC } from "react";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useData } from "../../context/DataContext";
import { CHART_TOOLTIP_STYLE, C } from "../../config/theme";

const HourlyMoodChart: FC<{ className?: string }> = ({ className }) => {
  const { data } = useData();

  if (!data) return null;

  const chartData = useMemo(() => {
    const raw = data.aggregateStats.hourlySentimentAverage || {};
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, "0");
      return { hour, mood: raw[hour] ?? 0 };
    });
  }, [data]);

  const yDomain = useMemo(() => {
    const moods = chartData.map((d) => d.mood);
    const minVal = Math.min(...moods);
    const maxVal = Math.max(...moods);
    if (maxVal - minVal < 30) {
      const mid = (maxVal + minVal) / 2;
      return [mid - 15, mid + 15];
    }
    return [Math.max(-100, minVal), Math.min(100, maxVal)];
  }, [chartData]);

  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden ${className}`}
    >
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-text-1)]">
          Hourly Mood Bias
        </h2>
      </div>

      <div className="p-4 text-[var(--color-text-3)]">
        <ResponsiveContainer width="100%" height={260} minWidth={250}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 18, bottom: 20, left: 12 }}
          >
            <CartesianGrid
              strokeDasharray="0"
              stroke="var(--color-border)"
              vertical={false}
            />
            <ReferenceLine y={0} stroke={C.borderHover} strokeWidth={1} />
            <XAxis
              dataKey="hour"
              tick={{ fill: "currentColor", fontSize: 10 }}
              label={{
                value: "Hour (24h)",
                position: "insideBottom",
                dy: 14,
                fill: "currentColor",
                fontSize: 10,
              }}
            />
            <YAxis
              domain={yDomain as [number, number]}
              tick={{ fill: "currentColor", fontSize: 10 }}
              tickFormatter={(value) => value.toFixed(0)}
              label={{
                value: "Mood",
                angle: -90,
                position: "insideLeft",
                dx: -8,
                fill: "currentColor",
                fontSize: 10,
              }}
            />
            <Tooltip
              cursor={{ stroke: C.border, strokeWidth: 1 }}
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value: number) => [value.toFixed(1), "Mood"]}
              labelFormatter={(label) => `${label}:00`}
            />
            <Line
              type="monotone"
              dataKey="mood"
              stroke={C.accent}
              strokeWidth={2}
              dot={{ r: 2, fill: C.accent, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: C.accent, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HourlyMoodChart;
