import { MOCK_PLANS, type Plan } from "@/data/v3-plans";
import type { Intake } from "./intake-types";

export type ScoredPlan = {
  plan: Plan;
  score: number;
  reasons: string[];
  concerns: string[];
  doctorHits: string[];
  drugCoverage: { drug: string; tier: number | null }[];
};

const norm = (s: string) => s.trim().toLowerCase();

export function scorePlan(plan: Plan, intake: Intake): ScoredPlan {
  const reasons: string[] = [];
  const concerns: string[] = [];
  let score = 0;

  const wantedDocs = intake.doctors.value.map((d) => norm(d.name));
  const doctorHits = wantedDocs.filter((d) =>
    plan.doctorsInNetwork.some((n) => norm(n).includes(d) || d.includes(norm(n))),
  );
  if (wantedDocs.length > 0) {
    const ratio = doctorHits.length / wantedDocs.length;
    score += ratio * 30;
    if (ratio === 1) reasons.push(`All ${wantedDocs.length} of your doctors are in network`);
    else if (ratio > 0) reasons.push(`${doctorHits.length} of ${wantedDocs.length} doctors in network`);
    else concerns.push(`None of your listed doctors are confirmed in network`);
  }

  const drugs = intake.medications.value.map((m) => norm(m.name));
  const drugCoverage = drugs.map((d) => {
    const key = Object.keys(plan.formularyTiers).find((k) => k.includes(d) || d.includes(k));
    return { drug: d, tier: key ? plan.formularyTiers[key as keyof typeof plan.formularyTiers] : null };
  });
  const covered = drugCoverage.filter((c) => c.tier !== null);
  if (drugs.length > 0) {
    const ratio = covered.length / drugs.length;
    score += ratio * 25;
    const avgTier = covered.length ? covered.reduce((a, c) => a + (c.tier ?? 0), 0) / covered.length : 0;
    if (ratio === 1 && avgTier <= 2) reasons.push(`All your medications covered at low tiers`);
    else if (ratio < 1) concerns.push(`${drugs.length - covered.length} of your medications not in formulary`);
  }

  const budget = intake.budgetSensitivity.value;
  if (budget === "high") {
    if (plan.monthlyPremium === 0) {
      score += 15;
      reasons.push(`$0 monthly premium`);
    } else {
      score -= plan.monthlyPremium / 10;
      concerns.push(`$${plan.monthlyPremium}/mo premium may stretch a tight budget`);
    }
    if (plan.moop > 7000) concerns.push(`Higher out-of-pocket max ($${plan.moop.toLocaleString()})`);
  } else if (budget === "low") {
    if (plan.moop < 5000) {
      score += 10;
      reasons.push(`Low out-of-pocket max — strong protection`);
    }
  } else if (budget === "medium") {
    if (plan.monthlyPremium < 40) score += 5;
  }

  const priorities = intake.priorities.value.map(norm).join(" ");
  if (priorities.includes("doctor") || priorities.includes("network")) {
    if (plan.network === "broad") {
      score += 12;
      reasons.push(`Broad ${plan.type} network — flexibility to see specialists`);
    }
  }
  if (priorities.includes("drug") || priorities.includes("medication") || priorities.includes("prescription")) {
    if (Object.keys(plan.formularyTiers).length >= 6) {
      score += 10;
      reasons.push(`Wide drug formulary`);
    }
  }
  if (priorities.includes("dental")) {
    if (plan.extras.includes("dental")) { score += 8; reasons.push("Includes dental"); }
    else concerns.push("No dental benefit");
  }
  if (priorities.includes("vision")) {
    if (plan.extras.includes("vision")) { score += 6; reasons.push("Includes vision"); }
  }
  if (priorities.includes("hearing")) {
    if (plan.extras.includes("hearing")) { score += 6; reasons.push("Includes hearing aids"); }
    else concerns.push("No hearing benefit");
  }
  if (priorities.includes("fitness") || priorities.includes("gym") || priorities.includes("silversneakers")) {
    if (plan.extras.includes("fitness")) { score += 5; reasons.push("Includes fitness benefit"); }
  }

  const wantedExtras = intake.extras.value;
  const extrasOverlap = wantedExtras.filter((e) => plan.extras.includes(e));
  score += extrasOverlap.length * 3;

  score += (10000 - plan.moop) / 1000;

  return { plan, score, reasons, concerns, doctorHits, drugCoverage };
}

export function rankPlans(intake: Intake): ScoredPlan[] {
  return MOCK_PLANS.map((p) => scorePlan(p, intake)).sort((a, b) => b.score - a.score);
}
