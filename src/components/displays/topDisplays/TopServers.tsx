import type { FC } from "react";
import { useMemo } from "react";
import { useData } from "../../../context/DataContext";
import React from "react";
import TopDisplay from "./TopDisplay";
import MarqueeText from "../../text/MarqueeText";
import type { ServerStats } from "../../../types/discord";
import { countInRange, type DateRange } from "../../../utils/timeFilterUtils";

const TopServers: FC<{ className?: string; dateRange?: DateRange | null }> = ({ className = "", dateRange = null }) => {
  const { data, isLoading } = useData();

  const topServers = useMemo(() => {
    if (!data) return [];
    const { channelStats, serverMapping } = data;
    const serverCounts: Record<string, number> = {};
    for (const [key, stats] of Object.entries(channelStats)) {
      if (!key.startsWith("channel_")) continue;
      const channelId = key.replace(/^channel_/, "");
      const total = countInRange(stats, dateRange);
      const type = data.channelMapping[channelId];
      if (!["GUILD_TEXT", "PUBLIC_THREAD", "GUILD_VOICE"].includes(type)) continue;
      const serverId = serverMapping.channelToServer[channelId] ?? `unknown (${channelId})`;
      serverCounts[serverId] = (serverCounts[serverId] || 0) + total;
    }
    const serverStats: ServerStats[] = Object.entries(serverCounts).map(
      ([serverId, totalMessages]) => ({
        serverId,
        name: serverMapping.serverNames[serverId] ?? `Unknown Server (${serverId})`,
        totalMessages,
      })
    );
    return serverStats.sort((a, b) => b.totalMessages - a.totalMessages).slice(0, 10);
  }, [data, dateRange]);

  const rows = topServers.map((s, i) => (
    <tr
      key={s.serverId}
      className="hover:bg-[var(--color-surface-raised)] transition-colors duration-100"
    >
      <td className="px-3 py-2.5 text-xs text-[var(--color-text-3)] tabular-nums whitespace-nowrap">
        {i + 1}
      </td>
      <td className="px-3 py-2.5 overflow-hidden min-w-0">
        <MarqueeText text={s.name} className="text-sm text-[var(--color-text-1)]" />
      </td>
      <td className="px-3 py-2.5 text-xs text-[var(--color-accent)] font-mono tabular-nums text-right whitespace-nowrap">
        {s.totalMessages.toLocaleString()}
      </td>
    </tr>
  ));

  return (
    <TopDisplay
      title="Top 10 Servers"
      headers={["#", "Server", "Messages"]}
      colWidths={["12%", "auto", "22%"]}
      rows={rows}
      isLoading={isLoading}
      className={className}
      emptyMessage="No servers found."
      noDataMessage="No data loaded."
    />
  );
};

export default React.memo(TopServers);
