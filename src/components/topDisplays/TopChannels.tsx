import type { FC } from "react";
import { useMemo } from "react";
import { useData } from "../../context/DataContext";
import React from "react";
import TopDisplay from "./TopDisplay";
import type { ChannelInfo } from "../../types/discord";

const TopChannels: FC<{ className?: string }> = ({ className = "" }) => {
  const { data } = useData();

  const topChannels = useMemo<ChannelInfo[]>(() => {
    if (!data?.channelStats || !data?.serverMapping) return [];

    const results: ChannelInfo[] = [];
    for (const [key, stats] of Object.entries(data.channelStats)) {
      if (!key.startsWith("channel_")) continue;

      const total = Object.values(stats.hourly || {}).reduce((a, b) => a + b, 0);
      const channelId = key.replace(/^channel_|\.json$/g, "");
      const serverId = data.serverMapping.channelToServer[channelId];
      const serverName = data.serverMapping.serverNames[serverId] || "";
      const resolvedName =
        data.channelNaming?.[channelId] || stats.recipientName || `#${channelId}`;

      results.push({ channelId, name: resolvedName, totalMessages: total, serverName });
    }

    return results.sort((a, b) => b.totalMessages - a.totalMessages).slice(0, 10);
  }, [data]);

  const rows =
    topChannels.length > 0
      ? topChannels.map((c, i) => (
          <tr
            key={c.channelId}
            className="even:bg-slate-50 dark:even:bg-slate-700/30 hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <td className="px-6 py-3 font-semibold text-lg">#{i + 1}</td>
            <td className="px-6 py-3">{c.name}</td>
            <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{c.serverName}</td>
            <td className="px-6 py-3 text-indigo-600 dark:text-indigo-400 text-right text-lg">
              {c.totalMessages.toLocaleString()}
            </td>
          </tr>
        ))
      : [];

  return (
    <TopDisplay
      title="Top 10 Channels"
      headers={["Rank", "Channel", "Server", "Messages"]}
      rows={rows}
      className={className}
      emptyMessage="No channels found."
      noDataMessage="No data loaded. Please upload your Discord ZIP file first."
    />
  );
};

export default React.memo(TopChannels);
