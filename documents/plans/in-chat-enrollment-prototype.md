# In-chat enrollment for the /v4/intake prototype

Approved plan (build target). Default: **Option B** for Medigap health questions — treat every demo user as being in a guaranteed-issue window, so underwriting is skipped and the flow always finishes cleanly.

Goal: extend the current favorite → recommend flow so a demo viewer can go all the way from "I like this plan" to a **completed, signed application package** inside the chat, with a clean handoff to a licensed agent for the actual submit. Everything is mock (no real carrier API, no real MBI validation), but the on-screen ceremony is faithful to what a real MA or Medigap+PDP enrollment requires.

## What we're building (mock-realistic)

1. **Enroll CTA on favorited plans** — Enroll button next to the heart. For a Medigap+PDP bundle, one Enroll starts one application covering both.
2. **Enrollment wizard** — stepped surface (modal in this build) with:
   - Intro ("About 3 minutes: confirm your info, review disclosures, sign")
   - **Scope of Appointment (SOA)** capture: product types, date, typed name, click-to-agree
   - **Missing-info sweep**: legal name / DOB / sex, address + county, phone + email, MBI (format-validated `1EG4-TE5-MK73`), Part A / Part B effective dates, enrollment period reason, requested effective date, payment method (monthly bill / EFT / card / SSA deduction, masked inputs). Medigap adds tobacco and SSN (masked). Guaranteed-issue window is assumed — no health questions.
   - **Disclosures + attestations**: TPMO disclaimer, Summary of Benefits, Star Rating, pre-enrollment checklist, MA-vs-Medigap acknowledgment, release of information, truthfulness. "Agree to all" convenience button.
   - **E-signature**: typed name + today's date + timestamp (mock IP) capture.
   - **Application summary + agent handoff**: full readable summary, **Submit to licensed agent** (opens the existing CallDialog scoped to a "package ready" banner) and **Download PDF (demo)**.
3. **Authorized-representative branch** — if a caregiver with write access is present, signature step offers "Signing on behalf of {member}".
4. **Workspace Enrollment card** — color-coded (indigo), shows enrollment %, plan(s), next step, resume.
5. **AI prompt + tool** — `startEnrollment({ planId, pairedPlanId? })` tool. Prompt guidance: after "enroll", "sign up", or clicking Enroll, call the tool. Never collect MBI / SSN in freeform chat bubbles.
6. **Demo cheatsheet** — "Auto-fill enrollment" button that pre-populates a mock Margaret application, jumping straight to disclosures / signature / handoff.

## What we are NOT building in the prototype

- Real carrier submission (Sunfire / Connecture / iPipeline / CMS OEC)
- Real MBI, SSN, bank account validation
- Real e-signature legal capture, IP logging, 10-year retention
- Real underwriting decisioning
- Real agent-of-record NPN assignment / licensed-entity guardrails
- Payment processing
- HIPAA-grade storage (same mock session store; existing "Your data" panel frames this)

These are the productionization path documented in `documents/plans/coverage-strategy-recommendations.md` and would live in a follow-up plan (`carrier-submission-integrations.md`).
