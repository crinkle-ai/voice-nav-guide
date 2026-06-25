
## Goal

Under the "Sign in" link in the top-right of the V4 header, show two very small indicators:

1. **Progress** — how complete the intake profile is (e.g. "Profile 40%" with a 60px-wide bar).
2. **Plan confidence** — how many UHC plans currently match the user's profile (e.g. "8 plans to recommend"). Clickable; opens a dialog listing those plans.

Both are subtle, right-aligned, in the existing header blue. They update live as the chat collects info.

## Files to add

- `src/lib/v4/plan-catalog.ts` — small static array of UHC plan stubs (AARP Medicare Advantage HMO, AARP MA PPO, AARP Dual Complete D-SNP, AARP Medigap Plan G, AARP Medigap Plan N, AARP MedicareRx Walgreens, AARP MedicareRx Preferred, AARP MedicareRx Saver Plus) — id, name, type, short blurb, eligibility predicate (Intake → boolean), match rationale.
- `src/lib/v4/profile-progress.ts` — `computeProgress(intake)` returning `{ pct, filled, total }` based on weighted fields: ZIP, DOB/age, doctors (≥1), meds (≥0 acknowledged), Medicaid answered, priorities (≥1), budget signal. Also `computeMatches(intake)` returning the plans whose eligibility passes (always ≥1; narrows as profile fills).
- `src/components/v4/header-indicators.tsx` — renders the two indicators stacked under the sign-in row; the plan-count button opens a `Dialog` (existing shadcn) listing matched plans with name, type, one-line rationale, and a "View comparison" link to the matches view.

## Files to change

- `src/components/v4/app-shell.tsx` — accept an optional `intake` prop; render `<HeaderIndicators intake={intake} />` directly below the sign-in link (inside the right cluster, second row). Keep existing `rightSlot` working. Indicator row uses `text-[10px]` / `text-[11px]`, header-text color at 70-90% alpha.
- `src/routes/v4.intake.tsx` (and any other route using `AppShell`) — pass `intake` from `useSession()` to `AppShell`.

## Behavior details

- Progress bar: 60px wide, 3px tall, same blue as existing progress.
- Plan count text: "{n} plans to recommend" (singular handling for 1). Disabled-look when n = catalog length (no narrowing yet); active/clickable once narrowed.
- Dialog content: list of matched plans with type badge and one-line rationale tied to intake (e.g. "Includes your ZIP 02118", "Covers metformin on Tier 1"). Footer button: "See full comparison" → navigates to existing matches/plan-comparison surface.
- No backend changes. Pure derivation from `session-store` intake.

## Out of scope

- Changing the existing step-based confidence bar that appears under the header when `step` is set (kept as-is).
- Editing the plan-comparison card itself.
