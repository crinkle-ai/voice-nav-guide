import { z } from "zod";

export type IntakeMode = "ramble" | "structured" | "hybrid";

export const ConfidenceEnum = z.enum(["captured", "needs_confirmation", "missing"]);
export type Confidence = z.infer<typeof ConfidenceEnum>;

export const FieldString = z.object({
  value: z.string().nullable(),
  confidence: ConfidenceEnum,
});

export const FieldList = z.object({
  value: z.array(z.string()),
  confidence: ConfidenceEnum,
});

export const NpiMatch = z.object({
  npi: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  credential: z.string().nullable(),
  primaryTaxonomy: z.string().nullable(),
  primaryAddress: z.object({
    line1: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    postalCode: z.string().nullable(),
  }),
  phone: z.string().nullable(),
});

export const NpiVerification = z.object({
  status: z.enum(["verified", "ambiguous", "not_found", "error"]),
  checkedAt: z.string(),
  matches: z.array(NpiMatch),
  selectedNpi: z.string().nullable(),
  message: z.string().optional(),
});
export type NpiVerification = z.infer<typeof NpiVerification>;

export const DoctorEntry = z.object({
  name: z.string(),
  specialty: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  clinic: z.string().nullable().optional(),
  verification: z.enum(["high", "low", "unverified"]).default("unverified"),
  npiVerification: NpiVerification.optional(),
});
export type DoctorEntry = z.infer<typeof DoctorEntry>;

export const DoctorList = z.object({
  value: z.array(DoctorEntry),
  confidence: ConfidenceEnum,
});

export const MedicationEntry = z.object({
  name: z.string(),
  strength: z.string().nullable().optional(),
  doseForm: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
});
export type MedicationEntry = z.infer<typeof MedicationEntry>;

export function formatMedication(m: MedicationEntry): string {
  return [m.name, m.strength, m.doseForm].filter(Boolean).join(" ").trim();
}

export const MedicationList = z.object({
  value: z.array(MedicationEntry),
  confidence: ConfidenceEnum,
});

export const IntakeSchema = z.object({
  reasonForCall: FieldString,
  priorities: FieldList,
  doctors: DoctorList,
  medications: MedicationList,
  conditions: FieldList,
  currentPlan: FieldString,
  budgetSensitivity: z.object({
    value: z.enum(["low", "medium", "high"]).nullable(),
    confidence: ConfidenceEnum,
  }),
  zip: FieldString,
  extras: z.object({
    value: z.array(z.enum(["dental", "vision", "hearing", "fitness", "transportation", "otc"])),
    confidence: ConfidenceEnum,
  }),
});

export type Intake = z.infer<typeof IntakeSchema>;

export const emptyIntake = (): Intake => ({
  reasonForCall: { value: null, confidence: "missing" },
  priorities: { value: [], confidence: "missing" },
  doctors: { value: [], confidence: "missing" },
  medications: { value: [], confidence: "missing" },
  conditions: { value: [], confidence: "missing" },
  currentPlan: { value: null, confidence: "missing" },
  budgetSensitivity: { value: null, confidence: "missing" },
  zip: { value: null, confidence: "missing" },
  extras: { value: [], confidence: "missing" },
});

export const FIELD_LABELS: Record<keyof Intake, string> = {
  reasonForCall: "Reason for call",
  priorities: "Top priorities",
  doctors: "Doctors",
  medications: "Medications",
  conditions: "Health conditions",
  currentPlan: "Current plan",
  budgetSensitivity: "Budget sensitivity",
  zip: "ZIP code",
  extras: "Extra benefits",
};

export const CRITICAL_FIELDS: (keyof Intake)[] = [
  "reasonForCall",
  "priorities",
  "doctors",
  "medications",
  "budgetSensitivity",
  "zip",
];

export function intakeCompleteness(intake: Intake): number {
  const total = CRITICAL_FIELDS.length;
  const filled = CRITICAL_FIELDS.filter(
    (f) => intake[f].confidence !== "missing",
  ).length;
  return Math.round((filled / total) * 100);
}
