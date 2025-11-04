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

interface HourlyChartProps {
    data: Record<string, number>;
    className?: string;
    title?: string;
}

const HourlyChart: FC<HourlyChartProps> = ({ data, className = "", title }) => {
    const chartData = useMemo(() => {
        return Array.from({ length: 24 }, (_, i) => {
            const hour = i.toString().padStart(2, "0");
            return { hour, count: data[hour] ?? 0 };
        });
    }, [data]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`text-slate-900 dark:text-slate-100 rounded-md ring-1 ring-slate-200 dark:ring-slate-700 bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl shadow-lg p-6 ${className}`}
        >
            <h2 className="mb-4 text-lg font-semibold leading-none text-slate-900 dark:text-slate-100">
                {title || "Hourly Message Frequency"}
            </h2>
            <ResponsiveContainer width="100%" height={320} minWidth={250}>
                <BarChart data={chartData} margin={{ top: 12, right: 18, bottom: 10, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                    <XAxis
                        dataKey="hour"
                        tick={{ fill: "currentColor", fontSize: 12 }}
                        label={{ value: "Hour (24h)", position: "insideBottom", dy: 12, fill: "currentColor" }}
                    />
                    <YAxis
                        allowDecimals={false}
                        tick={{ fill: "currentColor", fontSize: 12 }}
                        label={{ value: "Messages", angle: -90, position: "insideLeft", dx: -12, fill: "currentColor" }}
                    />
                    <Tooltip
                        wrapperClassName="!rounded-2xl !px-3 !py-2 !bg-white/90 dark:!bg-slate-800/95 !border-0 !shadow-lg dark:!text-slate-300"
                        formatter={(value: number) => [value, "Messages"]}
                        labelFormatter={(label) => `Hour ${label}:00`}
                    />
                    <Bar dataKey="count" className="fill-indigo-500 dark:fill-indigo-400" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </motion.div>
    );
};

export default HourlyChart;
