import { FIELD_LABELS, formatMedication, intakeCompleteness, type Intake, type DoctorEntry, type MedicationEntry } from "@/lib/v3/intake-types";
import { Check, CircleDashed, HelpCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useAutoVerifyProgress } from "@/components/v4/auto-verify-context";
import { docFingerprint, medFingerprint } from "@/components/v4/use-auto-verify-intake";

function statusIcon(c: "captured" | "needs_confirmation" | "missing") {
  if (c === "captured") return <Check className="h-3.5 w-3.5 text-accent" />;
  if (c === "needs_confirmation") return <HelpCircle className="h-3.5 w-3.5 text-amber-600" />;
  return <CircleDashed className="h-3.5 w-3.5 text-muted-2/60" />;
}

function isDoctorArray(v: unknown): v is DoctorEntry[] {
  return Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null && "verification" in (v[0] as object);
}

function isMedicationArray(v: unknown): v is MedicationEntry[] {
  return Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null && "name" in (v[0] as object) && !("verification" in (v[0] as object));
}

function AutoVerifyLine({ label, active }: { label: string; active: boolean }) {
  if (!active) return null;
  return (
    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-accent font-medium">
      <Loader2 className="h-3 w-3 animate-spin" />
      Auto-verifying {label}…
    </div>
  );
}

function renderValue(
  v: unknown,
  ctx: {
    isDocVerifying: (fp: string) => boolean;
    isMedVerifying: (fp: string) => boolean;
  },
): React.ReactNode {
  if (v == null) return "—";
  if (isDoctorArray(v)) {
    return (
      <ul className="space-y-1">
        {v.map((d, i) => {
          const loc = [d.city, d.zip].filter(Boolean).join(" ");
          const meta = [d.specialty, loc, d.clinic].filter(Boolean).join(" · ");
          const autoVerifying = Boolean(d.name && ctx.isDocVerifying(docFingerprint(d)));
          return (
            <li key={i} className="flex items-start gap-1.5">
              {d.verification === "low" && (
                <AlertTriangle className="h-3 w-3 text-amber-600 mt-1 shrink-0" aria-label="Needs more info to verify" />
              )}
              <div>
                <div>{d.name}</div>
                {meta && <div className="text-xs text-muted-2">{meta}</div>}
                <AutoVerifyLine label="against NPPES" active={autoVerifying} />
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
  if (isMedicationArray(v)) {
    return (
      <ul className="space-y-1">
        {v.map((m, i) => {
          const incomplete = !m.strength || !m.doseForm;
          const autoVerifying = Boolean(m.name && ctx.isMedVerifying(medFingerprint(m)));
          return (
            <li key={i} className="flex items-start gap-1.5">
              {incomplete && (
                <AlertTriangle className="h-3 w-3 text-amber-600 mt-1 shrink-0" aria-label="Missing strength or dose form" />
              )}
              <div>
                <div>{formatMedication(m) || m.name}</div>
                {m.frequency && <div className="text-xs text-muted-2">{m.frequency}</div>}
                <AutoVerifyLine label="against RxNorm" active={autoVerifying} />
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  return String(v);
}

export function CaptureSidebar({ intake, loading }: { intake: Intake; loading?: boolean }) {
  const pct = intakeCompleteness(intake);
  const entries = Object.entries(FIELD_LABELS) as [keyof Intake, string][];
  const { isDocVerifying, isMedVerifying } = useAutoVerifyProgress();
  return (
    <aside className="rounded-2xl border border-line bg-paper p-5 sticky top-32">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-serif text-lg">What we've captured</h3>
        {loading && <span className="text-xs text-muted-2 animate-pulse">updating…</span>}
      </div>
      <p className="text-xs text-muted-2 mb-4">Updates after each response.</p>
      <div className="h-1.5 rounded-full bg-canvas overflow-hidden mb-5">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <dl className="space-y-3">
        {entries.map(([k, label]) => {
          const field = intake[k] as { value: unknown; confidence: "captured" | "needs_confirmation" | "missing"; notes?: string | null } | undefined;
          if (!field) return null;
          const rawValue = field.value;
          let display: React.ReactNode;
          if (k === "medicaid") {
            const v = rawValue as "yes" | "no" | "applying" | "unsure" | null;
            const labels: Record<string, string> = {
              yes: "On Medicaid",
              no: "Not on Medicaid",
              applying: "Applying / planning to apply",
              unsure: "Not sure — check eligibility",
            };
            const notes = (field as { notes?: string | null }).notes;
            display = v ? (
              <>
                <div>{labels[v]}</div>
                {notes && <div className="text-xs text-muted-2">{notes}</div>}
              </>
            ) : "—";
          } else {
            display = renderValue(rawValue, { isDocVerifying, isMedVerifying });
          }
          return (
            <div key={k} className="flex items-start gap-2 text-sm">
              <div className="mt-1">{statusIcon(field.confidence)}</div>
              <div className="flex-1">
                <dt className="text-xs uppercase tracking-wide text-muted-2">{label}</dt>
                <dd className={`mt-0.5 ${field.confidence === "missing" ? "text-muted-2/60" : "text-ink"}`}>
                  {display}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </aside>
  );
}
