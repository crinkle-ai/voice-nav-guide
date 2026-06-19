import type { Persona } from "./personas";

export type Plan = {
  id: string;
  name: string;
  carrier: string;
  type: "Medicare Advantage" | "Medicare Supplement" | "PPO" | "HMO" | "PDP";
  premium: number; // monthly $
  blurb: string;
  // Need IDs this plan satisfies (must match persona.needs[].id)
  matches: string[];
  // Plain-language proof points keyed by need id
  proofs: Record<string, string>;
  // Optional: surface as one of Susan's two finalists
  finalist?: boolean;
};

export const plansByPersona: Record<Persona["id"], Plan[]> = {
  linda: [
    {
      id: "linda-1",
      name: "ClearStart Essentials",
      carrier: "BlueShield",
      type: "Medicare Supplement",
      premium: 142,
      blurb: "A simple Supplement plan paired with a starter drug plan — the most predictable monthly bill on this list.",
      matches: ["n-learn", "n-surprises", "n-costs", "n-expert"],
      proofs: {
        "n-learn": "Walkthrough videos and a glossary built into the member portal",
        "n-surprises": "Covers most of what Original Medicare leaves behind",
        "n-costs": "Flat monthly premium, predictable out-of-pocket",
        "n-expert": "Dedicated onboarding call with a licensed advisor",
      },
    },
    {
      id: "linda-2",
      name: "Aetna Simple Advantage",
      carrier: "Aetna",
      type: "Medicare Advantage",
      premium: 0,
      blurb: "A $0-premium Advantage plan with a clear out-of-pocket maximum and bundled basic drug coverage.",
      matches: ["n-learn", "n-surprises", "n-costs"],
      proofs: {
        "n-learn": "Plain-language plan summary mailed at enrollment",
        "n-surprises": "Capped yearly spending so big bills can't snowball",
        "n-costs": "$0 premium with a hard yearly cost ceiling",
      },
    },
    {
      id: "linda-3",
      name: "Humana Guided HMO",
      carrier: "Humana",
      type: "HMO",
      premium: 18,
      blurb: "Low premium with a single primary-care guide who helps you book everything.",
      matches: ["n-costs", "n-expert"],
      proofs: {
        "n-costs": "$18/month with predictable copays",
        "n-expert": "Personal care guide answers questions by phone",
      },
    },
  ],
  robert: [
    {
      id: "robert-1",
      name: "BlueShield Nationwide PPO",
      carrier: "BlueShield",
      type: "PPO",
      premium: 64,
      blurb: "Broad national PPO network that covers Minneapolis and Maricopa County without referrals.",
      matches: ["n-doctors", "n-rx", "n-travel", "n-balance"],
      proofs: {
        "n-doctors": "Dr. Patel and Dr. Chen confirmed in-network",
        "n-rx": "All 3 of your meds at Tier 1 or Tier 2",
        "n-travel": "Same coverage in MN and AZ — no out-of-area gap",
        "n-balance": "Mid-tier premium with one of the strongest networks",
      },
    },
    {
      id: "robert-2",
      name: "UnitedHealthcare AARP PPO",
      carrier: "UnitedHealthcare",
      type: "PPO",
      premium: 48,
      blurb: "Strong national network with one of the deepest drug formularies for cardiology meds.",
      matches: ["n-doctors", "n-rx", "n-travel"],
      proofs: {
        "n-doctors": "Dr. Patel in-network; Dr. Chen pending verification",
        "n-rx": "Atorvastatin, Lisinopril, and Metformin all Tier 1",
        "n-travel": "Nationwide coverage at in-network rates",
      },
    },
    {
      id: "robert-3",
      name: "Humana Local HMO Plus",
      carrier: "Humana",
      type: "HMO",
      premium: 0,
      blurb: "$0 premium with strong Minnesota coverage — limited outside the home service area.",
      matches: ["n-rx", "n-balance"],
      proofs: {
        "n-rx": "All 3 of your meds in-formulary",
        "n-balance": "$0 premium — but you'll trade some out-of-state access",
      },
    },
  ],
  susan: [
    {
      id: "susan-1",
      name: "BlueShield Choice PPO",
      carrier: "BlueShield",
      type: "PPO",
      premium: 38,
      finalist: true,
      blurb: "Lower premium, higher out-of-pocket maximum. Strong on flexibility.",
      matches: ["n-compare", "n-validate", "n-fineprint"],
      proofs: {
        "n-compare": "Side-by-side with AARP MedicareComplete ready",
        "n-validate": "Pressure-tested against your top 3 scenarios",
        "n-fineprint": "Plan documents annotated — no surprise exclusions found",
      },
    },
    {
      id: "susan-2",
      name: "AARP MedicareComplete HMO",
      carrier: "UnitedHealthcare",
      type: "HMO",
      premium: 0,
      finalist: true,
      blurb: "Higher premium savings, lower MOOP. Stronger if your year is heavy on care.",
      matches: ["n-compare", "n-validate", "n-fineprint"],
      proofs: {
        "n-compare": "Side-by-side with BlueShield Choice ready",
        "n-validate": "Confidence check covers cost, network, and Rx",
        "n-fineprint": "Referral rules surfaced so you know what to expect",
      },
    },
    {
      id: "susan-3",
      name: "Cigna Preferred PPO",
      carrier: "Cigna",
      type: "PPO",
      premium: 52,
      blurb: "A solid third option in case you want to revisit a plan outside your finalists.",
      matches: ["n-compare", "n-fineprint"],
      proofs: {
        "n-compare": "Drops cleanly into the side-by-side as a third column",
        "n-fineprint": "Plan documents reviewed for the same gotchas",
      },
    },
  ],
};