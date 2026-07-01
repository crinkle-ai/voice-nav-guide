## Goal
Bring `enrollment-dialog.tsx` up to the minimum data set a carrier + CMS need to accept a self-submitted MA, MA-PD, PDP, or Medigap application. Keep the current 5-step shape; expand the fields inside `InfoStep`, `DisclosuresStep`, and add a small `EligibilityStep` where the answers actually gate the application.

## Scope of changes (frontend only, demo-grade)

### 1. New "Eligibility & other coverage" section in `InfoStep`
Applies to all strategies (MA, MA-PD, PDP, Medigap + PDP, D-SNP).
- ESRD: yes / no / in kidney-transplant recovery
- Other coverage today (multi-select): none, employer group, union/retiree, COBRA, VA, TRICARE, Indian Health, Medicaid, other — with carrier + policy # when selected
- Medicaid status + Medicaid ID (required + validated when strategy = `dsnp` or Medicaid is checked above)
- LIS / Extra Help: yes / no / not sure
- Institutional status: community / LTC facility / receiving home- and community-based services
- Working-aged flag: only shown if DOB implies < 65

### 2. Expand "About you" in `InfoStep`
- Mailing address (checkbox "same as permanent residence")
- Emergency contact: name, relationship, phone (separate from authorized rep)
- Preferred language, race, ethnicity — clearly labeled "optional, CMS-collected"

### 3. Expand "Medicare card" in `InfoStep`
- Full SSN field (masked, `999-99-9999`) — required for Medigap, optional otherwise
- OEV contact preference: phone / email / mail

### 4. MA-only additions in `InfoStep` (strategy = `ma` or `dsnp`)
- PCP selection: name + NPI + "current patient? yes/no". Reuse NPPES verification pattern already used in Workspace.
- Plan-required attestation: "I understand I must use in-network providers except for emergencies."

### 5. Medigap-only additions in `InfoStep` (strategy = `medigap-plus-partd`)
- Guaranteed-issue reason (dropdown of CMS GI reasons) + loss-of-coverage date + optional doc upload stub
- Replacement question: "Do you have existing Medigap or MA coverage you're replacing?" → prior carrier, policy #, planned termination date
- Household discount question: "Does anyone else in your household have a policy with this carrier?"
- Height / weight (kept even under GI for carrier record)

### 6. Real payment capture in `InfoStep`
Replace "last 4 only" with:
- EFT: routing # (9-digit checksum) + account # (masked on blur)
- Card: full PAN (Luhn check), exp, CVV, billing ZIP
- SSA deduction: acknowledgment that SSA takes 1–3 months to start
Keep the demo-fill button; add a note that in production these route to a tokenized vault, never persisted client-side.

### 7. New disclosures in `DisclosuresStep`
- LIS attestation (only if LIS = yes/not sure)
- ESRD acknowledgment (only if ESRD = yes)
- OEV consent
- Electronic delivery consent for ANOC / EOC / formulary
- Medigap replacement notice acknowledgment (only if replacing)

### 8. Agent / SOA metadata
- SOA: add appointment date and time window (not just signed-at)
- Review step: show writing agent NPN + agency (pull from `state.permanentAgent`, fall back to "Self-service — no agent")

### 9. Update `ReviewStep` + PDF surrogate
Render every new field, grouped. Extend the text "PDF" to include the new sections so the download reflects what was captured.

### 10. Types
Extend `EnrollmentApplication["info"]` in `src/lib/v4/session-store.ts` with the new fields; keep everything optional so existing sessions don't break. Add new attestation keys to `attestations`.

## Out of scope
- Real carrier API submission, real payment tokenization, real doc upload storage — this stays a demo. Fields are captured and shown in the PDF surrogate + review screen only.
- Underwritten Medigap (health questions) — we keep the GI-only path the app already assumes.
- Backend persistence changes — everything continues to live in the existing session store.

## Verification
- Walk each of the 3 strategies (`ma`, `medigap-plus-partd`, `dsnp`) through the full wizard; confirm the right conditional sections appear and gate `Next`.
- "Demo: fill with Margaret's data" populates every newly required field so the Submit button remains reachable in one click.
- Downloaded text PDF contains every new section.
- Typecheck + build pass.
