import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, X, ArrowLeftRight } from "lucide-react";

export type SlideProps = { onLaunch: () => void };
export type SlideComp = (p: SlideProps) => React.ReactElement;

export function DeckShell({
  slides,
  mainCount,
  siblingHref,
  siblingLabel,
}: {
  slides: SlideComp[];
  mainCount: number;
  siblingHref: "/deck/ai" | "/deck/live";
  siblingLabel: string;
}) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const total = slides.length;
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const next = useCallback(() => setIndex((i) => (i >= total - 1 ? i : i + 1)), [total]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const launch = useCallback(() => navigate({ to: "/" }), [navigate]);
  const close = useCallback(() => navigate({ to: "/deck" }), [navigate]);

  useEffect(() => {
    slideRefs.current[index]?.scrollTo({ top: 0 });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Enter" && index === mainCount - 1) launch();
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, launch, close, index, mainCount]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const inAppendix = index >= mainCount;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground group"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20 flex items-center gap-2">
        <Link
          to={siblingHref}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-card/90 border shadow-lg backdrop-blur px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition hover:bg-card"
          title={`Switch to ${siblingLabel}`}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          {siblingLabel}
        </Link>
        <button
          onClick={close}
          className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-card/90 border shadow-lg backdrop-blur transition hover:bg-card"
          aria-label="Close deck"
        >
          <X className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden pb-24">
        {slides.map((Slide, i) => (
          <div
            key={i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            data-slide-index={i}
            className={`absolute inset-0 overflow-y-auto transition-all duration-500 ease-out ${
              i === index
                ? "opacity-100 translate-x-0"
                : i < index
                ? "opacity-0 -translate-x-8 pointer-events-none"
                : "opacity-0 translate-x-8 pointer-events-none"
            }`}
          >
            <Slide onLaunch={launch} />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-3 md:px-6 md:opacity-0 md:transition-opacity md:duration-300 md:group-hover:opacity-100">
        <button
          onClick={prev}
          disabled={index === 0}
          className="pointer-events-auto flex h-11 w-11 md:h-14 md:w-14 items-center justify-center rounded-full bg-card/90 border shadow-lg backdrop-blur transition hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5 md:h-7 md:w-7" />
        </button>
        <button
          onClick={next}
          disabled={index === total - 1}
          className="pointer-events-auto flex h-11 w-11 md:h-14 md:w-14 items-center justify-center rounded-full bg-card/90 border shadow-lg backdrop-blur transition hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5 md:h-7 md:w-7" />
        </button>
      </div>

      <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-4 z-10">
        <div className="flex items-center gap-1.5 md:gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <React.Fragment key={i}>
              {i === mainCount && <span className="mx-1 h-3 w-px bg-border" aria-hidden />}
              <button
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? `w-6 md:w-10 ${i >= mainCount ? "bg-muted-foreground" : "bg-primary"}`
                    : "w-3 md:w-6 bg-muted hover:bg-muted-foreground/40"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            </React.Fragment>
          ))}
        </div>
        <span className="text-xs md:text-sm font-medium text-muted-foreground tabular-nums">
          {inAppendix ? `Appendix ${index - mainCount + 1}` : `${index + 1} of ${mainCount}`}
        </span>
      </div>
    </div>
  );
}

export function SlideShell({
  children,
  kicker,
  appendix,
}: {
  children: React.ReactNode;
  kicker?: string;
  appendix?: boolean;
}) {
  return (
    <div className="min-h-full w-full flex flex-col justify-center px-6 md:px-24 py-10 md:py-16 max-w-7xl mx-auto">
      {kicker && (
        <div className="mb-3 md:mb-6 flex items-center gap-2">
          {appendix && (
            <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70 rounded-full border px-2 py-0.5">
              Appendix
            </span>
          )}
          <div className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {kicker}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
