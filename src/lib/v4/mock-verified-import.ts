// Mocked ID.me / CLEAR verified-identity dataset for the demo.
// Everything here is fake — no real PHI, no real OAuth. When the user
// completes the flow in VerifiedSignInDialog we hand this to the merge
// helpers in intake-merge / session-store so the Workspace, plan match,
// and profile progress all light up as if the data had come from
// MyChart, CMS Blue Button 2.0, and a pharmacy history feed.

import type {
  DoctorEntry,
  Intake,
  MedicationEntry,
  NpiVerification,
  RxVerification,
} from "@/lib/v3/intake-types";

export type ImportProvider = "idme" | "clear";

export type ImportSource = "identity" | "mychart" | "cms" | "pharmacy";

export type ImportedRecord = {
  provider: ImportProvider;
  user: { name: string; email: string; memberId: string; dobMasked: string };
  intakePatch: Partial<Intake>;
  importedDoctorNpis: string[];
  importedMedRxcuis: string[];
  importedMedNames: string[]; // fallback match key for meds without rxcui
  notableEvent: string;
  summary: string;
  counts: { providers: number; visits: number; claims: number; fills: number };
};

function fakeNpiVerification(npi: string, first: string, last: string, taxonomy: string, city: string, zip: string): NpiVerification {
  return {
    status: "verified",
    checkedAt: new Date().toISOString(),
    selectedNpi: npi,
    matches: [
      {
        npi,
        firstName: first,
        lastName: last,
        credential: "MD",
        primaryTaxonomy: taxonomy,
        primaryAddress: { line1: null, city, state: "FL", postalCode: zip },
        phone: null,
      },
    ],
    message: "Imported from CMS Blue Button 2.0",
  };
}

function fakeRxVerification(rxcui: string, canonical: string, ingredient: string): RxVerification {
  return {
    status: "verified",
    checkedAt: new Date().toISOString(),
    rxcui,
    canonicalName: canonical,
    tty: "SCD",
    ingredient,
    brandNames: [],
    strengthMatch: true,
    doseFormMatch: true,
    spellingCorrected: null,
    candidates: [],
    message: "Imported from pharmacy history",
  };
}

const IMPORTED_DOCTORS: DoctorEntry[] = [
  {
    name: "Dr. Priya Patel",
    specialty: "Cardiology",
    city: "Miami",
    zip: "33130",
    clinic: "Baptist Health Cardiology",
    verification: "high",
    npiVerification: fakeNpiVerification("1487654321", "Priya", "Patel", "Cardiovascular Disease", "Miami", "33130"),
  },
  {
    name: "Dr. Robert Kim",
    specialty: "Primary Care",
    city: "Miami",
    zip: "33130",
    clinic: "Baptist Health Primary Care",
    verification: "high",
    npiVerification: fakeNpiVerification("1598765432", "Robert", "Kim", "Family Medicine", "Miami", "33130"),
  },
  {
    name: "Dr. Sarah Nguyen",
    specialty: "Endocrinology",
    city: "Miami",
    zip: "33176",
    clinic: "University of Miami Health",
    verification: "high",
    npiVerification: fakeNpiVerification("1609876543", "Sarah", "Nguyen", "Endocrinology, Diabetes & Metabolism", "Miami", "33176"),
  },
];

const IMPORTED_MEDS: MedicationEntry[] = [
  {
    name: "Lisinopril",
    strength: "10 mg",
    doseForm: "tablet",
    frequency: "once daily",
    rxVerification: fakeRxVerification("314076", "Lisinopril 10 MG Oral Tablet", "lisinopril"),
  },
  {
    name: "Atorvastatin",
    strength: "20 mg",
    doseForm: "tablet",
    frequency: "once daily at bedtime",
    rxVerification: fakeRxVerification("617311", "Atorvastatin 20 MG Oral Tablet", "atorvastatin"),
  },
  {
    name: "Metformin",
    strength: "500 mg",
    doseForm: "tablet",
    frequency: "twice daily with meals",
    rxVerification: fakeRxVerification("860975", "Metformin hydrochloride 500 MG Oral Tablet", "metformin"),
  },
  {
    name: "Levothyroxine",
    strength: "50 mcg",
    doseForm: "tablet",
    frequency: "once daily in the morning",
    rxVerification: fakeRxVerification("966224", "Levothyroxine Sodium 0.05 MG Oral Tablet", "levothyroxine"),
  },
];

export function buildImportedRecord(provider: ImportProvider): ImportedRecord {
  const intakePatch: Partial<Intake> = {
    reasonForCall: { value: "Compare Medicare plans that fit my doctors, meds, and CMS history", confidence: "captured" },
    priorities: {
      value: ["Keep my cardiologist", "Low prescription copays", "Manage diabetes care"],
      confidence: "captured",
    },
    doctors: { value: IMPORTED_DOCTORS, confidence: "captured" },
    medications: { value: IMPORTED_MEDS, confidence: "captured" },
    conditions: {
      value: ["Hypertension", "Type 2 diabetes", "High cholesterol", "Hypothyroidism"],
      confidence: "captured",
    },
    zip: { value: "33130", confidence: "captured" },
    budgetSensitivity: { value: "medium", confidence: "needs_confirmation" },
  };

  return {
    provider,
    user: {
      name: "Margaret Chen",
      email: "margaret.chen@example.com",
      memberId: "CH-4728-1930",
      dobMasked: "••/••/1959",
    },
    intakePatch,
    importedDoctorNpis: IMPORTED_DOCTORS.map((d) => d.npiVerification!.selectedNpi!).filter(Boolean) as string[],
    importedMedRxcuis: IMPORTED_MEDS.map((m) => m.rxVerification!.rxcui!).filter(Boolean) as string[],
    importedMedNames: IMPORTED_MEDS.map((m) => m.name.toLowerCase()),
    notableEvent: "Knee MRI at Baptist Imaging (Mar 2026) — imaging access matters",
    summary:
      provider === "idme"
        ? "Pulled 3 providers from MyChart, 47 claims from CMS Blue Button, and 4 active meds from pharmacy history."
        : "Verified identity via CLEAR and pulled 3 providers, 47 CMS claims, and 4 active meds.",
    counts: { providers: 3, visits: 12, claims: 47, fills: 4 },
  };
}

// Progress milestones for the animated import screen. The dialog steps
// through these with a short delay between each so the beat lands on stage.
export type ImportMilestone = {
  key: ImportSource;
  label: string;
  detail: string;
  delayMs: number;
};

export function importMilestones(record: ImportedRecord): ImportMilestone[] {
  const providerName = record.provider === "idme" ? "ID.me" : "CLEAR";
  return [
    {
      key: "identity",
      label: `Verified identity via ${providerName}`,
      detail: `${record.user.name} · DOB ${record.user.dobMasked}`,
      delayMs: 700,
    },
    {
      key: "mychart",
      label: "Connected to MyChart",
      detail: `${record.counts.providers} providers · ${record.counts.visits} visits (last 24 mo)`,
      delayMs: 900,
    },
    {
      key: "cms",
      label: "Connected to CMS Blue Button 2.0",
      detail: `${record.counts.claims} claims imported`,
      delayMs: 1000,
    },
    {
      key: "pharmacy",
      label: "Connected to pharmacy history",
      detail: `${record.counts.fills} active medications`,
      delayMs: 800,
    },
  ];
}

// -------- Returning-visit resync --------
// On subsequent sign-ins we don't re-ask for consent — we silently re-pull
// each connection and surface a short "what's new since your last visit"
// recap. All mocked; no real network calls.

export type ResyncRecord = {
  provider: ImportProvider;
  summary: string;
  newSinceLastVisit: string[];
  milestones: ImportMilestone[];
};

export function buildResyncRecord(provider: ImportProvider): ResyncRecord {
  const providerName = provider === "idme" ? "ID.me" : "CLEAR";
  const newSinceLastVisit = [
    "New claim: Cardiology follow-up with Dr. Priya Patel (Jun 12)",
    "New Rx fill: Metformin 500 mg — 90-day refill (Jun 8)",
    "New lab result: A1C 6.8 (down from 7.2)",
    "Care team update: PCP Dr. Robert Kim added to your Baptist Health record",
  ];
  return {
    provider,
    summary: `Re-synced with ${providerName} · 3 new claims and 1 new Rx fill since your last visit.`,
    newSinceLastVisit,
    milestones: [
      {
        key: "identity",
        label: `Re-verified identity via ${providerName}`,
        detail: "Signed in with passkey · no consent required",
        delayMs: 500,
      },
      {
        key: "cms",
        label: "Checked CMS Blue Button for new claims",
        detail: "3 new claims since last visit",
        delayMs: 800,
      },
      {
        key: "pharmacy",
        label: "Checked pharmacy for new fills",
        detail: "1 new fill · 0 discontinued",
        delayMs: 700,
      },
      {
        key: "mychart",
        label: "Checked MyChart for care-team changes",
        detail: "1 update to your care team",
        delayMs: 700,
      },
    ],
  };
}
