import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Stepper } from "@/components/v4/app-shell";
import { useSession } from "@/lib/v4/session-store";
import { FIELD_LABELS, type Intake, type DoctorEntry, type MedicationEntry } from "@/lib/v3/intake-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/v4/summary")({
  head: () => ({ meta: [{ title: "Your summary — Medicare Compass v4" }] }),
  component: SummaryPage,
});

function SummaryPage() {
  const { state, update, ready } = useSession();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Intake | null>(null);

  useEffect(() => {
    if (ready && !state.finished) navigate({ to: "/v4" });
    if (ready && !draft) setDraft(state.intake);
  }, [ready, state.finished, state.intake, draft, navigate]);

  if (!draft) {
    return <AppShell step="summary"><p className="text-muted-2">Loading…</p></AppShell>;
  }

  const updateList = (k: keyof Intake, csv: string) => {
    const value = csv.split(",").map((s) => s.trim()).filter(Boolean);
    setDraft({ ...draft, [k]: { value, confidence: value.length ? "captured" : "missing" } } as Intake);
  };
  const updateString = (k: keyof Intake, v: string) =>
    setDraft({ ...draft, [k]: { value: v || null, confidence: v ? "captured" : "missing" } } as Intake);

  const cont = () => {
    update({ intake: draft });
    navigate({ to: "/v4/priorities" });
  };

  return (
    <AppShell step="summary">
      <Stepper current="summary" />
      <div className="max-w-2xl">
        <h1 className="font-serif text-3xl text-white">Here's what we heard</h1>
        <p className="text-white/80 mt-2">Edit anything that's wrong before we score plans.</p>

        <div className="mt-8 rounded-2xl border border-line bg-paper p-6 space-y-5">
          <Row label={FIELD_LABELS.reasonForCall}>
            <Input value={draft.reasonForCall.value ?? ""} onChange={(e) => updateString("reasonForCall", e.target.value)} />
          </Row>
          <Row label={FIELD_LABELS.doctors}>
            <DoctorList
              doctors={draft.doctors.value}
              onChange={(value) => setDraft({ ...draft, doctors: { value, confidence: value.length ? "captured" : "missing" } })}
            />
          </Row>
          <Row label={FIELD_LABELS.medications}>
            <MedList
              meds={draft.medications.value}
              onChange={(value) => setDraft({ ...draft, medications: { value, confidence: value.length ? "captured" : "missing" } })}
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
                    draft.budgetSensitivity.value === b ? "bg-ink text-paper border-ink" : "bg-paper border-line hover:border-ink"
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

function DoctorList({ doctors, onChange }: { doctors: DoctorEntry[]; onChange: (n: DoctorEntry[]) => void }) {
  const update = (i: number, patch: Partial<DoctorEntry>) =>
    onChange(doctors.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  return (
    <div className="space-y-2">
      {doctors.map((d, i) => (
        <div key={i} className="rounded-lg border border-line bg-canvas/40 p-3 space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Name" value={d.name} onChange={(e) => update(i, { name: e.target.value })} className="flex-1" />
            <button onClick={() => onChange(doctors.filter((_, x) => x !== i))} className="p-2 text-muted-2 hover:text-ink">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Specialty" value={d.specialty ?? ""} onChange={(e) => update(i, { specialty: e.target.value })} />
            <Input placeholder="City" value={d.city ?? ""} onChange={(e) => update(i, { city: e.target.value })} />
          </div>
        </div>
      ))}
      <button
        onClick={() => onChange([...doctors, { name: "", specialty: "", city: "", zip: "", clinic: "", verification: "unverified" }])}
        className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-2"
      >
        <Plus className="h-4 w-4" /> Add a doctor
      </button>
    </div>
  );
}

function MedList({ meds, onChange }: { meds: MedicationEntry[]; onChange: (n: MedicationEntry[]) => void }) {
  const update = (i: number, patch: Partial<MedicationEntry>) =>
    onChange(meds.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  return (
    <div className="space-y-2">
      {meds.map((m, i) => (
        <div key={i} className="rounded-lg border border-line bg-canvas/40 p-3 space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Name" value={m.name} onChange={(e) => update(i, { name: e.target.value })} className="flex-1" />
            <button onClick={() => onChange(meds.filter((_, x) => x !== i))} className="p-2 text-muted-2 hover:text-ink">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Strength" value={m.strength ?? ""} onChange={(e) => update(i, { strength: e.target.value })} />
            <Input placeholder="Dose form" value={m.doseForm ?? ""} onChange={(e) => update(i, { doseForm: e.target.value })} />
            <Input placeholder="Frequency" value={m.frequency ?? ""} onChange={(e) => update(i, { frequency: e.target.value })} />
          </div>
        </div>
      ))}
      <button
        onClick={() => onChange([...meds, { name: "", strength: "", doseForm: "", frequency: "" }])}
        className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-2"
      >
        <Plus className="h-4 w-4" /> Add a medication
      </button>
    </div>
  );
}
