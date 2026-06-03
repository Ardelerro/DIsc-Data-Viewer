import type { FC } from "react";
import { FitText, Divider, colCenter } from "../../../utils/uiUtils/generateWrapped";
import { type CardProps, CardFrame } from "../WrappedCards";
import { Blob } from "../../../utils/uiUtils/generateWrapped";

function InitialAvatar({ name, size }: { name: string; size: number }) {
  const trimmed = (name || "?").trim();
  const letter = trimmed.charAt(0).toUpperCase() || "?";
  let h = 0;
  for (let i = 0; i < trimmed.length; i++)
    h = (h * 31 + trimmed.charCodeAt(i)) % 360;
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        background: `linear-gradient(135deg, hsl(${h} 68% 56%), hsl(${(h + 45) % 360} 68% 46%))`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: size * 0.42,
        color: "#fff",
      }}
    >
      {letter}
    </div>
  );
}
export const PeopleCard: FC<CardProps> = ({ stats, avatarUrl, def }) => {
  const [top, ...rest] = stats.topPeople;
  return (
    <CardFrame
      def={def}
      avatarUrl={avatarUrl}
      username={stats.self.username}
      decoration={
        <Blob size={680} color="rgba(255,255,255,0.07)" bottom={-220} right={-180} />
      }
    >
      {top ? (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: def.accent }}>#1</div>
          <FitText
            text={top.name}
            maxWidth={900}
            maxSize={128}
            style={{ marginTop: 6 }}
          />
          <div style={{ fontSize: 36, opacity: 0.62, marginTop: 12 }}>
            {top.count.toLocaleString()} messages together
          </div>

          {rest.length > 0 && (
            <>
              <Divider accent={def.accent} />
              <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
                {rest.map((p, i) => (
                  <div
                    key={p.name + i}
                    style={{ display: "flex", alignItems: "center", gap: 22 }}
                  >
                    <span
                      style={{
                        fontSize: 40,
                        fontWeight: 800,
                        opacity: 0.32,
                        width: 64,
                        flexShrink: 0,
                      }}
                    >
                      {i + 2}
                    </span>
                    <InitialAvatar name={p.name} size={66} />
                    <FitText
                      text={p.name}
                      maxWidth={460}
                      maxSize={38}
                      minSize={24}
                      weight={600}
                      letterSpacing="0"
                      style={{ flex: 1 }}
                    />
                    <span
                      style={{
                        fontSize: 32,
                        opacity: 0.55,
                        flexShrink: 0,
                        textAlign: "right",
                      }}
                    >
                      {p.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={colCenter}>
          <FitText text="Servers, mostly" maxWidth={900} maxSize={120} color={def.accent} />
          <div style={{ fontSize: 38, opacity: 0.72, marginTop: 16 }}>
            Not much DM activity this year.
          </div>
        </div>
      )}
    </CardFrame>
  );
};