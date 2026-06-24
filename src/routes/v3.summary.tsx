import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Stepper } from "@/components/v3/app-shell";
import { useSession } from "@/lib/v3/session-store";
import { FIELD_LABELS, type Intake, type DoctorEntry, type MedicationEntry } from "@/lib/v3/intake-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { ArrowRight, Plus, Trash2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/v3/summary")({
  head: () => ({ meta: [{ title: "Your summary — Medicare Compass" }] }),
  component: SummaryPage,
});

function SummaryPage() {
  const { state, update, ready } = useSession();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Intake | null>(null);

  useEffect(() => {
    if (ready && !state.finished) navigate({ to: "/v3" });
    if (ready && !draft) setDraft(state.intake);
  }, [ready, state.finished, state.intake, draft, navigate]);

  if (!draft) {
    return <AppShell step="summary"><p className="text-muted-2">Loading…</p></AppShell>;
  }

  const updateList = (k: keyof Intake, csv: string) => {
    const value = csv.split(",").map((s) => s.trim()).filter(Boolean);
    setDraft({
      ...draft,
      [k]: { value, confidence: value.length ? "captured" : "missing" },
    } as Intake);
  };
  const updateString = (k: keyof Intake, v: string) => {
    setDraft({
      ...draft,
      [k]: { value: v || null, confidence: v ? "captured" : "missing" },
    } as Intake);
  };

  const cont = () => {
    update({ intake: draft });
    navigate({ to: "/v3/priorities" });
  };

  return (
    <AppShell step="summary">
      <Stepper current="summary" />
      <div className="max-w-2xl">
        <h1 className="font-serif text-3xl">Here's what we heard</h1>
        <p className="text-muted-2 mt-2">
          Edit anything that's wrong. This is what we'll use to find your matches.
        </p>

        <div className="mt-8 rounded-2xl border border-line bg-paper p-6 space-y-5">
          <Row label={FIELD_LABELS.reasonForCall}>
            <Input value={draft.reasonForCall.value ?? ""} onChange={(e) => updateString("reasonForCall", e.target.value)} />
          </Row>
          <Row label={FIELD_LABELS.doctors} hint="Name alone isn't enough — add specialty + city/ZIP">
            <DoctorEditor
              doctors={draft.doctors.value}
              onChange={(value: DoctorEntry[]) =>
                setDraft({
                  ...draft,
                  doctors: { value, confidence: value.length ? "captured" : "missing" },
                })
              }
            />
          </Row>
          <Row label={FIELD_LABELS.medications} hint="Name + strength + dose form (e.g. Atorvastatin 20 mg oral tablet)">
            <MedicationEditor
              medications={draft.medications.value}
              onChange={(value: MedicationEntry[]) =>
                setDraft({
                  ...draft,
                  medications: { value, confidence: value.length ? "captured" : "missing" },
                })
              }
            />
          </Row>
          <Row label={FIELD_LABELS.conditions} hint="Comma-separated">
            <Input value={draft.conditions.value.join(", ")} onChange={(e) => updateList("conditions", e.target.value)} />
          </Row>
          <Row label={FIELD_LABELS.priorities} hint="Comma-separated">
            <Input value={draft.priorities.value.join(", ")} onChange={(e) => updateList("priorities", e.target.value)} />
          </Row>
          <Row label={FIELD_LABELS.budgetSensitivity}>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setDraft({ ...draft, budgetSensitivity: { value: b, confidence: "captured" } })}
                  className={`flex-1 py-2 rounded-md text-sm border capitalize ${
                    draft.budgetSensitivity.value === b
                      ? "bg-ink text-paper border-ink"
                      : "bg-paper border-line hover:border-ink"
                  }`}
                >
                  {b === "low" ? "Cost not a concern" : b === "medium" ? "Balanced" : "Tight budget"}
                </button>
              ))}
            </div>
          </Row>
          <Row label={FIELD_LABELS.zip}>
            <Input value={draft.zip.value ?? ""} onChange={(e) => updateString("zip", e.target.value)} maxLength={5} />
          </Row>
        </div>

        <details className="mt-6 rounded-xl border border-line bg-paper p-4 text-sm">
          <summary className="cursor-pointer text-muted-2 hover:text-ink">
            View transcript ({state.messages.filter((m) => m.role === "user").length} of your turns)
          </summary>
          <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
            {state.messages.length === 0 ? (
              <p className="text-muted-2 italic">No transcript captured. If you used voice, the mic may not have picked up your speech.</p>
            ) : (
              state.messages.map((m) => {
                const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                if (!text.trim()) return null;
                return (
                  <p key={m.id} className="leading-relaxed">
                    <span className={`text-xs uppercase tracking-wide mr-2 ${m.role === "user" ? "text-accent" : "text-muted-2"}`}>
                      {m.role === "user" ? "You" : "AI"}
                    </span>
                    {text}
                  </p>
                );
              })
            )}
          </div>
        </details>

        <div className="mt-8 flex justify-end">
          <Button onClick={cont} className="bg-accent hover:bg-accent-2 text-paper">
            Looks good — what matters most <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-sm font-medium text-ink">{label}</label>
        {hint && <span className="text-xs text-muted-2">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function emptyDoctor(): DoctorEntry {
  return { name: "", specialty: "", city: "", zip: "", clinic: "", verification: "unverified" };
}

function computeVerification(d: DoctorEntry): DoctorEntry["verification"] {
  if (!d.name.trim()) return "unverified";
  const hasDetail = [d.specialty, d.city, d.zip, d.clinic].some((v) => v && v.trim());
  return hasDetail ? "high" : "low";
}

function DoctorEditor({
  doctors,
  onChange,
}: {
  doctors: DoctorEntry[];
  onChange: (next: DoctorEntry[]) => void;
}) {
  const list = doctors.length ? doctors : [];
  const update = (i: number, patch: Partial<DoctorEntry>) => {
    const next = list.map((d, idx) => {
      if (idx !== i) return d;
      const merged = { ...d, ...patch };
      return { ...merged, verification: computeVerification(merged) };
    });
    onChange(next);
  };
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  const add = () => onChange([...list, emptyDoctor()]);

  return (
    <div className="space-y-3">
      {list.length === 0 && (
        <p className="text-sm text-muted-2 italic">No doctors captured yet.</p>
      )}
      {list.map((d, i) => (
        <div key={i} className="rounded-lg border border-line bg-canvas/40 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Input
              placeholder="Doctor name (e.g. Dr. Anna Lee)"
              value={d.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove doctor"
              className="p-2 text-muted-2 hover:text-ink"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Specialty (e.g. cardiology)"
              value={d.specialty ?? ""}
              onChange={(e) => update(i, { specialty: e.target.value })}
            />
            <Input
              placeholder="Clinic / hospital / group"
              value={d.clinic ?? ""}
              onChange={(e) => update(i, { clinic: e.target.value })}
            />
            <Input
              placeholder="City"
              value={d.city ?? ""}
              onChange={(e) => update(i, { city: e.target.value })}
            />
            <Input
              placeholder="ZIP"
              value={d.zip ?? ""}
              onChange={(e) => update(i, { zip: e.target.value })}
              maxLength={5}
            />
          </div>
          {d.verification === "low" && d.name.trim() && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Name alone isn't enough to match a provider — add specialty or city/ZIP.
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-2"
      >
        <Plus className="h-4 w-4" /> Add a doctor
      </button>
    </div>
  );
}

function emptyMedication(): MedicationEntry {
  return { name: "", strength: "", doseForm: "", frequency: "" };
}

function MedicationEditor({
  medications,
  onChange,
}: {
  medications: MedicationEntry[];
  onChange: (next: MedicationEntry[]) => void;
}) {
  const list = medications;
  const update = (i: number, patch: Partial<MedicationEntry>) =>
    onChange(list.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  const add = () => onChange([...list, emptyMedication()]);

  return (
    <div className="space-y-3">
      {list.length === 0 && (
        <p className="text-sm text-muted-2 italic">No medications captured yet.</p>
      )}
      {list.map((m, i) => {
        const incomplete = m.name.trim() && (!m.strength?.trim() || !m.doseForm?.trim());
        return (
          <div key={i} className="rounded-lg border border-line bg-canvas/40 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Input
                placeholder="Medication (brand or generic, e.g. Atorvastatin)"
                value={m.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove medication"
                className="p-2 text-muted-2 hover:text-ink"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                placeholder="Strength (e.g. 20 mg)"
                value={m.strength ?? ""}
                onChange={(e) => update(i, { strength: e.target.value })}
              />
              <Input
                placeholder="Dose form (e.g. oral tablet, weekly pen)"
                value={m.doseForm ?? ""}
                onChange={(e) => update(i, { doseForm: e.target.value })}
              />
              <Input
                placeholder="Frequency (e.g. once daily)"
                value={m.frequency ?? ""}
                onChange={(e) => update(i, { frequency: e.target.value })}
              />
            </div>
            {incomplete && (
              <div className="flex items-center gap-1.5 text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Add strength and dose form to identify the product (e.g. "20 mg oral tablet").
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-2"
      >
        <Plus className="h-4 w-4" /> Add a medication
      </button>
    </div>
  );
}
