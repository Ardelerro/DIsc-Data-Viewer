import { toPng } from "html-to-image";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

export const CARD_W = 1080;
export const CARD_H = 1920;

export const FALLBACK_AVATAR = `data:image/svg+xml;base64,${btoa(
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><circle cx="128" cy="128" r="128" fill="#5865f2"/><circle cx="128" cy="96" r="52" fill="#fff"/><ellipse cx="128" cy="230" rx="90" ry="72" fill="#fff"/></svg>',
)}`;

export async function avatarToDataUrl(
  id: string,
  avatarHash?: string,
): Promise<string> {
  const cdnUrl =
    id && avatarHash
      ? `/discord-cdn/avatars/${id}/${avatarHash}.png?size=256`
      : `/discord-cdn/embed/avatars/${Number(id) % 5}.png`;
  try {
    const res = await fetch(cdnUrl);
    if (!res.ok) return FALLBACK_AVATAR;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return FALLBACK_AVATAR;
  }
}

export async function captureNode(
  node: HTMLElement,
  pixelRatio = 2,
): Promise<string> {
  if (document.fonts?.ready) await document.fonts.ready;

  const options = {
    width: CARD_W,
    height: CARD_H,
    pixelRatio,
    cacheBust: true,
    backgroundColor: undefined,
    style: { transform: "none", margin: "0" },
  };

  await toPng(node, options);
  return toPng(node, options);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export const colCenter: CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

export function FitText({
  text,
  maxWidth,
  maxSize,
  minSize = 24,
  weight = 800,
  color,
  letterSpacing = "-0.02em",
  style,
}: {
  text: string;
  maxWidth: number;
  maxSize: number;
  minSize?: number;
  weight?: number;
  color?: string;
  letterSpacing?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(maxSize);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let s = maxSize;
    el.style.fontSize = `${s}px`;
    let guard = 600;
    while (el.scrollWidth > maxWidth && s > minSize && guard-- > 0) {
      s -= 1;
      el.style.fontSize = `${s}px`;
    }
    setSize(s);
  }, [text, maxWidth, maxSize, minSize]);

  return (
    <div
      ref={ref}
      style={{
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1,
        letterSpacing,
        color,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {text}
    </div>
  );
}

export function Divider({ accent }: { accent: string }) {
  return (
    <div
      style={{
        width: 120,
        height: 5,
        borderRadius: 3,
        background: accent,
        opacity: 0.9,
        margin: "44px 0",
      }}
    />
  );
}

export function Blob({
  size,
  color,
  top,
  left,
  right,
  bottom,
  opacity = 1,
  blur = 0,
}: {
  size: number;
  color: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  opacity?: number;
  blur?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        opacity,
        filter: blur ? `blur(${blur}px)` : undefined,
        top,
        left,
        right,
        bottom,
        pointerEvents: "none",
      }}
    />
  );
}