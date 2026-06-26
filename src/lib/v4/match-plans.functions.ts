import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { IntakeSchema, type Intake, type DoctorEntry, type MedicationEntry } from "@/lib/v3/intake-types";

// RxNorm codes we authored formulary rows for.
const RXCUI_BY_KEYWORD: Array<{ rxcui: string; keywords: string[]; label: string }> = [
  { rxcui: "261551", label: "Lantus (insulin glargine)", keywords: ["lantus", "insulin glargine", "glargine"] },
  { rxcui: "1991302", label: "Ozempic (semaglutide)", keywords: ["ozempic", "semaglutide"] },
  { rxcui: "860975", label: "metformin 500 mg", keywords: ["metformin"] },
];

function rxcuiFor(med: MedicationEntry): { rxcui: string; label: string } | null {
  // Prefer the verified rxcui returned by RxNorm if it matches one we curated.
  const verified = med.rxVerification?.rxcui;
  if (verified) {
    const hit = RXCUI_BY_KEYWORD.find((r) => r.rxcui === verified);
    if (hit) return { rxcui: hit.rxcui, label: hit.label };
  }
  const name = (med.name || "").toLowerCase();
  for (const r of RXCUI_BY_KEYWORD) {
    if (r.keywords.some((k) => name.includes(k))) return { rxcui: r.rxcui, label: r.label };
  }
  return null;
}

function doctorMatchesNpi(doc: DoctorEntry, npi: string, firstName: string, lastName: string): boolean {
  if (doc.npiVerification?.selectedNpi === npi) return true;
  const name = (doc.name || "").toLowerCase().replace(/^dr\.?\s+/, "").trim();
  const last = lastName.toLowerCase();
  const first = firstName.toLowerCase();
  if (!name) return false;
  return name.includes(last) && (name.includes(first) || name.split(/\s+/)[0].startsWith(first.slice(0, 3)));
}

export type DemoPlanRow = Database["public"]["Tables"]["demo_plans_55410"]["Row"];
export type FormularyRow = Database["public"]["Tables"]["plan_formulary_55410"]["Row"];
export type ProviderRow = Database["public"]["Tables"]["providers_55410"]["Row"];

export type DoctorOutcome = {
  name: string;
  inNetwork: boolean;
  matchedNpi: string | null;
  matchedName: string | null;
  specialty: string | null;
};
export type DrugOutcome = {
  drug: string;
  covered: boolean;
  tier: number | null;
  priorAuth: boolean;
  stepTherapy: boolean;
  copay: number | null;
  notes: string | null;
};
export type DemoScoredPlan = {
  plan: DemoPlanRow;
  score: number;
  buckets: {
    network: { score: number; max: number; doctors: DoctorOutcome[] };
    formulary: { score: number; max: number; drugs: DrugOutcome[] };
    budget: { score: number; max: number; premiumOk: boolean; deductibleOk: boolean };
    extras: { score: number; max: number; matched: string[] };
    stars: { score: number; max: number };
  };
  reasons: string[];
  concerns: string[];
  eligible: boolean;
};

const W_NETWORK = 35;
const W_FORMULARY = 30;
const W_BUDGET = 20;
const W_EXTRAS = 10;
const W_STARS = 5;

function scorePlan(
  plan: DemoPlanRow,
  formulary: FormularyRow[],
  providers: ProviderRow[],
  intake: Intake,
): DemoScoredPlan {
  const reasons: string[] = [];
  const concerns: string[] = [];

  // Eligibility (D-SNP requires Medicaid)
  const onMedicaid = intake.medicaid?.value === "yes" || intake.medicaid?.value === "applying";
  const eligible = !plan.requires_medicaid || onMedicaid;

  // --- Network ---
  const intakeDocs = intake.doctors.value || [];
  const doctorOutcomes: DoctorOutcome[] = intakeDocs.map((d) => {
    const match = providers.find((p) =>
      doctorMatchesNpi(d, p.npi, p.first_name, p.last_name),
    );
    const inNet = !!(match && match.in_network_plans.includes(plan.id));
    return {
      name: d.name,
      inNetwork: inNet,
      matchedNpi: match?.npi ?? null,
      matchedName: match ? `${match.first_name} ${match.last_name}` : null,
      specialty: match?.specialty_label ?? d.specialty ?? null,
    };
  });
  let networkScore = 0;
  if (intakeDocs.length === 0) {
    networkScore = W_NETWORK * 0.6; // neutral if no doctors provided
  } else {
    const inNetCount = doctorOutcomes.filter((d) => d.inNetwork).length;
    const ratio = inNetCount / intakeDocs.length;
    networkScore = ratio * W_NETWORK;
    if (ratio === 1) reasons.push(`All ${intakeDocs.length} of your doctors are in network`);
    else if (inNetCount > 0)
      reasons.push(`${inNetCount} of ${intakeDocs.length} doctors in network`);
    else concerns.push(`None of your listed doctors are in this network`);
  }

  // --- Formulary ---
  const intakeMeds = intake.medications.value || [];
  const drugOutcomes: DrugOutcome[] = intakeMeds.map((m) => {
    const mapped = rxcuiFor(m);
    if (!mapped) {
      return {
        drug: m.name,
        covered: false,
        tier: null,
        priorAuth: false,
        stepTherapy: false,
        copay: null,
        notes: "Not in our demo formulary catalog",
      };
    }
    const row = formulary.find((f) => f.plan_id === plan.id && f.rxcui === mapped.rxcui);
    if (!row) {
      return {
        drug: mapped.label,
        covered: false,
        tier: null,
        priorAuth: false,
        stepTherapy: false,
        copay: null,
        notes: "Not on this plan's formulary",
      };
    }
    return {
      drug: mapped.label,
      covered: row.covered,
      tier: row.tier,
      priorAuth: row.prior_auth,
      stepTherapy: row.step_therapy,
      copay: row.preferred_copay,
      notes: row.notes,
    };
  });
  let formScore = 0;
  if (intakeMeds.length === 0) {
    formScore = W_FORMULARY * 0.5;
  } else {
    const coveredCount = drugOutcomes.filter((d) => d.covered).length;
    const ratio = coveredCount / intakeMeds.length;
    const tierAvg =
      drugOutcomes.filter((d) => d.covered && d.tier).reduce((a, d) => a + (d.tier ?? 0), 0) /
        Math.max(1, coveredCount) || 0;
    // ratio is the primary driver; tier degrades it slightly
    const tierPenalty = tierAvg > 0 ? Math.min(0.3, (tierAvg - 1) * 0.075) : 0;
    formScore = Math.max(0, ratio - tierPenalty) * W_FORMULARY;
    const restricted = drugOutcomes.filter((d) => d.covered && (d.priorAuth || d.stepTherapy));
    if (ratio === 1 && restricted.length === 0)
      reasons.push("All your medications covered with no restrictions");
    else if (ratio === 1)
      reasons.push(
        `All meds covered — ${restricted.length === 1 ? "1 has" : `${restricted.length} have`} prior auth or step therapy`,
      );
    if (ratio < 1)
      concerns.push(
        `${intakeMeds.length - coveredCount} of ${intakeMeds.length} medications not on formulary`,
      );
  }

  // --- Budget ---
  const caps = intake.budgetCaps;
  const premiumCap = caps?.monthlyPremiumMax ?? null;
  const deductibleCap = caps?.annualDeductibleMax ?? null;
  let budgetScore = W_BUDGET;
  let premiumOk = true;
  let deductibleOk = true;
  if (premiumCap !== null) {
    const premium = Number(plan.monthly_premium);
    if (premium <= premiumCap) {
      reasons.push(`$${premium}/mo premium fits your $${premiumCap} cap`);
    } else {
      premiumOk = false;
      const overshoot = (premium - premiumCap) / Math.max(1, premiumCap);
      budgetScore -= Math.min(W_BUDGET * 0.6, W_BUDGET * 0.6 * overshoot * 2);
      concerns.push(`$${premium}/mo premium is over your $${premiumCap} cap`);
    }
  }
  if (deductibleCap !== null) {
    const ded = Number(plan.annual_deductible);
    if (ded <= deductibleCap) {
      if (ded > 0) reasons.push(`$${ded} deductible fits your $${deductibleCap} ceiling`);
    } else {
      deductibleOk = false;
      budgetScore -= W_BUDGET * 0.4;
      concerns.push(`$${ded} deductible is over your $${deductibleCap} ceiling`);
    }
  }
  if (premiumCap === null && deductibleCap === null) {
    // Fall back to budgetSensitivity
    const sens = intake.budgetSensitivity.value;
    if (sens === "high" && Number(plan.monthly_premium) === 0) reasons.push("$0 monthly premium");
    if (sens === "high" && Number(plan.monthly_premium) > 50) budgetScore -= 6;
  }
  budgetScore = Math.max(0, budgetScore);

  // --- Extras ---
  const wanted = intake.extras.value || [];
  const matched = wanted.filter((e) => plan.extras.includes(e));
  const extrasScore = wanted.length === 0 ? W_EXTRAS * 0.5 : (matched.length / wanted.length) * W_EXTRAS;
  if (wanted.length > 0 && matched.length === wanted.length)
    reasons.push(`Includes ${matched.join(", ")}`);
  if (wanted.length > 0 && matched.length < wanted.length)
    concerns.push(`Missing: ${wanted.filter((e) => !matched.includes(e)).join(", ")}`);

  // --- Stars ---
  const stars = plan.star_rating ? (plan.star_rating / 5) * W_STARS : W_STARS * 0.6;

  const score = networkScore + formScore + budgetScore + extrasScore + stars;
  if (!eligible) concerns.unshift("Requires both Medicare and Medicaid enrollment");

  return {
    plan,
    score: eligible ? score : score * 0.4,
    buckets: {
      network: { score: networkScore, max: W_NETWORK, doctors: doctorOutcomes },
      formulary: { score: formScore, max: W_FORMULARY, drugs: drugOutcomes },
      budget: { score: budgetScore, max: W_BUDGET, premiumOk, deductibleOk },
      extras: { score: extrasScore, max: W_EXTRAS, matched },
      stars: { score: stars, max: W_STARS },
    },
    reasons,
    concerns,
    eligible,
  };
}

const InputSchema = z.object({ intake: IntakeSchema });

export const rankDemoPlans = createServerFn({ method: "POST" })
  .inputValidator((d: { intake: Intake }) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<DemoScoredPlan[]> => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const [{ data: plans }, { data: formulary }, { data: providers }] = await Promise.all([
      supabase.from("demo_plans_55410").select("*").order("sort_order"),
      supabase.from("plan_formulary_55410").select("*"),
      supabase.from("providers_55410").select("*"),
    ]);
    if (!plans || !formulary || !providers) return [];
    const scored = plans.map((p) => scorePlan(p, formulary, providers, data.intake));
    return scored.sort((a, b) => b.score - a.score);
  });
