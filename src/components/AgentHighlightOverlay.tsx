import { useEffect, useState } from "react";
import { useLiveAdvise } from "@/context/LiveAdviseContext";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function AgentHighlightOverlay() {
  const { highlightSelector, highlightLabel, status } = useLiveAdvise();
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!highlightSelector || status !== "connected") {
      setRect(null);
      return;
    }

    let raf = 0;
    let scrolled = false;
    const update = () => {
      const el = document.querySelector(highlightSelector) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      if (!scrolled) {
        scrolled = true;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    update();
    const interval = setInterval(update, 200);
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [highlightSelector, status]);

  if (!rect) return null;

  return (
    <div
      className="pointer-events-none fixed z-[40] rounded-xl border-2 border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25),0_0_40px_rgba(16,185,129,0.4)] transition-all duration-500 ease-out animate-pulse"
      style={{
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12,
      }}
    >
      {highlightLabel && (
        <div className="absolute -top-9 left-0 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-md">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          Sarah: {highlightLabel}
        </div>
      )}
    </div>
  );
}
