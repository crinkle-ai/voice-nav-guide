## Goal
Unify `/plans` (persona-driven "matches what matters to you") and `/compare-plans` (filter table + voice/agent + enroll) into a single route so the "show my way" demo flows from needs → matches → side‑by‑side → enroll without route hops.

## Target route
Keep `/compare-plans` as the canonical URL (it owns voice filter wiring, AppContext compare state, and enrollment). Redirect `/plans` → `/compare-plans` so existing links keep working.

## New page structure (single scroll)
```text
┌─ Header: "For Robert" + persona avatar
├─ 1. What matters to you  (from /plans)
│     - chips of persona.needs
│     - "Refine what matters" → /workspace
├─ 2. Plans that fit your needs  (from /plans, persona-matched)
│     - Top matches (finalists) as PlanCards w/ proof bullets
│     - "Add to compare" button on each card (writes comparePlanIds)
├─ 3. Or filter all plans  (from /compare-plans)
│     - Plan type, max premium, drug/dental/vision toggles
│     - Voice agent pre-fill (planVoiceFilters) preserved
│     - Filterable table; "Pick" checkbox feeds same compare tray
├─ 4. Side-by-side compare
│     - When 2-3 selected, render a comparison panel inline
│       (replaces today's fixed bottom tray-only UX)
├─ 5. Talk to an agent banner  (unchanged)
└─ 6. Enroll now CTA  (unchanged)
```

## Show-my-way demo path
1. Land → see the user's needs chips + matched plans (persona narrative).
2. Click "Add to compare" on 2 finalists → side-by-side panel appears.
3. Voice/filter tweak narrows the table → pick a third plan.
4. Hit "Start Enrollment".

## Changes
- `src/routes/compare-plans.tsx`: prepend persona header + needs chips + matched `PlanCard` grid lifted from `plans.tsx`. Wire each card's primary button to `dispatch({ type: "TOGGLE_COMPARE_PLAN", id })` instead of "Add to workspace". Add an inline side-by-side compare panel above the enroll section that renders when `selected.length >= 2`.
- `src/routes/plans.tsx`: replace component with a `<Navigate to="/compare-plans" replace />` redirect (keep route file so existing `<Link to="/plans">` typechecks, or update links — see Decisions).
- Keep `PlanCard` either inlined in `compare-plans.tsx` or extracted to `src/components/plan-card.tsx` (preferred for reuse).
- Nav: no change required (TopNav doesn't list `/plans`); verify any `<Link to="/plans">` callers and either leave (redirects) or repoint to `/compare-plans`.

## Out of scope
- Reconciling the two plan data sources (`@/mock/plans` `robertPlans` vs server `listPlans`). For the demo, the matched-plans section keeps using `robertPlans`; the filter table keeps using `listPlans`. A later pass can unify.

## Decisions to confirm
1. Keep `/plans` as a redirect, or delete the file and repoint links to `/compare-plans`?
2. Match the matched-plan cards to rows in the filter table by id so "Add to compare" from a card also checks the table row? (Requires id alignment between `robertPlans` and `listPlans` — currently unknown.)