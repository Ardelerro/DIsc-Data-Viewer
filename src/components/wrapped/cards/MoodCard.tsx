import type { FC } from "react";
import { colCenter, FitText } from "../../../utils/generateWrapped";
import { type CardProps, CardFrame } from "../WrappedCards";
import { Blob } from "../../../utils/generateWrapped";

function SegmentBar({
  positive,
  neutral,
  negative,
  total,
}: {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}) {
  const pct = (n: number) => `${(n / total) * 100}%`;
  const segs = [
    { w: pct(positive), color: "#34d399", label: "Positive", count: positive },
    { w: pct(neutral), color: "#fbbf24", label: "Neutral", count: neutral },
    { w: pct(negative), color: "#f87171", label: "Negative", count: negative },
  ];
  return (
    <div>
      <div
        style={{
          display: "flex",
          height: 44,
          borderRadius: 999,
          overflow: "hidden",
          width: "100%",
        }}
      >
        {segs.map((s) => (
          <div key={s.label} style={{ width: s.w, background: s.color }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 40, marginTop: 28 }}>
        {segs.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: s.color,
              }}
            />
            <span style={{ fontSize: 30, opacity: 0.85 }}>
              {s.label} {Math.round((s.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const MoodCard: FC<CardProps> = ({ stats, avatarUrl, def }) => {
  const s = stats.sentiment!;
  return (
    <CardFrame
      def={def}
      avatarUrl={avatarUrl}
      username={stats.self.username}
      decoration={
        <Blob size={520} color={`${def.accent}26`} bottom={140} right={-140} blur={16} />
      }
    >
      <div style={colCenter}>
        <FitText text={s.moodLabel} maxWidth={900} maxSize={116} color="#fff" />
        <div style={{ fontSize: 38, opacity: 0.8, marginTop: 16, marginBottom: 70 }}>
          {s.positivityPct}% of your messages were positive
        </div>
        <SegmentBar
          positive={s.positive}
          neutral={s.neutral}
          negative={s.negative}
          total={s.total}
        />
      </div>
    </CardFrame>
  );
};