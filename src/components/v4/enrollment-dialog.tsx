import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSession, type EnrollmentApplication, type EnrollmentStep } from "@/lib/v4/session-store";
import { useAuth } from "@/lib/v4/auth-store";
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Check,
  FileText,
  PenLine,
  UserCheck,
  Phone,
  Download,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { CallDialog } from "@/components/v4/call-dialog";

// CMS MBI: 11 chars, format C-A-AN-N-A-AN-N-A-A-N-N, displayed as XXXX-XXX-XXXX
const MBI_RE = /^[1-9][A-Z][A-Z0-9][0-9]-?[A-Z][A-Z0-9][0-9]-?[A-Z]{2}[0-9]{2}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MARGARET_DEMO: NonNullable<EnrollmentApplication["info"]> = {
  legalName: "Margaret Chen",
  dob: "1959-08-14",
  sex: "F",
  phone: "612-555-0134",
  email: "margaret.chen@example.com",
  preferredLanguage: "English",
  race: "Asian",
  ethnicity: "Not Hispanic or Latino",
  emergencyContact: { name: "Lily Chen", relationship: "Daughter", phone: "612-555-0198" },
  address1: "4210 Zenith Ave S",
  address2: "",
  city: "Minneapolis",
  state: "MN",
  zip: "55410",
  county: "Hennepin",
  mailingSameAsResidence: true,
  mbi: "1EG4-TE5-MK73",
  partAEffective: "2024-08-01",
  partBEffective: "2024-08-01",
  ssnFull: "123-45-1930",
  oevPreference: "email",
  enrollmentPeriod: "IEP",
  requestedEffective: "2026-01-01",
  esrd: "no",
  otherCoverage: ["none"],
  medicaidStatus: "no",
  lis: "no",
  institutional: "community",
  workingAged: false,
  pcp: { name: "Dr. Robert Bruley, MD", npi: "1487654321", currentPatient: true },
  giReason: "loss_employer",
  giLossDate: "2025-12-31",
  replacing: false,
  householdDiscount: false,
  heightIn: "64",
  weightLb: "142",
  payment: {
    method: "eft",
    routingNumber: "091000019",
    accountNumber: "000123456789",
    accountLast4: "6789",
  },
  tobacco: false,
  ssnLast4: "1930",
};


const STEP_ORDER: EnrollmentStep[] = [
  "intro",
  "soa",
  "info",
  "disclosures",
  "signature",
  "review",
  "submitted",
  "handed_off",
];

const STEP_LABELS: Record<EnrollmentStep, string> = {
  intro: "Start",
  soa: "Scope of Appointment",
  info: "Your details",
  disclosures: "Disclosures",
  signature: "Signature",
  review: "Review",
  submitted: "Submitted",
  handed_off: "With advisor",
};

export function EnrollmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { state, update } = useSession();
  const { user } = useAuth();
  const app = state.enrollment;
  const [callOpen, setCallOpen] = useState(false);

  useEffect(() => {
    if (open && !app) onOpenChange(false);
  }, [open, app, onOpenChange]);

  if (!app) return null;

  const patch = (p: Partial<EnrollmentApplication>) =>
    update((s) => ({ enrollment: { ...(s.enrollment ?? app), ...p } }));
  const goto = (step: EnrollmentStep) => patch({ step });

  const stepIdx = STEP_ORDER.indexOf(app.step);
  const products = app.strategy === "medigap-plus-partd" ? ["Medigap", "Part D (PDP)"] : app.strategy === "dsnp" ? ["Medicare Advantage (D-SNP)"] : ["Medicare Advantage"];
  const isMedigap = app.strategy === "medigap-plus-partd";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-[#131F69] px-6 py-4 text-white shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="font-serif text-lg leading-tight">
                Enroll in {app.planName ?? "your plan"}
                {app.pairedPlanName ? ` + ${app.pairedPlanName}` : ""}
              </DialogTitle>
              <div className="text-xs opacity-80 mt-0.5">
                Demo enrollment · Crinkle Health · {products.join(" + ")}
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-widest opacity-80">
              Step {Math.min(stepIdx + 1, STEP_ORDER.length)} / {STEP_ORDER.length}
            </div>
          </div>
          <div className="mt-3 h-1 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{ width: `${((stepIdx + 1) / STEP_ORDER.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#F7FAFC]">
          {app.step === "intro" && <IntroStep app={app} onNext={() => goto("soa")} products={products} />}
          {app.step === "soa" && (
            <SoaStep
              app={app}
              products={products}
              onSubmit={(soa) => {
                patch({ soa });
                goto("info");
              }}
              onBack={() => goto("intro")}
            />
          )}
          {app.step === "info" && (
            <InfoStep
              app={app}
              isMedigap={isMedigap}
              onSubmit={(info) => {
                patch({ info });
                goto("disclosures");
              }}
              onBack={() => goto("soa")}
            />
          )}
          {app.step === "disclosures" && (
            <DisclosuresStep
              app={app}
              onSubmit={(attestations) => {
                patch({ attestations });
                goto("signature");
              }}
              onBack={() => goto("info")}
            />
          )}
          {app.step === "signature" && (
            <SignatureStep
              app={app}
              caregiverWrite={
                !!state.caregiver?.name && state.caregiver?.invite?.access === "write"
              }
              caregiverName={state.caregiver?.name}
              caregiverRelationship={state.caregiver?.relationship}
              defaultName={app.info?.legalName ?? user?.name ?? ""}
              onSubmit={(signature) => {
                patch({ signature });
                goto("review");
              }}
              onBack={() => goto("disclosures")}
            />
          )}
          {app.step === "review" && (
            <ReviewStep
              app={app}
              onSelfSubmit={() => {
                patch({
                  status: "submitted",
                  step: "submitted",
                  handoff: {
                    agentName: "Self-submitted",
                    agentNpn: "—",
                    at: Date.now(),
                  },
                });
              }}
              onHandoff={() => {
                patch({
                  status: "handed_off",
                  step: "handed_off",
                  handoff: {
                    agentName: state.permanentAgent?.name ?? "Sarah Chen",
                    agentNpn: state.permanentAgent?.npn ?? "NPN #19284756",
                    at: Date.now(),
                  },
                });
                setCallOpen(true);
              }}
              onDownload={() => patch({ status: "packaged" })}
              onBack={() => goto("signature")}
            />
          )}
          {app.step === "submitted" && (
            <SubmittedStep app={app} onClose={() => onOpenChange(false)} />
          )}
          {app.step === "handed_off" && (
            <HandedOffStep app={app} onClose={() => onOpenChange(false)} />
          )}

        </div>
      </DialogContent>
      <CallDialog open={callOpen} onOpenChange={setCallOpen} agent={state.permanentAgent} />
    </Dialog>
  );
}

// ---------- Step components ----------

function IntroStep({ app, onNext, products }: { app: EnrollmentApplication; onNext: () => void; products: string[] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#033592]/15 bg-white p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#033592]/70 mb-2">
          <Sparkles className="h-3.5 w-3.5" /> About 3 minutes
        </div>
        <h3 className="font-serif text-xl text-[#131F69] leading-snug">
          Let's package your {products.join(" + ")} enrollment.
        </h3>
        <p className="text-sm text-ink/75 mt-2 leading-relaxed">
          I'll walk you through: a quick scope-of-appointment (SOA), your Medicare info,
          the CMS-required disclosures, and a signature. At the end, a licensed Crinkle Health
          advisor reviews it with you before it's submitted — nothing is filed until you say so.
        </p>
        <ul className="mt-3 text-sm text-ink/75 space-y-1.5">
          <StepBullet icon={ShieldCheck} label="Scope of Appointment (SOA)" />
          <StepBullet icon={UserCheck} label="Your Medicare details (MBI, dates, address, payment)" />
          <StepBullet icon={FileText} label="Disclosures + attestations" />
          <StepBullet icon={PenLine} label="Electronic signature" />
          <StepBullet icon={Phone} label="Licensed agent review + submit" />
        </ul>
      </div>
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900 flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <div>
          Demo only — no real application is submitted, no real MBI or payment info is
          validated or stored.
        </div>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={onNext} className={primaryBtn}>
          Get started <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StepBullet({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <div className="h-6 w-6 rounded-full bg-[#E5F5F8] text-[#033592] flex items-center justify-center">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span>{label}</span>
    </li>
  );
}

function SoaStep({
  app,
  products,
  onSubmit,
  onBack,
}: {
  app: EnrollmentApplication;
  products: string[];
  onSubmit: (soa: NonNullable<EnrollmentApplication["soa"]>) => void;
  onBack: () => void;
}) {
  const [typed, setTyped] = useState(app.soa?.typedName ?? "");
  const [agreed, setAgreed] = useState(!!app.soa);
  const [apptDate, setApptDate] = useState(app.soa?.appointmentDate ?? new Date().toISOString().slice(0, 10));
  const [apptWindow, setApptWindow] = useState(app.soa?.appointmentWindow ?? "any-time");
  const canSubmit = typed.trim().length >= 2 && agreed && !!apptDate;
  return (
    <div className="space-y-4">
      <StepHeader
        eyebrow="Step 1"
        title="Scope of Appointment"
        blurb="CMS requires we document which Medicare products we're discussing, before we discuss specific plans. This protects you from unwanted product pitches."
      />
      <div className="rounded-2xl border border-line bg-white p-4 space-y-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-2">Products discussed</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {products.map((p) => (
              <span key={p} className="inline-flex items-center gap-1 rounded-full bg-[#E5F5F8] text-[#033592] text-xs px-2.5 py-1">
                <Check className="h-3 w-3" /> {p}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-2">Appointment date</span>
            <input type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-2">Time window</span>
            <select value={apptWindow} onChange={(e) => setApptWindow(e.target.value)} className={inputCls}>
              <option value="morning">Morning (8am–12pm)</option>
              <option value="afternoon">Afternoon (12pm–5pm)</option>
              <option value="evening">Evening (5pm–8pm)</option>
              <option value="any-time">Any time today</option>
            </select>
          </label>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-2">Type your name</label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Your full name"
            className={inputCls}
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-ink cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I agree to discuss the products checked above with Crinkle Health today. I understand
            no other products will be discussed unless I sign another SOA.
          </span>
        </label>
      </div>
      <NavRow onBack={onBack} disabled={!canSubmit} onNext={() => onSubmit({ signedAt: Date.now(), typedName: typed.trim(), products, appointmentDate: apptDate, appointmentWindow: apptWindow })} />
    </div>
  );
}


function InfoStep({
  app,
  isMedigap,
  onSubmit,
  onBack,
}: {
  app: EnrollmentApplication;
  isMedigap: boolean;
  onSubmit: (info: NonNullable<EnrollmentApplication["info"]>) => void;
  onBack: () => void;
}) {
  const [info, setInfo] = useState<NonNullable<EnrollmentApplication["info"]>>(app.info ?? {});
  const set = <K extends keyof NonNullable<EnrollmentApplication["info"]>>(k: K, v: NonNullable<EnrollmentApplication["info"]>[K]) =>
    setInfo((p) => ({ ...p, [k]: v }));
  const setPay = <K extends keyof NonNullable<NonNullable<EnrollmentApplication["info"]>["payment"]>>(k: K, v: NonNullable<NonNullable<EnrollmentApplication["info"]>["payment"]>[K]) =>
    setInfo((p) => ({ ...p, payment: { ...(p.payment ?? {}), [k]: v } }));

  const mbiValid = !info.mbi || MBI_RE.test((info.mbi || "").trim());
  const errors = useMemo(() => {
    const e: string[] = [];
    if (!info.legalName) e.push("Legal name");
    if (!info.dob || !DATE_RE.test(info.dob)) e.push("Date of birth (YYYY-MM-DD)");
    if (!info.sex) e.push("Sex");
    if (!info.address1) e.push("Street address");
    if (!info.city) e.push("City");
    if (!info.state) e.push("State");
    if (!info.zip) e.push("ZIP");
    if (!info.phone) e.push("Phone");
    if (!info.email) e.push("Email");
    if (!info.mbi) e.push("MBI");
    else if (!mbiValid) e.push("MBI format (e.g. 1EG4-TE5-MK73)");
    if (!info.partAEffective) e.push("Part A effective date");
    if (!info.partBEffective) e.push("Part B effective date");
    if (!info.enrollmentPeriod) e.push("Enrollment period");
    if (!info.requestedEffective) e.push("Requested effective date");
    if (!info.payment?.method) e.push("Payment method");
    if (isMedigap && info.tobacco === undefined) e.push("Tobacco use (last 12 mo)");
    if (isMedigap && !info.ssnLast4) e.push("SSN (last 4)");
    return e;
  }, [info, mbiValid, isMedigap]);

  const canSubmit = errors.length === 0;
  return (
    <div className="space-y-4">
      <StepHeader
        eyebrow="Step 2"
        title="Your Medicare details"
        blurb="We've pre-filled what we already have. Fill in the rest — this is what Crinkle Health needs to file the application."
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setInfo(MARGARET_DEMO)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#131F69]/30 bg-white px-3 py-1.5 text-xs font-medium text-[#131F69] hover:bg-[#131F69]/5"
        >
          <Sparkles className="h-3.5 w-3.5" /> Demo: fill with Margaret's data
        </button>
      </div>
      <div className="rounded-2xl border border-line bg-white p-4 space-y-4">
        <Section title="About you">
          <TxtField label="Legal full name" value={info.legalName} onChange={(v) => set("legalName", v)} />
          <TxtField label="Date of birth (YYYY-MM-DD)" value={info.dob} onChange={(v) => set("dob", v)} placeholder="1959-08-14" />
          <SelectField label="Sex" value={info.sex} onChange={(v) => set("sex", v as "F" | "M" | "X")} options={[["F","Female"],["M","Male"],["X","Prefer not to say"]]} />
          <TxtField label="Phone" value={info.phone} onChange={(v) => set("phone", v)} placeholder="612-555-0134" />
          <TxtField label="Email" value={info.email} onChange={(v) => set("email", v)} placeholder="you@example.com" />
        </Section>

        <Section title="Permanent residence (no PO box)">
          <TxtField label="Street address" value={info.address1} onChange={(v) => set("address1", v)} />
          <TxtField label="Apt / unit (optional)" value={info.address2} onChange={(v) => set("address2", v)} />
          <TxtField label="City" value={info.city} onChange={(v) => set("city", v)} />
          <TxtField label="State" value={info.state} onChange={(v) => set("state", v)} placeholder="MN" />
          <TxtField label="ZIP" value={info.zip} onChange={(v) => set("zip", v)} placeholder="55410" />
          <TxtField label="County" value={info.county} onChange={(v) => set("county", v)} placeholder="Hennepin" />
        </Section>

        <Section title="Medicare card">
          <TxtField label="Medicare Beneficiary Identifier (MBI)" value={info.mbi} onChange={(v) => set("mbi", v.toUpperCase())} placeholder="1EG4-TE5-MK73" />
          <TxtField label="Part A effective date" value={info.partAEffective} onChange={(v) => set("partAEffective", v)} placeholder="2024-08-01" />
          <TxtField label="Part B effective date" value={info.partBEffective} onChange={(v) => set("partBEffective", v)} placeholder="2024-08-01" />
        </Section>

        <Section title="Enrollment period">
          <SelectField
            label="Reason you can enroll now"
            value={info.enrollmentPeriod}
            onChange={(v) => set("enrollmentPeriod", v as NonNullable<typeof info.enrollmentPeriod>)}
            options={[
              ["IEP", "Turning 65 (Initial Enrollment Period)"],
              ["AEP", "Annual Enrollment (Oct 15–Dec 7)"],
              ["MA-OEP", "MA Open Enrollment (Jan 1–Mar 31)"],
              ["SEP", "Special Enrollment Period"],
            ]}
          />
          {info.enrollmentPeriod === "SEP" && (
            <TxtField label="SEP reason" value={info.sepReason} onChange={(v) => set("sepReason", v)} placeholder="Moved, lost employer coverage, LIS, etc." />
          )}
          <TxtField label="Requested effective date" value={info.requestedEffective} onChange={(v) => set("requestedEffective", v)} placeholder="2026-01-01" />
        </Section>

        <Section title="Premium payment">
          <SelectField
            label="How would you like to pay premiums?"
            value={info.payment?.method}
            onChange={(v) => setPay("method", v as NonNullable<NonNullable<EnrollmentApplication["info"]>["payment"]>["method"])}
            options={[
              ["monthly_bill", "Monthly paper bill"],
              ["eft", "Bank draft (EFT)"],
              ["card", "Credit / debit card"],
              ["ssa", "Deducted from Social Security"],
            ]}
          />
          {(info.payment?.method === "eft" || info.payment?.method === "card") && (
            <TxtField
              label={info.payment?.method === "eft" ? "Account (last 4)" : "Card (last 4)"}
              value={info.payment?.accountLast4}
              onChange={(v) => setPay("accountLast4", v.replace(/\D/g, "").slice(0, 4))}
              placeholder="4242"
            />
          )}
        </Section>

        {isMedigap && (
          <Section title="Medigap-specific">
            <div className="col-span-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-800">
              <Check className="inline h-3 w-3 mr-1" /> You're in a <b>guaranteed-issue window</b>, so no
              health questions are required. Coverage cannot be denied based on health.
            </div>
            <SelectField
              label="Used tobacco in last 12 months?"
              value={info.tobacco === undefined ? undefined : info.tobacco ? "yes" : "no"}
              onChange={(v) => set("tobacco", v === "yes")}
              options={[["no", "No"], ["yes", "Yes"]]}
            />
            <TxtField label="SSN (last 4)" value={info.ssnLast4} onChange={(v) => set("ssnLast4", v.replace(/\D/g, "").slice(0, 4))} placeholder="1234" />
          </Section>
        )}
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900">
          Still needed: {errors.join(" · ")}
        </div>
      )}

      <NavRow onBack={onBack} disabled={!canSubmit} onNext={() => onSubmit(info)} />
    </div>
  );
}

function DisclosuresStep({
  app,
  onSubmit,
  onBack,
}: {
  app: EnrollmentApplication;
  onSubmit: (a: NonNullable<EnrollmentApplication["attestations"]>) => void;
  onBack: () => void;
}) {
  const items: { key: keyof NonNullable<EnrollmentApplication["attestations"]>; label: string; blurb: string }[] = [
    { key: "tpmo", label: "TPMO disclaimer", blurb: "\"We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area.\"" },
    { key: "sob", label: "Summary of Benefits reviewed", blurb: "I've reviewed (or waived review of) the Summary of Benefits for the plan(s) I'm enrolling in." },
    { key: "stars", label: "CMS Star Rating disclosed", blurb: "I understand the current CMS Star Rating for this plan." },
    { key: "preEnrollment", label: "Pre-enrollment checklist", blurb: "I've reviewed the CMS pre-enrollment checklist covering network, formulary, and cost." },
    { key: "maVsMedigap", label: "MA vs. Medigap acknowledgment", blurb: app.strategy === "medigap-plus-partd" ? "I understand this is a Medicare Supplement (Medigap) policy plus a standalone Part D plan — not Medicare Advantage." : "I understand this is a Medicare Advantage plan, not a Medicare Supplement." },
    { key: "releaseInfo", label: "Release of information", blurb: "I authorize Crinkle Health to share application information with the carrier and CMS to process this enrollment." },
    { key: "truthful", label: "Truthfulness of answers", blurb: "The information I've provided is true and complete to the best of my knowledge." },
  ];
  const [state, setState] = useState<NonNullable<EnrollmentApplication["attestations"]>>(app.attestations ?? {});
  const allChecked = items.every((i) => state[i.key]);
  return (
    <div className="space-y-4">
      <StepHeader
        eyebrow="Step 3"
        title="Disclosures & attestations"
        blurb="CMS requires these acknowledgments before any Medicare enrollment. Review each and check the box."
      />
      <div className="rounded-2xl border border-line bg-white p-2 divide-y divide-line">
        {items.map((it) => (
          <label key={it.key} className="flex items-start gap-3 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!state[it.key]}
              onChange={(e) => setState((s) => ({ ...s, [it.key]: e.target.checked }))}
              className="mt-1"
            />
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink">{it.label}</div>
              <div className="text-xs text-ink/70 mt-0.5 leading-relaxed">{it.blurb}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            const next: NonNullable<EnrollmentApplication["attestations"]> = {};
            items.forEach((i) => { next[i.key] = true; });
            setState(next);
          }}
          className="text-xs font-medium text-[#033592] hover:underline"
        >
          Agree to all
        </button>
      </div>
      <NavRow onBack={onBack} disabled={!allChecked} onNext={() => onSubmit(state)} />
    </div>
  );
}

function SignatureStep({
  app,
  caregiverWrite,
  caregiverName,
  caregiverRelationship,
  defaultName,
  onSubmit,
  onBack,
}: {
  app: EnrollmentApplication;
  caregiverWrite: boolean;
  caregiverName?: string;
  caregiverRelationship?: string;
  defaultName: string;
  onSubmit: (s: NonNullable<EnrollmentApplication["signature"]>) => void;
  onBack: () => void;
}) {
  const [onBehalf, setOnBehalf] = useState(false);
  const [typed, setTyped] = useState(app.signature?.typedName ?? defaultName ?? "");
  const [repName, setRepName] = useState(app.signature?.onBehalfOf?.repName ?? caregiverName ?? "");
  const [relationship, setRelationship] = useState(app.signature?.onBehalfOf?.relationship ?? caregiverRelationship ?? "");
  const [authority, setAuthority] = useState(app.signature?.onBehalfOf?.authorityType ?? "Healthcare proxy");

  const canSign = typed.trim().length >= 2 && (!onBehalf || (repName.trim() && relationship.trim() && authority.trim()));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <StepHeader
        eyebrow="Step 4"
        title="Electronic signature"
        blurb="Type your legal name to sign. Your signature is time-stamped and attached to this application package."
      />
      <div className="rounded-2xl border border-line bg-white p-4 space-y-3">
        {caregiverWrite && (
          <label className="flex items-start gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={onBehalf} onChange={(e) => setOnBehalf(e.target.checked)} className="mt-0.5" />
            <span>I'm signing on behalf of the member as their authorized representative.</span>
          </label>
        )}

        {onBehalf && (
          <div className="rounded-lg bg-[#E5F5F8] border border-[#033592]/15 p-3 space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-[#033592]">Authorized representative</div>
            <TxtField label="Your name" value={repName} onChange={setRepName} />
            <TxtField label="Relationship" value={relationship} onChange={setRelationship} placeholder="Daughter, spouse, etc." />
            <SelectField
              label="Authority type"
              value={authority}
              onChange={setAuthority}
              options={[
                ["Healthcare proxy", "Healthcare proxy"],
                ["Durable POA", "Durable Power of Attorney"],
                ["Court-appointed", "Court-appointed representative"],
                ["Family (informal)", "Family helping informally"],
              ]}
            />
          </div>
        )}

        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-2">
            {onBehalf ? "Member's legal name (as it appears on the Medicare card)" : "Type your legal name to sign"}
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className={inputCls + " text-lg font-serif italic"}
            placeholder="Your full legal name"
          />
        </div>
        <div className="text-[11px] text-ink/60 flex items-center gap-2">
          <PenLine className="h-3 w-3" /> Signed today, {today} · timestamp captured
        </div>
      </div>
      <NavRow
        onBack={onBack}
        disabled={!canSign}
        onNext={() =>
          onSubmit({
            signedAt: Date.now(),
            typedName: typed.trim(),
            ip: "192.0.2.10",
            onBehalfOf: onBehalf ? { repName: repName.trim(), relationship: relationship.trim(), authorityType: authority } : undefined,
          })
        }
        nextLabel="Sign & continue"
      />
    </div>
  );
}

function ReviewStep({
  app,
  onSelfSubmit,
  onHandoff,
  onDownload,
  onBack,
}: {
  app: EnrollmentApplication;
  onSelfSubmit: () => void;
  onHandoff: () => void;
  onDownload: () => void;
  onBack: () => void;
}) {
  const info = app.info ?? {};
  const sig = app.signature;
  const [downloading, setDownloading] = useState(false);
  const doDownload = async () => {
    setDownloading(true);
    // Client-side text "PDF" surrogate for demo
    const lines = [
      `Crinkle Health — Enrollment Application (DEMO)`,
      `Plan: ${app.planName ?? app.planId}${app.pairedPlanName ? ` + ${app.pairedPlanName}` : ""}`,
      `Strategy: ${app.strategy ?? ""}`,
      ``,
      `APPLICANT`,
      `  Name: ${info.legalName ?? ""}`,
      `  DOB: ${info.dob ?? ""}   Sex: ${info.sex ?? ""}`,
      `  ${info.address1 ?? ""} ${info.address2 ?? ""}`,
      `  ${info.city ?? ""}, ${info.state ?? ""} ${info.zip ?? ""} (${info.county ?? ""})`,
      `  Phone: ${info.phone ?? ""}   Email: ${info.email ?? ""}`,
      ``,
      `MEDICARE`,
      `  MBI: ${info.mbi ?? ""}`,
      `  Part A eff: ${info.partAEffective ?? ""}   Part B eff: ${info.partBEffective ?? ""}`,
      `  Enrollment period: ${info.enrollmentPeriod ?? ""} ${info.sepReason ? `(${info.sepReason})` : ""}`,
      `  Requested effective: ${info.requestedEffective ?? ""}`,
      ``,
      `PAYMENT`,
      `  Method: ${info.payment?.method ?? ""}   Last 4: ${info.payment?.accountLast4 ?? ""}`,
      ``,
      `SOA signed: ${app.soa ? new Date(app.soa.signedAt).toISOString() : "—"} by ${app.soa?.typedName ?? ""}`,
      `Attestations: ${Object.entries(app.attestations ?? {}).filter(([, v]) => v).map(([k]) => k).join(", ")}`,
      `Signature: ${sig?.typedName ?? ""} at ${sig ? new Date(sig.signedAt).toISOString() : ""}`,
      sig?.onBehalfOf ? `On behalf of member by ${sig.onBehalfOf.repName} (${sig.onBehalfOf.relationship}, ${sig.onBehalfOf.authorityType})` : "",
      ``,
      `THIS IS A DEMO. NOT A REAL APPLICATION.`,
    ].filter(Boolean).join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crinkle-enrollment-${app.planId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setDownloading(false), 500);
    onDownload();
  };

  return (
    <div className="space-y-4">
      <StepHeader
        eyebrow="Step 5"
        title="Review your application"
        blurb="Everything below will be reviewed with a licensed Crinkle Health advisor before submission."
      />

      <div className="rounded-2xl border border-line bg-white p-4 space-y-3">
        <ReviewGroup title="Coverage">
          <ReviewRow label="Strategy" value={app.strategy ?? ""} />
          <ReviewRow label="Primary plan" value={app.planName ?? app.planId} />
          {app.pairedPlanId && <ReviewRow label="Paired Part D" value={app.pairedPlanName ?? app.pairedPlanId} />}
        </ReviewGroup>

        <ReviewGroup title="You">
          <ReviewRow label="Name" value={info.legalName} />
          <ReviewRow label="DOB" value={info.dob} />
          <ReviewRow label="Address" value={[info.address1, info.address2, `${info.city ?? ""}, ${info.state ?? ""} ${info.zip ?? ""}`].filter(Boolean).join(", ")} />
          <ReviewRow label="Phone" value={info.phone} />
          <ReviewRow label="Email" value={info.email} />
        </ReviewGroup>

        <ReviewGroup title="Medicare">
          <ReviewRow label="MBI" value={info.mbi ? info.mbi.replace(/^(.{4}).*(.{2})$/, "$1••••$2") : ""} />
          <ReviewRow label="Part A / B effective" value={info.partAEffective && info.partBEffective ? `${info.partAEffective} / ${info.partBEffective}` : ""} />
          <ReviewRow label="Enrollment period" value={info.enrollmentPeriod ? `${info.enrollmentPeriod}${info.sepReason ? ` — ${info.sepReason}` : ""}` : ""} />
          <ReviewRow label="Requested effective" value={info.requestedEffective} />
        </ReviewGroup>

        <ReviewGroup title="Payment">
          <ReviewRow label="Method" value={info.payment?.method ? PAYMENT_LABELS[info.payment.method] : ""} />
          {info.payment?.accountLast4 && <ReviewRow label="Last 4" value={`•••• ${info.payment.accountLast4}`} />}
        </ReviewGroup>

        <ReviewGroup title="Signature">
          <ReviewRow label="Signed by" value={sig?.typedName} />
          <ReviewRow label="Signed at" value={sig ? new Date(sig.signedAt).toLocaleString() : ""} />
          {sig?.onBehalfOf && (
            <ReviewRow label="On behalf of member" value={`${sig.onBehalfOf.repName} (${sig.onBehalfOf.relationship}, ${sig.onBehalfOf.authorityType})`} />
          )}
        </ReviewGroup>
      </div>

      <div className="flex flex-wrap gap-2 justify-between items-center">
        <button type="button" onClick={onBack} className={ghostBtn}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={doDownload} disabled={downloading} className={outlineBtn}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </button>
          <button type="button" onClick={onHandoff} className={outlineBtn}>
            <Phone className="h-4 w-4" /> Get a 2nd opinion from licensed agent
          </button>
          <button type="button" onClick={onSelfSubmit} className={primaryBtn}>
            Submit application <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmittedStep({ app, onClose }: { app: EnrollmentApplication; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-600 text-white flex items-center justify-center">
          <Check className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-xl text-[#131F69] mt-3">Application submitted</h3>
        <p className="text-sm text-ink/75 mt-2 leading-relaxed">
          Your self-enrollment for <b>{app.planName ?? app.planId}</b>
          {app.pairedPlanName ? ` + ${app.pairedPlanName}` : ""} has been submitted.
          You'll get a confirmation by email, and your plan will take effect on
          <b> {app.info?.requestedEffective ?? "your requested date"}</b>.
        </p>
        <p className="text-xs text-ink/60 mt-2">Demo only — no real application was filed.</p>
      </div>
      <div className="text-center">
        <button type="button" onClick={onClose} className={primaryBtn + " mx-auto"}>
          Done
        </button>
      </div>
    </div>
  );
}


function HandedOffStep({ app, onClose }: { app: EnrollmentApplication; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-600 text-white flex items-center justify-center">
          <Check className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-xl text-[#131F69] mt-3">Package ready for review</h3>
        <p className="text-sm text-ink/75 mt-2 leading-relaxed">
          Your signed application for <b>{app.planName ?? app.planId}</b>
          {app.pairedPlanName ? ` + ${app.pairedPlanName}` : ""} is queued for
          <b> {app.handoff?.agentName ?? "a licensed advisor"}</b> ({app.handoff?.agentNpn}).
          They'll walk through it with you on the call before anything is filed.
        </p>
      </div>
      <div className="text-center">
        <button type="button" onClick={onClose} className={primaryBtn + " mx-auto"}>
          Done
        </button>
      </div>
    </div>
  );
}

// ---------- Shared bits ----------

const PAYMENT_LABELS: Record<string, string> = {
  monthly_bill: "Monthly paper bill",
  eft: "Bank draft (EFT)",
  card: "Credit / debit card",
  ssa: "Social Security deduction",
};

const inputCls =
  "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#033592]/40";
const primaryBtn =
  "inline-flex items-center gap-2 rounded-full bg-[#131F69] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d1650] disabled:opacity-50 disabled:cursor-not-allowed";
const outlineBtn =
  "inline-flex items-center gap-2 rounded-full border border-[#131F69] px-4 py-2 text-sm font-medium text-[#131F69] hover:bg-[#131F69]/5 disabled:opacity-50";
const ghostBtn =
  "inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm text-ink/70 hover:text-ink hover:bg-ink/5";

function StepHeader({ eyebrow, title, blurb }: { eyebrow: string; title: string; blurb: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[#033592]/70">{eyebrow}</div>
      <h3 className="font-serif text-xl text-[#131F69] leading-snug mt-0.5">{title}</h3>
      <p className="text-sm text-ink/70 mt-1 leading-relaxed">{blurb}</p>
    </div>
  );
}

function NavRow({ onBack, onNext, disabled, nextLabel = "Continue" }: { onBack: () => void; onNext: () => void; disabled?: boolean; nextLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button type="button" onClick={onBack} className={ghostBtn}>
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <button type="button" onClick={onNext} disabled={disabled} className={primaryBtn}>
        {nextLabel} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-[#033592]/70 mb-2">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function TxtField({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-2">{label}</span>
      <input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </label>
  );
}

function SelectField<T extends string>({ label, value, onChange, options }: { label: string; value?: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-2">{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
        <option value="" disabled>Select…</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

function ReviewGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-[#033592]/70 mb-1">{title}</div>
      <div className="divide-y divide-line/60 border-y border-line/60">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <div className="text-muted-2">{label}</div>
      <div className="col-span-2 text-ink">{value || <span className="text-muted-2">—</span>}</div>
    </div>
  );
}
