import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Sparkles, ChevronLeft } from "lucide-react";
import { AboutMoreRamble } from "@/components/about-more-ramble";
import { persona } from "@/mock/personas";

export function AboutYouDrawer() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = sessionStorage.getItem("about-you-drawer-hint");
      if (!seen) {
        setPulse(true);
        sessionStorage.setItem("about-you-drawer-hint", "1");
        const t = setTimeout(() => setPulse(false), 4200);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => { setPulse(false); setOpen(true); }}
        aria-label="Open About you"
        className={[
          "fixed right-0 top-1/2 z-40 -translate-y-1/2 group",
          "flex items-center gap-1.5 rounded-l-2xl border border-r-0 border-border bg-card/95 backdrop-blur",
          "px-2.5 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)]",
          "hover:bg-card hover:text-ink transition",
          pulse ? "animate-pulse ring-2 ring-primary/40" : "",
        ].join(" ")}
      >
        <ChevronLeft className="h-4 w-4 text-primary" />
        <span className="[writing-mode:vertical-rl] rotate-180">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> About you
          </span>
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-accent-foreground">
              <Sparkles className="h-3 w-3" /> About you
            </div>
            <SheetTitle className="font-display text-2xl text-ink">Here's what I'm hearing</SheetTitle>
            <SheetDescription>
              A living summary that shapes your route. Add anything — it adapts.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-5">
            <div className="rounded-2xl border border-border bg-primary-soft/40 p-4">
              <p className="text-[14px] leading-relaxed text-ink">{persona.narrativeMirror}</p>
            </div>
            <AboutMoreRamble />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
