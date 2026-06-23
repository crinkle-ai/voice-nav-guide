import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Plus, Sparkles, Check } from "lucide-react";
import { persona } from "@/mock/personas";
import { usePersonaStore } from "@/state/usePersonaStore";

export function AboutMoreRamble() {
  const extra = persona.extraRamble;
  const applied = usePersonaStore((s) => s.extraRambleApplied);
  const applyExtraRamble = usePersonaStore((s) => s.applyExtraRamble);

  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  if (!extra) return null;

  const startRamble = () => {
    if (open || applied) return;
    setOpen(true);
    setTyped("");
    setTyping(true);
    let i = 0;
    const full = extra.ramble;
    timer.current = setInterval(() => {
      i += 3;
      setTyped(full.slice(0, i));
      if (i >= full.length) {
        if (timer.current) clearInterval(timer.current);
        setTyping(false);
      }
    }, 22);
  };

  const onApply = () => {
    setAnalyzing(true);
    setTimeout(() => {
      applyExtraRamble();
      setAnalyzing(false);
      setOpen(false);
    }, 900);
  };

  if (applied) {
    return (
      <div className="rounded-3xl border border-success/30 bg-success-soft/40 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
            <Check className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-success">Route updated</div>
            <div className="mt-0.5 text-sm text-ink">{extra.summary}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Added <span className="font-medium text-ink">{extra.insertStep.label}</span> to your route.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="prompt"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={startRamble}
            className="flex w-full items-start gap-3 text-left"
          >
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Workspace</div>
              <div className="mt-0.5 text-sm font-medium text-ink">{extra.promptLabel}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                A small detail can change what we put on your route.
              </div>
            </div>
          </motion.button>
        ) : (
          <motion.div
            key="ramble"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Listening
            </div>
            <p className="mt-3 min-h-[6rem] whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
              {typed}
              {typing && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary align-middle" />}
            </p>
            <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mic className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-end gap-0.5">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <motion.span key={i}
                      className="w-1 rounded-full bg-primary/50"
                      animate={{ height: typing ? [4, 10 + (i % 4) * 3, 6] : 3 }}
                      transition={{ duration: 0.6 + (i % 4) * 0.1, repeat: Infinity, delay: i * 0.04 }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={onApply}
              disabled={typing || analyzing}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-medium text-background transition hover:bg-ink/90 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {analyzing ? "Updating your route…" : "Update my route"}
            </button>
            <button
              onClick={() => setOpen(false)}
              disabled={analyzing}
              className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-ink"
            >
              Not now
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
