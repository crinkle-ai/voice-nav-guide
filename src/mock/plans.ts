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
  // Optional: surface as one of the finalists
  finalist?: boolean;
};

export const robertPlans: Plan[] = [
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
    finalist: true,
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
    finalist: true,
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
];

export const plansByPersona: Record<Persona["id"], Plan[]> = {
  robert: robertPlans,
};
