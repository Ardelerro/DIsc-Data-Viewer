import type { FC, ReactNode } from "react";
import { motion } from "framer-motion";
import React from "react";

export interface TopDisplayProps {
  title: string;
  headers: string[];
  rows: ReactNode[];
  className?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  noDataMessage?: string;
}

const TopDisplay: FC<TopDisplayProps> = ({
  title,
  headers,
  rows,
  className = "",
  isLoading = false,
  emptyMessage = "No entries found.",
  noDataMessage = "No data loaded.",
}) => {
  const hasRows = rows && rows.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`rounded-3xl ring-1 ring-slate-200 dark:ring-slate-700 bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl shadow-lg p-6 ${className}`}
    >
      <h2 className="mb-4 text-lg font-semibold leading-none text-slate-900 dark:text-slate-100">
        {title}
      </h2>

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : !rows ? (
        <div className="flex justify-center items-center h-32 text-slate-600 dark:text-slate-300">
          {noDataMessage}
        </div>
      ) : !hasRows ? (
        <div className="flex justify-center items-center h-32 text-slate-600 dark:text-slate-300">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="min-w-full table-auto text-base text-slate-700 dark:text-slate-200">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-700/40 text-left text-lg">
                {headers.map((h, i) => (
                  <th key={i} className="px-4 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(TopDisplay);
