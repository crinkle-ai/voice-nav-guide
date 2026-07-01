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
