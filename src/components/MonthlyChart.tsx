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

interface MonthlyChartProps {
    data: Record<string, number>;
    className?: string;
}

const MonthlyChart: FC<MonthlyChartProps> = ({ data, className = "" }) => {
const chartData = useMemo(() => {
    const months = Object.keys(data).sort();
    if (months.length === 0) return [];

    const first = new Date(`${months[0]}-01`);
    const last = new Date(`${months[months.length - 1]}-01`);

    const result: { month: string; count: number; ts: number }[] = [];
    const current = new Date(first);

    while (current <= last) {
        const monthStr = current.toISOString().slice(0, 7);
        result.push({ month: monthStr, count: data[monthStr] ?? 0, ts: current.getTime() });
        current.setMonth(current.getMonth() + 1);
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
            <ResponsiveContainer width="100%" height={320} minWidth={250}>
                <LineChart data={chartData} margin={{ top: 12, right: 18, bottom: 10, left: 12 }} >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis
                        dataKey="month"
                        tick={{ fill: "currentColor", fontSize: 12 }}
                        label={{ value: "Month", position: "insideBottom", dy: 12, fill: "currentColor" }}
                    />
                    <YAxis
                        allowDecimals={false}
                        tick={{ fill: "currentColor", fontSize: 12 }}
                        label={{ value: "Messages", angle: -90, position: "insideLeft", dx: -12, fill: "currentColor" }}
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
        </motion.div>
    );
};

export default MonthlyChart;