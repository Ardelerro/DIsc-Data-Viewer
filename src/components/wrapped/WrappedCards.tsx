import {
  type FC,
  type ReactNode,
} from "react";
import { CARD_W, CARD_H } from "../../utils/generateWrapped";
import type { WrappedStats } from "../../utils/wrappedStats";
import { WRAPPED_CARDS } from "./WrappedCardDef";

const FONT_FAMILY =
  '"DM Sans", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

export interface WrappedCardDef {
  id: string;
  label: string;
  eyebrow: string;
  accent: string;
  gradient: string;
  Component: FC<CardProps>;
  enabled?: (s: WrappedStats) => boolean;
}

export interface CardProps {
  stats: WrappedStats;
  avatarUrl: string;
  def: WrappedCardDef;
}

export function CardFrame({
  def,
  avatarUrl,
  username,
  children,
  decoration,
  eyebrow,
}: {
  def: WrappedCardDef;
  avatarUrl: string;
  username: string;
  children: ReactNode;
  decoration?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        position: "relative",
        overflow: "hidden",
        background: def.gradient,
        color: "#fff",
        fontFamily: FONT_FAMILY,
      }}
    >
      {decoration}

      <div
        style={{
          position: "absolute",
          top: 96,
          left: 90,
          right: 90,
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.62)",
        }}
      >
        {eyebrow ?? def.eyebrow}
      </div>

      <div
        style={{
          position: "absolute",
          top: 184,
          left: 90,
          right: 90,
          bottom: 152,
        }}
      >
        {children}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 56,
          left: 90,
          right: 90,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 26,
        }}
      >
        <span style={{ opacity: 0.7, fontWeight: 600, letterSpacing: "0.04em" }}>
          disc-data-viewer
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src={avatarUrl}
            width={56}
            height={56}
            style={{ borderRadius: "50%", objectFit: "cover", display: "block" }}
            alt=""
          />
          <span style={{ fontWeight: 600 }}>{username}</span>
        </span>
      </div>
    </div>
  );
}

export function enabledCards(stats: WrappedStats): WrappedCardDef[] {
  return WRAPPED_CARDS.filter((c) => !c.enabled || c.enabled(stats));
}
