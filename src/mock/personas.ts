export type ActivityId =
  | "medicare-basics"
  | "learn-plan-types"
  | "compare-coverage-models"
  | "review-costs"
  | "speak-expert"
  | "enrollment-review"
  | "verify-doctors"
  | "review-prescriptions"
  | "evaluate-travel"
  | "compare-plans"
  | "expert-review"
  | "enroll"
  | "compare-final-plans"
  | "evaluate-tradeoffs"
  | "confidence-review"
  | "enrollment-readiness"
  | "dental-vision"
  | "spousal-coordination"
  | "spouse-future-enrollment";

export type RouteStep = {
  id: string;
  label: string;
  activity: ActivityId;
  status: "completed" | "current" | "upcoming";
  confidenceImpact: number;
  estMinutes: number;
  optional?: boolean;
};

export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  location: string;
  status: "in-network" | "verifying" | "out-of-network" | "unknown";
};

export type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  tier?: string;
};

export type Question = { id: string; text: string; answered: boolean };
export type Note = { id: string; text: string; source?: string };

export type NeedCard = {
  id: string;
  icon:
    | "compass"
    | "shield"
    | "wallet"
    | "headset"
    | "stethoscope"
    | "pill"
    | "plane"
    | "scale"
    | "git-compare"
    | "check-circle"
    | "file-search";
  label: string;
  subLabel: string;
};

export type RouteDriver = {
  id: string;
  label: string;
  hint: string;
  icon: NeedCard["icon"] | "book" | "users" | "list-checks" | "clipboard" | "thumbs-up";
  estMinutes: number;
};

export type PlanFilter = {
  id: string;
  label: string;
  hint: string;
};

export type Persona = {
  id: "robert";
  name: string;
  age: number;
  hue: number;
  situationOneLiner: string;
  startingConfidence: number;
  ramble: string;
  understanding: {
    priorities: string[];
    concerns: string[];
    knowledgeLevel: "Beginner" | "Intermediate" | "Advanced";
    confidence: number;
  };
  narrativeMirror: string;
  needs: NeedCard[];
  routeDrivers: RouteDriver[];
  planFilters: PlanFilter[];
  whatMattersMost: string[];
  doctors: Doctor[];
  medications: Medication[];
  questions: Question[];
  notes: Note[];
  route: RouteStep[];
  progressPct: number;
  adaptiveMoment?: {
    afterActivity: ActivityId;
    newConcern: string;
    insertStep: RouteStep;
    toast: string;
  };
  extraRamble?: {
    promptLabel: string;
    placeholder: string;
    ramble: string;
    summary: string;
    newConcern: string;
    newPriority?: string;
    newQuestion?: string;
    confidenceImpact: number;
    insertStep: RouteStep;
    toast: string;
  };
};

export const persona: Persona = {
  id: "robert",
  name: "Robert",
  age: 67,
  hue: 200,
  situationOneLiner: "Splits the year between MN and AZ. Doctors come first.",
  startingConfidence: 6,
  ramble:
    "I've already done quite a bit of research. My biggest concern is making sure I can keep my primary care doctor and my cardiologist. I also travel between Minnesota and Arizona throughout the year and I take several prescriptions. Cost matters, but keeping my doctors matters more.",
  understanding: {
    priorities: ["Keep doctors", "Prescription coverage", "Travel flexibility"],
    concerns: ["Provider networks", "Coverage restrictions"],
    knowledgeLevel: "Intermediate",
    confidence: 6,
  },
  narrativeMirror:
    "Here's what I'm hearing from you — keeping your doctors is the most important thing, especially Dr. Patel and Dr. Chen. You split your year between Minnesota and Arizona, so you need a plan that follows you across state lines, not one that only works at home. You take a few prescriptions and you want the monthly math to stay predictable. Cost matters to you — but not more than access to the people who already know your care.",
  needs: [
    { id: "n-doctors", icon: "stethoscope", label: "Keep my doctors", subLabel: "Prioritize plans with my providers in-network" },
    { id: "n-rx", icon: "pill", label: "Cover my prescriptions", subLabel: "Plans with strong drug coverage" },
    { id: "n-travel", icon: "plane", label: "Stay covered when I travel", subLabel: "Out-of-network or nationwide coverage" },
    { id: "n-balance", icon: "scale", label: "Balance cost and access", subLabel: "Cost matters, but not more than access" },
  ],
  routeDrivers: [
    { id: "rd-doctors", label: "Verify my doctors are covered", hint: "Dr. Patel and Dr. Chen — confirm in-network", icon: "stethoscope", estMinutes: 8 },
    { id: "rd-rx", label: "Check my prescriptions", hint: "How your 3 meds price under each plan", icon: "pill", estMinutes: 7 },
    { id: "rd-compare", label: "Compare matching plans", hint: "Side-by-side on what actually matters to you", icon: "git-compare", estMinutes: 12 },
    { id: "rd-enroll", label: "Confirm enrollment", hint: "Lock in the plan and start date", icon: "clipboard", estMinutes: 10 },
  ],
  planFilters: [
    { id: "pf-network", label: "In-network for Dr. Patel & Dr. Chen", hint: "Plans that keep your current care team" },
    { id: "pf-multistate", label: "Multi-state PPO coverage", hint: "Works in both MN and AZ at in-network rates" },
    { id: "pf-formulary", label: "Strong drug formulary", hint: "Tier 1–2 coverage for your cardiology meds" },
    { id: "pf-balanced", label: "Balanced premium", hint: "Mid-tier monthly cost in exchange for network depth" },
  ],
  whatMattersMost: [
    "Keeping Dr. Patel (primary) and Dr. Chen (cardiology)",
    "Coverage that works in both Minnesota and Arizona",
    "Predictable monthly cost for prescriptions",
  ],
  doctors: [
    { id: "d1", name: "Dr. Anika Patel", specialty: "Primary Care", location: "Minneapolis, MN", status: "in-network" },
    { id: "d2", name: "Dr. Marcus Chen", specialty: "Cardiology", location: "Minneapolis, MN", status: "verifying" },
  ],
  medications: [
    { id: "m1", name: "Atorvastatin", dosage: "20 mg", frequency: "Daily", tier: "Tier 1" },
    { id: "m2", name: "Lisinopril", dosage: "10 mg", frequency: "Daily", tier: "Tier 1" },
    { id: "m3", name: "Metformin", dosage: "500 mg", frequency: "Twice daily", tier: "Tier 2" },
  ],
  questions: [
    { id: "q1", text: "Does this plan's network cover Arizona providers?", answered: false },
    { id: "q2", text: "Will I need referrals to see Dr. Chen?", answered: false },
  ],
  notes: [
    { id: "n1", text: "In Arizona Nov–Mar. Need confirmed coverage in Maricopa County.", source: "Saved from intake" },
    { id: "n2", text: "Dr. Chen is non-negotiable.", source: "Pinned" },
  ],
  progressPct: 38,
  route: [
    { id: "s1", label: "Verify Doctors", activity: "verify-doctors", status: "completed", confidenceImpact: 2, estMinutes: 8 },
    { id: "s2", label: "Review Prescriptions", activity: "review-prescriptions", status: "current", confidenceImpact: 1, estMinutes: 7 },
    { id: "s3", label: "Compare Plans", activity: "compare-plans", status: "upcoming", confidenceImpact: 2, estMinutes: 12 },
    { id: "s4", label: "Talk to a licensed advisor", activity: "expert-review", status: "upcoming", confidenceImpact: 1, estMinutes: 20, optional: true },
    { id: "s5", label: "Enroll", activity: "enroll", status: "upcoming", confidenceImpact: 1, estMinutes: 10 },
  ],
  adaptiveMoment: {
    afterActivity: "review-prescriptions",
    newConcern: "Multi-state coverage",
    toast: "We noticed you split the year between MN and AZ. Added 'Evaluate Travel Needs' to your route.",
    insertStep: { id: "s2b", label: "Evaluate Travel Needs", activity: "evaluate-travel", status: "current", confidenceImpact: 2, estMinutes: 6 },
  },
  extraRamble: {
    promptLabel: "Anything else we should know?",
    placeholder: "Family, finances, anything that affects this decision…",
    ramble:
      "One thing I didn't mention — my wife is also on Medicare. We've been on separate plans and I'm pretty sure we're double-paying for some stuff. I'd love to coordinate so we're not duplicating coverage.",
    summary: "Robert wants to coordinate coverage with his wife's plan.",
    newConcern: "Spousal coordination",
    newPriority: "Avoid double-paying with my spouse's plan",
    newQuestion: "Where is our coverage overlapping and what can we drop?",
    confidenceImpact: 1,
    toast: "Got it — added a step to coordinate with your wife's plan.",
    insertStep: { id: "s-extra-robert", label: "Coordinate With Spouse's Plan", activity: "spousal-coordination", status: "current", confidenceImpact: 1, estMinutes: 7 },
  },
};

// Backwards-compatible helpers (single persona).
export const personas: Persona[] = [persona];
export const getPersona = (_id?: string): Persona => persona;

export type Activity = {
  id: ActivityId;
  title: string;
  objective: string;
  whyItMatters: string;
  kind: "lesson" | "doctors" | "medications" | "compare" | "expert" | "enroll" | "travel" | "tradeoffs" | "confidence" | "readiness";
  estMinutes: number;
};

export const activities: Record<ActivityId, Activity> = {
  "medicare-basics": { id: "medicare-basics", title: "Medicare Basics", estMinutes: 8, kind: "lesson", objective: "Understand what Medicare is, what it covers, and what it doesn't.", whyItMatters: "Every decision downstream sits on top of these four parts. Ten minutes here saves weeks of confusion." },
  "learn-plan-types": { id: "learn-plan-types", title: "Learn Plan Types", estMinutes: 10, kind: "lesson", objective: "Tell the difference between Original Medicare + Supplement vs. Medicare Advantage.", whyItMatters: "These are two genuinely different ways to get coverage. Picking the model is the biggest choice you'll make." },
  "compare-coverage-models": { id: "compare-coverage-models", title: "Compare Coverage Models", estMinutes: 7, kind: "compare", objective: "See the everyday tradeoffs in cost, flexibility, and paperwork.", whyItMatters: "The right model depends on how you actually use care — not which one sounds better on paper." },
  "review-costs": { id: "review-costs", title: "Review Costs", estMinutes: 6, kind: "lesson", objective: "Understand premiums, deductibles, and out-of-pocket maximums.", whyItMatters: "A low premium can hide a high yearly cost. We'll show you the all-in number." },
  "speak-expert": { id: "speak-expert", title: "Speak with an Expert", estMinutes: 20, kind: "expert", objective: "Talk through your situation with a licensed advisor.", whyItMatters: "A 20-minute call often resolves what hours of reading can't." },
  "enrollment-review": { id: "enrollment-review", title: "Enrollment Review", estMinutes: 10, kind: "enroll", objective: "Confirm timing, paperwork, and what to expect on day one.", whyItMatters: "Missing your enrollment window can mean lifelong late penalties." },
  "verify-doctors": { id: "verify-doctors", title: "Verify Doctors", estMinutes: 8, kind: "doctors", objective: "Confirm every doctor you want to keep is in-network.", whyItMatters: "Networks change every year. The wrong plan can quietly drop the doctor you trust most." },
  "review-prescriptions": { id: "review-prescriptions", title: "Review Prescriptions", estMinutes: 7, kind: "medications", objective: "Check how your medications are priced under each plan's formulary.", whyItMatters: "A single mid-tier drug can shift your yearly cost by thousands." },
  "evaluate-travel": { id: "evaluate-travel", title: "Evaluate Travel Needs", estMinutes: 6, kind: "travel", objective: "Make sure your plan works in every state you live in.", whyItMatters: "Some Advantage plans only cover routine care in a single service area." },
  "compare-plans": { id: "compare-plans", title: "Compare Plans", estMinutes: 12, kind: "compare", objective: "Side-by-side the plans that match what matters most to you.", whyItMatters: "We hide the noise and surface only the differences that affect your situation." },
  "expert-review": { id: "expert-review", title: "Expert Review", estMinutes: 20, kind: "expert", objective: "Have a licensed advisor pressure-test your top choice.", whyItMatters: "A second set of eyes catches the things a website can't." },
  enroll: { id: "enroll", title: "Enroll", estMinutes: 10, kind: "enroll", objective: "Submit your enrollment and confirm coverage start date.", whyItMatters: "This is the final step. We'll walk you through it field-by-field." },
  "compare-final-plans": { id: "compare-final-plans", title: "Compare Final Plans", estMinutes: 12, kind: "compare", objective: "Lock in a clean side-by-side of your two finalists.", whyItMatters: "At this stage, the goal is clarity — not more options." },
  "evaluate-tradeoffs": { id: "evaluate-tradeoffs", title: "Evaluate Tradeoffs", estMinutes: 8, kind: "tradeoffs", objective: "Quantify the tradeoffs that actually matter to you.", whyItMatters: "Every plan has a tradeoff. Naming yours makes the decision feel earned." },
  "confidence-review": { id: "confidence-review", title: "Confidence Review", estMinutes: 5, kind: "confidence", objective: "A quick gut-check before you commit.", whyItMatters: "If something still feels off, this is the moment to name it." },
  "enrollment-readiness": { id: "enrollment-readiness", title: "Enrollment Readiness", estMinutes: 4, kind: "readiness", objective: "Confirm everything you need to enroll smoothly.", whyItMatters: "Five minutes here prevents the most common enrollment hiccups." },
  "dental-vision": { id: "dental-vision", title: "Dental & Vision Add-ons", estMinutes: 6, kind: "lesson", objective: "See which plans bundle dental and vision — and what's actually covered.", whyItMatters: "These benefits vary wildly between plans and are easy to overlook until you need them." },
  "spousal-coordination": { id: "spousal-coordination", title: "Coordinate With Spouse's Plan", estMinutes: 7, kind: "compare", objective: "Make sure your plan and your spouse's plan don't duplicate coverage you're paying twice for.", whyItMatters: "Couples often pay for overlapping benefits that one plan already provides." },
  "spouse-future-enrollment": { id: "spouse-future-enrollment", title: "Plan Ahead for Spouse's Enrollment", estMinutes: 6, kind: "readiness", objective: "Map the timing so your plans line up when your spouse joins Medicare.", whyItMatters: "A little planning now avoids a gap or a mismatched enrollment window next year." },
};
