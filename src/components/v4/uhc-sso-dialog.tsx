import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/lib/v4/auth-store";
import emblemAsset from "@/assets/uhc-emblem.png.asset.json";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export function UhcSsoDialog({
  open,
  onOpenChange,
  onSignedIn,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSignedIn?: () => void;
}) {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);

  const doSignIn = async () => {
    setBusy(true);
    // Simulate the SSO handshake round-trip.
    await new Promise((r) => setTimeout(r, 850));
    signIn();
    setBusy(false);
    onOpenChange(false);
    onSignedIn?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="bg-[#131F69] px-6 py-5 text-white">
          <div className="flex items-center gap-2">
            <img src={emblemAsset.url} alt="CrinkleHealthcare" className="h-8 w-auto object-contain bg-white rounded-full p-0.5" />
            <div className="leading-tight">
              <div style={{ fontFamily: '"Source Serif Pro", Georgia, serif' }} className="text-base">
                CrinkleHealthcare
              </div>
              <div className="text-xs opacity-80">Member sign in</div>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <DialogTitle className="font-serif text-xl text-[#131F69]">
            Save your workspace to your CHC account
          </DialogTitle>
          <DialogDescription className="text-sm text-ink/70">
            Sign in with your CrinkleHealthcare account to save your doctors, medications,
            favorite plans and progress. Your information is stored in CHC's HIPAA-secure
            member systems — the same ones that protect your claims and benefits.
          </DialogDescription>

          <button
            type="button"
            onClick={doSignIn}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#131F69] px-4 py-3 text-sm font-medium text-white hover:bg-[#0d1650] transition disabled:opacity-70"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signing you in…
              </>
            ) : (
              <>
                Continue with CHC account <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="rounded-lg bg-[#E5F5F8] border border-[#033592]/15 px-3 py-2 text-xs text-[#131F69] flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Protected by CHC's HIPAA-compliant identity system. You can download or
              delete your workspace data anytime from <span className="font-medium">Your data</span>.
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full text-center text-xs text-ink/60 hover:underline"
          >
            Not now — keep exploring without saving
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
