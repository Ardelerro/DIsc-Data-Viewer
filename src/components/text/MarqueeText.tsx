import { useRef, useEffect, useState, useCallback, type FC } from "react";
import React from "react";

interface MarqueeTextProps {
  text: string;
  className?: string;
  rotation?: "auto" | "hover";
}

const MARQUEE_DURATION = 4;

const MarqueeText: FC<MarqueeTextProps> = ({
  text,
  className = "",
  rotation = "auto",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  const [overflow, setOverflow] = useState(false);
  const [segmentPx, setSegmentPx] = useState(0);

  const check = useCallback(() => {
    const container = containerRef.current;
    const probe = probeRef.current;
    if (!container || !probe) return;

    const textW = probe.scrollWidth;
    const containerW = container.clientWidth;

    setOverflow(textW > containerW + 1);
    setSegmentPx(textW);
  }, []);

  useEffect(() => {
    const t = setTimeout(check, 60);
    const ro = new ResizeObserver(check);

    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [text, check]);

  const GAP_PX = 64;
  const totalPx = segmentPx + GAP_PX;

  const keyframeName = `_mq_${CSS.escape(
    text.slice(0, 12).replace(/\s/g, "_"),
  )}`;

  const resetAndPause = () => {
    const el = marqueeRef.current;
    if (!el) return;

    el.style.animation = "none";
    el.offsetHeight;
    el.style.animation = `${keyframeName} ${MARQUEE_DURATION}s linear infinite`;
    el.style.animationPlayState = "paused";
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full min-w-0 max-w-full overflow-hidden"
    >
      <span
        ref={probeRef}
        className={`invisible whitespace-nowrap pointer-events-none ${className}`}
        aria-hidden
      >
        {text}
      </span>

      {overflow ? (
        <>
          <style>{`
            @keyframes ${keyframeName} {
              0% { transform: translateX(0px); }
              100% { transform: translateX(-${totalPx}px); }
            }
          `}</style>

          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 0%, black 85%, transparent)",
              maskImage:
                "linear-gradient(to right, transparent, black 0%, black 85%, transparent)",
            }}
          >
            {" "}
            <div
              ref={marqueeRef}
              className={`inline-block whitespace-nowrap will-change-transform pointer-events-auto ${className}`}
              style={{
                animation:
                  rotation === "auto"
                    ? `${keyframeName} ${MARQUEE_DURATION}s linear infinite`
                    : `${keyframeName} ${MARQUEE_DURATION}s linear infinite`,
                animationPlayState: rotation === "hover" ? "paused" : "running",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;

                if (rotation === "hover") {
                  el.style.animationPlayState = "running";
                } else {
                  el.style.animationPlayState = "paused";
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;

                if (rotation === "hover") {
                  resetAndPause();
                } else {
                  el.style.animationPlayState = "running";
                }
              }}
            >
              {text}
              <span style={{ width: GAP_PX }} className="inline-block" />
              {text}
              <span style={{ width: GAP_PX }} className="inline-block" />
            </div>
          </div>
        </>
      ) : (
        <span className={`absolute inset-0 whitespace-nowrap ${className}`}>
          {text}
        </span>
      )}
    </div>
  );
};

export default React.memo(MarqueeText);
