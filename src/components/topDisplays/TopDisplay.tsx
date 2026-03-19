import type { FC, ReactNode } from "react";
import { motion } from "framer-motion";
import React from "react";

export interface TopDisplayProps {
  title: string;
  headers: string[];
  colWidths: string[];
  rows: ReactNode[];
  className?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  noDataMessage?: string;
}

const TopDisplay: FC<TopDisplayProps> = ({
  title,
  headers,
  colWidths,
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
      transition={{ duration: 0.4 }}
      className={`flex flex-col rounded-3xl ring-1 ring-slate-200 dark:ring-slate-700 bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl shadow-lg p-6 overflow-hidden max-w-full ${className}`}
    >
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h2>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center h-32">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : !rows ? (
        <div className="flex flex-1 items-center justify-center h-32 text-slate-600 dark:text-slate-300">
          {noDataMessage}
        </div>
      ) : !hasRows ? (
        <div className="flex flex-1 items-center justify-center h-32 text-slate-600 dark:text-slate-300">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex-1 w-full min-w-0 overflow-hidden">
          <table className="w-full max-w-full table-fixed text-base text-slate-700 dark:text-slate-200">
            <colgroup>
              {colWidths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>

            <thead>
              <tr className="bg-slate-100 dark:bg-slate-700/40 text-left text-lg">
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-2 font-medium truncate"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="min-w-0">{rows}</tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(TopDisplay);