import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/lib/v4/auth-store";
import emblemAsset from "@/assets/chc-emblem.png.asset.json";
import { ShieldCheck, ArrowRight, Loader2, UserPlus } from "lucide-react";

export type SsoMode = "signin" | "signup";

export function UhcSsoDialog({
  open,
  onOpenChange,
  onSignedIn,
  defaultMode = "signin",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSignedIn?: () => void;
  defaultMode?: SsoMode;
}) {
  const { signIn, signUp } = useAuth();
  const [busy, setBusy] = useState<null | SsoMode>(null);

  // Reset any residual busy state whenever the dialog reopens.
  useEffect(() => {
    if (open) setBusy(null);
  }, [open]);

  const doSignIn = async () => {
    setBusy("signin");
    await new Promise((r) => setTimeout(r, 850));
    signIn();
    setBusy(null);
    onOpenChange(false);
    onSignedIn?.();
  };

  const doSignUp = async () => {
    setBusy("signup");
    // Slightly longer to sell the "creating your HealthSafe ID" beat.
    await new Promise((r) => setTimeout(r, 1100));
    signUp();
    setBusy(null);
    onOpenChange(false);
    onSignedIn?.();
  };

  const anyBusy = busy !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="bg-[#131F69] px-6 py-5 text-white">
          <div className="flex items-center gap-2">
            <img
              src={emblemAsset.url}
              alt="CrinkleHealthcare"
              className="h-8 w-auto object-contain bg-white rounded-full p-0.5"
            />
            <div className="leading-tight">
              <div
                style={{ fontFamily: '"Source Serif Pro", Georgia, serif' }}
                className="text-base"
              >
                CrinkleHealthcare
              </div>
              <div className="text-xs opacity-80">HealthSafe ID</div>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <DialogTitle className="font-serif text-xl text-[#131F69]">
            Save your workspace to your CHC account
          </DialogTitle>
          <DialogDescription className="text-sm text-ink/70">
            CrinkleHealthcare uses <span className="font-medium">HealthSafe ID</span> — the
            same secure account you use for myuhc.com and the CHC app. Sign in to save your
            doctors, medications, and favorite plans.
          </DialogDescription>

          {/* Primary: existing HealthSafe ID */}
          {(defaultMode === "signin" || busy !== "signup") && (
            <button
              type="button"
              onClick={doSignIn}
              disabled={anyBusy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#131F69] px-4 py-3 text-sm font-medium text-white hover:bg-[#0d1650] transition disabled:opacity-70"
            >
              {busy === "signin" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing you in…
                </>
              ) : (
                <>
                  Sign in with HealthSafe ID <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}

          {/* Secondary: create a new HealthSafe ID */}
          <div className="pt-1">
            <div className="text-xs text-ink/60 mb-1.5">New to CrinkleHealthcare?</div>
            <button
              type="button"
              onClick={doSignUp}
              disabled={anyBusy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#131F69] px-4 py-3 text-sm font-medium text-[#131F69] hover:bg-[#131F69]/5 transition disabled:opacity-70"
            >
              {busy === "signup" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating your HealthSafe ID…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Create a HealthSafe ID
                </>
              )}
            </button>
            {busy !== "signup" && (
              <p className="text-[11px] text-ink/55 mt-1.5 leading-snug">
                Takes about a minute. We'll use it to save your doctors, medications, and
                plan favorites.
              </p>
            )}
          </div>

          <div className="rounded-lg bg-[#E5F5F8] border border-[#033592]/15 px-3 py-2 text-xs text-[#131F69] flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Protected by CHC's HIPAA-compliant HealthSafe ID system. You can download or
              delete your workspace anytime from <span className="font-medium">Your data</span>.
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={anyBusy}
            className="w-full text-center text-xs text-ink/60 hover:underline disabled:opacity-50"
          >
            Not now — keep exploring without saving
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
