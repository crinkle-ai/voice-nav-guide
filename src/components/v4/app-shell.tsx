import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { UserCircle2 } from "lucide-react";
import emblemAsset from "@/assets/uhc-emblem-white.png.asset.json";
import { useDemoCheatsheet } from "./demo-cheatsheet";

export type StepKey = "intake" | "summary" | "priorities" | "matches" | "next";

const STEPS: { key: StepKey; label: string; pct: number }[] = [
  { key: "intake", label: "Tell us about you", pct: 20 },
  { key: "summary", label: "Confirm summary", pct: 45 },
  { key: "priorities", label: "What matters most", pct: 65 },
  { key: "matches", label: "Your matches", pct: 85 },
  { key: "next", label: "Next step", pct: 100 },
];

const V4_HEADER_BG = "#131F69";
const V4_HEADER_TEXT = "#ffffff";
const V4_INK = "#131F69";

export function AppShell({
  step,
  children,
  rightSlot,
}: {
  step?: StepKey;
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  const { open: cheatOpen, width: cheatWidth } = useDemoCheatsheet();
  const leftPad = cheatOpen ? `${cheatWidth}px` : undefined;
  return (
    <div className="min-h-screen bg-canvas v4-scope" style={{ paddingLeft: leftPad, color: V4_INK }}>
      <header className="sticky top-0 z-30 backdrop-blur" style={{ backgroundColor: V4_HEADER_BG }}>
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/v4" className="flex items-center gap-1.5">
              <img
                src={emblemAsset.url}
                alt="UnitedHealthcare"
                className="h-12 w-auto object-contain"
              />
              <div className="flex flex-col leading-none -ml-1">
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
              style={{ color: `${V4_HEADER_TEXT}b3` }}
              onMouseEnter={(e) => (e.currentTarget.style.color = V4_HEADER_TEXT)}
              onMouseLeave={(e) => (e.currentTarget.style.color = `${V4_HEADER_TEXT}b3`)}
            >
              ← Back
            </Link>
          </div>
          <div className="flex items-center gap-5 text-sm" style={{ color: V4_HEADER_TEXT }}>
            {rightSlot}
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 transition"
              style={{ color: V4_HEADER_TEXT }}
            >
              <UserCircle2 className="h-5 w-5" style={{ color: V4_HEADER_TEXT }} />
              <span>Sign in</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      <footer className="mx-auto max-w-6xl px-6 py-10 text-xs" style={{ color: `${V4_INK}99` }}>
        © UnitedHealthcare. Medicare Advantage plans. Plan availability and benefits vary by region.
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
                  ? "bg-white text-[#131F69] border-[#131F69]"
                  : done
                  ? "bg-[#131F69] text-white border-[#131F69]"
                  : "bg-white text-[#131F69]/60 border-[#131F69]/30"
              }`}
            >
              {stepIdx}
            </div>
            <span className={`text-xs ${active ? "text-[#131F69] font-medium" : "text-[#131F69]/60"}`}>{s.label}</span>
            {stepIdx < STEPS.length - 1 && <div className="flex-1 h-px bg-[#131F69]/20" />}
          </li>
        );
      })}
    </ol>
  );
}
