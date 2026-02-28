import type { FC } from "react";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { motion } from "framer-motion";
import React from "react";
import type { MonthlyChartProps } from "../../types/types";

const MonthlyChart: FC<MonthlyChartProps> = ({ data, className = "" }) => {
  const chartData = useMemo(() => {
    const months = Object.keys(data).sort();
    //console.log("months", months);
    if (months.length === 0) return [];

    const [startYear, startMonth] = months[0].split("-").map(Number);
    const [endYear, endMonth] = months[months.length - 1]
      .split("-")
      .map(Number);

    const result: { month: string; count: number }[] = [];

    let year = startYear;
    let month = startMonth;

    while (year < endYear || (year === endYear && month <= endMonth)) {
      const monthStr = `${year}-${String(month).padStart(2, "0")}`;

      result.push({
        month: monthStr,
        count: data[monthStr] ?? 0,
      });

      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    return result;
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`text-slate-900 dark:text-slate-100 rounded-md ring-1 ring-slate-200 dark:ring-slate-700 bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl shadow-lg p-6 ${className}`}
    >
      <h2 className="mb-4 text-lg font-semibold leading-none text-slate-900 dark:text-slate-100">
        Monthly Message Trend
      </h2>
      <div className="overflow-x-auto sm:overflow-x-visible">
        <div className="w-[600px] sm:w-full">
          <ResponsiveContainer width="100%" height={320} minWidth={250}>
            <LineChart
              data={chartData}
              margin={{ top: 12, right: 18, bottom: 10, left: 12 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-slate-200 dark:stroke-slate-700"
              />
              <XAxis
                dataKey="month"
                tick={{ fill: "currentColor", fontSize: 12 }}
                label={{
                  value: "Month",
                  position: "insideBottom",
                  dy: 12,
                  fill: "currentColor",
                }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "currentColor", fontSize: 12 }}
                label={{
                  value: "Messages",
                  angle: -90,
                  position: "insideLeft",
                  dx: -12,
                  fill: "currentColor",
                }}
              />
              <Tooltip
                wrapperClassName="!rounded-2xl !px-3 !py-2 !bg-white/90 dark:!bg-slate-800/95 !border-0 !shadow-lg"
                formatter={(val: number) => [val, "Messages"]}
                labelFormatter={(label) => label}
              />
              <Line
                type="monotone"
                dataKey="count"
                className="stroke-emerald-500 dark:stroke-emerald-400"
                strokeWidth={2.5}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4.5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(MonthlyChart);
