# V4 Demo Data — Minneapolis 55410 Diabetic Scenario

This document summarizes the seeded demo data and matching architecture that powers the `/v4/matches` experience for a Minneapolis (ZIP 55410) diabetic patient on insulin + GLP-1.

## Goal

Make `/v4` plan matching feel real: the user enters real providers and real medications, and the tool maps those against five demo plans authored for the local 55410 market, then ranks them by network, formulary, and budget fit.

---

## 1. Providers — `providers_55410`

Real Twin Cities providers seeded once from the NPPES NPI Registry, then hand-mapped to demo plan networks for a deterministic in/out-of-network story.

| Column | Notes |
|---|---|
| `npi` | NPPES NPI (unique) |
| `first_name`, `last_name`, `credential` | From NPPES |
| `primary_taxonomy`, `specialty_label` | Taxonomy code + human label |
| `address_line1`, `city`, `state`, `zip`, `phone` | Practice location |
| `in_network_plans` | `text[]` of `demo_plans_55410.id` values |

**Curated taxonomy mix** (~20 providers across ZIP 55410 + nearby Edina / Minneapolis):

- Family Medicine / Internal Medicine (PCPs) — ~8
- Endocrinology — ~4
- Ophthalmology + Optometry (diabetic retinopathy screening) — ~3
- Podiatry — ~2
- Cardiology — ~2
- Nephrology — ~1

**Access:** public `TO anon SELECT` (directory data is non-sensitive). Writes denied.

---

## 2. Medications — RxNorm-coded catalog

Three demo medications resolved through the existing RxNorm helpers:

| Drug | RxCUI | Class |
|---|---|---|
| Lantus (insulin glargine) | `261551` | Long-acting insulin (SBD) |
| Ozempic (semaglutide) | `1991302` | GLP-1 agonist (SBD) |
| metformin 500 mg | `860975` | Biguanide (SCD) |

### `plan_formulary_55410`

Joins `demo_plans_55410.id` ↔ `rxcui` with: `tier` (1–5), `covered`, `prior_auth`, `step_therapy`, `quantity_limit`, `preferred_copay`, `standard_copay`, `notes`.

**Formulary story across the five plans:**

| Drug | Choice HMO | Patriot HMO | Choice PPO | Plan 2 PPO | Dual Complete D-SNP |
|---|---|---|---|---|---|
| Lantus | Tier 3 + PA | **Not preferred** | Tier 2 | Tier 2 | Tier 2 ($0 copay) |
| Ozempic | Tier 3 + step therapy | **Not covered** | **Not covered** | Tier 3 | Tier 2 |
| Metformin | Tier 1 | Tier 1 | Tier 1 | Tier 1 | Tier 1 |

Designed to force real-world tradeoff conversations (formulary differences, PA hurdles, step therapy).

---

## 3. Demo Plans — `demo_plans_55410`

Five CHC-style Medicare Advantage plans hand-tuned for the Twin Cities market.

| # | Plan | Type | Premium | Deductible | MOOP | Notes |
|---|---|---|---|---|---|---|
| 1 | CHC AARP Medicare Advantage Choice Plan 1 | MA-HMO | $0 | $0 | $4,900 | Narrow Allina/Fairview network |
| 2 | CHC AARP Medicare Advantage Patriot | MA-HMO | $0 | $0 | higher copays | Broadest local HMO network |
| 3 | CHC AARP Medicare Advantage Choice | MA-PPO | $39 | low | $6,700 | Nationwide PPO |
| 4 | CHC AARP Medicare Advantage Plan 2 | MA-PPO | $89 | $0 | $4,500 | Rich extras (dental / vision / hearing) |
| 5 | CHC Dual Complete MN-Y001 | D-SNP | $0 | $0 | $0 | **Requires Medicaid**; OTC + transportation |

Columns also include `pcp_copay`, `specialist_copay`, `network_id`, `extras (text[])`, `star_rating`, `summary`, `highlights (text[])`, `sort_order`.

### Plan ↔ Provider mapping (authored for narrative)

| Specialty | Choice HMO | Patriot HMO | Choice PPO | Plan 2 PPO | D-SNP |
|---|---|---|---|---|---|
| Patient's PCP (Fairview) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Endocrinologist | ✅ | ❌ | ✅ | ✅ | ✅ |
| Ophthalmologist | ❌ | ❌ | ✅ | ✅ | ❌ |
| Podiatrist | ❌ | ❌ | ✅ | ✅ | ✅ |

---

## 4. Scoring — `rankDemoPlans` server function

`src/lib/v4/match-plans.functions.ts` (forked from v3) loads `demo_plans_55410`, `plan_formulary_55410`, and `providers_55410` server-side and returns enriched `DemoScoredPlan[]` to the matches route.

### Weighted buckets (transparent in the UI)

| Bucket | Weight | Logic |
|---|---|---|
| Network fit | 35 | % of intake doctors matched (by NPI / fuzzy name) and in-network for the plan |
| Formulary fit | 30 | Coverage ratio × tier penalty; PA / step therapy = concern, not a block; uncovered drug = large penalty |
| Budget fit | 20 | Distance from user's `monthlyPremiumMax` / `annualDeductibleMax` caps |
| Extras fit | 10 | Overlap with `intake.extras` (dental / vision / hearing / fitness / transportation / OTC) |
| Star rating | 5 | Normalized from `star_rating` |

D-SNP plans get a 0.4× eligibility multiplier when the user is not on Medicaid.

Plan cards show per-bucket bars plus chips like *"3/3 doctors in network"*, *"All meds covered, 1 needs prior auth"*, *"$0 premium fits your $50 cap"*, *"Dental + vision included"*, with a separate **Things to know** list for concerns.

---

## 5. Intake additions for budget

`IntakeSchema` extended with:

```ts
budgetCaps: {
  monthlyPremiumMax: number | null,
  annualDeductibleMax: number | null,
  confidence: "captured" | "needs_confirmation" | "missing",
}
```

- Existing `budgetSensitivity` (low / medium / high) is kept for the conversational flow.
- The structured wizard's Budget step now exposes two dollar inputs for the caps.
- The extraction prompt knows about `budgetCaps` so ramble mode can pick up phrases like *"My ceiling is $50/mo"*.
- Workspace drawer renders the caps alongside other captured info.

---

## 6. "Load diabetic 55410 demo" affordance

Small link on the `/v4` landing surface that pre-fills the session with the canonical diabetic scenario and jumps straight to `/v4/matches`:

- ZIP **55410**
- Conditions: **type 2 diabetes**, **hypertension**
- Priorities: Keep my doctors, Drug coverage, Low monthly cost
- Doctors: PCP (Robert Bruley, Family Medicine) + Endocrinologist (Lawrence Schuster) — by name only, so auto-verify still rounds-trips against NPPES
- Medications: **Lantus 100 u/mL**, **Ozempic 1 mg**, **metformin 500 mg**
- Budget caps: **$50/mo** premium, **$300** deductible
- Extras: dental, vision
- Medicaid: no
- `budgetSensitivity`: high

Implemented in `src/lib/v4/demo-profile.ts` and triggered from `src/routes/v4.intake.tsx`.

---

## Technical notes

- All Supabase reads for scoring go through server functions; route loaders never query Supabase directly.
- Seeding scripts use `supabaseAdmin` server-side only; the runtime path uses the publishable key with `TO anon SELECT` policies.
- Existing `verifyProvider` (NPPES) and `verifyMedication` (RxNorm) continue to run live so user-typed entries are still validated — the DB just gives scoring something authoritative to match against.
- Match scoring is pure: the server function fetches inputs and passes them into `scorePlan(plan, formulary, providers, intake)`, keeping it unit-test friendly.
- No changes to V1 / V2 / V3.

## Out of scope

- Editing real CHC plan PDFs or pulling live CMS formularies — values are hand-curated for narrative coherence.
- Coverage outside ZIP 55410.
- Persisting intake to the DB across sessions (still `localStorage`).
