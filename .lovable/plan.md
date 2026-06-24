## Goal

Make `/v3` read as a real Unified Health Medicare landing page (not a "pilot/testing site"), borrowing the v2 visual cues already in the project. **No functional changes** — the three intake modes (Ramble / Structured / Hybrid), routing, scoring, and downstream pages all work exactly as today.

## Scope (what changes)

Two files only:

### 1. `src/components/v3/app-shell.tsx` — header chrome

- Replace the small "M" circle + "Medicare Compass" wordmark with the existing Unified Health logo (`src/assets/unified-health-logo-v2-white.png`, already used in v2) on a dark accent bar, or the dark logo on the current light header — matching v2's brand treatment.
-  

### 2. `src/routes/v3.index.tsx` — landing copy

- Remove the "Text or Voice AI Intake" pill (it reads as internal/testing language).
- Headline stays: "From confused to confident, in one honest conversation." (already strong and on-brand for v2's voice).
- Subhead rewritten away from "Pick the intake style you want to test" toward member-facing copy: e.g. "Medicare doesn't have to be overwhelming. Tell us about your life and we'll guide you to a plan that actually fits — in your words, at your pace."
- Section heading "Choose an intake style" → "How would you like to start?"
- Mode card copy reworded so it reads as a member choice, not a test:
  - **Ramble** → "Just talk" — "Tell us about your life in your own words. We'll listen and only ask when something's missing."
  - **Structured** → "Step by step" — "Short, clear questions in order. Best when you already know what you're looking for."
  - **Hybrid** → "A bit of both" — "Start open, then a few targeted questions to fill in the gaps."
- Card CTA "Start this experience" → "Start here".
- "How the pilot works" section → "How it works", with steps rewritten to drop "pilot/AI/test" framing where it sounds clinical (keep the four-step structure).
- Drop the trailing paragraph that references "the telephonic AI intake from the UHC pilot guide" and "prototype". Replace with a short reassuring line, e.g. "You can restart anytime, and nothing is submitted until you say so."

### Out of scope (explicitly unchanged)

- All three intake modes still exist and still route to `/v3/intake` via the same `start(mode)` handler.
- `useSession`, `IntakeMode` type, route tree, NPI / RxNorm verification, scoring, summary/priorities/matches/next-step pages — untouched.
- Color tokens and the v2 blue/serif theme already scoped to `.v3-scope` stay as-is.
- No new assets generated; reuses the existing Unified Health logo asset.

## Verification

- Visit `/v3`, confirm the page reads as a Unified Health landing page (logo upper-left, agent/member links upper-right, no "pilot/test" language anywhere).
- Click each of the three cards and confirm it still lands on `/v3/intake` with the correct mode set in session.
- Confirm `/v3/summary`, `/v3/priorities`, `/v3/matches`, `/v3/next-step` still render with the updated shell (new header, new footer) and no broken links.