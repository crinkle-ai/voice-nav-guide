import type { Intake } from "./v3/intake-types";
import { rankPlans as rankPlansV3, type ScoredPlan } from "./v3/match-plans";

export type LensKey =
  | "doctor-first"
  | "drug-first"
  | "lowest-cost"
  | "extras"
  | "balanced";

export type Lens = {
  key: LensKey;
  label: string;
  rationale: string;
};

const LENS_LABELS: Record<LensKey, string> = {
  "doctor-first": "Keep your doctors",
  "drug-first": "Cover your medications",
  "lowest-cost": "Lowest total cost",
  extras: "Best extras (dental, vision, hearing)",
  balanced: "Balanced fit",
};

const norm = (s: string) => s.trim().toLowerCase();

const PATH_TO_LENS: Record<string, LensKey> = {
  "doctor-first": "doctor-first",
  "drug-first": "drug-first",
  "budget-first": "lowest-cost",
  "new-to-medicare": "balanced",
};

export function deriveLens(
  intake: Intake,
  opts?: { hybridPath?: string | null },
): Lens {
  // Explicit Shop-Your-Way path wins.
  if (opts?.hybridPath) {
    const key = PATH_TO_LENS[opts.hybridPath];
    if (key) {
      return {
        key,
        label: LENS_LABELS[key],
        rationale: `You chose the "${opts.hybridPath.replace(/-/g, " ")}" path — ranking plans on that signal first.`,
      };
    }
  }
  const priorities = intake.priorities.value.map(norm).join(" ");
  const budget = intake.budgetSensitivity.value;
  const docs = intake.doctors.value.length;
  const meds = intake.medications.value.length;
  const extras = intake.extras.value.length;

  // Explicit priority signals dominate
  if (/doctor|specialist|network|keep my/.test(priorities) && docs > 0) {
    return {
      key: "doctor-first",
      label: LENS_LABELS["doctor-first"],
      rationale: `You named ${docs} doctor${docs === 1 ? "" : "s"} you want to keep — we'll rank plans by network fit first.`,
    };
  }
  if (/drug|prescription|medication|formulary|rx/.test(priorities) && meds > 0) {
    return {
      key: "drug-first",
      label: LENS_LABELS["drug-first"],
      rationale: `You listed ${meds} prescription${meds === 1 ? "" : "s"} — we'll rank by drug coverage and tier.`,
    };
  }
  if (budget === "high" || /low.*cost|cheap|premium|budget|afford/.test(priorities)) {
    return {
      key: "lowest-cost",
      label: LENS_LABELS["lowest-cost"],
      rationale: "Tight budget — we'll lead with $0-premium plans and lowest out-of-pocket.",
    };
  }
  if (/dental|vision|hearing|silversneakers|gym|fitness/.test(priorities) || extras > 1) {
    return {
      key: "extras",
      label: LENS_LABELS["extras"],
      rationale: "You care about benefits beyond medical — plans with strong extras rise to the top.",
    };
  }
  // Smart defaults from intake shape
  if (docs >= meds && docs > 0) {
    return {
      key: "doctor-first",
      label: LENS_LABELS["doctor-first"],
      rationale: `${docs} doctor${docs === 1 ? "" : "s"} on your list — ranking by network fit first.`,
    };
  }
  if (meds > 0) {
    return {
      key: "drug-first",
      label: LENS_LABELS["drug-first"],
      rationale: `${meds} prescription${meds === 1 ? "" : "s"} on your list — ranking by drug coverage.`,
    };
  }
  return {
    key: "balanced",
    label: LENS_LABELS.balanced,
    rationale: "We'll balance network, drugs, and cost equally until you tell us more.",
  };
}

export const ALL_LENSES: { key: LensKey; label: string }[] = (
  Object.keys(LENS_LABELS) as LensKey[]
).map((k) => ({ key: k, label: LENS_LABELS[k] }));

/** Re-rank plans, biasing by lens on top of base score. */
export function rankPlansByLens(intake: Intake, lens: LensKey): ScoredPlan[] {
  const base = rankPlansV3(intake);
  return base
    .map((sp) => {
      let bias = 0;
      const p = sp.plan;
      if (lens === "doctor-first") {
        bias += sp.doctorHits.length * 10;
        if (p.network === "broad") bias += 6;
      } else if (lens === "drug-first") {
        const covered = sp.drugCoverage.filter((d) => d.tier !== null);
        bias += covered.length * 8;
        const avgTier =
          covered.length ? covered.reduce((a, c) => a + (c.tier ?? 0), 0) / covered.length : 5;
        bias += (5 - avgTier) * 3;
      } else if (lens === "lowest-cost") {
        bias += p.monthlyPremium === 0 ? 18 : -p.monthlyPremium / 8;
        bias += (10000 - p.moop) / 600;
      } else if (lens === "extras") {
        bias += p.extras.length * 5;
      }
      return { ...sp, score: sp.score + bias };
    })
    .sort((a, b) => b.score - a.score);
}

export { type ScoredPlan } from "./v3/match-plans";
export { LENS_LABELS };
