import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/v4/auth-store";
import { useSession } from "@/lib/v4/session-store";
import { mergeIntake } from "@/lib/v4/intake-merge";
import { emptyIntake } from "@/lib/v3/intake-types";
import {
  ShieldCheck,
  ArrowRight,
  Loader2,
  UserPlus,
  Check,
  Lock,
  ChevronLeft,
} from "lucide-react";
import {
  buildImportedRecord,
  buildResyncRecord,
  importMilestones,
  type ImportProvider,
  type ImportMilestone,
} from "@/lib/v4/mock-verified-import";

export type VerifiedSignInMode = "signin" | "signup";

type Step =
  | { kind: "choose" }
  | { kind: "consent"; provider: ImportProvider }
  | { kind: "importing"; provider: ImportProvider }
  | { kind: "resyncing"; provider: ImportProvider }
  | { kind: "done"; provider: ImportProvider }
  | { kind: "resynced"; provider: ImportProvider };

const IDME_MARK = (
  <div className="h-6 w-6 rounded-md bg-[#0F753C] text-white text-[11px] font-bold grid place-items-center">
    ID
  </div>
);

const CLEAR_MARK = (
  <div className="h-6 w-6 rounded-md bg-[#0033A0] text-white text-[10px] font-bold grid place-items-center tracking-tight">
    CL
  </div>
);

// Remembered across sign-out so the returning-user resync flow can trigger
// even after the local session state has been wiped. Demo-only; a real impl
// would key this off the identity provider's stored refresh token.
const REMEMBER_KEY = "v4.verifiedProvider";
function rememberProvider(p: ImportProvider) {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(REMEMBER_KEY, p);
  } catch {}
}
function readRememberedProvider(): ImportProvider | null {
  try {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(REMEMBER_KEY);
    return v === "idme" || v === "clear" ? v : null;
  } catch {
    return null;
  }
}
export function forgetRememberedVerifiedProvider() {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(REMEMBER_KEY);
  } catch {}
}


/**
 * Two-in-one sign-in dialog. Primary path is verified identity via
 * ID.me / CLEAR, which imports mock MyChart + CMS Blue Button + pharmacy
 * data into the Workspace. Secondary path is the existing HealthSafe ID
 * sign-in / sign-up (kept intact from UhcSsoDialog).
 */
export function VerifiedSignInDialog({
  open,
  onOpenChange,
  onSignedIn,
  defaultMode = "signin",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSignedIn?: () => void;
  defaultMode?: VerifiedSignInMode;
}) {
  const { signIn, signUp } = useAuth();
  const { state, update } = useSession();
  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [busy, setBusy] = useState<null | "signin" | "signup">(null);
  const [sources, setSources] = useState({ mychart: true, cms: true, pharmacy: true });
  const [remembered, setRemembered] = useState<ImportProvider | null>(null);

  useEffect(() => {
    if (open) {
      setStep({ kind: "choose" });
      setBusy(null);
      setSources({ mychart: true, cms: true, pharmacy: true });
      setRemembered(readRememberedProvider());
    }
  }, [open]);


  const doHealthSafeSignIn = async () => {
    setBusy("signin");
    await new Promise((r) => setTimeout(r, 850));
    signIn();
    setBusy(null);
    onOpenChange(false);
    onSignedIn?.();
  };

  const doHealthSafeSignUp = async () => {
    setBusy("signup");
    await new Promise((r) => setTimeout(r, 1100));
    signUp();
    setBusy(null);
    onOpenChange(false);
    onSignedIn?.();
  };

  const hasPriorImport = !!state.verifiedImport || !!readRememberedProvider();

  const startVerified = (provider: ImportProvider) => {
    // Returning user — skip consent and silently re-sync claims.
    if (hasPriorImport) {
      runResync(provider);
      return;
    }
    setStep({ kind: "consent", provider });
  };

  const runImport = async (provider: ImportProvider) => {
    setStep({ kind: "importing", provider });
    const record = buildImportedRecord(provider);
    const milestones = importMilestones(record);
    // Wait for the on-screen animation to run through (handled by ImportingStep).
    const totalDelay = milestones.reduce((a, m) => a + m.delayMs, 0) + 400;
    await new Promise((r) => setTimeout(r, totalDelay));

    // Merge the imported record into the intake so plan-match / progress /
    // workspace all light up. Then persist the identity fields via signIn.
    const nextIntake = mergeIntake(state.intake ?? emptyIntake(), {
      ...emptyIntake(),
      ...record.intakePatch,
    });
    update({
      intake: nextIntake,
      verifiedImport: {
        provider,
        importedAt: Date.now(),
        summary: record.summary,
        notableEvent: record.notableEvent,
        doctorNpis: record.importedDoctorNpis,
        medRxcuis: record.importedMedRxcuis,
        medNames: record.importedMedNames,
      },
    });
    signIn({
      name: record.user.name,
      email: record.user.email,
      memberId: record.user.memberId,
    });
    rememberProvider(provider);

    setStep({ kind: "done", provider });
  };

  const runResync = async (provider: ImportProvider) => {
    setStep({ kind: "resyncing", provider });
    const record = buildResyncRecord(provider);
    const totalDelay = record.milestones.reduce((a, m) => a + m.delayMs, 0) + 400;
    await new Promise((r) => setTimeout(r, totalDelay));

    // If the session was cleared on sign-out, re-seed the Workspace from the
    // original imported record so doctors/meds/CMS claims come back too.
    const baseline = buildImportedRecord(provider);
    const nextIntake = mergeIntake(state.intake ?? emptyIntake(), {
      ...emptyIntake(),
      ...baseline.intakePatch,
    });
    const prior = state.verifiedImport;
    update({
      intake: nextIntake,
      verifiedImport: {
        provider,
        importedAt: prior?.importedAt ?? Date.now(),
        summary: record.summary,
        notableEvent: prior?.notableEvent ?? baseline.notableEvent,
        doctorNpis: prior?.doctorNpis ?? baseline.importedDoctorNpis,
        medRxcuis: prior?.medRxcuis ?? baseline.importedMedRxcuis,
        medNames: prior?.medNames ?? baseline.importedMedNames,
        resyncedAt: Date.now(),
        newSinceLastVisit: record.newSinceLastVisit,
        cardDismissed: false,
      },
    });
    signIn({
      name: baseline.user.name,
      email: baseline.user.email,
      memberId: baseline.user.memberId,
    });
    rememberProvider(provider);
    setStep({ kind: "resynced", provider });
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="bg-[#131F69] px-6 py-4 text-white flex items-center gap-3">
          {step.kind === "consent" && (
            <button
              type="button"
              onClick={() => setStep({ kind: "choose" })}
              className="rounded-full p-1 hover:bg-white/10 transition"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="leading-tight">
            <div style={{ fontFamily: '"Source Serif Pro", Georgia, serif' }} className="text-base">
              {hasPriorImport ? "Welcome back to Hello Medicare" : "Sign in to Hello Medicare"}
            </div>
            <div className="text-xs opacity-80">Verified identity · HIPAA-secure</div>
          </div>
          <span className="ml-auto text-[10px] uppercase tracking-wider bg-white/15 rounded-full px-2 py-0.5">
            Mock demo
          </span>
        </div>

        {step.kind === "choose" && (
          <ChooseStep
            defaultMode={defaultMode}
            busy={busy}
            hasPriorImport={hasPriorImport}
            onVerified={startVerified}
            onHealthSafeSignIn={doHealthSafeSignIn}
            onHealthSafeSignUp={doHealthSafeSignUp}
          />
        )}
        {step.kind === "consent" && (
          <ConsentStep
            provider={step.provider}
            sources={sources}
            setSources={setSources}
            onCancel={() => setStep({ kind: "choose" })}
            onContinue={() => runImport(step.provider)}
          />
        )}
        {step.kind === "importing" && (
          <ImportingStep provider={step.provider} sources={sources} />
        )}
        {step.kind === "resyncing" && (
          <ResyncingStep provider={step.provider} />
        )}
        {step.kind === "done" && (
          <DoneStep
            provider={step.provider}
            onClose={() => {
              onOpenChange(false);
              onSignedIn?.();
            }}
          />
        )}
        {step.kind === "resynced" && (
          <ResyncedStep
            provider={step.provider}
            onClose={() => {
              onOpenChange(false);
              onSignedIn?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Steps -------------------- */

function ChooseStep({
  defaultMode,
  busy,
  hasPriorImport,
  onVerified,
  onHealthSafeSignIn,
  onHealthSafeSignUp,
}: {
  defaultMode: VerifiedSignInMode;
  busy: null | "signin" | "signup";
  hasPriorImport: boolean;
  onVerified: (p: ImportProvider) => void;
  onHealthSafeSignIn: () => void;
  onHealthSafeSignUp: () => void;
}) {
  const anyBusy = busy !== null;
  return (
    <div className="px-6 py-5 space-y-5">
      {/* Verified identity — primary */}
      <div>
        <DialogTitle className="font-serif text-[19px] text-[#131F69]">
          {hasPriorImport ? "Sync your latest claims and refills" : "Bring your health history with you"}
        </DialogTitle>
        <DialogDescription className="text-sm text-ink/70 mt-1 leading-relaxed">
          {hasPriorImport
            ? "Sign back in with your verified identity and we'll silently pull anything new from MyChart, CMS Blue Button, and your pharmacy since your last visit."
            : "Sign in with a verified identity to pull your doctors, medications, and CMS claims into your Workspace — so your plan match is based on what you already use, not what you remember."}
        </DialogDescription>


        <div className="mt-3 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => onVerified("idme")}
            disabled={anyBusy}
            className="w-full inline-flex items-center gap-3 rounded-xl border border-[#131F69]/25 bg-white px-4 py-3 text-left hover:bg-[#E5F5F8]/60 transition disabled:opacity-60"
          >
            {IDME_MARK}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#131F69]">Continue with ID.me</div>
              <div className="text-[11px] text-ink/60">
                Verified identity · MyChart · CMS Blue Button · Pharmacy
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#131F69]/70" />
          </button>
          <button
            type="button"
            onClick={() => onVerified("clear")}
            disabled={anyBusy}
            className="w-full inline-flex items-center gap-3 rounded-xl border border-[#131F69]/25 bg-white px-4 py-3 text-left hover:bg-[#E5F5F8]/60 transition disabled:opacity-60"
          >
            {CLEAR_MARK}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#131F69]">Continue with CLEAR</div>
              <div className="text-[11px] text-ink/60">
                Verified identity · MyChart · CMS Blue Button · Pharmacy
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#131F69]/70" />
          </button>
        </div>

        <div className="rounded-lg bg-[#E5F5F8] border border-[#033592]/15 px-3 py-2 text-[11px] text-[#131F69] flex items-start gap-2 mt-3">
          <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div>
            Read-only. You can revoke or delete any connection from{" "}
            <span className="font-medium">Your data</span> anytime.
          </div>
        </div>
        {hasPriorImport && (
          <button
            type="button"
            onClick={() => {
              forgetRememberedVerifiedProvider();
              // Force re-render by toggling a source (cheap) — parent effect
              // resets on next open; but we're already open, so reload state
              // via a location no-op isn't needed: hasPriorImport is derived
              // from localStorage read on each render.
              window.dispatchEvent(new Event("storage"));
            }}
            className="mt-2 text-[11px] text-ink/55 hover:text-[#131F69] hover:underline"
          >
            Not you? Start fresh as a new user
          </button>
        )}
      </div>


      {/* HealthSafe ID — secondary */}
      <div className="pt-3 border-t border-[#033592]/10">
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink/50 mb-2">
          Or use a Hello Medicare account
        </div>
        {(defaultMode === "signin" || busy !== "signup") && (
          <button
            type="button"
            onClick={onHealthSafeSignIn}
            disabled={anyBusy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#131F69]/95 px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0d1650] transition disabled:opacity-70"
          >
            {busy === "signin" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signing you in…
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" /> Sign in with HealthSafe ID
              </>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onHealthSafeSignUp}
          disabled={anyBusy}
          className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#131F69]/40 px-4 py-2.5 text-sm font-medium text-[#131F69] hover:bg-[#131F69]/5 transition disabled:opacity-70"
        >
          {busy === "signup" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating your account…
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" /> Create a HealthSafe ID
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ConsentStep({
  provider,
  sources,
  setSources,
  onCancel,
  onContinue,
}: {
  provider: ImportProvider;
  sources: { mychart: boolean; cms: boolean; pharmacy: boolean };
  setSources: (s: { mychart: boolean; cms: boolean; pharmacy: boolean }) => void;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const providerName = provider === "idme" ? "ID.me" : "CLEAR";
  const toggle = (k: keyof typeof sources) => setSources({ ...sources, [k]: !sources[k] });
  return (
    <div className="px-6 py-5 space-y-4">
      <div>
        <DialogTitle className="font-serif text-[18px] text-[#131F69]">
          Choose what to share with Hello Medicare
        </DialogTitle>
        <DialogDescription className="text-sm text-ink/70 mt-1 leading-relaxed">
          You're signing in as a verified user via {providerName}. Pick which sources to
          connect. You can revoke access from Your data anytime.
        </DialogDescription>
      </div>

      <div className="rounded-xl border border-[#033592]/15 divide-y divide-[#033592]/10 bg-white">
        <SourceRow
          checked={sources.mychart}
          onToggle={() => toggle("mychart")}
          title="MyChart / Epic"
          detail="Doctors, upcoming appointments, care team"
        />
        <SourceRow
          checked={sources.cms}
          onToggle={() => toggle("cms")}
          title="CMS Blue Button 2.0"
          detail="Medicare claims: providers seen, drugs filled, costs (24 mo)"
        />
        <SourceRow
          checked={sources.pharmacy}
          onToggle={() => toggle("pharmacy")}
          title="Pharmacy history"
          detail="Active prescriptions and refill patterns"
        />
      </div>

      <p className="text-[11px] text-ink/60 leading-snug">
        You're sharing read-only data with Hello Medicare. Hello Medicare uses this only
        to recommend a plan that fits your care — it does not share or sell your data.
      </p>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-ink/60 hover:underline"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#131F69] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0d1650]"
        >
          Allow &amp; import <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SourceRow({
  checked,
  onToggle,
  title,
  detail,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  detail: string;
}) {
  return (
    <label className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[#E5F5F8]/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 h-4 w-4 accent-[#131F69]"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#131F69]">{title}</div>
        <div className="text-[12px] text-ink/65 leading-snug">{detail}</div>
      </div>
    </label>
  );
}

function ImportingStep({
  provider,
  sources,
}: {
  provider: ImportProvider;
  sources: { mychart: boolean; cms: boolean; pharmacy: boolean };
}) {
  const record = useMemo(() => buildImportedRecord(provider), [provider]);
  const allMilestones = useMemo(() => importMilestones(record), [record]);
  const milestones = useMemo(
    () =>
      allMilestones.filter((m) => {
        if (m.key === "identity") return true;
        if (m.key === "mychart") return sources.mychart;
        if (m.key === "cms") return sources.cms;
        if (m.key === "pharmacy") return sources.pharmacy;
        return true;
      }),
    [allMilestones, sources],
  );
  const [done, setDone] = useState(0);

  useEffect(() => {
    setDone(0);
    let cancelled = false;
    let acc = 0;
    milestones.forEach((m, i) => {
      acc += m.delayMs;
      setTimeout(() => {
        if (!cancelled) setDone(i + 1);
      }, acc);
    });
    return () => {
      cancelled = true;
    };
  }, [milestones]);

  return (
    <div className="px-6 py-6 space-y-4">
      <DialogTitle className="font-serif text-[18px] text-[#131F69]">
        Importing your health history…
      </DialogTitle>
      <DialogDescription className="sr-only">
        Connecting to selected data sources and importing your records.
      </DialogDescription>
      <ul className="space-y-2.5">
        {milestones.map((m, i) => {
          const isDone = i < done;
          const isActive = i === done;
          return (
            <li
              key={m.key}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                isDone
                  ? "border-emerald-200 bg-emerald-50/60"
                  : isActive
                  ? "border-[#033592]/25 bg-[#E5F5F8]/60"
                  : "border-[#033592]/10 bg-white opacity-70"
              }`}
            >
              <div className="mt-0.5 h-5 w-5 grid place-items-center rounded-full bg-white border border-current/20">
                {isDone ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : isActive ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#131F69]" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-ink/25" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#131F69]">{m.label}</div>
                <div className="text-[12px] text-ink/65">{m.detail}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DoneStep({ provider, onClose }: { provider: ImportProvider; onClose: () => void }) {
  const record = useMemo(() => buildImportedRecord(provider), [provider]);
  return (
    <div className="px-6 py-6 space-y-4">
      <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 grid place-items-center">
        <Check className="h-6 w-6 text-emerald-700" />
      </div>
      <div className="text-center">
        <DialogTitle className="font-serif text-[19px] text-[#131F69]">
          You're all set, {record.user.name.split(" ")[0]}
        </DialogTitle>
        <DialogDescription className="text-sm text-ink/70 mt-1">
          {record.summary}
        </DialogDescription>
      </div>
      <div className="rounded-lg bg-[#E5F5F8] border border-[#033592]/15 px-3 py-2 text-[12px] text-[#131F69] leading-snug">
        Your Workspace has been filled in. Head back to chat and I'll walk through what
        this changes about your plan match.
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#131F69] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0d1650]"
      >
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ResyncingStep({ provider }: { provider: ImportProvider }) {
  const record = useMemo(() => buildResyncRecord(provider), [provider]);
  const milestones: ImportMilestone[] = record.milestones;
  const [done, setDone] = useState(0);

  useEffect(() => {
    setDone(0);
    let cancelled = false;
    let acc = 0;
    milestones.forEach((m, i) => {
      acc += m.delayMs;
      setTimeout(() => {
        if (!cancelled) setDone(i + 1);
      }, acc);
    });
    return () => {
      cancelled = true;
    };
  }, [milestones]);

  return (
    <div className="px-6 py-6 space-y-4">
      <DialogTitle className="font-serif text-[18px] text-[#131F69]">
        Syncing your latest claims…
      </DialogTitle>
      <DialogDescription className="text-sm text-ink/70">
        You've connected before — we're just checking what's changed since your last
        visit. No consent needed.
      </DialogDescription>
      <ul className="space-y-2.5">
        {milestones.map((m, i) => {
          const isDone = i < done;
          const isActive = i === done;
          return (
            <li
              key={m.key + i}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                isDone
                  ? "border-emerald-200 bg-emerald-50/60"
                  : isActive
                  ? "border-[#033592]/25 bg-[#E5F5F8]/60"
                  : "border-[#033592]/10 bg-white opacity-70"
              }`}
            >
              <div className="mt-0.5 h-5 w-5 grid place-items-center rounded-full bg-white border border-current/20">
                {isDone ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : isActive ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#131F69]" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-ink/25" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#131F69]">{m.label}</div>
                <div className="text-[12px] text-ink/65">{m.detail}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ResyncedStep({ provider, onClose }: { provider: ImportProvider; onClose: () => void }) {
  const record = useMemo(() => buildResyncRecord(provider), [provider]);
  return (
    <div className="px-6 py-6 space-y-4">
      <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 grid place-items-center">
        <Check className="h-6 w-6 text-emerald-700" />
      </div>
      <div className="text-center">
        <DialogTitle className="font-serif text-[19px] text-[#131F69]">
          What's new since your last visit
        </DialogTitle>
        <DialogDescription className="text-sm text-ink/70 mt-1">
          {record.summary}
        </DialogDescription>
      </div>
      <ul className="rounded-lg bg-[#E5F5F8] border border-[#033592]/15 px-3 py-2 text-[12px] text-[#131F69] leading-snug space-y-1.5">
        {record.newSinceLastVisit.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#131F69] shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#131F69] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0d1650]"
      >
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
