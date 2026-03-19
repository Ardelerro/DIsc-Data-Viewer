import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { X, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { previewAllCards, downloadWrappedCard } from "../utils/generateWrapped";
import type { WrappedCardData } from "../types/discord";

interface Props {
  data: WrappedCardData;
  onClose: () => void;
}

interface CardPreview {
  id: string;
  label: string;
  bg: string;
  dataUrl: string;
}




const CARD_DISPLAY_W = 400; 
const ASPECT = 1920 / 1080; 

export default function WrappedCarousel({ data, onClose }: Props) {
  const [cards, setCards] = useState<CardPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setProgress] = useState(0);
  const [active, setActive] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef<number | null>(null);

  
  const clampW = Math.min(CARD_DISPLAY_W, Math.round(window.innerWidth * 0.72));
  const clampH = Math.round(clampW * ASPECT);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setProgress(0);
    previewAllCards(data).then((all) => {
      if (!cancelled) {
        setCards(all);
        setLoading(false);
        setProgress(100);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [data]);

  
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setProgress((p) => Math.min(p + 4, 90)), 350);
    return () => clearInterval(id);
  }, [loading]);

  const go = useCallback(
    (delta: number) => {
      if (!cards.length) return;
      setDirection(delta);
      setActive((prev) => (prev + delta + cards.length) % cards.length);
    },
    [cards.length],
  );

  const handleDownload = useCallback(
    async (id: string) => {
      if (!id) return;
      setDownloading(id);
      try {
        await downloadWrappedCard(data, id);
      } finally {
        setDownloading(null);
      }
    },
    [data],
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

  const slideVariants = {
    enter: (d: number) => ({
      x: d > 0 ? clampW + 48 : -(clampW + 48),
      opacity: 0,
      scale: 0.9,
    }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({
      x: d > 0 ? -(clampW + 48) : clampW + 48,
      opacity: 0,
      scale: 0.9,
    }),
  };

  const activeCard = cards[active];

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(20px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      
      <button
        onClick={onClose}
        className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white z-10"
      >
        <X className="w-5 h-5" />
      </button>

      
      <div className="mb-4 text-center z-10">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/35 mb-1">
          Discord Wrapped
        </p>
        <h2 className="text-white font-bold text-[18px]">
          {data.self.username}
        </h2>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-5 text-white/60 px-8 w-full max-w-[280px]">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 56 56"
            >
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="#5865F2"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - loadProgress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.4s ease" }}
              />
            </svg>
            <span className="text-xs font-bold text-white/70">
              {loadProgress}%
            </span>
          </div>
          <p className="text-sm text-center leading-relaxed">
            Building your cards…
            <br />
            <span className="text-xs opacity-50">
              Rendering at full quality
            </span>
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full">
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => go(-1)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition text-white flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            
            <div
              className="relative flex-shrink-0"
              style={{
                width: clampW,
                height: clampH,
                borderRadius: 18,
                overflow: "hidden",
              }}
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
                  inset: -24,
                  borderRadius: 32,
                  zIndex: 0,
                  background: `radial-gradient(ellipse at 50% 50%, ${activeCard?.bg ?? "#5865F2"}66 0%, transparent 70%)`,
                  transition: "background 0.5s ease",
                  filter: "blur(20px)",
                  pointerEvents: "none",
                }}
              />

              <AnimatePresence custom={direction} mode="popLayout">
                <motion.div
                  key={activeCard?.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 360, damping: 34 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 18,
                    overflow: "hidden",
                    zIndex: 1,
                  }}
                >
                  {activeCard && (
                    <img
                      src={activeCard.dataUrl}
                      alt={activeCard.label}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                      draggable={false}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              onClick={() => go(1)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition text-white flex-shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          
          <div className="flex gap-2 mt-4">
            {cards.map((c, i) => (
              <button
                key={c.id}
                onClick={() => {
                  setDirection(i > active ? 1 : -1);
                  setActive(i);
                }}
                style={{
                  width: i === active ? 20 : 5,
                  height: 5,
                  borderRadius: 3,
                  background:
                    i === active
                      ? (activeCard?.bg ?? "#5865F2")
                      : "rgba(255,255,255,0.18)",
                  transition: "all 0.3s ease",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          
          <div className="flex items-center gap-2.5 mt-3 mb-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              {activeCard?.label}
            </p>
            <span className="text-[10px] text-white/20">
              {active + 1}/{cards.length}
            </span>
          </div>

          
          <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => handleDownload(activeCard?.id)}
            disabled={!!downloading}
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-bold text-white text-sm mb-3 transition-opacity"
            style={{
              background: activeCard?.bg ?? "#5865F2",
              opacity: downloading ? 0.6 : 1,
              minWidth: 210,
              letterSpacing: "0.01em",
            }}
          >
            {downloading === activeCard?.id ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Rendering 4K…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Save · 4K PNG
              </>
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={async () => {
              for (const c of cards) await handleDownload(c.id);
            }}
            disabled={!!downloading}
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-bold text-white text-sm mb-3 transition-opacity"
            style={{
              background: activeCard?.bg ?? "#5865F2",
              opacity: downloading ? 0.6 : 1,
              minWidth: 210,
              letterSpacing: "0.01em",
            }}
          >
            {downloading
              ? "Downloading…"
              : `Download all ${cards.length} cards`}
          </motion.button>
            </div>
        </div>
      )}
    </motion.div>,
    document.body,
  );
}
