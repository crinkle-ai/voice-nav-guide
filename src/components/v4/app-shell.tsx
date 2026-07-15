import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import helloMedicareLogo from "@/assets/hello-medicare.png.asset.json";
import { useDemoCheatsheet } from "./demo-cheatsheet";
import { useSession } from "@/lib/v4/session-store";
import { UserMenu } from "./user-menu";
import { EnrollmentDialog } from "@/components/v4/enrollment-dialog";
import { useEnrollmentDialogOpen } from "@/lib/v4/enrollment-dialog-store";

export type StepKey = "intake" | "summary" | "priorities" | "matches" | "next";

const STEPS: { key: StepKey; label: string; pct: number }[] = [
  { key: "intake", label: "Tell us about you", pct: 20 },
  { key: "summary", label: "Confirm summary", pct: 45 },
  { key: "priorities", label: "What matters most", pct: 65 },
  { key: "matches", label: "Your matches", pct: 85 },
  { key: "next", label: "Next step", pct: 100 },
];

const V4_HEADER_BG = "#ffffff";
const V4_HEADER_TEXT = "#131F69";
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
  const { state } = useSession();
  const sharingActive = !!state.sharingActive;
  const { open: cheatOpen, width: cheatWidth } = useDemoCheatsheet();
  const leftPad = cheatOpen ? `${cheatWidth}px` : undefined;
  return (
    <div className="min-h-screen bg-canvas v4-scope relative" style={{ paddingLeft: leftPad, color: V4_INK }}>
      {sharingActive && (
        <div
          className="fixed inset-0 z-[100] border-4 border-red-600 pointer-events-none"
          aria-hidden="true"
        />
      )}
      <header className="sticky top-0 z-30 backdrop-blur border-b border-black/10" style={{ backgroundColor: V4_HEADER_BG }}>
        <div className="mx-auto max-w-6xl px-6 h-11 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/v4" className="flex items-center">
              <img
                src={helloMedicareLogo.url}
                alt="Hello Medicare"
                className="h-8 w-auto object-contain"
              />
            </Link>
          </div>
          <div className="flex items-center gap-5 text-sm" style={{ color: V4_HEADER_TEXT }}>
            {rightSlot}
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl w-full px-6 py-3">{children}</main>
      <footer className="mx-auto max-w-6xl px-6 py-4 text-[11px] leading-relaxed opacity-60" style={{ color: V4_INK }}>
        <p className="font-semibold mb-1">Innovation Prototype • Mock Data</p>
        <p>This experience uses fictional consumers, providers, plans, medications, and recommendations for demonstration purposes only. Generative AI may be used to simulate conversations, but no production business systems or real consumer data are accessed.</p>
      </footer>
      <EnrollmentMount />
    </div>
  );
}

function EnrollmentMount() {
  const [open, setOpen] = useEnrollmentDialogOpen();
  return <EnrollmentDialog open={open} onOpenChange={setOpen} />;
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
