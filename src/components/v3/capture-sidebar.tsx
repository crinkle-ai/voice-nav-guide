import { FIELD_LABELS, formatMedication, intakeCompleteness, type Intake, type DoctorEntry, type MedicationEntry } from "@/lib/v3/intake-types";
import { Check, CircleDashed, HelpCircle, AlertTriangle } from "lucide-react";

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

function renderValue(v: unknown): React.ReactNode {
  if (v == null) return "—";
  if (isDoctorArray(v)) {
    return (
      <ul className="space-y-1">
        {v.map((d, i) => {
          const loc = [d.city, d.zip].filter(Boolean).join(" ");
          const meta = [d.specialty, loc, d.clinic].filter(Boolean).join(" · ");
          return (
            <li key={i} className="flex items-start gap-1.5">
              {d.verification === "low" && (
                <AlertTriangle className="h-3 w-3 text-amber-600 mt-1 shrink-0" aria-label="Needs more info to verify" />
              )}
              <div>
                <div>{d.name}</div>
                {meta && <div className="text-xs text-muted-2">{meta}</div>}
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
          return (
            <li key={i} className="flex items-start gap-1.5">
              {incomplete && (
                <AlertTriangle className="h-3 w-3 text-amber-600 mt-1 shrink-0" aria-label="Missing strength or dose form" />
              )}
              <div>
                <div>{formatMedication(m) || m.name}</div>
                {m.frequency && <div className="text-xs text-muted-2">{m.frequency}</div>}
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
          const field = intake[k];
          return (
            <div key={k} className="flex items-start gap-2 text-sm">
              <div className="mt-1">{statusIcon(field.confidence)}</div>
              <div className="flex-1">
                <dt className="text-xs uppercase tracking-wide text-muted-2">{label}</dt>
                <dd className={`mt-0.5 ${field.confidence === "missing" ? "text-muted-2/60" : "text-ink"}`}>
                  {renderValue((field as { value: unknown }).value)}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </aside>
  );
}
