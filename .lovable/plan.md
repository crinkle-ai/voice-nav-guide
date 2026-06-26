
## What this is

A small **"Demo cheat sheet"** drawer for `/v4` only. It's for *us* — the person running the demo — so we can see the answers to give the AI (ZIP, doctors, meds, budget, Medicaid status, etc.) while we talk to the assistant. Not a feature for end users.

Key requirement: it must stay open **at the same time as the chat**, so it has to be narrow and non-modal (no dark overlay, doesn't block clicks or input on the chat).

## UX

- **Trigger**: small vertical tab pinned to the right edge labeled `DEMO` (smaller, more subdued than the existing "Workspace" tab, sitting just above or below it). Only visible on `/v4/*` routes.
- **Drawer**: slides in from the right.
  - Width: ~320px (narrow). Chat composer and message column remain fully usable.
  - **Non-modal**: no backdrop, no focus trap, page behind stays interactive. (Built as a fixed-position panel, not a Radix `Sheet`, since `Sheet` is modal by default.)
  - Sticky header with title, a "Pin open" toggle (persisted to `localStorage`), and a close (×) button.
  - Body is scrollable; content is dense and compact (small type, tight spacing) so it doesn't feel like a UI surface.
- **Persistence**: open/closed state and "pinned" state stored in `localStorage` so it stays open across navigations within /v4 while we're demoing.
- **Hide switch**: a single constant `SHOW_DEMO_CHEATSHEET` in the component so we can hide it for real demos by flipping one flag (or gate on `import.meta.env.DEV`). Default: on.

## Content (the cheat sheet itself)

Sourced verbatim from `documents/v4-demo-script-data.md` so the script and the in-app sheet never drift. Sections, in this order, each collapsible and copy-to-clipboard friendly:

1. **Quick-load**: button that triggers the existing "Load diabetic 55410 demo" profile, plus a "Reset conversation" button.
2. **Profile to give the AI** (the lines to actually say):
   - ZIP: `55410`
   - Conditions: Type 2 diabetes, hypertension
   - Doctors to name: Dr. Emily Larson (PCP), Dr. Raj Patel (Endo) — with NPIs in small grey text.
   - Medications: Lantus 100u/mL, Ozempic 1mg, Metformin 500mg.
   - Budget caps: "$50/mo premium, $300 deductible".
   - Extras: dental, vision.
   - Medicaid: No.
3. **Expected ranking** (top 5 plan names + 1-line "why").
4. **Signal matrix** (compact table): one row per plan × columns Network / Formulary / Budget / Eligible, with ✓ / ⚠ / ✗ — so we can glance and verify the matcher is doing the right thing while we talk.
5. **Variation prompts** to try mid-demo (e.g. "say you're on Medicaid → D-SNP should jump", "raise premium cap to $100 → PPO unlocks", "remove Ozempic → Patriot HMO recovers").

## Files

- New: `src/components/v4/demo-cheatsheet.tsx` — the drawer component (fixed-position, non-modal, narrow, persistent open state).
- New: `src/lib/v4/demo-cheatsheet-data.ts` — typed constants for profile lines, expected ranking, signal matrix, variation prompts (mirrors `documents/v4-demo-script-data.md`).
- Edit: `src/routes/v4.tsx` — mount `<DemoCheatsheet />` alongside the existing `<WorksheetDrawer />`.
- No changes to V1/V2/V3, scoring, prompts, or data layer.

## Out of scope

- Editing the AI behavior or the matcher.
- Auto-driving the chat from the sheet (no "click to send"). It's read-only reference content plus the existing demo-profile loader button.
- A print stylesheet (can add later if you want a paper copy — easy follow-up).
