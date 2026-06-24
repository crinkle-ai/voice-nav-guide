# Unify v4 intake → Workspace + /my-matches

Turn the three v4 intakes (Ramble, Form, Shop Your Way) into the front door for a single shopping experience. Workspace becomes the editable record of what we heard, and a new `/my-matches` route surfaces the recommended path + ranked plans.

## What changes for the user

1. **Workspace drawer is available inside /v4** — same component as v1, opens as a side drawer over any v4 screen. As intake fills in (chat, form, or path-picker), the Workspace populates live.
2. **After completing any v4 intake** → land on `/my-matches` with the Workspace drawer open and editable. No `/v3/summary` confirmation gate.
3. **/my-matches** shows: recommended path (with switcher), top 3 ranked plans, "Open full comparison" link to `/compare-plans` (pre-filtered).
4. **Workspace is the source of truth** — edits there re-rank `/my-matches` and re-filter `/compare-plans` immediately.

## Recommended path: derive + switch

A single derived `recommendedLens` is computed from the intake. User can switch lenses anytime; matches re-rank.

Derivation rules (first match wins):

```text
Shop-Your-Way picked a path     → use that lens (explicit beats derived)
intake.doctors.length >= 1      → "keep-my-doctors"
intake.medications.length >= 2  → "afford-my-meds"
intake.budgetSensitivity = high → "lowest-cost"
intake.isNewToMedicare = true   → "learn-the-basics"
fallback                        → "lowest-cost"
```

Lens switcher renders as 4 chips on `/my-matches` and as a small selector at the top of the Workspace "Recommended path" card. Switching updates a `lensOverride` in the session; clearing it falls back to the derived value.

## Architecture

```text
/v4 (any mode)                          /v1 home (unchanged for cold users)
   │                                       │
   │ intake completes                      │ click "See my matches"
   ▼                                       ▼
/my-matches  ◄────────────────────►  Workspace drawer (editable)
   │                                       │
   │ "Open full comparison"                │ filters
   ▼                                       ▼
/compare-plans (pre-filtered by intake + lens)
```

Workspace edits propagate to `/my-matches` and `/compare-plans` via the existing `useSession` store — no new state layer.

## Files

**New**
- `src/routes/my-matches.tsx` — recommended-path card with lens switcher, ranked Top 3 plans, "Open full comparison" CTA. Lives under the v1 chrome (TopNav visible). Empty state ("No intake yet — start one") links to `/v4`.
- `src/lib/recommended-path.ts` — `deriveLens(intake)`, `LENSES` metadata (label, blurb, icon, sort/filter rules), `rankPlans(plans, intake, lens)` returning Top N with a one-line "why this matches" string per plan.

**Edited**
- `src/lib/v3/session-store.ts` — add `lensOverride?: Lens` field + setter.
- `src/routes/__root.tsx` — mount `WorkspaceDrawer` on `/v4` routes too (currently hidden). Keep TopNav/BottomVoiceBar hidden on /v4.
- `src/components/v4/v4-shell.tsx` (or equivalent v4 header) — add a Workspace pill/button to open the drawer; show a small "items captured: N" badge.
- `src/components/workspace-drawer.tsx` — add "Recommended path" section at the top (lens chip + switch link), and a "Top 3 plan matches" section that links to `/my-matches`. Sections already derive from intake — extend `workspace-derivations.ts`.
- `src/lib/workspace-derivations.ts` — add `getTopMatches(intake, lens)` and `getRecommendedPath(intake)` helpers wrapping `recommended-path.ts`.
- `src/routes/v4.ramble.tsx`, `src/routes/v4.structured.tsx`, `src/routes/v4.shop.*` — on completion, `navigate({ to: "/my-matches" })` instead of `/v3/summary`. Shop Your Way's picked path writes to `lensOverride`.
- `src/routes/compare-plans.tsx` — read `intake` + current lens, pre-filter plan list, show a "Filtered by your Workspace" chip with a clear button.
- `src/routes/v1.tsx` (RambleHero) — when intake exists, swap CTA from "Show my path" to "See my matches →" pointing at `/my-matches`. Keep auto-open Workspace handoff.
- `src/routes/index.tsx` (executive chooser) — update v3 (Shop Your Way) blurb to mention "lands on your matches with an editable Workspace".

**Retired (kept as redirects for now)**
- `/v3/summary`, `/v3/matches`, `/v3/next-step` — replaced by `/my-matches`. Each redirects to `/my-matches` so existing links keep working.

## Open question I'll resolve while building

Plan data source for `rankPlans`: v3's existing matches list is small + hardcoded. I'll reuse it as-is for now and flag where a real plan catalog would slot in — no new backend.

## Out of scope

- Real plan catalog / CMS integration.
- Persisting Workspace across browsers (still session-scoped).
- Auth on `/my-matches` (open route, reads same in-memory session).
