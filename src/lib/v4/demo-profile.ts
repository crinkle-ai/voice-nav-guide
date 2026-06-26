import { emptyIntake, type Intake } from "@/lib/v3/intake-types";

/** Pre-populated intake for a Minneapolis diabetic on insulin + GLP-1. */
export function diabeticMinneapolisIntake(): Intake {
  const intake = emptyIntake();
  intake.zip = { value: "55410", confidence: "captured" };
  intake.reasonForCall = {
    value: "Comparing Medicare plans for type 2 diabetes care",
    confidence: "captured",
  };
  intake.conditions = {
    value: ["type 2 diabetes", "hypertension"],
    confidence: "captured",
  };
  intake.priorities = {
    value: ["Keep my doctors", "Drug coverage", "Low monthly cost"],
    confidence: "captured",
  };
  intake.doctors = {
    value: [
      {
        name: "Robert Bruley",
        specialty: "Family Medicine",
        city: "Minneapolis",
        zip: "55410",
        clinic: null,
        verification: "unverified",
      },
      {
        name: "Lawrence Schuster",
        specialty: "Endocrinology",
        city: "Minneapolis",
        zip: "55410",
        clinic: null,
        verification: "unverified",
      },
    ],
    confidence: "captured",
  };
  intake.medications = {
    value: [
      { name: "Lantus", strength: "100 unit/mL", doseForm: "solution", frequency: "nightly" },
      { name: "Ozempic", strength: "1 mg", doseForm: "pen", frequency: "weekly" },
      { name: "metformin", strength: "500 mg", doseForm: "tablet", frequency: "twice daily" },
    ],
    confidence: "captured",
  };
  intake.budgetSensitivity = { value: "high", confidence: "captured" };
  intake.budgetCaps = {
    monthlyPremiumMax: 50,
    annualDeductibleMax: 300,
    confidence: "captured",
  };
  intake.extras = { value: ["dental", "vision"], confidence: "captured" };
  intake.medicaid = { value: "no", confidence: "captured", notes: null };
  return intake;
}
