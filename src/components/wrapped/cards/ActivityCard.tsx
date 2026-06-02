import type { FC } from "react";
import { CardFrame, type CardProps } from "../WrappedCards";
import { Smile, Mic, Phone, Paperclip } from "lucide-react";
import { colCenter, FitText } from "../../../utils/generateWrapped";
import { Blob } from "../../../utils/generateWrapped";
const ACTIVITY_ICONS = { Smile, Mic, Phone, Paperclip };

export const ActivityCard: FC<CardProps> = ({ stats, avatarUrl, def }) => {
  const rows: { Icon: typeof Smile; label: string; value: number }[] = [
    { Icon: ACTIVITY_ICONS.Smile, label: "Reactions given", value: stats.activity.reactions },
    { Icon: ACTIVITY_ICONS.Mic, label: "Voice sessions", value: stats.activity.voice },
    { Icon: ACTIVITY_ICONS.Phone, label: "Calls", value: stats.activity.calls },
    { Icon: ACTIVITY_ICONS.Paperclip, label: "Attachments sent", value: stats.activity.attachments },
  ];
  return (
    <CardFrame
      def={def}
      avatarUrl={avatarUrl}
      username={stats.self.username}
      decoration={
        <Blob size={680} color="rgba(255,255,255,0.06)" top={-180} right={-200} />
      }
    >
      <div style={{ ...colCenter, justifyContent: "center" }}>
        {rows.map(({ Icon, label, value }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "40px 0",
              borderBottom: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 26 }}>
              <Icon size={52} color={def.accent} strokeWidth={2} />
              <span style={{ fontSize: 38, opacity: 0.82 }}>{label}</span>
            </span>
            <FitText
              text={value.toLocaleString()}
              maxWidth={360}
              maxSize={78}
              color="#fff"
              style={{ textAlign: "right" }}
            />
          </div>
        ))}
      </div>
    </CardFrame>
  );
};