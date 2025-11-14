import type { FC } from "react";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import React from "react";
import type { HourlyChartProps } from "../../types/types";

const HourlyChart: FC<HourlyChartProps> = ({ data, className = "", title }) => {
  const chartData = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, "0");
      return { hour, count: data[hour] ?? 0 };
    });
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`text-slate-900 dark:text-slate-100 
        rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 
        bg-white/90 dark:bg-slate-800/80 
        backdrop-blur-xl shadow-lg 
        p-4 sm:p-6 ${className}`}
    >
      <h2 className="mb-4 text-base sm:text-lg font-semibold leading-none">
        {title || "Hourly Message Frequency"}
      </h2>

      <div className="w-full h-[240px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 10, left: -10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-slate-200 dark:stroke-slate-600"
            />
            <XAxis
              dataKey="hour"
              tick={{ fill: "currentColor", fontSize: 10 }}
              interval={window.innerWidth < 640 ? 2 : 0}
              label={{
                value: "Hour (24h)",
                position: "insideBottom",
                dy: 12,
                fill: "currentColor",
                fontSize: 11,
              }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "currentColor", fontSize: 10 }}
              label={{
                value: "Messages",
                angle: -90,
                position: "insideLeft",
                dx: -8,
                fill: "currentColor",
                fontSize: 11,
              }}
            />
            <Tooltip
              wrapperClassName="!rounded-2xl !px-3 !py-2 !bg-white/90 dark:!bg-slate-800/95 !border-0 !shadow-lg dark:!text-slate-300"
              contentStyle={{
                borderRadius: "1rem",
                fontSize: "0.8rem",
                padding: "0.4rem 0.6rem",
              }}
              formatter={(value: number) => [value, "Messages"]}
              labelFormatter={(label) => `Hour ${label}:00`}
            />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              className="fill-indigo-500 dark:fill-indigo-400 transition-all duration-300 hover:opacity-80"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default React.memo(HourlyChart);
