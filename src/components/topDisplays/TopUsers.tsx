import type { FC } from "react";
import { useMemo } from "react";
import { useData } from "../../context/DataContext";
import React from "react";
import TopDisplay from "./TopDisplay";
import MarqueeText from "../text/MarqueeText";
import type { UserStats } from "../../types/discord";
import Avatar from "../Avatar";

const TopUsers: FC<{ className?: string }> = ({ className = "" }) => {
  const { data } = useData();

  const userStats = useMemo<UserStats[]>(() => {
    if (!data) return [];
    const results: UserStats[] = [];
    for (const [key, stats] of Object.entries(data.channelStats)) {
      if (!stats.recipientName || !key.startsWith("dm_")) continue;
      const totalMessages = Object.values(stats.hourly || {}).reduce(
        (a, b) => a + b,
        0,
      );
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
  }, [data]);

  const rows = userStats.map((u, i) => (
    <tr
      key={u.channelId}
      className="even:bg-slate-50 dark:even:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <td className="px-4 py-3 font-semibold text-lg whitespace-nowrap">
        #{i + 1}
      </td>
      <td className="px-4 py-3 overflow-hidden min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            userId={u.userId}
            avatarHash={u.avatar}
            className="w-10 h-10 rounded-full shrink-0"
          />
          <div className="min-w-0 flex-1 overflow-hidden">
            <MarqueeText text={u.name} rotation="hover" className="text-base" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 text-base text-right whitespace-nowrap pl-6 shrink-0">
        {u.count.toLocaleString()}
      </td>
    </tr>
  ));

  return (
    <TopDisplay
      title="Top 10 Messaged Users"
      headers={["Rank", "User", "Messages"]}
      colWidths={["15%", "auto", "25%"]}
      rows={rows}
      className={className}
      emptyMessage="No DM stats found."
      noDataMessage="No data loaded. Please upload your Discord ZIP file first."
    />
  );
};

export default React.memo(TopUsers);
