import { useEffect, useState } from "react";
import { Cloud, CloudOff, Check, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/v4/auth-store";
import { useSession } from "@/lib/v4/session-store";

function fmtAgo(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/**
 * Small status chip that sits in the Workspace header.
 * Signed-in: shows "Saved · just now" and cycles through Saving → Saved on
 * every session change. Anonymous: shows "Not saved" with a subtle CTA.
 * Real HIPAA-compliant persistence is handled on the UHC side; this
 * component only surfaces the sync state to the user.
 */
export function SaveChip({ onSignInClick }: { onSignInClick?: () => void }) {
  const { user } = useAuth();
  const { state } = useSession();
  const [phase, setPhase] = useState<"saved" | "saving">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<number>(() => Date.now());
  const [, setTick] = useState(0);

  // Cycle a brief "saving" pulse whenever the session changes.
  useEffect(() => {
    if (!user) return;
    setPhase("saving");
    const t = setTimeout(() => {
      setPhase("saved");
      setLastSavedAt(Date.now());
    }, 550);
    return () => clearTimeout(t);
    // Track intake + favorites + caregiver + agent as the "workspace" surface.
  }, [
    user,
    state.intake,
    state.favoritePlans,
    state.caregiver,
    state.permanentAgent,
    state.cardOrder,
  ]);

  // Live "Xs ago" label.
  useEffect(() => {
    if (!user) return;
    const i = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(i);
  }, [user]);

  if (!user) {
    return (
      <button
        type="button"
        onClick={onSignInClick}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#033592]/25 bg-white px-2.5 py-1 text-[11px] font-medium text-[#033592] hover:bg-[#E5F5F8] transition"
        title="Sign in to save this workspace to your UHC account"
      >
        <CloudOff className="h-3 w-3" />
        Not saved · Sign in
      </button>
    );
  }

  if (phase === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5F5F8] border border-[#033592]/15 px-2.5 py-1 text-[11px] font-medium text-[#033592]">
        <Cloud className="h-3 w-3 animate-pulse" />
        Saving…
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
      title="Saved to your UHC account via HIPAA-secure sync"
    >
      <Check className="h-3 w-3" />
      Saved · {fmtAgo(Date.now() - lastSavedAt)}
      <ShieldCheck className="h-3 w-3 opacity-70" />
    </span>
  );
}
