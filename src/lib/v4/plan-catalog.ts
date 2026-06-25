import type { Intake } from "@/lib/v3/intake-types";

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
