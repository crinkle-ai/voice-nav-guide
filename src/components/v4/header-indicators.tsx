import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSession } from "@/lib/v4/session-store";
import { computeProgress } from "@/lib/v4/profile-progress";
import { PLAN_CATALOG, computeMatches } from "@/lib/v4/plan-catalog";

const HEADER_TEXT = "#033592";
const ON_DARK = "rgba(255,255,255,0.85)";
const ON_DARK_MUTED = "rgba(255,255,255,0.6)";

export function HeaderIndicators() {
  const { state, ready } = useSession();
  const [open, setOpen] = useState(false);

  const { pct, matches } = useMemo(() => {
    const p = computeProgress(state.intake);
    const m = computeMatches(state.intake);
    return { pct: p.pct, matches: m };
  }, [state.intake]);

  if (!ready) return null;

  const narrowed = matches.length < PLAN_CATALOG.length;
  const planLabel = `${matches.length} plan${matches.length === 1 ? "" : "s"} to recommend`;

  return (
    <>
      <div className="flex flex-col items-end gap-1 select-none">
        <div className="flex items-center gap-1.5" style={{ color: ON_DARK_MUTED }}>
          <span className="text-[10px] leading-none">Profile {pct}%</span>
          <div className="h-[3px] w-[60px] rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: "#fff" }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] leading-none transition hover:underline"
          style={{ color: narrowed ? ON_DARK : ON_DARK_MUTED }}
        >
          {planLabel}
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ color: HEADER_TEXT }}>{planLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {matches.map((p) => (
              <div key={p.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-slate-900">{p.name}</div>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${HEADER_TEXT}14`, color: HEADER_TEXT }}
                  >
                    {p.type}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-1">{p.blurb}</div>
                <div className="text-xs mt-1.5" style={{ color: HEADER_TEXT }}>
                  {p.rationale(state.intake)}
                </div>
              </div>
            ))}
            {matches.length === 0 && (
              <div className="text-sm text-slate-600">No matches yet — tell the assistant a bit more.</div>
            )}
          </div>
          <DialogFooter>
            <Link
              to="/v4/matches"
              onClick={() => setOpen(false)}
              className="text-sm font-medium px-3 py-2 rounded-md text-white"
              style={{ backgroundColor: HEADER_TEXT }}
            >
              See full comparison
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
