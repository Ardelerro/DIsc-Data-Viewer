import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  avatarToDataUrl,
  captureNode,
  downloadDataUrl,
  FALLBACK_AVATAR,
  CARD_W,
  CARD_H,
} from "../../utils/generateWrapped";
import { deriveWrappedStats } from "../../utils/wrappedStats";
import { enabledCards, type WrappedCardDef } from "../wrapped/WrappedCards";
import type { ProcessedData } from "../../types/discord";

interface Props {
  data: ProcessedData;
  onClose: () => void;
}

const ASPECT = CARD_H / CARD_W;
const DOWNLOAD_PIXEL_RATIO = 2;

const raf2 = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

function ScaledCard({
  def,
  stats,
  avatarUrl,
  scale,
}: {
  def: WrappedCardDef;
  stats: ReturnType<typeof deriveWrappedStats>;
  avatarUrl: string;
  scale: number;
}) {
  const Card = def.Component;
  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      <Card def={def} stats={stats} avatarUrl={avatarUrl} />
    </div>
  );
}

export default function WrappedCarousel({ data, onClose }: Props) {
  const stats = useMemo(() => deriveWrappedStats(data), [data]);
  const cards = useMemo(() => enabledCards(stats), [stats]);

  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [busy, setBusy] = useState<null | "save" | "share" | "all">(null);
  const [avatarUrl, setAvatarUrl] = useState(FALLBACK_AVATAR);
  const [captureIdx, setCaptureIdx] = useState(0);
  const [viewport, setViewport] = useState({
    w: window.innerWidth,
    h: window.innerHeight,
  });

  const avatarPromise = useRef<Promise<string> | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  /* resolve the user's avatar once, inline it as a data URL for capture */
  useEffect(() => {
    let cancelled = false;
    const p = avatarToDataUrl(stats.self.id, stats.self.avatarHash);
    avatarPromise.current = p;
    p.then((url) => {
      if (!cancelled) setAvatarUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [stats.self.id, stats.self.avatarHash]);

  useEffect(() => {
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile = viewport.w < 768;
  const chromeH = isMobile ? 230 : 300;
  const availH = Math.max(300, viewport.h - chromeH);
  const availW = isMobile ? viewport.w - 40 : Math.min(420, viewport.w * 0.7);
  const cardW = Math.max(180, Math.min(availW, availH / ASPECT));
  const cardH = cardW * ASPECT;
  const scale = cardW / CARD_W;

  const go = useCallback(
    (delta: number) => {
      if (!cards.length) return;
      setDirection(delta);
      setActive((prev) => (prev + delta + cards.length) % cards.length);
    },
    [cards.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  /** Render a card into the off-screen full-size node and rasterise it. */
  const renderAndCapture = useCallback(async (index: number) => {
    if (avatarPromise.current) await avatarPromise.current;
    flushSync(() => setCaptureIdx(index));
    await raf2();
    const node = captureRef.current;
    if (!node) throw new Error("WrappedCarousel: capture node missing");
    return captureNode(node, DOWNLOAD_PIXEL_RATIO);
  }, []);

  const handleSave = useCallback(
    async (index: number) => {
      if (busy) return;
      setBusy("save");
      try {
        const url = await renderAndCapture(index);
        downloadDataUrl(url, `discord-wrapped-${cards[index].id}.png`);
      } finally {
        setBusy(null);
      }
    },
    [busy, cards, renderAndCapture],
  );

  const handleSaveAll = useCallback(async () => {
    if (busy) return;
    setBusy("all");
    try {
      for (let i = 0; i < cards.length; i++) {
        const url = await renderAndCapture(i);
        downloadDataUrl(
          url,
          `discord-wrapped-${i + 1}-${cards[i].id}.png`,
        );
        await new Promise((r) => setTimeout(r, 150));
      }
    } finally {
      setBusy(null);
    }
  }, [busy, cards, renderAndCapture]);

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleShare = useCallback(
    async (index: number) => {
      if (busy) return;
      setBusy("share");
      try {
        const url = await renderAndCapture(index);
        const blob = await (await fetch(url)).blob();
        const file = new File([blob], `discord-wrapped-${cards[index].id}.png`, {
          type: "image/png",
        });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "My Discord Wrapped" });
        } else {
          downloadDataUrl(url, file.name);
        }
      } catch {
        /* user dismissed the share sheet — ignore */
      } finally {
        setBusy(null);
      }
    },
    [busy, cards, renderAndCapture],
  );

  const activeCard = cards[active];
  const accent = activeCard?.accent ?? "#9572e8";

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? cardW + 48 : -(cardW + 48), opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -(cardW + 48) : cardW + 48, opacity: 0 }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center overflow-y-auto"
      style={{
        background: "rgba(0,0,0,0.96)",
        backdropFilter: "blur(24px)",
        justifyContent: isMobile ? "flex-start" : "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* off-screen full-size node used only for PNG capture */}
      <div
        ref={captureRef}
        aria-hidden
        style={{
          position: "fixed",
          left: -99999,
          top: 0,
          width: CARD_W,
          height: CARD_H,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        {cards[captureIdx] && (
          <ScaledCard
            def={cards[captureIdx]}
            stats={stats}
            avatarUrl={avatarUrl}
            scale={1}
          />
        )}
      </div>

      <button
        onClick={onClose}
        className="fixed top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white z-20"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <X className="w-5 h-5" />
      </button>

      <div className="w-full text-center flex-shrink-0 pt-5 pb-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/35 mb-0.5">
          Discord Wrapped
        </p>
        <h2 className="text-white font-bold text-[17px]">
          {stats.self.username}
        </h2>
      </div>

      <div className="flex items-center gap-3 px-4">
        {!isMobile && (
          <button
            onClick={() => go(-1)}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition text-white flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div
          className="relative flex-shrink-0"
          style={{ width: cardW, height: cardH }}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const diff = touchStartX.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 36) go(diff > 0 ? 1 : -1);
            touchStartX.current = null;
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -28,
              zIndex: 0,
              background: `radial-gradient(ellipse at 50% 50%, ${accent}55 0%, transparent 70%)`,
              transition: "background 0.5s ease",
              filter: "blur(22px)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 18,
              overflow: "hidden",
              zIndex: 1,
              boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
            }}
          >
            <AnimatePresence custom={direction} mode="popLayout">
              <motion.div
                key={activeCard?.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 360, damping: 34 }}
                style={{ position: "absolute", inset: 0 }}
              >
                {activeCard && (
                  <ScaledCard
                    def={activeCard}
                    stats={stats}
                    avatarUrl={avatarUrl}
                    scale={scale}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {!isMobile && (
          <button
            onClick={() => go(1)}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition text-white flex-shrink-0"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* dots */}
      <div className="flex gap-1.5 mt-4 items-center">
        {isMobile && (
          <button
            onClick={() => go(-1)}
            className="p-2 rounded-full bg-white/10 active:bg-white/20 transition text-white flex-shrink-0 mr-1"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {cards.map((c, i) => (
          <button
            key={c.id}
            onClick={() => {
              setDirection(i > active ? 1 : -1);
              setActive(i);
            }}
            style={{
              width: i === active ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === active ? accent : "rgba(255,255,255,0.2)",
              transition: "all 0.3s ease",
              border: "none",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          />
        ))}
        {isMobile && (
          <button
            onClick={() => go(1)}
            className="p-2 rounded-full bg-white/10 active:bg-white/20 transition text-white flex-shrink-0 ml-1"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2.5 mt-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
          {activeCard?.label}
        </p>
        <span className="text-[10px] text-white/20">
          {active + 1}/{cards.length}
        </span>
      </div>

      {/* actions */}
      <div
        className="flex mt-4 mb-6"
        style={{
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 10 : 12,
          width: isMobile ? cardW : undefined,
        }}
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => (canShare ? handleShare(active) : handleSave(active))}
          disabled={!!busy}
          className="flex items-center justify-center gap-2 rounded-full font-bold text-white text-sm transition-opacity"
          style={{
            background: accent,
            color: "#1a1024",
            opacity: busy ? 0.6 : 1,
            height: 48,
            paddingLeft: 28,
            paddingRight: 28,
            width: isMobile ? "100%" : 210,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {busy === "save" || busy === "share" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Rendering…
            </>
          ) : canShare ? (
            <>
              <Share2 className="w-4 h-4" /> Share image
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Save 4K PNG
            </>
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => (canShare ? handleSave(active) : handleSaveAll())}
          disabled={!!busy}
          className="flex items-center justify-center gap-2 rounded-full font-bold text-sm transition-opacity"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: `1.5px solid ${accent}66`,
            color: "rgba(255,255,255,0.82)",
            opacity: busy ? 0.6 : 1,
            height: 48,
            paddingLeft: 28,
            paddingRight: 28,
            width: isMobile ? "100%" : 210,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {busy === "all" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving all…
            </>
          ) : canShare ? (
            <>
              <Download className="w-4 h-4" /> Save this card
            </>
          ) : (
            "Download all"
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
