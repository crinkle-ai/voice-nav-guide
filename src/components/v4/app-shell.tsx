import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { UserCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import emblemAsset from "@/assets/uhc-emblem.png.asset.json";

export type StepKey = "intake" | "summary" | "priorities" | "matches" | "next";

const STEPS: { key: StepKey; label: string; pct: number }[] = [
  { key: "intake", label: "Tell us about you", pct: 20 },
  { key: "summary", label: "Confirm summary", pct: 45 },
  { key: "priorities", label: "What matters most", pct: 65 },
  { key: "matches", label: "Your matches", pct: 85 },
  { key: "next", label: "Next step", pct: 100 },
];

const UHC_BLUE = "#002678";

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
      <header className="sticky top-0 z-30 backdrop-blur" style={{ backgroundColor: UHC_BLUE }}>
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/v4" className="flex items-center gap-3">
              <img src={logoAsset.url} alt="UnitedHealthcare" className="h-8 w-auto object-contain" />
              <span className="text-white/40">|</span>
              <span className="text-white font-medium text-lg tracking-tight">Medicare</span>
            </Link>
            <Link to="/" className="text-xs text-white/60 hover:text-white transition ml-2">
              ← Back
            </Link>
          </div>
          <div className="flex items-center gap-5 text-sm">
            {rightSlot}
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-white/90 hover:text-white transition"
            >
              <UserCircle2 className="h-5 w-5" />
              <span>Sign in</span>
            </Link>
          </div>
        </div>
        {active && (
          <div className="mx-auto max-w-6xl px-6 pb-3 pt-1">
            <div className="flex items-center justify-between text-xs text-white/75 mb-1.5">
              <span>{active.label}</span>
              <span className="font-medium text-white">Confidence {active.pct}%</span>
            </div>
            <Progress value={active.pct} className="h-1.5" />
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-muted-2">
        © Unified Health. Medicare Advantage plans. Plan availability and benefits vary by region.
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
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium border ${
                active
                  ? "bg-accent text-paper border-accent"
                  : done
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper text-muted-2 border-line"
              }`}
            >
              {stepIdx}
            </div>
            <span className={`text-xs ${active ? "text-ink font-medium" : "text-muted-2"}`}>{s.label}</span>
            {stepIdx < STEPS.length - 1 && <div className="flex-1 h-px bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}
