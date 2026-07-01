import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSession, type EnrollmentApplication, type EnrollmentStep } from "@/lib/v4/session-store";
import { useAuth } from "@/lib/v4/auth-store";
import {
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
  "info",
  "disclosures",
  "signature",
  "review",
  "submitted",
  "handed_off",
];

const STEP_LABELS: Record<EnrollmentStep, string> = {
  intro: "Start",
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
          {app.step === "intro" && <IntroStep app={app} onNext={() => goto("info")} products={products} />}
          {app.step === "info" && (
            <InfoStep
              app={app}
              isMedigap={isMedigap}
              isMA={!isMedigap}
              onSubmit={(info) => {
                patch({ info });
                goto("disclosures");
              }}
              onBack={() => goto("intro")}
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
          I'll walk you through: your Medicare info, the CMS-required disclosures,
          and a signature. At the end, a licensed Crinkle Health advisor reviews
          it with you before it's submitted — nothing is filed until you say so.
        </p>
        <ul className="mt-3 text-sm text-ink/75 space-y-1.5">
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



function InfoStep({
  app,
  isMedigap,
  isMA,
  onSubmit,
  onBack,
}: {
  app: EnrollmentApplication;
  isMedigap: boolean;
  isMA: boolean;
  onSubmit: (info: NonNullable<EnrollmentApplication["info"]>) => void;
  onBack: () => void;
}) {
  const [info, setInfo] = useState<NonNullable<EnrollmentApplication["info"]>>(app.info ?? {});
  const set = <K extends keyof NonNullable<EnrollmentApplication["info"]>>(k: K, v: NonNullable<EnrollmentApplication["info"]>[K]) =>
    setInfo((p) => ({ ...p, [k]: v }));
  const setPay = <K extends keyof NonNullable<NonNullable<EnrollmentApplication["info"]>["payment"]>>(k: K, v: NonNullable<NonNullable<EnrollmentApplication["info"]>["payment"]>[K]) =>
    setInfo((p) => ({ ...p, payment: { ...(p.payment ?? {}), [k]: v } }));
  const setEc = (k: "name" | "relationship" | "phone", v: string) =>
    setInfo((p) => ({ ...p, emergencyContact: { ...(p.emergencyContact ?? {}), [k]: v } }));
  const setPcp = (k: "name" | "npi" | "currentPatient", v: string | boolean) =>
    setInfo((p) => ({ ...p, pcp: { ...(p.pcp ?? {}), [k]: v } as NonNullable<EnrollmentApplication["info"]>["pcp"] }));

  const mbiValid = !info.mbi || MBI_RE.test((info.mbi || "").trim());
  const ssnValid = !info.ssnFull || /^\d{3}-?\d{2}-?\d{4}$/.test(info.ssnFull);
  const routingValid = !info.payment?.routingNumber || /^\d{9}$/.test(info.payment.routingNumber);
  const isDsnp = app.strategy === "dsnp";

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!info.legalName) e.push("Legal name");
    if (!info.dob || !DATE_RE.test(info.dob)) e.push("Date of birth (YYYY-MM-DD)");
    if (!info.sex) e.push("Sex");
    if (!info.address1) e.push("Street address");
    if (!info.city) e.push("City");
    if (!info.state) e.push("State");
    if (!info.zip) e.push("ZIP");
    if (info.mailingSameAsResidence === false) {
      if (!info.mailingAddress1) e.push("Mailing street");
      if (!info.mailingCity) e.push("Mailing city");
      if (!info.mailingState) e.push("Mailing state");
      if (!info.mailingZip) e.push("Mailing ZIP");
    }
    if (!info.phone) e.push("Phone");
    if (!info.email) e.push("Email");
    if (!info.emergencyContact?.name) e.push("Emergency contact name");
    if (!info.emergencyContact?.phone) e.push("Emergency contact phone");
    if (!info.mbi) e.push("MBI");
    else if (!mbiValid) e.push("MBI format (e.g. 1EG4-TE5-MK73)");
    if (!info.partAEffective) e.push("Part A effective date");
    if (!info.partBEffective) e.push("Part B effective date");
    if (!info.oevPreference) e.push("OEV contact preference");
    if (!info.enrollmentPeriod) e.push("Enrollment period");
    if (!info.requestedEffective) e.push("Requested effective date");
    // Eligibility
    if (!info.esrd) e.push("ESRD question");
    if (!info.otherCoverage || info.otherCoverage.length === 0) e.push("Other coverage");
    if (!info.lis) e.push("Extra Help (LIS) question");
    if (!info.institutional) e.push("Living situation");
    if (isDsnp && !info.medicaidId) e.push("Medicaid ID (required for D-SNP)");
    if (info.otherCoverage?.includes("medicaid") && !info.medicaidId) e.push("Medicaid ID");
    // MA-only
    if (isMA && !info.pcp?.name) e.push("Primary care provider");
    if (isMA && !info.pcp?.npi) e.push("PCP NPI");
    // Payment
    if (!info.payment?.method) e.push("Payment method");
    if (info.payment?.method === "eft") {
      if (!routingValid) e.push("Routing # (9 digits)");
      if (!info.payment?.routingNumber) e.push("Routing #");
      if (!info.payment?.accountNumber) e.push("Account #");
    }
    if (info.payment?.method === "card") {
      if (!info.payment?.cardPan || info.payment.cardPan.replace(/\D/g, "").length < 15) e.push("Card number");
      if (!info.payment?.cardExp) e.push("Card exp (MM/YY)");
      if (!info.payment?.cardCvv) e.push("Card CVV");
      if (!info.payment?.cardBillingZip) e.push("Card billing ZIP");
    }
    // Medigap
    if (isMedigap) {
      if (info.tobacco === undefined) e.push("Tobacco use (last 12 mo)");
      if (!info.ssnFull) e.push("Full SSN");
      else if (!ssnValid) e.push("SSN format (XXX-XX-XXXX)");
      if (!info.giReason) e.push("Guaranteed-issue reason");
      if (!info.giLossDate) e.push("Loss-of-coverage date");
      if (info.replacing === undefined) e.push("Replacing existing coverage? (yes/no)");
      if (info.replacing && !info.replacePriorCarrier) e.push("Prior carrier");
      if (info.householdDiscount === undefined) e.push("Household discount question");
      if (!info.heightIn) e.push("Height");
      if (!info.weightLb) e.push("Weight");
    }
    return e;
  }, [info, mbiValid, ssnValid, routingValid, isMedigap, isMA, isDsnp]);

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
          <TxtField label="Preferred language (optional)" value={info.preferredLanguage} onChange={(v) => set("preferredLanguage", v)} placeholder="English" />
          <TxtField label="Race (optional, CMS-collected)" value={info.race} onChange={(v) => set("race", v)} />
          <TxtField label="Ethnicity (optional, CMS-collected)" value={info.ethnicity} onChange={(v) => set("ethnicity", v)} />
        </Section>

        <Section title="Permanent residence (no PO box)">
          <TxtField label="Street address" value={info.address1} onChange={(v) => set("address1", v)} />
          <TxtField label="Apt / unit (optional)" value={info.address2} onChange={(v) => set("address2", v)} />
          <TxtField label="City" value={info.city} onChange={(v) => set("city", v)} />
          <TxtField label="State" value={info.state} onChange={(v) => set("state", v)} placeholder="MN" />
          <TxtField label="ZIP" value={info.zip} onChange={(v) => set("zip", v)} placeholder="55410" />
          <TxtField label="County" value={info.county} onChange={(v) => set("county", v)} placeholder="Hennepin" />
        </Section>

        <div>
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={info.mailingSameAsResidence !== false}
              onChange={(e) => set("mailingSameAsResidence", e.target.checked)}
            />
            <span>Mailing address is the same as my permanent residence</span>
          </label>
          {info.mailingSameAsResidence === false && (
            <div className="mt-2">
              <Section title="Mailing address">
                <TxtField label="Street" value={info.mailingAddress1} onChange={(v) => set("mailingAddress1", v)} />
                <TxtField label="Apt / unit" value={info.mailingAddress2} onChange={(v) => set("mailingAddress2", v)} />
                <TxtField label="City" value={info.mailingCity} onChange={(v) => set("mailingCity", v)} />
                <TxtField label="State" value={info.mailingState} onChange={(v) => set("mailingState", v)} />
                <TxtField label="ZIP" value={info.mailingZip} onChange={(v) => set("mailingZip", v)} />
              </Section>
            </div>
          )}
        </div>

        <Section title="Emergency contact">
          <TxtField label="Name" value={info.emergencyContact?.name} onChange={(v) => setEc("name", v)} />
          <TxtField label="Relationship" value={info.emergencyContact?.relationship} onChange={(v) => setEc("relationship", v)} placeholder="Daughter, spouse, etc." />
          <TxtField label="Phone" value={info.emergencyContact?.phone} onChange={(v) => setEc("phone", v)} />
        </Section>

        <Section title="Medicare card">
          <TxtField label="Medicare Beneficiary Identifier (MBI)" value={info.mbi} onChange={(v) => set("mbi", v.toUpperCase())} placeholder="1EG4-TE5-MK73" />
          <TxtField label="Part A effective date" value={info.partAEffective} onChange={(v) => set("partAEffective", v)} placeholder="2024-08-01" />
          <TxtField label="Part B effective date" value={info.partBEffective} onChange={(v) => set("partBEffective", v)} placeholder="2024-08-01" />
          <TxtField label="SSN (full, XXX-XX-XXXX)" value={info.ssnFull} onChange={(v) => set("ssnFull", v)} placeholder="123-45-1930" />
          <SelectField
            label="Outbound Enrollment Verification (OEV) — how should CMS contact you?"
            value={info.oevPreference}
            onChange={(v) => set("oevPreference", v as NonNullable<typeof info.oevPreference>)}
            options={[["phone","Phone"],["email","Email"],["mail","Mail"]]}
          />
        </Section>

        <Section title="Eligibility & other coverage">
          <SelectField
            label="Do you have End-Stage Renal Disease (ESRD)?"
            value={info.esrd}
            onChange={(v) => set("esrd", v as NonNullable<typeof info.esrd>)}
            options={[["no","No"],["yes","Yes"],["transplant_recovery","In kidney-transplant recovery"]]}
          />
          <SelectField
            label="Do you receive Extra Help (LIS) for prescription costs?"
            value={info.lis}
            onChange={(v) => set("lis", v as NonNullable<typeof info.lis>)}
            options={[["no","No"],["yes","Yes"],["unsure","Not sure"]]}
          />
          <SelectField
            label="Where do you live?"
            value={info.institutional}
            onChange={(v) => set("institutional", v as NonNullable<typeof info.institutional>)}
            options={[["community","In the community (home)"],["ltc","Long-term care facility"],["hcbs","Receiving home & community-based services"]]}
          />
          <SelectField
            label="Medicaid status"
            value={info.medicaidStatus}
            onChange={(v) => set("medicaidStatus", v as NonNullable<typeof info.medicaidStatus>)}
            options={[["no","No Medicaid"],["full","Full Medicaid"],["partial","Partial (share of cost)"],["qmb","QMB"],["slmb","SLMB"]]}
          />
          {(isDsnp || info.otherCoverage?.includes("medicaid") || (info.medicaidStatus && info.medicaidStatus !== "no")) && (
            <TxtField label="Medicaid ID" value={info.medicaidId} onChange={(v) => set("medicaidId", v)} />
          )}
          <div className="col-span-1 sm:col-span-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-2">Other coverage today (select all that apply)</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(["none","employer","union","cobra","va","tricare","ihs","medicaid","other"] as const).map((c) => {
                const checked = info.otherCoverage?.includes(c) ?? false;
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => {
                      const cur = new Set(info.otherCoverage ?? []);
                      if (checked) cur.delete(c); else {
                        if (c === "none") { cur.clear(); cur.add("none"); }
                        else { cur.delete("none"); cur.add(c); }
                      }
                      set("otherCoverage", Array.from(cur));
                    }}
                    className={`rounded-full px-2.5 py-1 text-xs border ${checked ? "bg-[#131F69] text-white border-[#131F69]" : "bg-white text-ink border-line"}`}
                  >
                    {({ none:"None", employer:"Employer group", union:"Union / retiree", cobra:"COBRA", va:"VA", tricare:"TRICARE", ihs:"Indian Health", medicaid:"Medicaid", other:"Other" } as Record<string,string>)[c]}
                  </button>
                );
              })}
            </div>
          </div>
          {info.otherCoverage && info.otherCoverage.some((c) => c !== "none") && (
            <>
              <TxtField label="Other coverage carrier" value={info.otherCoverageCarrier} onChange={(v) => set("otherCoverageCarrier", v)} />
              <TxtField label="Other coverage policy #" value={info.otherCoveragePolicy} onChange={(v) => set("otherCoveragePolicy", v)} />
            </>
          )}
        </Section>

        {isMA && (
          <Section title="Primary care provider (required for MA)">
            <TxtField label="PCP name" value={info.pcp?.name} onChange={(v) => setPcp("name", v)} />
            <TxtField label="PCP NPI (10 digits)" value={info.pcp?.npi} onChange={(v) => setPcp("npi", v.replace(/\D/g,"").slice(0,10))} />
            <SelectField
              label="Currently a patient?"
              value={info.pcp?.currentPatient === undefined ? undefined : info.pcp.currentPatient ? "yes" : "no"}
              onChange={(v) => setPcp("currentPatient", v === "yes")}
              options={[["yes","Yes"],["no","No"]]}
            />
          </Section>
        )}

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
          {info.payment?.method === "eft" && (
            <>
              <TxtField label="Routing # (9 digits)" value={info.payment?.routingNumber} onChange={(v) => setPay("routingNumber", v.replace(/\D/g,"").slice(0,9))} placeholder="091000019" />
              <TxtField label="Account #" value={info.payment?.accountNumber} onChange={(v) => { const clean = v.replace(/\D/g,""); setPay("accountNumber", clean); setPay("accountLast4", clean.slice(-4)); }} placeholder="000123456789" />
            </>
          )}
          {info.payment?.method === "card" && (
            <>
              <TxtField label="Card number" value={info.payment?.cardPan} onChange={(v) => { const clean = v.replace(/\D/g,"").slice(0,19); setPay("cardPan", clean); setPay("accountLast4", clean.slice(-4)); }} placeholder="4242 4242 4242 4242" />
              <TxtField label="Exp (MM/YY)" value={info.payment?.cardExp} onChange={(v) => setPay("cardExp", v)} placeholder="12/28" />
              <TxtField label="CVV" value={info.payment?.cardCvv} onChange={(v) => setPay("cardCvv", v.replace(/\D/g,"").slice(0,4))} />
              <TxtField label="Billing ZIP" value={info.payment?.cardBillingZip} onChange={(v) => setPay("cardBillingZip", v.replace(/\D/g,"").slice(0,5))} />
            </>
          )}
          {info.payment?.method === "ssa" && (
            <div className="col-span-1 sm:col-span-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900">
              Social Security deductions typically take <b>1–3 months</b> to start. You may receive a bill in the meantime.
            </div>
          )}
          <div className="col-span-1 sm:col-span-2 text-[11px] text-ink/60">
            In production, payment details are tokenized by the carrier's payment vault and are never stored on our servers.
          </div>
        </Section>

        {isMedigap && (
          <Section title="Medigap-specific">
            <div className="col-span-1 sm:col-span-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-800">
              <Check className="inline h-3 w-3 mr-1" /> You're in a <b>guaranteed-issue window</b>, so no
              health questions are required. Coverage cannot be denied based on health.
            </div>
            <SelectField
              label="Guaranteed-issue reason"
              value={info.giReason}
              onChange={(v) => set("giReason", v)}
              options={[
                ["turning_65", "Turning 65 open enrollment"],
                ["loss_employer", "Losing employer/retiree coverage"],
                ["ma_termination", "MA plan leaving service area / terminating"],
                ["ma_trial", "Trial right (dropped Medigap for MA, going back within 12 mo)"],
                ["moved", "Moved out of plan area"],
                ["other_gi", "Other CMS-defined GI event"],
              ]}
            />
            <TxtField label="Loss-of-coverage date" value={info.giLossDate} onChange={(v) => set("giLossDate", v)} placeholder="2025-12-31" />
            <div className="col-span-1 sm:col-span-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-2">Supporting document (termination letter)</label>
              <input
                type="file"
                onChange={(e) => set("giDocName", e.target.files?.[0]?.name)}
                className="mt-1 block w-full text-xs text-ink/70 file:mr-3 file:rounded-full file:border-0 file:bg-[#131F69] file:text-white file:px-3 file:py-1.5 file:text-xs file:cursor-pointer"
              />
              {info.giDocName && <div className="text-[11px] text-emerald-700 mt-1">Attached: {info.giDocName}</div>}
            </div>
            <SelectField
              label="Replacing existing Medigap or MA coverage?"
              value={info.replacing === undefined ? undefined : info.replacing ? "yes" : "no"}
              onChange={(v) => set("replacing", v === "yes")}
              options={[["no","No"],["yes","Yes"]]}
            />
            {info.replacing && (
              <>
                <TxtField label="Prior carrier" value={info.replacePriorCarrier} onChange={(v) => set("replacePriorCarrier", v)} />
                <TxtField label="Prior policy #" value={info.replacePriorPolicy} onChange={(v) => set("replacePriorPolicy", v)} />
                <TxtField label="Planned termination date" value={info.replaceTerminationDate} onChange={(v) => set("replaceTerminationDate", v)} placeholder="2025-12-31" />
              </>
            )}
            <SelectField
              label="Anyone else in your household with this carrier?"
              value={info.householdDiscount === undefined ? undefined : info.householdDiscount ? "yes" : "no"}
              onChange={(v) => set("householdDiscount", v === "yes")}
              options={[["no","No"],["yes","Yes"]]}
            />
            <SelectField
              label="Used tobacco in last 12 months?"
              value={info.tobacco === undefined ? undefined : info.tobacco ? "yes" : "no"}
              onChange={(v) => set("tobacco", v === "yes")}
              options={[["no", "No"], ["yes", "Yes"]]}
            />
            <TxtField label="Height (inches)" value={info.heightIn} onChange={(v) => set("heightIn", v.replace(/\D/g,"").slice(0,3))} placeholder="64" />
            <TxtField label="Weight (lb)" value={info.weightLb} onChange={(v) => set("weightLb", v.replace(/\D/g,"").slice(0,3))} placeholder="142" />
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
  const isMedigap = app.strategy === "medigap-plus-partd";
  const isMA = !isMedigap;
  const info = app.info ?? {};
  const items: { key: keyof NonNullable<EnrollmentApplication["attestations"]>; label: string; blurb: string }[] = [
    { key: "tpmo", label: "TPMO disclaimer", blurb: "\"We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area.\"" },
    { key: "sob", label: "Summary of Benefits reviewed", blurb: "I've reviewed (or waived review of) the Summary of Benefits for the plan(s) I'm enrolling in." },
    { key: "stars", label: "CMS Star Rating disclosed", blurb: "I understand the current CMS Star Rating for this plan." },
    { key: "preEnrollment", label: "Pre-enrollment checklist", blurb: "I've reviewed the CMS pre-enrollment checklist covering network, formulary, and cost." },
    { key: "maVsMedigap", label: "MA vs. Medigap acknowledgment", blurb: isMedigap ? "I understand this is a Medicare Supplement (Medigap) policy plus a standalone Part D plan — not Medicare Advantage." : "I understand this is a Medicare Advantage plan, not a Medicare Supplement." },
    ...(isMA ? [{ key: "maNetwork" as const, label: "Provider network acknowledgment", blurb: "I understand I must use in-network providers except for emergencies or urgent care; out-of-network care may not be covered." }] : []),
    ...(info.lis === "yes" || info.lis === "unsure" ? [{ key: "lisAttest" as const, label: "Extra Help (LIS) attestation", blurb: "I understand my premium and copays may be lower due to Low Income Subsidy, and I'll notify the plan if my LIS status changes." }] : []),
    ...(info.esrd === "yes" ? [{ key: "esrdAck" as const, label: "ESRD acknowledgment", blurb: "I understand ESRD may affect plan eligibility and I've discussed my options with a licensed agent." }] : []),
    { key: "oevConsent", label: "Outbound Enrollment Verification (OEV) consent", blurb: "I consent to being contacted by the plan/CMS to verify my enrollment before it's finalized." },
    { key: "electronicDelivery", label: "Electronic delivery consent", blurb: "I agree to receive the Annual Notice of Change (ANOC), Evidence of Coverage (EOC), and formulary electronically." },
    ...(isMedigap && info.replacing ? [{ key: "medigapReplacement" as const, label: "Medigap replacement notice", blurb: "I've received and read the Medicare Supplement replacement notice comparing my current and new coverage." }] : []),
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
    const mask = (s?: string) => (s ? `•••• ${s.slice(-4)}` : "");
    const mailing = info.mailingSameAsResidence === false
      ? `  ${info.mailingAddress1 ?? ""} ${info.mailingAddress2 ?? ""}, ${info.mailingCity ?? ""}, ${info.mailingState ?? ""} ${info.mailingZip ?? ""}`
      : `  (same as residence)`;
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
      `MAILING`,
      mailing,
      `  Phone: ${info.phone ?? ""}   Email: ${info.email ?? ""}`,
      `  Language: ${info.preferredLanguage ?? ""}   Race: ${info.race ?? ""}   Ethnicity: ${info.ethnicity ?? ""}`,
      ``,
      `EMERGENCY CONTACT`,
      `  ${info.emergencyContact?.name ?? ""} (${info.emergencyContact?.relationship ?? ""}) ${info.emergencyContact?.phone ?? ""}`,
      ``,
      `MEDICARE`,
      `  MBI: ${info.mbi ?? ""}`,
      `  Part A eff: ${info.partAEffective ?? ""}   Part B eff: ${info.partBEffective ?? ""}`,
      `  SSN: ${info.ssnFull ? "***-**-" + info.ssnFull.slice(-4) : ""}`,
      `  OEV pref: ${info.oevPreference ?? ""}`,
      `  Enrollment period: ${info.enrollmentPeriod ?? ""} ${info.sepReason ? `(${info.sepReason})` : ""}`,
      `  Requested effective: ${info.requestedEffective ?? ""}`,
      ``,
      `ELIGIBILITY & OTHER COVERAGE`,
      `  ESRD: ${info.esrd ?? ""}   LIS/Extra Help: ${info.lis ?? ""}   Living: ${info.institutional ?? ""}`,
      `  Medicaid: ${info.medicaidStatus ?? ""}${info.medicaidId ? ` (ID: ${info.medicaidId})` : ""}`,
      `  Other coverage: ${(info.otherCoverage ?? []).join(", ")}${info.otherCoverageCarrier ? ` — ${info.otherCoverageCarrier} #${info.otherCoveragePolicy ?? ""}` : ""}`,
      ``,
      info.pcp?.name ? `PRIMARY CARE PROVIDER\n  ${info.pcp.name}  NPI: ${info.pcp.npi ?? ""}  Current patient: ${info.pcp.currentPatient ? "yes" : "no"}\n` : "",
      `PAYMENT`,
      `  Method: ${info.payment?.method ?? ""}`,
      info.payment?.method === "eft" ? `  Routing: ${info.payment?.routingNumber ?? ""}  Account: ${mask(info.payment?.accountNumber)}` : "",
      info.payment?.method === "card" ? `  Card: ${mask(info.payment?.cardPan)}  Exp: ${info.payment?.cardExp ?? ""}  Billing ZIP: ${info.payment?.cardBillingZip ?? ""}` : "",
      ``,
      app.strategy === "medigap-plus-partd" ? `MEDIGAP\n  GI reason: ${info.giReason ?? ""}  Loss date: ${info.giLossDate ?? ""}\n  Replacing: ${info.replacing ? `yes (${info.replacePriorCarrier ?? ""} #${info.replacePriorPolicy ?? ""}, term ${info.replaceTerminationDate ?? ""})` : "no"}\n  Household discount: ${info.householdDiscount ? "yes" : "no"}\n  Tobacco: ${info.tobacco ? "yes" : "no"}   Height: ${info.heightIn ?? ""}in  Weight: ${info.weightLb ?? ""}lb\n  Doc attached: ${info.giDocName ?? "—"}\n` : "",
      `SOA signed: ${app.soa ? new Date(app.soa.signedAt).toISOString() : "—"} by ${app.soa?.typedName ?? ""}`,
      `  Appointment: ${app.soa?.appointmentDate ?? ""} ${app.soa?.appointmentWindow ?? ""}`,
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

  const isMedigap = app.strategy === "medigap-plus-partd";

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
          <ReviewRow label="Residence" value={[info.address1, info.address2, `${info.city ?? ""}, ${info.state ?? ""} ${info.zip ?? ""}`].filter(Boolean).join(", ")} />
          {info.mailingSameAsResidence === false && (
            <ReviewRow label="Mailing" value={[info.mailingAddress1, `${info.mailingCity ?? ""}, ${info.mailingState ?? ""} ${info.mailingZip ?? ""}`].filter(Boolean).join(", ")} />
          )}
          <ReviewRow label="Phone" value={info.phone} />
          <ReviewRow label="Email" value={info.email} />
          <ReviewRow label="Emergency contact" value={info.emergencyContact?.name ? `${info.emergencyContact.name}${info.emergencyContact.relationship ? ` (${info.emergencyContact.relationship})` : ""} · ${info.emergencyContact.phone ?? ""}` : ""} />
        </ReviewGroup>

        <ReviewGroup title="Medicare">
          <ReviewRow label="MBI" value={info.mbi ? info.mbi.replace(/^(.{4}).*(.{2})$/, "$1••••$2") : ""} />
          <ReviewRow label="Part A / B effective" value={info.partAEffective && info.partBEffective ? `${info.partAEffective} / ${info.partBEffective}` : ""} />
          <ReviewRow label="SSN" value={info.ssnFull ? `***-**-${info.ssnFull.slice(-4)}` : ""} />
          <ReviewRow label="OEV preference" value={info.oevPreference} />
          <ReviewRow label="Enrollment period" value={info.enrollmentPeriod ? `${info.enrollmentPeriod}${info.sepReason ? ` — ${info.sepReason}` : ""}` : ""} />
          <ReviewRow label="Requested effective" value={info.requestedEffective} />
        </ReviewGroup>

        <ReviewGroup title="Eligibility & other coverage">
          <ReviewRow label="ESRD" value={info.esrd} />
          <ReviewRow label="Extra Help (LIS)" value={info.lis} />
          <ReviewRow label="Living situation" value={info.institutional} />
          <ReviewRow label="Medicaid" value={info.medicaidStatus ? `${info.medicaidStatus}${info.medicaidId ? ` (ID: ${info.medicaidId})` : ""}` : ""} />
          <ReviewRow label="Other coverage" value={(info.otherCoverage ?? []).join(", ") || "None"} />
        </ReviewGroup>

        {info.pcp?.name && (
          <ReviewGroup title="Primary care provider">
            <ReviewRow label="Provider" value={info.pcp.name} />
            <ReviewRow label="NPI" value={info.pcp.npi} />
            <ReviewRow label="Current patient" value={info.pcp.currentPatient ? "Yes" : "No"} />
          </ReviewGroup>
        )}

        <ReviewGroup title="Payment">
          <ReviewRow label="Method" value={info.payment?.method ? PAYMENT_LABELS[info.payment.method] : ""} />
          {info.payment?.method === "eft" && <ReviewRow label="Bank" value={`Routing ${info.payment.routingNumber ?? ""} · Acct •••• ${(info.payment.accountNumber ?? "").slice(-4)}`} />}
          {info.payment?.method === "card" && <ReviewRow label="Card" value={`•••• ${(info.payment.cardPan ?? "").slice(-4)} · Exp ${info.payment.cardExp ?? ""}`} />}
        </ReviewGroup>

        {isMedigap && (
          <ReviewGroup title="Medigap">
            <ReviewRow label="GI reason" value={info.giReason} />
            <ReviewRow label="Loss-of-coverage" value={info.giLossDate} />
            <ReviewRow label="Replacing coverage" value={info.replacing ? `Yes — ${info.replacePriorCarrier ?? ""} #${info.replacePriorPolicy ?? ""}` : "No"} />
            <ReviewRow label="Household discount" value={info.householdDiscount ? "Yes" : "No"} />
            <ReviewRow label="Tobacco (12 mo)" value={info.tobacco ? "Yes" : "No"} />
            <ReviewRow label="Height / Weight" value={info.heightIn && info.weightLb ? `${info.heightIn}in / ${info.weightLb}lb` : ""} />
            {info.giDocName && <ReviewRow label="Doc attached" value={info.giDocName} />}
          </ReviewGroup>
        )}

        <ReviewGroup title="Scope of Appointment">
          <ReviewRow label="Signed by" value={app.soa?.typedName} />
          <ReviewRow label="Appointment" value={app.soa?.appointmentDate ? `${app.soa.appointmentDate} · ${app.soa.appointmentWindow ?? ""}` : ""} />
          <ReviewRow label="Writing agent" value={`Self-service (no writing agent) · Crinkle Health`} />
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
