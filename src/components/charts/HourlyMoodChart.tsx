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
} from "recharts";
import { motion } from "framer-motion";
import { useData } from "../../context/DataContext";

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

    let range = maxVal - minVal;

    if (range < 0.3) {
      const mid = (maxVal + minVal) / 2;
      return [mid - 0.15, mid + 0.15];
    }

    return [Math.max(-1, minVal), Math.min(1, maxVal)];
  }, [chartData]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`text-slate-900 dark:text-slate-100 rounded-md ring-1 ring-slate-200 dark:ring-slate-700 bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl shadow-lg p-6 ${className}`}
    >
      <h2 className="mb-4 text-lg font-semibold leading-none text-slate-900 dark:text-slate-100">
        Hourly Mood Bias
      </h2>
      <ResponsiveContainer width="100%" height={320} minWidth={250}>
        <LineChart
          data={chartData}
          margin={{ top: 12, right: 18, bottom: 10, left: 12 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-slate-200 dark:stroke-slate-600"
          />
          <XAxis
            dataKey="hour"
            tick={{ fill: "currentColor", fontSize: 12 }}
            label={{
              value: "Hour (24h)",
              position: "insideBottom",
              dy: 12,
              fill: "currentColor",
            }}
          />
          <YAxis
            domain={yDomain as [number, number]}
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickFormatter={(value) => value.toFixed(2)}
            label={{
              value: "Mood",
              angle: -90,
              position: "insideLeft",
              dx: -12,
              fill: "currentColor",
            }}
          />
          <Tooltip
            wrapperClassName="!rounded-2xl !px-3 !py-2 !bg-white/90 dark:!bg-slate-800/95 !border-0 !shadow-lg dark:!text-slate-300"
            formatter={(value: number) => [value.toFixed(2), "Mood"]}
            labelFormatter={(label) => `Hour ${label}:00`}
          />
          <Line
            type="monotone"
            dataKey="mood"
            stroke="#6366F1"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default HourlyMoodChart;
