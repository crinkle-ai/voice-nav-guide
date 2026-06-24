## Goal

Mirror what we did for doctors (NPPES) on the medication side: a server-side `verifyMedication` that calls the NIH/NLM **RxNorm REST API** to confirm whether the AI captured a real drug — and ideally pin down the exact strength + dose form (an RxCUI). This is the same accuracy story for prescriptions.

## Why RxNorm

- Free, public, no API key, CORS-restricted (so it must be server-side, same as NPPES).
- Base URL: `https://rxnav.nlm.nih.gov/REST/`.
- Normalizes brand and generic names to a single concept ID (RxCUI) — exactly what Part D formularies key off.
- Returns a structured ingredient + strength + dose form, which is what we need to score "did the AI capture this medication well enough?"

## What to build

### 1. `verifyMedication` server function
New file: `src/lib/v3/medications.functions.ts`

- `createServerFn({ method: "POST" })`, no auth (read-only public registry).
- Zod input: `{ name: string, strength?: string, doseForm?: string }`. Require `name` (min 2 chars).
- Handler strategy (cheap → precise):
  1. **Spelling suggest** — if the name looks misspelled, call
     `GET /REST/spellingsuggestions.json?name=<name>` and capture the top suggestion. Use the corrected name for the rest of the lookups.
  2. **Approximate match** — `GET /REST/approximateTerm.json?term=<name>&maxEntries=4`. This returns candidate RxCUIs with a score even when the AI captured a brand vs. generic or a slightly off spelling.
  3. **Resolve concept** — for the top candidate's RxCUI, call
     `GET /REST/rxcui/<rxcui>/properties.json` for the canonical name and TTY (ingredient, brand, SCD, SBD, etc.).
  4. **Find the SCD/SBD** that matches strength + dose form — `GET /REST/rxcui/<rxcui>/related.json?tty=SCD+SBD` and pick the one whose name contains the user's normalized strength (e.g. `20 mg`) and dose form (e.g. `oral tablet`, with common synonyms: `tablet`, `tab`, `capsule`, `cap`, `pen`, `solution`).
  5. **Pull brand/generic crosswalk** for the chosen RxCUI — generic ingredient via `tty=IN`, brand alternatives via `tty=BN` (top 3) — useful demo color.
- Wrap all `fetch` calls with `AbortSignal.timeout(6000)`; on any non-200 or network error return `{ status: "error", message }` instead of throwing.
- Response shape:
  ```ts
  type VerifyMedicationResult =
    | { status: "verified"; rxcui: string; canonicalName: string; tty: string;
        ingredient: string | null; brandNames: string[];
        strengthMatch: boolean; doseFormMatch: boolean;
        spellingCorrected: string | null;
        candidates: Array<{ rxcui: string; name: string; tty: string }>; }
    | { status: "needs_detail"; candidates: [...]; spellingCorrected: string | null }   // name resolved but couldn't pick a single product without strength/dose form
    | { status: "ambiguous"; candidates: [...]; spellingCorrected: string | null }      // multiple plausible drugs (e.g. "ozempic" vs "rybelsus")
    | { status: "not_found"; spellingCorrected: string | null }
    | { status: "error"; message: string };
  ```

### 2. Extend the medication data shape
`src/lib/v3/intake-types.ts`

- Add an optional `rxVerification` to `MedicationEntry` (mirrors `npiVerification` on doctors), holding `status`, `checkedAt`, `rxcui`, `canonicalName`, `ingredient`, `brandNames`, `strengthMatch`, `doseFormMatch`, `spellingCorrected`, `candidates`, optional `message`. Backwards compatible.

### 3. Wire into the summary medication editor
`src/routes/v3.summary.tsx` → `MedicationEditor`

- Add a "Verify with RxNorm" button per row, disabled until `name` has at least 2 chars; show spinner while loading.
- On result, render inline below the row:
  - **verified**: green badge "Verified · RxCUI 1234567" + canonical name (e.g. *atorvastatin 20 MG oral tablet*) + ingredient + up to 3 brand alternatives. If `strengthMatch` or `doseFormMatch` is false, a small amber note: "We matched the drug but not the strength/form you said — confirm with your pharmacy."
  - **needs_detail**: amber "We found the drug but need strength + dose form to identify the exact product." Suggest filling those fields; offer the top 3 candidate products as clickable rows that, when chosen, set `strength`/`doseForm` from the candidate name and re-verify.
  - **ambiguous**: list top 3 candidate concepts with name + TTY; clicking one replaces the medication name with the canonical name and re-verifies.
  - **not_found**: "No RxNorm match." If `spellingCorrected` is non-null, render "Did you mean **X**?" — clicking it patches `name` and re-verifies.
  - **error**: muted "RxNorm unavailable — try again."
- If a spelling correction was applied silently (verified status), show a small "Auto-corrected from '*<original>*'" hint.

### 4. Nothing else changes
- No DB schema, no secrets, no migration.
- Plan-matching logic (`match-plans.ts`) is untouched for now; we're proving capture accuracy, not changing formulary scoring.
- Doctors, intake, priorities, matches, next-step screens untouched.
- v1 and v2 untouched.

## Technical notes

- Sample calls to keep in mind while building:
  - `GET https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=atorvastatin%2020mg&maxEntries=4`
  - `GET https://rxnav.nlm.nih.gov/REST/rxcui/83367/properties.json`
  - `GET https://rxnav.nlm.nih.gov/REST/rxcui/83367/related.json?tty=SCD+SBD+IN+BN`
  - `GET https://rxnav.nlm.nih.gov/REST/spellingsuggestions.json?name=atorvastaten`
- Normalize strength comparison: lowercase, strip spaces, accept `20mg` / `20 MG` / `20 milligram` (regex `(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|unit|iu)`).
- Normalize dose form: map common spoken forms to RxNorm vocabulary (`tablet`→`oral tablet`, `pill`→`oral tablet`, `capsule`→`oral capsule`, `shot`/`injection`→`injectable`, `pen`→`prefilled syringe`, `inhaler`→`metered dose inhaler`).
- Public NLM endpoint has no rate-limiting primitive in this template; per repo policy we won't add custom rate limiting unless explicitly requested. NLM publishes a fair-use limit (~20 req/sec per IP) that's well above one-click-per-row usage.
- Plain `createServerFn` (no auth middleware) — public read-only call.

## Out of scope (could be follow-ups)

- Interaction checks (`/REST/interaction/list.json?rxcuis=...`) across captured meds.
- Cross-checking Part D formulary coverage per plan using captured RxCUIs.
- Bulk "verify all medications" button.
- Persisting verifications to a database.

## Open question (won't block the plan)

Brand vs. generic preference: if the user said "Lipitor" but RxNorm resolves to the generic SCD `atorvastatin 20 MG oral tablet`, do we surface the brand RxCUI (SBD) or the generic (SCD) as the primary match? Default in this plan: prefer the **SBD** when the user typed a brand name, otherwise SCD — but flag both in `candidates`. Happy to flip that if you prefer always-generic.
