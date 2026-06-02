import type { FC } from "react";
import { colCenter, FitText, Divider } from "../../../utils/generateWrapped";
import { type CardProps, CardFrame } from "../WrappedCards";
import { Blob } from "../../../utils/generateWrapped";

function formatShortDate(key: string | null): string {
  if (!key) return "";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleString("default", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}


export const StreaksCard: FC<CardProps> = ({ stats, avatarUrl, def }) => {
  const hasStreak = stats.streak.length >= 2;
  return (
    <CardFrame
      def={def}
      avatarUrl={avatarUrl}
      username={stats.self.username}
      decoration={
        <Blob size={720} color="rgba(255,255,255,0.07)" top={-200} right={-200} />
      }
    >
      <div style={colCenter}>
        {hasStreak ? (
          <>
            <FitText
              text={stats.streak.length.toLocaleString()}
              maxWidth={900}
              maxSize={300}
              color={def.accent}
            />
            <div style={{ fontSize: 60, fontWeight: 700, opacity: 0.92, marginTop: 12 }}>
              day streak
            </div>
            <Divider accent={def.accent} />
            <div style={{ fontSize: 40, opacity: 0.82 }}>
              {formatShortDate(stats.streak.start)} → {formatShortDate(stats.streak.end)}
            </div>
            <div style={{ fontSize: 34, opacity: 0.6, marginTop: 16 }}>
              {stats.activeDays.toLocaleString()} active days in total
            </div>
          </>
        ) : (
          <>
            <FitText
              text={stats.activeDays.toLocaleString()}
              maxWidth={900}
              maxSize={300}
              color={def.accent}
            />
            <div style={{ fontSize: 60, fontWeight: 700, opacity: 0.92, marginTop: 12 }}>
              days you showed up
            </div>
          </>
        )}
      </div>
    </CardFrame>
  );
};