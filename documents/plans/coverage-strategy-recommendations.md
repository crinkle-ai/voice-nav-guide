# Coverage Strategy Recommendations

## Where we are today

The prototype already understands MA-HMO, MA-PPO, D-SNP, Medigap (G/N), and standalone PDPs, and the AI knowledge base tells the model "Medigap pairs with a standalone Part D". But recommendations flow through a **single** `recommendPlans` tool that returns one plan per card. There is no concept of a *coverage strategy* that bundles Medigap + a matching PDP into one recommendation — the user has to shop for them as two separate results. So we are ~60% there on data and prompt, ~0% there on the recommendation shape and UI.

## Goal

The AI recommends a **coverage strategy** based on lifestyle needs:

- **Bundled strategy** → one Medicare Advantage plan (medical + drug in one)
- **Paired strategy** → one Medigap plan + one matching Part D plan
- **Dual strategy** → one D-SNP (when Medicaid-eligible)

The user never has to pick "Medigap vs MA" — the AI decides and explains why.

## Changes

### 1. Prompt (`src/lib/v4/prompts.ts`)

- Add a **Coverage Strategy** section to `INLINE_PLANS_RULE` teaching the model to translate lifestyle signals → strategy:
  - travels, snowbird, any doctor, no referrals, predictable costs → **Medigap + Part D**
  - low premium, bundled convenience, extras (dental/vision/fitness), local → **Medicare Advantage**
  - Medicaid eligible → **D-SNP**
- Rewrite the confidence-gate so a Medigap recommendation MUST also include a paired Part D plan (never Medigap alone).
- Forbid asking the user "do you want Medigap or MA?" — the AI decides from needs.
- Update the explanation template to name the strategy and say *why* (e.g. "Medigap fits your travel; Part D fills the drug gap").

### 2. Recommendation tool schema (`src/routes/api/v4/chat.ts`)

Extend `recommendPlans` input:

- Add `strategy: "medicare-advantage" | "medigap-plus-partd" | "dsnp"`
- Add optional `pairedPlanId: string` (the Part D that pairs with the Medigap)
- Add `strategyRationale: string` — one short paragraph the UI shows above the cards
- Keep existing `recommendedPlanId`, `plans[]`, `rationale[]`, `confidence`.
- Validation: when `strategy === "medigap-plus-partd"`, both `recommendedPlanId` (Medigap) and `pairedPlanId` (PDP) are required and must both be present in `plans[]`.

### 3. Plan catalog (`src/lib/v4/plan-catalog.ts`)

- Existing Medigap G/N and three PDPs are enough for the demo; no schema changes needed.
- Add a small `PAIRED_PDP_SUGGESTION` helper: given a Medigap pick + intake (drug list, budget), return the best PDP id from the catalog. Used by `buildInlinePlanRecommendations` and available to the AI via the knowledge prompt.
- Update `buildInlinePlanRecommendations` so when the top-scored plan is Medigap it also returns `strategy: "medigap-plus-partd"` and a `pairedPlanId`.

### 4. UI — combined recommendation card (`src/components/v4/chat-cards/plan-comparison.tsx`)

- When `strategy === "medigap-plus-partd"`, render a new **Recommended Coverage** header card above the tiles:
  - Title: "Your recommended coverage"
  - Two labeled slots side-by-side: **Medical Coverage** (Medigap tile) + **Prescription Coverage** (paired PDP tile), joined by a "+" pill
  - "Why this combination" block underneath showing `strategyRationale`
- Runner-up plans render below in the existing horizontal strip, de-emphasized.
- MA strategy: keep today's single-recommended layout but add a small "Includes medical + prescription" badge on the recommended tile.
- D-SNP: same as MA with "Medicare + Medicaid" badge.

### 5. Favorites / Workspace

- When the user favorites a Medigap recommendation, also auto-favorite the paired PDP (they're a bundle). Add a small "Bundled" label on the pair in the Workspace favorites card.

### 6. Header indicators

- `# plans to recommend` counts the *strategy*, not raw plan count — so a Medigap+PDP pair counts as 1.

## Out of scope for this pass

- Actual county-level premiums / real PDP formulary matching
- Letting the user override the strategy pick (we can add "Show me the other approach" as a suggestNext chip later)
- Enrollment / cart flow for the bundled pair

## Verification

- Ramble: "I travel between MN and AZ and see a cardiologist" → AI recommends Medigap Plan G + AARP MedicareRx Preferred, combined card renders with "Why this combination".
- Ramble: "I want the lowest premium and everything in one plan" → AI recommends an MA-HMO with the "medical + prescription" badge, no paired PDP.
- Ramble: "I have Medicaid" → D-SNP with dual badge, no paired PDP.
- Confidence < 80 still blocks any recommendation and asks one narrowing question.

---

# Productionizing Medigap + Part D outside this prototype

The prototype hard-codes three PDPs, a static Medigap G/N, and a scoring function. In production the same "bundled coverage strategy" idea has to run against live CMS data, actual carrier pricing, a real drug formulary match, and licensed-agent compliance rules. Here is how each layer maps to real systems.

## 1. Authoritative data sources

| Layer | Source | Refresh cadence | Notes |
|---|---|---|---|
| Plan universe (MA, PDP, Medigap) | **CMS Medicare Plan Finder data files** (Landscape + Benefits + Pharmacy Network + Provider files) via the CMS Public Use Files (PUF) portal | Annual (Oct 1 for AEP) + mid-year corrections | Ground truth for what plans exist in a county |
| Real-time premiums / benefits | **CMS Medicare.gov Plan Finder API** (partner access) OR carrier-direct feeds (e.g. UHC's Plan Benefit Package feed) | Daily | Plan Finder API requires a CMS data-use agreement |
| Part D formularies | **CMS Formulary Reference File** (quarterly) + carrier drug pricing APIs | Quarterly + real-time for pricing at a specific pharmacy | Needed to score "does this PDP cover my drugs cheaply" |
| Medigap rates | **NAIC SERFF filings** or a rate aggregator (CSG Actuarial, Sunfire, Connecture) | Monthly | Medigap is age/gender/tobacco/ZIP rated — no free public API |
| Pharmacy network | Included in CMS Pharmacy Network file + carrier feeds | Monthly | Needed for "preferred pharmacy" pricing |
| Provider network | Carrier provider directories (via NPPES + carrier APIs like Availity, or aggregators like Ribbon Health, Turquoise) | Weekly | For MA plans, not Medigap (Medigap = any Medicare provider) |
| RxNorm normalization | **NLM RxNorm API** (already used in prototype) | Live | Maps free-text drug names → RxCUI for formulary lookup |
| Eligibility (Medicaid / LIS / SEP) | **CMS BEQ (Batch Eligibility Query)** or MBI-based real-time eligibility via a clearinghouse | Real-time at intake | Drives D-SNP eligibility and enrollment periods |

Most Medicare shopping platforms (SelectQuote, GoHealth, eHealth, Chapter, Healthpilot) license this data through **Sunfire, Connecture (DRX), or CSG** rather than integrating each source directly. That is the pragmatic build-vs-buy call for v1.

## 2. Data pipeline

```text
CMS PUF (annual)         Carrier feeds (daily)      RxNorm / NLM
      |                          |                       |
      v                          v                       v
   +---------------------- Ingestion (Airflow / Dagster) ----------------------+
   |  - Validate schema, diff against last snapshot, alert on carrier drops   |
   |  - Normalize plan IDs (CMS contract-plan-segment: H1234-001-000)         |
   +--------------------------------------------------------------------------+
                                    |
                                    v
                    +------- Canonical plan store --------+
                    |  Postgres + read replicas           |
                    |  Tables: plans, benefits,           |
                    |  formularies, pharmacy_networks,    |
                    |  medigap_rates, provider_networks   |
                    +-------------------------------------+
                                    |
                                    v
                    +------- Recommendation service ------+
                    |  Scoring, pairing, ranking, cache   |
                    +-------------------------------------+
```

Snapshots are immutable per effective date so a quote made on Nov 3 can be reproduced exactly later (audit and CMS compliance requirement).

## 3. Real Medigap + Part D pairing algorithm

Replace `pickPairedPdpId(intake)` with a true optimizer. For a given (ZIP, age, tobacco, drug list, preferred pharmacy):

1. **Filter Medigap candidates** — Plans A, G, N, HDG in the state, from carriers licensed in that state, with rates for the applicant's age/gender/tobacco band. Apply guaranteed-issue rules (initial enrollment window, birthday rule, trial right, loss of coverage).
2. **Filter PDP candidates** — All PDPs available in the ZIP's PDP region (there are 34 CMS PDP regions).
3. **Compute true annual drug cost per PDP** — For each PDP:
   - Look up each RxCUI in the formulary
   - Apply tier, deductible, initial coverage, coverage gap, catastrophic phases
   - Use the applicant's preferred pharmacy (preferred vs standard network pricing)
   - Add plan premium × 12
   - This is the standard **Medicare Plan Finder total annual cost** calculation
4. **Score the bundle** = Medigap annual premium + Medigap expected OOP (near zero for Plan G) + PDP total annual drug cost + weight for star rating + weight for carrier consolidation (same carrier for both is a small UX win, not a cost win).
5. **Return the lowest-total-annual-cost bundle** plus 2 runner-ups. Show the math (premium breakdown, drug cost breakdown) — regulators and consumers both expect this transparency.

Cache the (ZIP, drug-list-hash, age-band) → ranked bundles result for ~24h; invalidate on formulary or rate updates.

## 4. Recommendation service shape

Keep the `strategy` concept from the prototype, but back it with real data:

```ts
POST /api/recommendations
{
  zip, dob, tobacco, gender,
  drugs: [{ rxcui, dosage, quantity, daysSupply }],
  preferredPharmacyNpi,
  providers: [{ npi }],
  medicaidStatus, lisLevel,
  priorities: ["travel", "lowest_premium", ...]
}
=>
{
  strategy: "medigap-plus-partd" | "medicare-advantage" | "dsnp",
  confidence: 0.87,
  primary: {
    medical: { planId, carrier, annualPremium, expectedOOP, ... },
    drug:    { planId, carrier, annualPremium, annualDrugCost, formularyCoverage: 0.95, ... },
    combinedAnnualCost: 3120,
    rationale: "Nationwide provider access + low drug cost for your list"
  },
  runnersUp: [ ... ]
}
```

The strategy decision itself becomes an explainable rules layer (Medicaid → DSNP; travel + provider-loyalty + budget-tolerant → Medigap+PDP; else MA), not an ML black box — CMS marketing rules require the agent to be able to justify why a plan was recommended.

## 5. Compliance and licensing (this is the hard part, not the code)

- **Third-Party Marketing Organization (TPMO) rules (CMS 42 CFR 422.2274 / 423.2274)**: any tool that recommends specific plans must include the CMS TPMO disclaimer ("We do not offer every plan available in your area…"), record the call/session, and retain for 10 years.
- **Scope of Appointment (SOA)** must be captured before discussing specific MA/PDP plans; 48-hour rule applies to inbound web leads too (as of CY2024, with ongoing rulemaking).
- **Licensed agent**: to actually *enroll* the user, a state-licensed, AHIP-certified, carrier-appointed agent has to be in the loop (or the user self-enrolls on Medicare.gov / carrier.com). The AI can recommend and educate; the enrollment click has to route to a licensed human or a compliant self-service enrollment flow.
- **PHI / HIPAA**: drug lists, providers, Medicaid status are PHI once tied to an identifier. Storage, transport (TLS 1.2+), access logging, BAAs with every vendor (Sunfire, Ribbon, LLM provider, transcription, etc.), and a documented minimum-necessary policy.
- **State DOI licensing**: Medigap is state-regulated. The recommending entity needs a resident + non-resident health insurance producer license in every state it quotes in.
- **Recording and consent**: all sales calls recorded end-to-end (CMS requirement since 2023), including AI-assisted chat sessions that lead to enrollment.

## 6. LLM's role in production

The LLM does **not** pick the plan. The recommendation service does. The LLM:
- Extracts structured intake from conversation (drugs, doctors, priorities, Medicaid) — validated against RxNorm / NPPES before use.
- Explains the recommendation in plain language, grounded in the structured response above (retrieval, not generation, of numbers).
- Handles objection/clarification ("why not Plan N?") by calling the same service with a `whatIf` mode.

Every user-facing number (premium, drug cost, star rating) must come from the recommendation service payload, never from the model's memory. Guardrails: refuse to state a premium the payload does not contain; always include the TPMO disclaimer on any plan-specific answer.

## 7. Rollout path from today's prototype

1. Swap the static `PLAN_CATALOG` for a Sunfire (or Connecture) sandbox integration behind the same `computeMatches` / `buildInlinePlanRecommendations` interface — the UI and prompt don't change.
2. Add the true drug-cost calculator (formulary + pharmacy pricing) — the biggest driver of PDP ranking accuracy.
3. Add Medigap rate lookup (CSG Actuarial is the usual first vendor).
4. Add SOA capture, TPMO disclaimer, call recording hooks.
5. Add licensed-agent hand-off + carrier enrollment API (or SEP-aware deep link to Medicare.gov / carrier enrollment).
6. Add snapshotting so every recommendation is reproducible from its effective-date data snapshot.

Everything above the recommendation service — the chat UI, workspace, favorites, coverage-strategy explanation — carries over unchanged. The production lift is data + compliance, not UX.

