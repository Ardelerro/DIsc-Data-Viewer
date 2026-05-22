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
import React from "react";
import type { HourlyChartProps } from "../../types/types";
import { CHART_TOOLTIP_STYLE, C } from "../../config/theme";

const HourlyChart: FC<HourlyChartProps> = ({ data, className = "", title }) => {
  const chartData = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, "0");
      return { hour, count: data[hour] ?? 0 };
    });
  }, [data]);

  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden ${className}`}
    >
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-text-1)]">
          {title || "Hourly Message Frequency"}
        </h2>
      </div>

      <div className="p-4 text-[var(--color-text-3)]">
        <div className="w-full h-[220px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, bottom: 20, left: -8 }}
            >
              <CartesianGrid
                strokeDasharray="0"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="hour"
                tick={{ fill: "currentColor", fontSize: 10 }}
                interval={window.innerWidth < 640 ? 2 : 0}
                label={{
                  value: "Hour (24h)",
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
                  dx: -4,
                  fill: "currentColor",
                  fontSize: 10,
                }}
              />
              <Tooltip
                cursor={{ fill: C.surfaceRaised }}
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value: number) => [value.toLocaleString(), "Messages"]}
                labelFormatter={(label) => `${label}:00`}
              />
              <Bar
                dataKey="count"
                radius={[3, 3, 0, 0]}
                fill={C.accent}
                opacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default React.memo(HourlyChart);
