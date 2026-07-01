export type Plan = {
  id: string;
  name: string;
  carrier: string;
  type: "HMO" | "PPO" | "HMO-POS" | "SNP";
  monthlyPremium: number;
  moop: number;
  pcpCopay: number;
  specialistCopay: number;
  drugDeductible: number;
  network: "narrow" | "regional" | "broad";
  doctorsInNetwork: string[];
  formularyTiers: Record<string, 1 | 2 | 3 | 4>;
  extras: ("dental" | "vision" | "hearing" | "fitness" | "transportation" | "otc")[];
  highlight: string;
};

export const MOCK_PLANS: Plan[] = [
  {
    id: "uhc-essential-hmo",
    name: "AARP Medicare Advantage Essential",
    carrier: "Crinkle Health",
    type: "HMO",
    monthlyPremium: 0,
    moop: 6700,
    pcpCopay: 0,
    specialistCopay: 35,
    drugDeductible: 0,
    network: "regional",
    doctorsInNetwork: ["dr. patel", "dr. nguyen", "dr. johnson", "dr. lee"],
    formularyTiers: { metformin: 1, lisinopril: 1, atorvastatin: 1, eliquis: 3, jardiance: 3 },
    extras: ["dental", "vision", "fitness", "otc"],
    highlight: "$0 premium with strong everyday extras",
  },
  {
    id: "uhc-choice-ppo",
    name: "AARP Medicare Advantage Choice PPO",
    carrier: "Crinkle Health",
    type: "PPO",
    monthlyPremium: 39,
    moop: 5500,
    pcpCopay: 10,
    specialistCopay: 45,
    drugDeductible: 0,
    network: "broad",
    doctorsInNetwork: ["dr. patel", "dr. nguyen", "dr. johnson", "dr. lee", "dr. garcia", "dr. williams", "dr. brown"],
    formularyTiers: { metformin: 1, lisinopril: 1, atorvastatin: 1, eliquis: 3, jardiance: 3, ozempic: 4 },
    extras: ["dental", "vision", "hearing", "fitness"],
    highlight: "See any provider — in or out of network",
  },
  {
    id: "uhc-patriot-hmo",
    name: "AARP Medicare Advantage Patriot",
    carrier: "Crinkle Health",
    type: "HMO",
    monthlyPremium: 0,
    moop: 8300,
    pcpCopay: 0,
    specialistCopay: 50,
    drugDeductible: 0,
    network: "narrow",
    doctorsInNetwork: ["dr. patel", "dr. johnson"],
    formularyTiers: { metformin: 1, lisinopril: 1, atorvastatin: 1 },
    extras: ["fitness"],
    highlight: "Lowest cost — best for healthy, infrequent users",
  },
  {
    id: "uhc-rx-saver",
    name: "AARP Medicare Advantage Rx Saver",
    carrier: "Crinkle Health",
    type: "HMO-POS",
    monthlyPremium: 22,
    moop: 5900,
    pcpCopay: 5,
    specialistCopay: 40,
    drugDeductible: 0,
    network: "regional",
    doctorsInNetwork: ["dr. patel", "dr. nguyen", "dr. johnson", "dr. lee", "dr. garcia"],
    formularyTiers: { metformin: 1, lisinopril: 1, atorvastatin: 1, eliquis: 2, jardiance: 2, ozempic: 3, humira: 4 },
    extras: ["dental", "vision", "otc"],
    highlight: "Best drug coverage — strong formulary on common brand names",
  },
  {
    id: "uhc-complete-ppo",
    name: "AARP Medicare Advantage Complete PPO",
    carrier: "Crinkle Health",
    type: "PPO",
    monthlyPremium: 79,
    moop: 4500,
    pcpCopay: 0,
    specialistCopay: 30,
    drugDeductible: 0,
    network: "broad",
    doctorsInNetwork: ["dr. patel", "dr. nguyen", "dr. johnson", "dr. lee", "dr. garcia", "dr. williams", "dr. brown", "dr. davis"],
    formularyTiers: { metformin: 1, lisinopril: 1, atorvastatin: 1, eliquis: 2, jardiance: 2, ozempic: 3 },
    extras: ["dental", "vision", "hearing", "fitness", "transportation", "otc"],
    highlight: "All-inclusive — lowest out-of-pocket max with every extra",
  },
  {
    id: "uhc-dual-snp",
    name: "Crinkle Health Dual Complete (D-SNP)",
    carrier: "Crinkle Health",
    type: "SNP",
    monthlyPremium: 0,
    moop: 3500,
    pcpCopay: 0,
    specialistCopay: 0,
    drugDeductible: 0,
    network: "regional",
    doctorsInNetwork: ["dr. patel", "dr. nguyen", "dr. johnson"],
    formularyTiers: { metformin: 1, lisinopril: 1, atorvastatin: 1, eliquis: 2, jardiance: 2 },
    extras: ["dental", "vision", "hearing", "fitness", "transportation", "otc"],
    highlight: "For people with Medicare AND Medicaid — $0 cost share",
  },
];
