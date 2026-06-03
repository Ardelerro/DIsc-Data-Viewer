import type { FC } from "react";
import { colCenter, FitText } from "../../../utils/uiUtils/generateWrapped";
import { type CardProps, CardFrame } from "../WrappedCards";
import { Blob } from "../../../utils/uiUtils/generateWrapped";

export const CoverCard: FC<CardProps> = ({ stats, avatarUrl, def }) => (
  <CardFrame
    def={def}
    avatarUrl={avatarUrl}
    username={stats.self.username}
    eyebrow={stats.yearRange}
    decoration={
      <>
        <Blob size={720} color="rgba(255,255,255,0.10)" top={-220} right={-180} />
        <Blob size={420} color={`${def.accent}33`} bottom={120} left={-160} blur={20} />
      </>
    }
  >
    <div style={{ ...colCenter, justifyContent: "center", alignItems: "flex-start" }}>
      <img
        src={avatarUrl}
        width={188}
        height={188}
        alt=""
        style={{
          borderRadius: "50%",
          objectFit: "cover",
          marginBottom: 52,
          boxShadow: "0 0 0 6px rgba(255,255,255,0.16)",
        }}
      />
      <div style={{ fontSize: 46, fontWeight: 600, opacity: 0.85, marginBottom: 10 }}>
        {stats.self.username}&rsquo;s
      </div>
      <FitText text="Discord" maxWidth={900} maxSize={232} color="#fff" letterSpacing="-0.03em" />
      <FitText text="Wrapped" maxWidth={900} maxSize={232} color={def.accent} letterSpacing="-0.03em" />
    </div>
  </CardFrame>
);
