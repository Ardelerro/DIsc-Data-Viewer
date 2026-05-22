import type { FC } from "react";
import { useMemo } from "react";
import { useData } from "../../../context/DataContext";
import React from "react";
import TopDisplay from "./TopDisplay";
import MarqueeText from "../../text/MarqueeText";
import type { UserStats } from "../../../types/discord";
import Avatar from "../../Avatar";
import { countInRange, type DateRange } from "../../../utils/timeFilterUtils";

const TopUsers: FC<{ className?: string; dateRange?: DateRange | null }> = ({ className = "", dateRange = null }) => {
  const { data } = useData();

  const userStats = useMemo<UserStats[]>(() => {
    if (!data) return [];
    const results: UserStats[] = [];
    for (const [key, stats] of Object.entries(data.channelStats)) {
      if (!stats.recipientName || !key.startsWith("dm_")) continue;
      const totalMessages = countInRange(stats, dateRange);
      const channelId = key.replace(/^dm_|\.json$/g, "");
      const userId = Object.entries(data.userMapping || {}).find(
        ([, info]) => info.username === stats.recipientName,
      )?.[0];
      const avatar = userId ? data.userMapping?.[userId]?.avatar : undefined;
      results.push({
        channelId,
        userId,
        name: stats.recipientName,
        avatar,
        count: totalMessages,
      });
    }
    return results.sort((a, b) => b.count - a.count).slice(0, 10);
  }, [data, dateRange]);

  const rows = userStats.map((u, i) => (
    <tr
      key={u.channelId}
      className="hover:bg-[var(--color-surface-raised)] transition-colors duration-100"
    >
      <td className="px-3 py-2.5 text-xs text-[var(--color-text-3)] tabular-nums whitespace-nowrap">
        {i + 1}
      </td>
      <td className="px-3 py-2.5 overflow-hidden min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            userId={u.userId}
            avatarHash={u.avatar}
            className="w-6 h-6 rounded-full shrink-0"
          />
          <div className="min-w-0 flex-1 overflow-hidden">
            <MarqueeText text={u.name} rotation="hover" className="text-sm text-[var(--color-text-1)]" />
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-[var(--color-accent)] font-mono tabular-nums text-right whitespace-nowrap">
        {u.count.toLocaleString()}
      </td>
    </tr>
  ));

  return (
    <TopDisplay
      title="Top 10 Messaged Users"
      headers={["#", "User", "Messages"]}
      colWidths={["12%", "auto", "22%"]}
      rows={rows}
      className={className}
      emptyMessage="No DM stats found."
      noDataMessage="No data loaded. Please upload your Discord ZIP file first."
    />
  );
};

export default React.memo(TopUsers);
