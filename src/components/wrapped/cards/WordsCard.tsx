import type { FC } from "react";
import { FitText } from "../../../utils/uiUtils/generateWrapped";
import { type CardProps, CardFrame } from "../WrappedCards";
import { Blob } from "../../../utils/uiUtils/generateWrapped";

function WordChips({ words, accent }: { words: string[]; accent: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "18px 16px", alignContent: "flex-start" }}>
      {words.map((w, i) => {
        const size = i < 3 ? 46 : i < 8 ? 38 : i < 14 ? 31 : 26;
        return (
          <span
            key={w + i}
            style={{
              fontSize: size,
              fontWeight: i < 3 ? 700 : 600,
              padding: "10px 24px",
              borderRadius: 999,
              lineHeight: 1,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.16)",
              color: i < 3 ? accent : "rgba(255,255,255,0.92)",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}

export const WordsCard: FC<CardProps> = ({ stats, avatarUrl, def }) => (
  <CardFrame
    def={def}
    avatarUrl={avatarUrl}
    username={stats.self.username}
    decoration={
      <Blob size={560} color={`${def.accent}26`} top={-160} left={-140} blur={14} />
    }
  >
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <FitText text={stats.topWords[0] ?? ""} maxWidth={900} maxSize={176} color={def.accent} />
      <div style={{ fontSize: 38, opacity: 0.72, marginTop: 8, marginBottom: 56 }}>
        your most-used word
      </div>
      <WordChips words={stats.topWords.slice(1)} accent={def.accent} />
    </div>
  </CardFrame>
);