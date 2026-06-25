import type { Intake } from "@/lib/v3/intake-types";

type Field = { key: string; weight: number; filled: (i: Intake) => boolean };

const FIELDS: Field[] = [
  { key: "zip", weight: 1, filled: (i) => !!i.zip?.value },
  { key: "priorities", weight: 1, filled: (i) => (i.priorities?.value || []).length > 0 },
  { key: "doctors", weight: 1, filled: (i) => (i.doctors?.value || []).length > 0 },
  { key: "medications", weight: 1, filled: (i) => i.medications?.confidence !== "missing" },
  { key: "medicaid", weight: 1, filled: (i) => !!i.medicaid?.value },
  { key: "budget", weight: 1, filled: (i) => !!i.budgetSensitivity?.value },
  { key: "reason", weight: 1, filled: (i) => !!i.reasonForCall?.value },
];

export function computeProgress(intake: Intake) {
  const total = FIELDS.reduce((s, f) => s + f.weight, 0);
  const filled = FIELDS.reduce((s, f) => s + (f.filled(intake) ? f.weight : 0), 0);
  const pct = Math.round((filled / total) * 100);
  return { pct, filled, total };
}
