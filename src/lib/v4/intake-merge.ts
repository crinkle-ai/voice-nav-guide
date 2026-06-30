import type { Intake } from "@/lib/v3/intake-types";
import type { DoctorEntry, MedicationEntry, Confidence } from "@/lib/v3/intake-types";

// Prefer the field with the stronger confidence. "captured" > "needs_confirmation" > "missing".
// If new is missing, keep prior. If both present, prefer new (it's more recent) but only
// if it actually carries a value.
function rank(c: Confidence): number {
  return c === "captured" ? 2 : c === "needs_confirmation" ? 1 : 0;
}

function mergeScalar<T extends { value: unknown; confidence: Confidence }>(
  prior: T,
  next: T,
): T {
  const priorHas = prior.value !== null && prior.value !== undefined && prior.value !== "";
  const nextHas = next.value !== null && next.value !== undefined && next.value !== "";
  if (!nextHas) return prior;
  if (!priorHas) return next;
  // Both have values: prefer the one with stronger confidence; tie → newer.
  return rank(next.confidence) >= rank(prior.confidence) ? next : prior;
}

function mergeStringList(
  prior: { value: string[]; confidence: Confidence },
  next: { value: string[]; confidence: Confidence },
): { value: string[]; confidence: Confidence } {
  const seen = new Map<string, string>();
  for (const v of prior.value) seen.set(v.toLowerCase().trim(), v);
  for (const v of next.value) seen.set(v.toLowerCase().trim(), v);
  const value = Array.from(seen.values());
  const confidence: Confidence =
    rank(next.confidence) >= rank(prior.confidence) ? next.confidence : prior.confidence;
  return { value, confidence: value.length === 0 ? "missing" : confidence };
}

function doctorKey(d: DoctorEntry): string {
  return d.name.toLowerCase().replace(/\s+/g, " ").trim();
}

function mergeDoctors(
  prior: { value: DoctorEntry[]; confidence: Confidence },
  next: { value: DoctorEntry[]; confidence: Confidence },
): { value: DoctorEntry[]; confidence: Confidence } {
  const byKey = new Map<string, DoctorEntry>();
  for (const d of prior.value) byKey.set(doctorKey(d), d);
  for (const d of next.value) {
    const k = doctorKey(d);
    const existing = byKey.get(k);
    if (!existing) {
      byKey.set(k, d);
    } else {
      byKey.set(k, {
        ...existing,
        ...d,
        // Preserve verification artifacts we added locally.
        npiVerification: existing.npiVerification ?? d.npiVerification,
        verification: existing.npiVerification ? existing.verification : d.verification,
      });
    }
  }
  const value = Array.from(byKey.values());
  const confidence: Confidence =
    rank(next.confidence) >= rank(prior.confidence) ? next.confidence : prior.confidence;
  return { value, confidence: value.length === 0 ? "missing" : confidence };
}

function medKey(m: MedicationEntry): string {
  return m.name.toLowerCase().replace(/\s+/g, " ").trim();
}

function mergeMedications(
  prior: { value: MedicationEntry[]; confidence: Confidence },
  next: { value: MedicationEntry[]; confidence: Confidence },
): { value: MedicationEntry[]; confidence: Confidence } {
  const byKey = new Map<string, MedicationEntry>();
  for (const m of prior.value) byKey.set(medKey(m), m);
  for (const m of next.value) {
    const k = medKey(m);
    const existing = byKey.get(k);
    if (!existing) {
      byKey.set(k, m);
    } else {
      byKey.set(k, {
        ...existing,
        ...m,
        strength: m.strength ?? existing.strength,
        doseForm: m.doseForm ?? existing.doseForm,
        frequency: m.frequency ?? existing.frequency,
        rxVerification: existing.rxVerification ?? m.rxVerification,
      });
    }
  }
  const value = Array.from(byKey.values());
  const confidence: Confidence =
    rank(next.confidence) >= rank(prior.confidence) ? next.confidence : prior.confidence;
  return { value, confidence: value.length === 0 ? "missing" : confidence };
}

export function mergeIntake(prior: Intake, next: Intake): Intake {
  return {
    reasonForCall: mergeScalar(prior.reasonForCall, next.reasonForCall),
    priorities: mergeStringList(prior.priorities, next.priorities),
    doctors: mergeDoctors(prior.doctors, next.doctors),
    medications: mergeMedications(prior.medications, next.medications),
    conditions: mergeStringList(prior.conditions, next.conditions),
    currentPlan: mergeScalar(prior.currentPlan, next.currentPlan),
    budgetSensitivity: mergeScalar(prior.budgetSensitivity, next.budgetSensitivity),
    zip: mergeScalar(prior.zip, next.zip),
    extras: (() => {
      const merged = mergeStringList(
        { value: prior.extras.value as string[], confidence: prior.extras.confidence },
        { value: next.extras.value as string[], confidence: next.extras.confidence },
      );
      return { value: merged.value as Intake["extras"]["value"], confidence: merged.confidence };
    })(),
    medicaid: (() => {
      const priorHas = prior.medicaid.value !== null;
      const nextHas = next.medicaid.value !== null;
      if (!nextHas) return prior.medicaid;
      if (!priorHas) return next.medicaid;
      return rank(next.medicaid.confidence) >= rank(prior.medicaid.confidence)
        ? next.medicaid
        : prior.medicaid;
    })(),
    budgetCaps: (() => {
      const pickedPremium =
        next.budgetCaps.monthlyPremiumMax ?? prior.budgetCaps.monthlyPremiumMax;
      const pickedDeductible =
        next.budgetCaps.annualDeductibleMax ?? prior.budgetCaps.annualDeductibleMax;
      const confidence: Confidence =
        rank(next.budgetCaps.confidence) >= rank(prior.budgetCaps.confidence)
          ? next.budgetCaps.confidence
          : prior.budgetCaps.confidence;
      return {
        monthlyPremiumMax: pickedPremium,
        annualDeductibleMax: pickedDeductible,
        confidence,
      };
    })(),
  };
}
