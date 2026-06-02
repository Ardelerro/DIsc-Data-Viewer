import type { FC } from "react";
import { colCenter, FitText } from "../../../utils/generateWrapped";
import { type CardProps, CardFrame } from "../WrappedCards";
import { Blob } from "../../../utils/generateWrapped";

function StatPair({
  items,
}: {
  items: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: "flex", gap: 96 }}>
      {items.map((it) => (
        <div key={it.label}>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1 }}>
            {it.value}
          </div>
          <div style={{ fontSize: 30, opacity: 0.6, marginTop: 10 }}>
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}


function HourHistogram({
  hourly,
  accent,
}: {
  hourly: number[];
  accent: string;
}) {
  const max = Math.max(1, ...hourly);
  let peakIdx = 0;
  for (let i = 1; i < hourly.length; i++)
    if (hourly[i] > hourly[peakIdx]) peakIdx = i;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 240 }}>
        {hourly.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(2, (v / max) * 100)}%`,
              background: i === peakIdx ? accent : "rgba(255,255,255,0.26)",
              borderRadius: 7,
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 16,
          fontSize: 22,
          opacity: 0.5,
        }}
      >
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>11pm</span>
      </div>
    </div>
  );
}

export const HoursCard: FC<CardProps> = ({ stats, avatarUrl, def }) => (
  <CardFrame
    def={def}
    avatarUrl={avatarUrl}
    username={stats.self.username}
    decoration={
      <Blob size={520} color={`${def.accent}26`} top={-120} right={-120} blur={10} />
    }
  >
    <div style={{ ...colCenter, justifyContent: "space-between" }}>
      <div>
        <FitText
          text={stats.peakHour.label}
          maxWidth={900}
          maxSize={196}
          color={def.accent}
        />
        <div style={{ fontSize: 40, opacity: 0.72, marginTop: 8 }}>
          your golden hour
        </div>
      </div>
      <HourHistogram hourly={stats.hourly} accent={def.accent} />
      <StatPair
        items={[
          { value: stats.dailyAverage.toLocaleString(), label: "messages / day" },
          { value: stats.busiestWeekday, label: "busiest day" },
        ]}
      />
    </div>
  </CardFrame>
);