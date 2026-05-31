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
import React from "react";
import type { MonthlyChartProps } from "../../types/types";
import { CHART_TOOLTIP_STYLE, C } from "../../config/theme";

const MonthlyChart: FC<MonthlyChartProps> = ({ data, className = "" }) => {
  const chartData = useMemo(() => {
    const months = Object.keys(data).sort();
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
      result.push({ month: monthStr, count: data[monthStr] ?? 0 });
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    return result;
  }, [data]);

  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden ${className}`}
    >
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-text-1)]">
          Monthly Message Trend
        </h2>
      </div>

      <div className="p-4 text-[var(--color-text-3)]">
        <div className="overflow-x-auto sm:overflow-x-visible">
          <div className="w-[600px] sm:w-full">
            <ResponsiveContainer width="100%" height={280} minWidth={250}>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 18, bottom: 20, left: 12 }}
              >
                <CartesianGrid
                  strokeDasharray="0"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "currentColor", fontSize: 10 }}
                  label={{
                    value: "Month",
                    position: "insideBottom",
                    dy: 14,
                    fill: "currentColor",
                    fontSize: 10,
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
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  cursor={{ stroke: C.border, strokeWidth: 1 }}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(val: number) => [
                    val.toLocaleString(),
                    "Messages",
                  ]}
                  labelFormatter={(label) => label}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={C.accent}
                  strokeWidth={2}
                  dot={{ r: 2, fill: C.accent, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: C.accent, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MonthlyChart);
