import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Plus, Trash2, Check } from "lucide-react";
import type { Intake, DoctorEntry, MedicationEntry } from "@/lib/v3/intake-types";

type Props = {
  intake: Intake;
  onChange: (next: Intake) => void;
  onFinish: () => void;
};

type StepKey = "zip" | "doctors" | "medications" | "conditions" | "priorities" | "budget" | "extras";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "zip", label: "ZIP code" },
  { key: "doctors", label: "Doctors" },
  { key: "medications", label: "Medications" },
  { key: "conditions", label: "Health" },
  { key: "priorities", label: "Priorities" },
  { key: "budget", label: "Budget" },
  { key: "extras", label: "Extras" },
];

const PRIORITY_OPTIONS = [
  "Low monthly cost",
  "Keep my doctors",
  "Drug coverage",
  "Dental",
  "Vision",
  "Hearing",
  "Fitness benefit",
  "Low out-of-pocket max",
];

const EXTRA_OPTIONS: { key: "dental" | "vision" | "hearing" | "fitness" | "transportation" | "otc"; label: string }[] = [
  { key: "dental", label: "Dental" },
  { key: "vision", label: "Vision" },
  { key: "hearing", label: "Hearing" },
  { key: "fitness", label: "Fitness / gym" },
  { key: "transportation", label: "Transportation" },
  { key: "otc", label: "OTC allowance" },
];

export function StructuredWizard({ intake, onChange, onFinish }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];
  const pct = Math.round(((stepIdx + 1) / STEPS.length) * 100);

  const back = () => setStepIdx((i) => Math.max(0, i - 1));
  const next = () => {
    if (stepIdx === STEPS.length - 1) onFinish();
    else setStepIdx((i) => i + 1);
  };

  return (
    <div className="rounded-2xl border border-line bg-paper overflow-hidden">
      <div className="px-6 pt-5 pb-3 border-b border-line">
        <div className="flex items-center justify-between text-xs text-muted-2 mb-2">
          <span className="font-medium text-ink">Step {stepIdx + 1} of {STEPS.length} · {step.label}</span>
          <span>{pct}% complete</span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>

      <div className="px-6 py-8 min-h-[420px]">
        {step.key === "zip" && <ZipStep intake={intake} onChange={onChange} />}
        {step.key === "doctors" && <DoctorsStep intake={intake} onChange={onChange} />}
        {step.key === "medications" && <MedicationsStep intake={intake} onChange={onChange} />}
        {step.key === "conditions" && <ConditionsStep intake={intake} onChange={onChange} />}
        {step.key === "priorities" && <PrioritiesStep intake={intake} onChange={onChange} />}
        {step.key === "budget" && <BudgetStep intake={intake} onChange={onChange} />}
        {step.key === "extras" && <ExtrasStep intake={intake} onChange={onChange} />}
      </div>

      <div className="border-t border-line px-6 py-4 flex items-center justify-between bg-canvas/40">
        <Button onClick={back} variant="ghost" disabled={stepIdx === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          {stepIdx < STEPS.length - 1 && (
            <Button onClick={next} variant="ghost" className="text-muted-2">
              Skip
            </Button>
          )}
          <Button onClick={next} className="bg-accent hover:bg-accent-2 text-paper">
            {stepIdx === STEPS.length - 1 ? (
              <>Finish intake <Check className="h-4 w-4 ml-1" /></>
            ) : (
              <>Next <ArrowRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ZipStep({ intake, onChange }: { intake: Intake; onChange: (n: Intake) => void }) {
  return (
    <div className="max-w-md">
      <h2 className="font-serif text-2xl mb-2">What's your ZIP code?</h2>
      <p className="text-sm text-muted-2 mb-6">
        Plan availability and pricing vary by region.
      </p>
      <Input
        value={intake.zip.value ?? ""}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 5);
          onChange({
            ...intake,
            zip: { value: v || null, confidence: v.length === 5 ? "captured" : v ? "needs_confirmation" : "missing" },
          });
        }}
        placeholder="e.g. 78705"
        maxLength={5}
        className="text-lg"
      />
    </div>
  );
}

function DoctorsStep({ intake, onChange }: { intake: Intake; onChange: (n: Intake) => void }) {
  const list = intake.doctors.value;
  const set = (value: DoctorEntry[]) =>
    onChange({ ...intake, doctors: { value, confidence: value.length ? "captured" : "missing" } });
  const update = (i: number, patch: Partial<DoctorEntry>) =>
    set(list.map((d, idx) => (idx === i ? { ...d, ...patch, verification: "high" } : d)));
  return (
    <div>
      <h2 className="font-serif text-2xl mb-2">Which doctors do you want to keep?</h2>
      <p className="text-sm text-muted-2 mb-6">
        Add as many as you like. Name plus specialty or city makes them much easier to match.
      </p>
      <div className="space-y-3">
        {list.map((d, i) => (
          <div key={i} className="rounded-lg border border-line bg-canvas/40 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Input
                placeholder="Doctor name"
                value={d.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="flex-1"
              />
              <button onClick={() => set(list.filter((_, idx) => idx !== i))} className="p-2 text-muted-2 hover:text-ink">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input placeholder="Specialty" value={d.specialty ?? ""} onChange={(e) => update(i, { specialty: e.target.value })} />
              <Input placeholder="Clinic / hospital" value={d.clinic ?? ""} onChange={(e) => update(i, { clinic: e.target.value })} />
              <Input placeholder="City" value={d.city ?? ""} onChange={(e) => update(i, { city: e.target.value })} />
              <Input placeholder="ZIP" value={d.zip ?? ""} maxLength={5} onChange={(e) => update(i, { zip: e.target.value })} />
            </div>
          </div>
        ))}
        <button
          onClick={() => set([...list, { name: "", specialty: "", city: "", zip: "", clinic: "", verification: "unverified" }])}
          className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-2"
        >
          <Plus className="h-4 w-4" /> Add a doctor
        </button>
      </div>
    </div>
  );
}

function MedicationsStep({ intake, onChange }: { intake: Intake; onChange: (n: Intake) => void }) {
  const list = intake.medications.value;
  const set = (value: MedicationEntry[]) =>
    onChange({ ...intake, medications: { value, confidence: value.length ? "captured" : "missing" } });
  const update = (i: number, patch: Partial<MedicationEntry>) =>
    set(list.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  return (
    <div>
      <h2 className="font-serif text-2xl mb-2">What medications do you take?</h2>
      <p className="text-sm text-muted-2 mb-6">
        Strength and form (e.g. "20 mg oral tablet") help us match drug coverage accurately.
      </p>
      <div className="space-y-3">
        {list.map((m, i) => (
          <div key={i} className="rounded-lg border border-line bg-canvas/40 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Input
                placeholder="Medication name"
                value={m.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="flex-1"
              />
              <button onClick={() => set(list.filter((_, idx) => idx !== i))} className="p-2 text-muted-2 hover:text-ink">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input placeholder="Strength (e.g. 20 mg)" value={m.strength ?? ""} onChange={(e) => update(i, { strength: e.target.value })} />
              <Input placeholder="Dose form (e.g. tablet)" value={m.doseForm ?? ""} onChange={(e) => update(i, { doseForm: e.target.value })} />
              <Input placeholder="Frequency (e.g. once daily)" value={m.frequency ?? ""} onChange={(e) => update(i, { frequency: e.target.value })} />
            </div>
          </div>
        ))}
        <button
          onClick={() => set([...list, { name: "", strength: "", doseForm: "", frequency: "" }])}
          className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-2"
        >
          <Plus className="h-4 w-4" /> Add a medication
        </button>
      </div>
    </div>
  );
}

function ConditionsStep({ intake, onChange }: { intake: Intake; onChange: (n: Intake) => void }) {
  return (
    <div className="max-w-lg">
      <h2 className="font-serif text-2xl mb-2">Any health conditions to flag?</h2>
      <p className="text-sm text-muted-2 mb-6">
        Comma-separated. Examples: diabetes, high blood pressure, COPD.
      </p>
      <Input
        value={intake.conditions.value.join(", ")}
        onChange={(e) => {
          const value = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
          onChange({ ...intake, conditions: { value, confidence: value.length ? "captured" : "missing" } });
        }}
        placeholder="diabetes, high blood pressure"
      />
    </div>
  );
}

function PrioritiesStep({ intake, onChange }: { intake: Intake; onChange: (n: Intake) => void }) {
  const value = intake.priorities.value;
  const toggle = (k: string) => {
    const has = value.includes(k);
    const next = has ? value.filter((x) => x !== k) : [...value, k];
    onChange({ ...intake, priorities: { value: next, confidence: next.length ? "captured" : "missing" } });
  };
  return (
    <div>
      <h2 className="font-serif text-2xl mb-2">What matters most?</h2>
      <p className="text-sm text-muted-2 mb-6">Pick everything that applies — you'll rank them later.</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {PRIORITY_OPTIONS.map((p) => {
          const on = value.includes(p);
          return (
            <button
              key={p}
              onClick={() => toggle(p)}
              className={`text-left rounded-lg border p-3 text-sm transition ${
                on ? "bg-ink text-paper border-ink" : "bg-paper border-line hover:border-ink"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BudgetStep({ intake, onChange }: { intake: Intake; onChange: (n: Intake) => void }) {
  const v = intake.budgetSensitivity.value;
  const options: { key: "low" | "medium" | "high"; label: string; desc: string }[] = [
    { key: "low", label: "Cost isn't a concern", desc: "I'll pay for the right coverage." },
    { key: "medium", label: "Balanced", desc: "I want a fair price for solid coverage." },
    { key: "high", label: "Tight budget", desc: "Keep premiums and copays as low as possible." },
  ];
  return (
    <div>
      <h2 className="font-serif text-2xl mb-2">How tight is your budget?</h2>
      <p className="text-sm text-muted-2 mb-6">Helps us weigh premiums vs. benefits.</p>
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onChange({ ...intake, budgetSensitivity: { value: opt.key, confidence: "captured" } })}
            className={`w-full text-left rounded-lg border p-4 transition ${
              v === opt.key ? "bg-ink text-paper border-ink" : "bg-paper border-line hover:border-ink"
            }`}
          >
            <div className="font-medium">{opt.label}</div>
            <div className={`text-sm mt-0.5 ${v === opt.key ? "text-paper/80" : "text-muted-2"}`}>{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ExtrasStep({ intake, onChange }: { intake: Intake; onChange: (n: Intake) => void }) {
  const value = intake.extras.value;
  const toggle = (k: typeof EXTRA_OPTIONS[number]["key"]) => {
    const has = value.includes(k);
    const next = has ? value.filter((x) => x !== k) : [...value, k];
    onChange({ ...intake, extras: { value: next, confidence: next.length ? "captured" : "missing" } });
  };
  return (
    <div>
      <h2 className="font-serif text-2xl mb-2">Any extras that matter?</h2>
      <p className="text-sm text-muted-2 mb-6">Pick anything you'd like a plan to include.</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {EXTRA_OPTIONS.map((opt) => {
          const on = value.includes(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => toggle(opt.key)}
              className={`text-left rounded-lg border p-3 text-sm transition ${
                on ? "bg-ink text-paper border-ink" : "bg-paper border-line hover:border-ink"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
