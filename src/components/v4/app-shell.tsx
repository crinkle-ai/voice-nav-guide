import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { UserCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import emblemAsset from "@/assets/uhc-emblem-white.png.asset.json";

export type StepKey = "intake" | "summary" | "priorities" | "matches" | "next";

const STEPS: { key: StepKey; label: string; pct: number }[] = [
  { key: "intake", label: "Tell us about you", pct: 20 },
  { key: "summary", label: "Confirm summary", pct: 45 },
  { key: "priorities", label: "What matters most", pct: 65 },
  { key: "matches", label: "Your matches", pct: 85 },
  { key: "next", label: "Next step", pct: 100 },
];

const V4_HEADER_BG = "#E0F7FA";
const V4_HEADER_TEXT = "#01579B";

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
    <div className="min-h-screen bg-canvas v4-scope text-white">
      <header className="sticky top-0 z-30 backdrop-blur" style={{ backgroundColor: V4_HEADER_BG }}>
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/v4" className="flex items-center gap-3">
              <img
                src={emblemAsset.url}
                alt="UnitedHealthcare"
                className="h-12 w-auto object-contain"
              />
              <div className="flex flex-col leading-none">
                <span
                  className="text-[1.05rem]"
                  style={{ fontFamily: '"Source Serif Pro", Georgia, serif', color: V4_HEADER_TEXT }}
                >
                  UnitedHealthcare
                </span>
                <span className="text-[0.95rem] tracking-tight" style={{ color: `${V4_HEADER_TEXT}cc` }}>
                  Medicare
                </span>
              </div>
            </Link>
            <Link
              to="/"
              className="text-xs transition ml-4"
              style={{ color: `${V4_HEADER_TEXT}99` }}
              onMouseEnter={(e) => (e.currentTarget.style.color = V4_HEADER_TEXT)}
              onMouseLeave={(e) => (e.currentTarget.style.color = `${V4_HEADER_TEXT}99`)}
            >
              ← Back
            </Link>
          </div>
          <div className="flex items-center gap-5 text-sm" style={{ color: `${V4_HEADER_TEXT}e6` }}>
            {rightSlot}
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 transition"
              style={{ color: `${V4_HEADER_TEXT}e6` }}
              onMouseEnter={(e) => (e.currentTarget.style.color = V4_HEADER_TEXT)}
              onMouseLeave={(e) => (e.currentTarget.style.color = `${V4_HEADER_TEXT}e6`)}
            >
              <UserCircle2 className="h-5 w-5" />
              <span>Sign in</span>
            </Link>
          </div>
        </div>
        {active && (
          <div className="mx-auto max-w-6xl px-6 pb-3 pt-1">
            <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: `${V4_HEADER_TEXT}bf` }}>
              <span>{active.label}</span>
              <span className="font-medium" style={{ color: V4_HEADER_TEXT }}>Confidence {active.pct}%</span>
            </div>
            <Progress value={active.pct} className="h-1.5" />
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-white/70">
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
                  ? "bg-white text-[#01579B] border-white"
                  : done
                  ? "bg-[#0277BD] text-white border-[#0277BD]"
                  : "bg-white/10 text-white/70 border-white/30"
              }`}
            >
              {stepIdx}
            </div>
            <span className={`text-xs ${active ? "text-white font-medium" : "text-white/60"}`}>{s.label}</span>
            {stepIdx < STEPS.length - 1 && <div className="flex-1 h-px bg-white/30" />}
          </li>
        );
      })}
    </ol>
  );
}
