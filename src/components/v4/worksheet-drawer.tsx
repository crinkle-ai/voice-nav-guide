import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CaptureSidebar } from "@/components/v3/capture-sidebar";
import { DoctorVerificationPanel } from "@/components/v4/doctor-verification-panel";
import { MedicationVerificationPanel } from "@/components/v4/medication-verification-panel";
import { useSession } from "@/lib/v4/session-store";
import { ChevronLeft, ClipboardList } from "lucide-react";

export function WorksheetDrawer() {
  const { state, ready } = useSession();
  const [open, setOpen] = useState(false);

  if (!ready || !state.mode) return null;

  const modeLabel =
    state.mode === "ramble"
      ? "Open conversation"
      : state.mode === "structured"
      ? "Step-by-step wizard"
      : "Shop your way";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open workspace"
        className="fixed right-0 top-1/2 z-40 -translate-y-1/2 flex items-center gap-1.5 rounded-l-2xl border border-r-0 border-line bg-paper/95 backdrop-blur px-2.5 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-2 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)] hover:text-ink transition"
      >
        <ChevronLeft className="h-4 w-4 text-accent" />
        <span className="[writing-mode:vertical-rl] rotate-180">
          <span className="inline-flex items-center gap-1">
            <ClipboardList className="h-3 w-3" /> Workspace
          </span>
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-canvas">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-serif text-2xl">Your workspace</SheetTitle>
            <SheetDescription>
              Captured from your {modeLabel.toLowerCase()} intake. Updates as you go.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <CaptureSidebar intake={state.intake} loading={false} />
            <DoctorVerificationPanel />
            <MedicationVerificationPanel />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
