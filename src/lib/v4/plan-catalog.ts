import type { Intake } from "@/lib/v3/intake-types";
import { computeProgress } from "./profile-progress";

export type CatalogPlan = {
  id: string;
  name: string;
  type: "MA-HMO" | "MA-PPO" | "D-SNP" | "Medigap" | "PDP";
  blurb: string;
  /** Returns true if the plan is still in the running for this user. */
  eligible: (i: Intake) => boolean;
  /** Short reason this plan currently fits — derived from intake. */
  rationale: (i: Intake) => string;
};

const hasMedicaid = (i: Intake) =>
  i.medicaid?.value === "yes" || i.medicaid?.value === "applying";

const wantsTravel = (i: Intake) =>
  (i.priorities?.value || []).some((p) => /travel|nationwide|snowbird|out of state/i.test(p));

const budgetLow = (i: Intake) => i.budgetSensitivity?.value === "high"; // high sensitivity = low budget
const hasDrugs = (i: Intake) => (i.medications?.value || []).length > 0;

const PLAN_DETAILS: Record<
  string,
  { monthlyPremium: number; maxOOP: number; starRating?: number; highlights: string[] }
> = {
  "aarp-ma-hmo": {
    monthlyPremium: 0,
    maxOOP: 4900,
    starRating: 4.2,
    highlights: ["Built-in drug coverage", "Dental, vision, hearing and fitness extras", "Lower costs when you stay in network"],
  },
  "aarp-ma-ppo": {
    monthlyPremium: 0,
    maxOOP: 6500,
    starRating: 4.1,
    highlights: ["More provider flexibility", "No referrals for specialists", "Works well for travel or split-state living"],
  },
  "aarp-dual-complete": {
    monthlyPremium: 0,
    maxOOP: 0,
    starRating: 4.0,
    highlights: ["For people with Medicare and Medicaid", "Extra support for OTC, transportation or everyday needs", "Usually $0 premium"],
  },
  "aarp-medigap-g": {
    monthlyPremium: 165,
    maxOOP: 240,
    highlights: ["Predictable medical costs", "Any doctor who accepts Medicare", "Pairs with a standalone Part D plan"],
  },
  "aarp-medigap-n": {
    monthlyPremium: 120,
    maxOOP: 240,
    highlights: ["Lower premium than Plan G", "Nationwide Medicare doctor access", "Small office or ER copays may apply"],
  },
  "aarp-rx-walgreens": {
    monthlyPremium: 35,
    maxOOP: 0,
    highlights: ["Standalone Part D coverage", "Preferred Walgreens pricing", "Good fit alongside Original Medicare or Medigap"],
  },
  "aarp-rx-preferred": {
    monthlyPremium: 82,
    maxOOP: 0,
    highlights: ["Broad drug formulary", "Standalone Part D coverage", "Useful when prescriptions are a priority"],
  },
  "aarp-rx-saver": {
    monthlyPremium: 18,
    maxOOP: 0,
    highlights: ["Lowest-premium standalone Part D option", "Good fit for budget-sensitive shoppers", "Pairs with Original Medicare or Medigap"],
  },
};

export const PLAN_CATALOG: CatalogPlan[] = [
  {
    id: "aarp-ma-hmo",
    name: "AARP Medicare Advantage (HMO)",
    type: "MA-HMO",
    blurb: "Low premium HMO with $0 PCP visits and built-in Part D.",
    eligible: (i) => !hasMedicaid(i) && !wantsTravel(i),
    rationale: (i) =>
      i.zip?.value ? `Available in ZIP ${i.zip.value} with local network` : "Local network plan",
  },
  {
    id: "aarp-ma-ppo",
    name: "AARP Medicare Advantage (PPO)",
    type: "MA-PPO",
    blurb: "Nationwide PPO — see any Medicare provider, in or out of network.",
    eligible: (i) => !hasMedicaid(i),
    rationale: (i) =>
      wantsTravel(i) ? "Nationwide coverage fits your travel priority" : "Flexible out-of-network coverage",
  },
  {
    id: "aarp-dual-complete",
    name: "AARP Dual Complete (D-SNP)",
    type: "D-SNP",
    blurb: "$0 premium plan for people with both Medicare and Medicaid.",
    eligible: (i) => hasMedicaid(i),
    rationale: () => "Eligible because you have (or are applying for) Medicaid",
  },
  {
    id: "aarp-medigap-g",
    name: "AARP Medicare Supplement Plan G",
    type: "Medigap",
    blurb: "Most comprehensive Medigap — predictable out-of-pocket costs.",
    eligible: (i) => !hasMedicaid(i) && !budgetLow(i),
    rationale: () => "Predictable costs, any Medicare doctor nationwide",
  },
  {
    id: "aarp-medigap-n",
    name: "AARP Medicare Supplement Plan N",
    type: "Medigap",
    blurb: "Lower-premium Medigap with small copays.",
    eligible: (i) => !hasMedicaid(i),
    rationale: () => "Lower premium than Plan G with small office copays",
  },
  {
    id: "aarp-rx-walgreens",
    name: "AARP MedicareRx Walgreens (PDP)",
    type: "PDP",
    blurb: "Standalone Part D with preferred pricing at Walgreens.",
    eligible: (i) => !hasMedicaid(i) && hasDrugs(i),
    rationale: () => "Standalone drug plan to pair with Original Medicare or Medigap",
  },
  {
    id: "aarp-rx-preferred",
    name: "AARP MedicareRx Preferred (PDP)",
    type: "PDP",
    blurb: "Broad formulary Part D plan.",
    eligible: (i) => !hasMedicaid(i) && hasDrugs(i),
    rationale: () => "Broad formulary covers most common medications",
  },
  {
    id: "aarp-rx-saver",
    name: "AARP MedicareRx Saver Plus (PDP)",
    type: "PDP",
    blurb: "Lowest-premium standalone Part D option.",
    eligible: (i) => !hasMedicaid(i) && budgetLow(i),
    rationale: () => "Lowest premium standalone drug plan",
  },
];

export function computeMatches(intake: Intake): CatalogPlan[] {
  return PLAN_CATALOG.filter((p) => {
    try {
      return p.eligible(intake);
    } catch {
      return true;
    }
  });
}

export type CoverageStrategy = "medicare-advantage" | "medigap-plus-partd" | "dsnp";

/** Given a Medigap pick + intake, choose the best paired standalone Part D plan. */
export function pickPairedPdpId(intake: Intake): string {
  if (budgetLow(intake)) return "aarp-rx-saver";
  if (hasDrugs(intake)) return "aarp-rx-preferred";
  return "aarp-rx-walgreens";
}

export function buildInlinePlanRecommendations(intake: Intake) {
  const matches = computeMatches(intake).slice(0, 4);
  const fallback = PLAN_CATALOG.slice(0, 3);
  const selected = matches.length > 0 ? matches : fallback;

  // Score plans against intake to pick a single best fit.
  const scored = selected.map((plan) => {
    let score = 0;
    const details = PLAN_DETAILS[plan.id];
    if (hasMedicaid(intake) && plan.type === "D-SNP") score += 100;
    if (wantsTravel(intake) && plan.type === "Medigap") score += 40;
    if (wantsTravel(intake) && plan.type === "MA-PPO") score += 25;
    if (budgetLow(intake) && details && details.monthlyPremium <= 25) score += 25;
    if (hasDrugs(intake) && (plan.type === "MA-HMO" || plan.type === "MA-PPO" || plan.type === "D-SNP")) score += 15;
    if ((intake.doctors?.value || []).length > 0 && (plan.type === "MA-PPO" || plan.type === "Medigap")) score += 20;
    if (plan.type === "MA-HMO") score += 5;
    return { plan, score };
  });
  scored.sort((a, b) => b.score - a.score);
  let recommendedPlanId = scored[0]?.plan.id;
  const topPlan = scored[0]?.plan;

  // Derive strategy from the top pick.
  let strategy: CoverageStrategy = "medicare-advantage";
  let pairedPlanId: string | undefined;
  let strategyRationale = "";

  if (topPlan?.type === "D-SNP") {
    strategy = "dsnp";
    strategyRationale = "You qualify for both Medicare and Medicaid, so a Dual Special Needs Plan gives you $0 premium plus extra benefits — no separate drug plan needed.";
  } else if (topPlan?.type === "Medigap") {
    strategy = "medigap-plus-partd";
    pairedPlanId = pickPairedPdpId(intake);
    strategyRationale = "Medigap gives you nationwide freedom to see any doctor who takes Medicare, with predictable costs. Since Medigap doesn't include drug coverage, we pair it with a standalone Part D plan.";
  } else {
    strategy = "medicare-advantage";
    strategyRationale = "A Medicare Advantage plan bundles your medical coverage and prescription drugs into one plan, usually with extras like dental and vision — a good fit when convenience and low premium matter most.";
  }

  // Ensure paired PDP is in the plan list when Medigap strategy.
  let planList = selected;
  if (strategy === "medigap-plus-partd" && pairedPlanId) {
    const alreadyIncluded = planList.some((p) => p.id === pairedPlanId);
    if (!alreadyIncluded) {
      const pdp = PLAN_CATALOG.find((p) => p.id === pairedPlanId);
      if (pdp) planList = [...planList, pdp].slice(0, 4);
    }
  }

  const { pct } = computeProgress(intake);
  const confidence = Math.max(35, Math.min(98, pct));

  return {
    strategy,
    recommendedPlanId,
    pairedPlanId,
    strategyRationale,
    confidence,
    plans: planList.map((plan) => {
      const details = PLAN_DETAILS[plan.id] ?? {
        monthlyPremium: 0,
        maxOOP: 6700,
        highlights: [plan.blurb],
      };
      return {
        id: plan.id,
        name: plan.name,
        carrier: "CrinkleHealthcare",
        type: plan.type,
        monthlyPremium: details.monthlyPremium,
        maxOOP: details.maxOOP,
        starRating: details.starRating,
        highlights: details.highlights,
      };
    }),
    rationale: planList.map((plan) => ({
      planId: plan.id,
      reasons: [
        {
          label: "Current fit",
          detail: plan.rationale(intake),
          sourceField: intake.zip?.value ? "zip" : intake.medicaid?.value ? "medicaid" : "priorities",
        },
        {
          label: "Plan type",
          detail: plan.blurb,
          sourceField: "priorities",
        },
      ],
    })),
  };
}
