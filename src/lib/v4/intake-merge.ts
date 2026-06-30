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

export function normalizeDoctorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(dr|doctor|prof|professor|mr|mrs|ms|mx)\.?\b/g, "")
    .replace(/[,\s]+(md|do|dc|np|pa|pa-c|rn|phd|dds|dpm|dnp|facp|faafp|jr|sr|ii|iii|iv)\b\.?/g, "")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function doctorKey(d: DoctorEntry): string {
  const npi = d.npiVerification?.selectedNpi;
  if (npi) return `npi:${npi}`;
  return `name:${normalizeDoctorName(d.name)}`;
}

function mergeDoctorEntries(a: DoctorEntry, b: DoctorEntry): DoctorEntry {
  const aVerified = Boolean(a.npiVerification);
  const bVerified = Boolean(b.npiVerification);
  const base = aVerified ? a : bVerified ? b : a;
  const fill = base === a ? b : a;
  return {
    ...base,
    name: base.name || fill.name,
    specialty: base.specialty ?? fill.specialty,
    clinic: base.clinic ?? fill.clinic,
    city: base.city ?? fill.city,
    zip: base.zip ?? fill.zip,
    npiVerification: base.npiVerification ?? fill.npiVerification,
    verification: base.npiVerification ? base.verification : fill.verification,
  };
}

function mergeDoctors(
  prior: { value: DoctorEntry[]; confidence: Confidence },
  next: { value: DoctorEntry[]; confidence: Confidence },
): { value: DoctorEntry[]; confidence: Confidence } {
  const all = [...prior.value, ...next.value];
  // Pass 1: dedupe by key (NPI or normalized name).
  const byKey = new Map<string, DoctorEntry>();
  const order: string[] = [];
  for (const d of all) {
    const k = doctorKey(d);
    const existing = byKey.get(k);
    if (existing) {
      byKey.set(k, mergeDoctorEntries(existing, d));
    } else {
      byKey.set(k, d);
      order.push(k);
    }
  }
  // Pass 2: collapse name-keyed entries that match an NPI-keyed entry.
  const result: DoctorEntry[] = order.map((k) => byKey.get(k)!);
  const byNpi = new Map<string, number>();
  const removed = new Set<number>();
  result.forEach((d, i) => {
    const npi = d.npiVerification?.selectedNpi;
    if (!npi) return;
    const existingIdx = byNpi.get(npi);
    if (existingIdx === undefined) {
      byNpi.set(npi, i);
    } else {
      result[existingIdx] = mergeDoctorEntries(result[existingIdx], d);
      removed.add(i);
    }
  });
  // Pass 3: drop unverified name-only entries whose normalized name matches
  // an NPI-verified entry already present.
  const verifiedNames = new Set(
    result
      .filter((_, i) => !removed.has(i))
      .filter((d) => d.npiVerification?.selectedNpi)
      .map((d) => normalizeDoctorName(d.name)),
  );
  result.forEach((d, i) => {
    if (removed.has(i)) return;
    if (d.npiVerification?.selectedNpi) return;
    if (verifiedNames.has(normalizeDoctorName(d.name))) removed.add(i);
  });
  const final = result.filter((_, i) => !removed.has(i));
  const confidence: Confidence =
    rank(next.confidence) >= rank(prior.confidence) ? next.confidence : prior.confidence;
  return { value: final, confidence: final.length === 0 ? "missing" : confidence };
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
