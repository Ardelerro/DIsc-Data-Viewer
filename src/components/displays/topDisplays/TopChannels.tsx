import type { FC } from "react";
import { useMemo } from "react";
import { useData } from "../../../context/DataContext";
import React from "react";
import TopDisplay from "./TopDisplay";
import MarqueeText from "../../text/MarqueeText";
import type { ChannelInfo } from "../../../types/discord";
import { countInRange, type DateRange } from "../../../utils/timeFilterUtils";

const TopChannels: FC<{ className?: string; dateRange?: DateRange | null }> = ({
  className = "",
  dateRange = null,
}) => {
  const { data } = useData();

  const topChannels = useMemo<ChannelInfo[]>(() => {
    if (!data?.channelStats || !data?.serverMapping) return [];
    const results: ChannelInfo[] = [];
    for (const [key, stats] of Object.entries(data.channelStats)) {
      if (!key.startsWith("channel_")) continue;
      const total = countInRange(stats, dateRange);
      const channelId = key.replace(/^channel_|\.json$/g, "");
      const serverId = data.serverMapping.channelToServer[channelId];
      const serverName = data.serverMapping.serverNames[serverId] || "";
      const resolvedName =
        data.channelNaming?.[channelId] ||
        stats.recipientName ||
        `#${channelId}`;
      results.push({
        channelId,
        name: resolvedName,
        totalMessages: total,
        serverName,
      });
    }
    return results
      .sort((a, b) => b.totalMessages - a.totalMessages)
      .slice(0, 10);
  }, [data, dateRange]);

  const rows = topChannels.map((c, i) => (
    <tr
      key={c.channelId}
      className="hover:bg-[var(--color-surface-raised)] transition-colors duration-100"
    >
      <td className="px-3 py-2.5 text-xs text-[var(--color-text-3)] tabular-nums whitespace-nowrap">
        {i + 1}
      </td>
      <td className="px-3 py-2.5 overflow-hidden min-w-0">
        <MarqueeText
          text={c.name}
          rotation="hover"
          className="text-sm text-[var(--color-text-1)]"
        />
      </td>
      <td className="px-3 py-2.5 overflow-hidden min-w-0">
        <MarqueeText
          text={c.serverName}
          rotation="hover"
          className="text-xs text-[var(--color-text-3)]"
        />
      </td>
      <td className="px-3 py-2.5 text-xs text-[var(--color-accent)] font-mono tabular-nums text-right whitespace-nowrap">
        {c.totalMessages.toLocaleString()}
      </td>
    </tr>
  ));

  return (
    <TopDisplay
      title="Top 10 Channels"
      headers={["#", "Channel", "Server", "Messages"]}
      colWidths={["12%", "auto", "28%", "20%"]}
      rows={rows}
      className={className}
      emptyMessage="No channels found."
      noDataMessage="No data loaded. Please upload your Discord ZIP file first."
    />
  );
};

export default React.memo(TopChannels);
