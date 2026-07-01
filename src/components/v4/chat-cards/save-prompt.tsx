import { useState } from "react";
import { ShieldCheck, X, ArrowRight, Sparkles, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/v4/auth-store";
import { UhcSsoDialog, type SsoMode } from "@/components/v4/uhc-sso-dialog";

/**
 * Inline chat card that offers to save the workspace to a CHC account.
 * Fires once per anonymous session at meaningful progress moments; the
 * caller decides when to insert this into the transcript.
 */
export function SavePromptCard({ trigger }: { trigger: string }) {
  const { dismissSavePrompt } = useAuth();
  const [ssoOpen, setSsoOpen] = useState(false);
  const [ssoMode, setSsoMode] = useState<SsoMode>("signin");
  const [hidden, setHidden] = useState(false);

  const openSso = (mode: SsoMode) => {
    setSsoMode(mode);
    setSsoOpen(true);
  };

  if (hidden) return null;

  return (
    <div className="rounded-2xl border border-[#033592]/25 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#E5F5F8] to-white px-4 py-3 flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-[#131F69] flex items-center justify-center shrink-0">
          <ShieldCheck className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#033592]/70 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Save your progress
          </div>
          <div className="font-serif text-[17px] text-[#131F69] leading-snug mt-0.5">
            Want me to save this to your CHC account?
          </div>
          <p className="text-sm text-ink/75 mt-1 leading-relaxed">
            {trigger} Sign in and I'll keep your doctors, medications and favorite
            plans safe — protected by CHC's HIPAA-secure member systems.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSsoOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#131F69] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#0d1650]"
            >
              Sign in with CHC <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                dismissSavePrompt();
                setHidden(true);
              }}
              className="text-xs text-ink/60 hover:text-ink hover:underline"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            dismissSavePrompt();
            setHidden(true);
          }}
          aria-label="Dismiss"
          className="text-ink/40 hover:text-ink/70 rounded-md p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <UhcSsoDialog
        open={ssoOpen}
        onOpenChange={setSsoOpen}
        onSignedIn={() => setHidden(true)}
      />
    </div>
  );
}

/**
 * Inline recap card shown to a returning signed-in user when the server
 * has newer data than their last visit.
 */
export function RecapCard({
  name,
  summary,
  onDismiss,
}: {
  name: string;
  summary: string;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700">
            Welcome back
          </div>
          <div className="font-serif text-[17px] text-[#131F69] leading-snug mt-0.5">
            Hi {name.split(" ")[0]} — a few things changed since your last visit.
          </div>
          <p className="text-sm text-ink/75 mt-1 leading-relaxed">{summary}</p>
          <div className="mt-3">
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#131F69] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#0d1650]"
            >
              Got it, let's keep going
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-ink/40 hover:text-ink/70 rounded-md p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
