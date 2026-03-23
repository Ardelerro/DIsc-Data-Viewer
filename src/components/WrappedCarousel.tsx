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
  const isMobile = window.innerWidth < 768;

  
  const cardW = isMobile
    ? window.innerWidth - 32 
    : Math.min(CARD_DISPLAY_W, Math.round(window.innerWidth * 0.72));
  const cardH = Math.round(cardW * ASPECT);

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
    return () => { cancelled = true; };
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
      x: d > 0 ? cardW + 48 : -(cardW + 48),
      opacity: 0,
      scale: 0.94,
    }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({
      x: d > 0 ? -(cardW + 48) : cardW + 48,
      opacity: 0,
      scale: 0.94,
    }),
  };

  const activeCard = cards[active];
  const accentColor = activeCard?.bg ?? "#5865F2";

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center overflow-hidden"
      style={{
        background: "rgba(0,0,0,0.96)",
        backdropFilter: "blur(24px)",
        
        justifyContent: isMobile ? "flex-start" : "center",
        paddingTop: isMobile ? 0 : undefined,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white z-20"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <X className="w-5 h-5" />
      </button>

      
      <div
        className="w-full text-center z-10 flex-shrink-0"
        style={{ paddingTop: isMobile ? 20 : undefined, marginBottom: isMobile ? 14 : undefined }}
      >
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/35 mb-0.5">
          Discord Wrapped
        </p>
        <h2 className="text-white font-bold text-[17px]">{data.self.username}</h2>
      </div>

      {loading ? (
        /* ── Loading state ── */
        <div className="flex flex-col items-center gap-5 text-white/60 px-8 w-full max-w-[280px] mt-16">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <circle
                cx="28" cy="28" r="24" fill="none" stroke="#5865F2" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - loadProgress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.4s ease" }}
              />
            </svg>
            <span className="text-xs font-bold text-white/70">{loadProgress}%</span>
          </div>
          <p className="text-sm text-center leading-relaxed">
            Building your cards…<br />
            <span className="text-xs opacity-50">Rendering at full quality</span>
          </p>
        </div>
      ) : (
        <div
          className="flex flex-col items-center w-full flex-1"
          style={{
            
            overflowY: isMobile ? "auto" : "visible",
            paddingBottom: isMobile ? 24 : 0,
          }}
        >
          
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
              style={{
                width: cardW,
                height: cardH,
                borderRadius: 16,
                overflow: "hidden",
              }}
              onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
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
                  zIndex: 0,
                  background: `radial-gradient(ellipse at 50% 50%, ${accentColor}55 0%, transparent 70%)`,
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
                    borderRadius: 16,
                    overflow: "hidden",
                    zIndex: 1,
                  }}
                >
                  {activeCard && (
                    <img
                      src={activeCard.dataUrl}
                      alt={activeCard.label}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      draggable={false}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
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

          
          {isMobile && (
            <div className="flex items-center gap-4 mt-4 px-4">
              <button
                onClick={() => go(-1)}
                className="p-2 rounded-full bg-white/10 active:bg-white/20 transition text-white flex-shrink-0"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              
              <div className="flex items-center gap-1.5 flex-1 justify-center">
                {cards.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => { setDirection(i > active ? 1 : -1); setActive(i); }}
                    style={{
                      width: i === active ? 18 : 5,
                      height: 5,
                      borderRadius: 3,
                      background: i === active ? accentColor : "rgba(255,255,255,0.18)",
                      transition: "all 0.3s ease",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>

              <button
                onClick={() => go(1)}
                className="p-2 rounded-full bg-white/10 active:bg-white/20 transition text-white flex-shrink-0"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          
          {!isMobile && (
            <div className="flex gap-2 mt-4">
              {cards.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => { setDirection(i > active ? 1 : -1); setActive(i); }}
                  style={{
                    width: i === active ? 20 : 5,
                    height: 5,
                    borderRadius: 3,
                    background: i === active ? accentColor : "rgba(255,255,255,0.18)",
                    transition: "all 0.3s ease",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          )}

          
          <div className="flex items-center gap-2.5 mt-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              {activeCard?.label}
            </p>
            <span className="text-[10px] text-white/20">
              {active + 1}/{cards.length}
            </span>
          </div>

          
          <div
            className="flex mt-3 mb-2"
            style={{
              flexDirection: isMobile ? "column" : "row",
              gap: isMobile ? 10 : 12,
              width: isMobile ? cardW : undefined,
              padding: isMobile ? "0 0" : undefined,
            }}
          >
            
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleDownload(activeCard?.id)}
              disabled={!!downloading}
              className="flex items-center justify-center gap-2 rounded-full font-bold text-white text-sm transition-opacity"
              style={{
                background: accentColor,
                opacity: downloading ? 0.6 : 1,
                height: 48,
                paddingLeft: 28,
                paddingRight: 28,
                letterSpacing: "0.01em",
                width: isMobile ? "100%" : 210,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {downloading === activeCard?.id ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Rendering 4K…</>
              ) : (
                <><Download className="w-4 h-4" /> Save 4K PNG</>
              )}
            </motion.button>

            
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={async () => { for (const c of cards) await handleDownload(c.id); }}
              disabled={!!downloading}
              className="flex items-center justify-center gap-2 rounded-full font-bold text-sm transition-opacity"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: `1.5px solid ${accentColor}55`,
                color: "rgba(255,255,255,0.75)",
                opacity: downloading ? 0.6 : 1,
                height: 48,
                paddingLeft: 28,
                paddingRight: 28,
                letterSpacing: "0.01em",
                width: isMobile ? "100%" : 210,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {downloading ? "Downloading…" : `Download all`}
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>,
    document.body,
  );
}