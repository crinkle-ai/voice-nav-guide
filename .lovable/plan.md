## Goal

Make the /v4 matching feel real for a Minneapolis (55410) diabetic on insulin + GLP-1. The user enters real providers and real medications; the tool maps those against five demo plans authored for the local market and ranks them by network, formulary, and budget fit.

## 1. Seed real provider data (NPPES → DB)

New Lovable Cloud table `providers_55410` with columns:
- npi (text, unique), first_name, last_name, credential, primary_taxonomy, specialty_label
- address_line1, city, state, zip, phone
- in_network_plans (text[]) — which demo plan ids accept this provider

Seeded once from NPPES via a one-off server function `seedProviders55410` (admin-gated; supabaseAdmin inside handler). It pulls a curated set of taxonomies in ZIP 55410 + nearby Edina/Minneapolis ZIPs:
- Family Medicine / Internal Medicine (PCPs) — ~8
- Endocrinology — ~4
- Ophthalmology + Optometry (diabetic retinopathy screening) — ~3
- Podiatry — ~2
- Cardiology — ~2
- Nephrology — ~1

After fetch, we hand-assign each provider to a subset of the 5 demo plan networks so the in/out-of-network story is deterministic.

Public read policy `TO anon SELECT` (non-sensitive directory data).

## 2. Canonical medication catalog (RxNorm)

New table `medications_catalog`:
- rxcui (text, unique), name, tty, ingredient, brand_names (text[]), is_glp1, is_insulin

Pre-populate via migration insert with the 3 demo meds resolved through existing RxNorm helpers:
- Lantus (insulin glargine) — SBD
- Ozempic (semaglutide) — SBD
- metformin 500 mg — SCD

Also a `plan_formulary` table joining plans ↔ rxcui with: tier (1–5), prior_auth (bool), step_therapy (bool), quantity_limit (text|null), preferred_pharmacy_copay (numeric), standard_copay (numeric).

Public anon SELECT on both.

## 3. Five demo plans for 55410

New table `demo_plans_55410`:
- id, name, type ('MA-HMO'|'MA-PPO'|'D-SNP'), carrier
- monthly_premium, annual_deductible, moop, pcp_copay, specialist_copay
- network_id (text) — joins to providers_55410.in_network_plans
- extras (text[]), star_rating
- summary, highlights (text[])

Seeded plans (representative — final pricing tuned to UHC/Twin Cities reality):
1. UHC AARP Medicare Advantage Choice Plan 1 (HMO) — $0 premium, $4,900 MOOP, narrow Allina/Fairview network
2. UHC AARP Medicare Advantage Patriot (HMO) — $0 premium, higher copays, broadest local HMO network
3. UHC AARP Medicare Advantage Choice (PPO) — $39 premium, nationwide PPO, $6,700 MOOP
4. UHC AARP Medicare Advantage Plan 2 (PPO) — $89 premium, $4,500 MOOP, richer extras (dental/vision/hearing)
5. UHC Dual Complete MN-Y001 (D-SNP) — $0 premium, requires Medicaid, $0 MOOP, OTC + transportation

Plan ↔ provider mapping authored so the demo is interesting:
- Patient's PCP in network on all 5 (common Fairview practice)
- Endocrinologist in network on HMO Choice, both PPOs, D-SNP — NOT on Patriot
- Ophthalmologist in network on PPOs only (story: HMOs require referral + narrower)
- Podiatrist: PPOs + D-SNP

Plan ↔ formulary mapping:
- Lantus: Tier 3 with PA on Choice HMO; Tier 2 on PPOs; Tier 2 + $0 copay on D-SNP; NOT preferred on Patriot HMO
- Ozempic: Tier 3 with step therapy on Choice HMO; Tier 3 on Plan 2 PPO; NOT covered on Patriot HMO and Choice PPO (story: forces conversation about formulary differences)
- Metformin: Tier 1 everywhere

## 4. Scoring upgrade

Rewrite `src/lib/v4/match-plans.ts` (fork of v3's `match-plans.ts`) to source from the new tables via a new server function `loadDemoMatchInputs` that returns `{ plans, formulary, providerNetworkIndex }`. The function called by /v4/matches becomes a server fn `rankDemoPlans(intake)` returning `ScoredPlan[]` already enriched.

Scoring buckets (transparent weights surfaced in the UI):
- Network fit (35): % of intake doctors verified+in network for the plan
- Formulary fit (30): coverage ratio × tier weighting; PA/step therapy = concern, not a hard block; uncovered drug = large penalty
- Budget fit (20): user's preferred max premium and deductible (new intake fields, see §5) → distance-based score
- Extras fit (10): overlap with intake.extras
- Star rating (5)

Each plan card shows per-bucket badges: "3/3 doctors in network", "All meds covered, 1 needs prior auth", "$0 premium fits your $50 cap", "Dental + vision included".

## 5. Intake additions for budget

Extend `IntakeSchema` with:
- `budget.monthlyPremiumMax` (number | null)
- `budget.annualDeductibleMax` (number | null)

Keep `budgetSensitivity` for the existing conversational flow; the new fields are populated by the wizard step and a new chip in ramble ("My ceiling is $X/mo"). Workspace drawer renders them.

## 6. "Load diabetic 55410 demo" affordance

Small dev button on /v4 landing (and a `?demo=diabetes-55410` query param) that pre-fills the session with:
- ZIP 55410
- Conditions: type 2 diabetes, hypertension
- Doctors: 2 of the seeded providers (PCP + endocrinologist) — by name only, so auto-verify still runs against NPPES to prove the round-trip
- Medications: Lantus 100 u/mL, Ozempic 1 mg, metformin 500 mg
- Budget caps: $50/mo premium, $300 deductible
- Extras: dental, vision

User can then walk into /v4/matches and see the 5 plans scored against real data.

## Technical notes

- All Supabase reads in scoring go through server fns; loaders never query directly.
- `seedProviders55410` is admin-only (requireSupabaseAuth + has_role check) and idempotent (upsert on npi). Not exposed in UI; invoked once via `stack_modern--invoke-server-function`.
- Existing `verifyProvider` / `verifyMedication` continue to run live against NPPES/RxNorm so user-typed entries are still validated; the DB just gives scoring something authoritative to match against.
- Match scoring functions stay pure; the server fn fetches inputs and passes them in, so unit-test-friendly.
- No changes to V1/V2/V3.

## Out of scope

- Editing existing UHC plan PDFs / pulling live formularies from CMS — values are hand-curated to make the demo coherent.
- Coverage outside ZIP 55410.
- Persisting user intake across sessions to the DB (still localStorage).
