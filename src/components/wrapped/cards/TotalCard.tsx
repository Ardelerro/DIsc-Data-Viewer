import type { FC } from "react";
import { colCenter, FitText, Divider } from "../../../utils/generateWrapped";
import { type CardProps, CardFrame } from "../WrappedCards";
import { Blob } from "../../../utils/generateWrapped";

export const TotalCard: FC<CardProps> = ({ stats, avatarUrl, def }) => (
  <CardFrame
    def={def}
    avatarUrl={avatarUrl}
    username={stats.self.username}
    decoration={
      <Blob size={760} color="rgba(255,255,255,0.07)" top={-200} left={-220} />
    }
  >
    <div style={colCenter}>
      <FitText
        text={stats.totalMessages.toLocaleString()}
        maxWidth={900}
        maxSize={300}
        color={def.accent}
      />
      <div style={{ fontSize: 60, fontWeight: 700, opacity: 0.92, marginTop: 14 }}>
        messages sent
      </div>
      <Divider accent={def.accent} />
      <div style={{ fontSize: 38, opacity: 0.72, lineHeight: 1.5 }}>
        Across <b>{stats.daySpan.toLocaleString()} days</b> — about{" "}
        <b>{stats.dailyAverage.toLocaleString()}</b> a day.
      </div>
    </div>
  </CardFrame>
);