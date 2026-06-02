import type { FC } from "react";
import { colCenter, FitText } from "../../../utils/generateWrapped";
import { type CardProps, CardFrame } from "../WrappedCards";
import { Blob } from "../../../utils/generateWrapped";

export const PersonalityCard: FC<CardProps> = ({ stats, avatarUrl, def }) => {
  const Icon = stats.personality.icon;
  return (
    <CardFrame
      def={def}
      avatarUrl={avatarUrl}
      username={stats.self.username}
      decoration={
        <>
          <Blob size={560} color={`${def.accent}2e`} top={-120} right={-120} blur={14} />
          <Blob size={420} color="rgba(255,255,255,0.06)" bottom={160} left={-160} />
        </>
      }
    >
      <div style={colCenter}>
        <div
          style={{
            width: 148,
            height: 148,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 44,
          }}
        >
          <Icon size={78} color="#fff" strokeWidth={1.6} />
        </div>
        <div style={{ fontSize: 42, opacity: 0.72, marginBottom: 8 }}>You&rsquo;re</div>
        <FitText
          text={stats.personality.name}
          maxWidth={900}
          maxSize={120}
          color={def.accent}
        />
        <div style={{ fontSize: 40, opacity: 0.86, marginTop: 18, lineHeight: 1.35 }}>
          {stats.personality.tagline}
        </div>
        {stats.personality.signals.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 48 }}>
            {stats.personality.signals.slice(0, 3).map((sig, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: def.accent,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 30, opacity: 0.82 }}>{sig}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </CardFrame>
  );
};