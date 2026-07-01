import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ShieldCheck, Download, Trash2, ExternalLink, User2, Stethoscope, Pill, Wallet, Heart, Users, BadgeCheck } from "lucide-react";
import { useAuth } from "@/lib/v4/auth-store";
import { useSession } from "@/lib/v4/session-store";

const CARD_META: Record<string, { label: string; icon: typeof User2 }> = {
  personal: { label: "About you", icon: User2 },
  doctors: { label: "Doctors & care", icon: Stethoscope },
  meds: { label: "Medications", icon: Pill },
  budget: { label: "Budget & coverage", icon: Wallet },
  favorites: { label: "Favorite plans", icon: Heart },
  caregiver: { label: "Caregiver", icon: Users },
  agent: { label: "Your agent", icon: BadgeCheck },
};

function summarizeCard(key: string, s: ReturnType<typeof useSession>["state"]): string {
  const intake = s.intake;
  switch (key) {
    case "personal": {
      const bits = [intake.zip.value && `ZIP ${intake.zip.value}`, intake.currentPlan.value].filter(Boolean);
      return bits.length ? bits.join(" · ") : "Nothing yet";
    }
    case "doctors":
      return intake.doctors.value.length ? `${intake.doctors.value.length} added` : "Nothing yet";
    case "meds":
      return intake.medications.value.length ? `${intake.medications.value.length} added` : "Nothing yet";
    case "budget":
      return intake.budgetSensitivity.value || intake.budgetCaps.monthlyPremiumMax
        ? [
            intake.budgetSensitivity.value,
            intake.budgetCaps.monthlyPremiumMax && `Up to $${intake.budgetCaps.monthlyPremiumMax}/mo`,
          ]
            .filter(Boolean)
            .join(" · ")
        : "Nothing yet";
    case "favorites":
      return (s.favoritePlans ?? []).length ? `${(s.favoritePlans ?? []).length} plan(s)` : "Nothing yet";
    case "caregiver":
      return s.caregiver?.name ? `${s.caregiver.name}${s.caregiver.relationship ? ` (${s.caregiver.relationship})` : ""}` : "Nothing yet";
    case "agent":
      return s.permanentAgent?.name ?? "Nothing yet";
    default:
      return "";
  }
}

export function YourDataPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user, signOut } = useAuth();
  const { state, reset } = useSession();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const download = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: user ? { name: user.name, memberId: user.memberId, email: user.email } : null,
      workspace: state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uhc-workspace-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doDelete = () => {
    reset();
    signOut();
    setConfirmDelete(false);
    onOpenChange(false);
  };

  const enabled = (state.enabledCards?.length ? state.enabledCards : ["personal", "doctors", "meds", "budget", "favorites"]) as string[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="bg-[#131F69] px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle className="font-serif text-lg">Your data</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-white/80 mt-1">
            {user
              ? "Saved to your CHC account in HIPAA-secure member systems."
              : "Kept only on this device until you sign in and save to your CHC account."}
          </DialogDescription>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink/50 mb-2">What's saved</div>
            <ul className="rounded-lg border border-line divide-y divide-line bg-white overflow-hidden">
              {enabled.map((key) => {
                const meta = CARD_META[key];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <li key={key} className="flex items-start gap-2.5 px-3 py-2.5 text-sm">
                    <Icon className="h-4 w-4 text-[#033592] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ink">{meta.label}</div>
                      <div className="text-xs text-ink/60 truncate">{summarizeCard(key, state)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink/50 mb-2">Who can see it</div>
            <ul className="text-sm text-ink/80 space-y-1 pl-4 list-disc">
              <li>Only you, when signed in to your CHC account</li>
              <li>Any CHC agent you call from this workspace</li>
              {state.caregiver?.name && (
                <li>
                  Your caregiver <span className="font-medium">{state.caregiver.name}</span> — you can revoke anytime
                </li>
              )}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={download}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#033592]/25 bg-white px-3 py-2 text-sm font-medium text-[#131F69] hover:bg-[#E5F5F8]"
            >
              <Download className="h-4 w-4" /> Download my data (JSON)
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" /> Delete my data
            </button>
            <a
              href="https://www.uhc.com/legal/privacy-notice"
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 text-xs text-[#033592] hover:underline mt-1"
            >
              CHC Notice of Privacy Practices <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your workspace?</AlertDialogTitle>
              <AlertDialogDescription>
                This wipes everything you've captured — doctors, medications, favorites, caregiver — from this device
                {user ? " and from your CHC account" : ""}. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my data</AlertDialogCancel>
              <AlertDialogAction onClick={doDelete} className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600">
                Delete everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
