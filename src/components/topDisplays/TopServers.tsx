import type { FC } from "react";
import { useMemo } from "react";
import { useData } from "../../context/DataContext";
import React from "react";
import TopDisplay from "./TopDisplay";
import MarqueeText from "../text/MarqueeText";
import type { ServerStats } from "../../types/discord";

const TopServers: FC<{ className?: string }> = ({ className = "" }) => {
  const { data, isLoading } = useData();

  const topServers = useMemo(() => {
    if (!data) return [];
    const { channelStats, serverMapping } = data;
    const serverCounts: Record<string, number> = {};
    for (const [key, stats] of Object.entries(channelStats)) {
      if (!key.startsWith("channel_")) continue;
      const channelId = key.replace(/^channel_/, "");
      const total = Object.values(stats.hourly || {}).reduce((sum, val) => sum + (val ?? 0), 0);
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
  }, [data]);

  const rows = topServers.map((s, i) => (
    <tr
      key={s.serverId}
      className="even:bg-slate-50 dark:even:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <td className="px-4 py-3 font-semibold text-lg whitespace-nowrap">#{i + 1}</td>
      <td className="px-4 py-3 overflow-hidden min-w-0">
        <MarqueeText text={s.name} className="text-base" />
      </td>
      <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 text-base text-right whitespace-nowrap pl-6 shrink-0">
        {s.totalMessages.toLocaleString()}
      </td>
    </tr>
  ));

  return (
    <TopDisplay
      title="Top 10 Servers"
      headers={["Rank", "Server", "Messages"]}
      colWidths={["15%", "auto", "25%"]}
      rows={rows}
      isLoading={isLoading}
      className={className}
      emptyMessage="No servers found."
      noDataMessage="No data loaded."
    />
  );
};

export default React.memo(TopServers);