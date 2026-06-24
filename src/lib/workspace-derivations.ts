import type { Intake } from "./v3/intake-types";
import { CRITICAL_FIELDS, FIELD_LABELS, intakeCompleteness } from "./v3/intake-types";

export type DerivedPlanFilter = { id: string; label: string; hint: string };
export type DerivedQuestion = { id: string; text: string };
export type DerivedRouteStep = {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  to?: string;
};

export function hasAnyIntake(intake: Intake): boolean {
  return intakeCompleteness(intake) > 0;
}

export function deriveNarrative(intake: Intake): string | null {
  const r = intake.reasonForCall.value?.trim();
  const priorities = intake.priorities.value;
  const docCount = intake.doctors.value.length;
  const medCount = intake.medications.value.length;
  const zip = intake.zip.value;

  if (!r && priorities.length === 0 && docCount === 0 && medCount === 0 && !zip) {
    return null;
  }

  const bits: string[] = [];
  if (r) bits.push(`Here's what I'm hearing — ${r}`);
  if (priorities.length) bits.push(`What matters most: ${priorities.slice(0, 3).join(", ")}.`);
  if (docCount) bits.push(`${docCount} doctor${docCount === 1 ? "" : "s"} to keep in network.`);
  if (medCount) bits.push(`${medCount} prescription${medCount === 1 ? "" : "s"} to price.`);
  if (zip) bits.push(`Shopping in ${zip}.`);
  return bits.join(" ");
}

export function derivePlanFilters(intake: Intake): DerivedPlanFilter[] {
  const out: DerivedPlanFilter[] = [];
  if (intake.doctors.value.length) {
    out.push({
      id: "df-doctors",
      label: `In-network for ${intake.doctors.value.length} doctor${intake.doctors.value.length === 1 ? "" : "s"} you named`,
      hint: intake.doctors.value.map((d) => d.name).slice(0, 3).join(", "),
    });
  }
  if (intake.medications.value.length) {
    out.push({
      id: "df-rx",
      label: `Covers your ${intake.medications.value.length} prescription${intake.medications.value.length === 1 ? "" : "s"}`,
      hint: intake.medications.value.map((m) => m.name).slice(0, 3).join(", "),
    });
  }
  if (intake.budgetSensitivity.value) {
    const map = {
      low: { label: "Network depth over cost", hint: "Cost isn't your top concern" },
      medium: { label: "Balanced premium and coverage", hint: "Comfortable middle on monthly cost" },
      high: { label: "Lowest realistic out-of-pocket", hint: "Tight budget — minimize monthly cost" },
    } as const;
    const m = map[intake.budgetSensitivity.value];
    out.push({ id: "df-budget", label: m.label, hint: m.hint });
  }
  for (const e of intake.extras.value) {
    out.push({
      id: `df-extra-${e}`,
      label: `${e[0].toUpperCase() + e.slice(1)} coverage`,
      hint: `Plans that include ${e}`,
    });
  }
  return out;
}

export function deriveOpenQuestions(intake: Intake): DerivedQuestion[] {
  const out: DerivedQuestion[] = [];
  for (const f of CRITICAL_FIELDS) {
    const field = intake[f];
    if (field.confidence === "missing") {
      out.push({ id: `q-${f}`, text: `Still need: ${FIELD_LABELS[f].toLowerCase()}` });
    } else if (field.confidence === "needs_confirmation") {
      out.push({ id: `q-${f}`, text: `Confirm: ${FIELD_LABELS[f].toLowerCase()}` });
    }
  }
  for (const d of intake.doctors.value) {
    if (d.npiVerification && d.npiVerification.status === "ambiguous") {
      out.push({ id: `q-doc-${d.name}`, text: `Pick the right ${d.name} from NPI matches` });
    }
  }
  return out;
}

export function deriveRouteSteps(intake: Intake): DerivedRouteStep[] {
  return [
    {
      id: "rs-doctors",
      label: "Verify your doctors are covered",
      hint: intake.doctors.value.length
        ? intake.doctors.value.map((d) => d.name).slice(0, 2).join(", ")
        : "Add the doctors you want to keep",
      done: intake.doctors.value.length > 0,
      to: "/find-doctors",
    },
    {
      id: "rs-rx",
      label: "Check your prescriptions",
      hint: intake.medications.value.length
        ? `${intake.medications.value.length} on your list`
        : "Add the medications you take",
      done: intake.medications.value.length > 0,
    },
    {
      id: "rs-compare",
      label: "Compare matching plans",
      hint: "Side-by-side on what matters to you",
      done: false,
      to: "/compare-plans",
    },
    {
      id: "rs-enroll",
      label: "Enroll",
      hint: "Final step — lock it in",
      done: false,
    },
  ];
}
