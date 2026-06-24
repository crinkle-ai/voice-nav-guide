import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";

export type StepKey = "intake" | "summary" | "priorities" | "matches" | "next";

const STEPS: { key: StepKey; label: string; pct: number }[] = [
  { key: "intake", label: "Tell us about you", pct: 20 },
  { key: "summary", label: "Confirm summary", pct: 45 },
  { key: "priorities", label: "What matters most", pct: 65 },
  { key: "matches", label: "Your matches", pct: 85 },
  { key: "next", label: "Next step", pct: 100 },
];

export function AppShell({
  step,
  children,
  rightSlot,
}: {
  step?: StepKey;
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  const active = STEPS.find((s) => s.key === step);
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line bg-paper/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xs text-muted-2 hover:text-ink transition">
              ← All demos
            </Link>
            <Link to="/v3" className="flex items-center gap-2 group">
              <span className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-paper font-serif text-lg">M</span>
              <span className="font-serif text-xl tracking-tight">Medicare Compass</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {rightSlot}
            <Link to="/v3" className="text-xs text-muted-2 hover:text-ink transition">Start over</Link>
          </div>
        </div>
        {active && (
          <div className="mx-auto max-w-6xl px-6 pb-3">
            <div className="flex items-center justify-between text-xs text-muted-2 mb-1.5">
              <span>{active.label}</span>
              <span className="font-medium text-ink">Confidence {active.pct}%</span>
            </div>
            <Progress value={active.pct} className="h-1.5" />
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-muted-2">
        Pilot prototype. Not affiliated with CMS. Plan details shown are illustrative.
      </footer>
    </div>
  );
}

export function Stepper({ current }: { current: StepKey }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="flex items-center gap-2 mb-8">
      {STEPS.slice(1).map((s, i) => {
        const stepIdx = i + 1;
        const done = stepIdx < idx;
        const active = stepIdx === idx;
        return (
          <li key={s.key} className="flex items-center gap-2 flex-1">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium border ${
              active ? "bg-accent text-paper border-accent" :
              done ? "bg-ink text-paper border-ink" :
              "bg-paper text-muted-2 border-line"
            }`}>{stepIdx}</div>
            <span className={`text-xs ${active ? "text-ink font-medium" : "text-muted-2"}`}>{s.label}</span>
            {stepIdx < STEPS.length - 1 && <div className="flex-1 h-px bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}
