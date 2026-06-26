// Static reference content for the /v4 demo cheat sheet drawer.
// Mirrors documents/v4-demo-script-data.md — keep in sync.

export const SCRIPT_LINES: { label: string; value: string }[] = [
  { label: "ZIP", value: "55410" },
  { label: "Conditions", value: "type 2 diabetes, high blood pressure" },
  { label: "PCP", value: "Dr. Bruley (Family Med · NPI 1841403912)" },
  { label: "Endo", value: "Dr. Schuster (NPI 1861547382)" },
  { label: "Med 1", value: "Lantus 100 unit/mL — nightly" },
  { label: "Med 2", value: "Ozempic 1 mg — weekly" },
  { label: "Med 3", value: "metformin 500 mg — twice daily" },
  { label: "Premium cap", value: "$50 / month" },
  { label: "Deductible cap", value: "$300" },
  { label: "Extras", value: "dental, vision" },
  { label: "Medicaid", value: "No" },
];

export const READ_ALOUD = `I live in 55410. I have type 2 diabetes and high blood pressure. My PCP is Dr. Bruley, and I see Dr. Schuster for endocrinology. I take Lantus 100 units per mL, Ozempic 1 mg, and metformin 500 mg. I want my premium under $50 a month and my deductible under $300. Dental and vision matter. I'm not on Medicaid.`;

export const EXPECTED_RANKING: { rank: number; plan: string; why: string }[] = [
  { rank: 1, plan: "AARP MA Plan 2 (PPO)", why: "Covers Ozempic, best extras + MOOP" },
  { rank: 2, plan: "AARP MA Choice (PPO)", why: "Under budget but Ozempic not covered" },
  { rank: 3, plan: "AARP MA Choice HMO", why: "Ozempic needs step therapy + PA" },
  { rank: 4, plan: "AARP MA Patriot (HMO)", why: "Ozempic not covered, endo OON" },
  { rank: 5, plan: "Dual Complete D-SNP", why: "Would be #1 — blocked: no Medicaid" },
];

type Sig = "ok" | "warn" | "bad";
export const SIGNAL_MATRIX: {
  plan: string;
  network: Sig;
  formulary: Sig;
  budget: Sig;
  eligible: Sig;
}[] = [
  { plan: "Choice HMO", network: "ok", formulary: "warn", budget: "ok", eligible: "ok" },
  { plan: "Patriot HMO", network: "warn", formulary: "bad", budget: "ok", eligible: "ok" },
  { plan: "Choice PPO", network: "ok", formulary: "bad", budget: "ok", eligible: "ok" },
  { plan: "Plan 2 PPO", network: "ok", formulary: "ok", budget: "bad", eligible: "ok" },
  { plan: "D-SNP", network: "ok", formulary: "ok", budget: "ok", eligible: "bad" },
];

export const VARIATIONS: { say: string; expect: string }[] = [
  { say: '"Actually, I do have Medicaid"', expect: "D-SNP jumps to #1" },
  { say: '"Raise my premium cap to $100"', expect: "Plan 2 PPO unlocks" },
  { say: '"My eye doctor is Dr. Bailey"', expect: "PPOs win, HMOs drop" },
  { say: '"My endo is Dr. Bergenstal"', expect: "Patriot HMO drops out" },
  { say: '"Drop Ozempic"', expect: "Patriot HMO + Choice PPO recover" },
  { say: '"Dr. Smithers is my doctor"', expect: "NPPES flags ambiguous" },
];
