import type { FC, ReactNode } from "react";
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
    <div
      className={`flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden max-w-full ${className}`}
    >
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-base font-semibold text-[var(--color-text-1)]">
          {title}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center h-32">
          <div className="animate-spin h-5 w-5 rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        </div>
      ) : !rows ? (
        <div className="flex flex-1 items-center justify-center h-32 text-sm text-[var(--color-text-3)]">
          {noDataMessage}
        </div>
      ) : !hasRows ? (
        <div className="flex flex-1 items-center justify-center h-32 text-sm text-[var(--color-text-3)]">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex-1 w-full min-w-0 overflow-hidden">
          <table className="w-full max-w-full table-fixed text-sm text-[var(--color-text-1)]">
            <colgroup>
              {colWidths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>

            <thead>
              <tr className="bg-[var(--color-surface-raised)]">
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-3)] truncate"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="min-w-0 divide-y divide-[var(--color-border)]">
              {rows}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default React.memo(TopDisplay);
