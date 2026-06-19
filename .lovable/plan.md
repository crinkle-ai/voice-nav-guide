## Goal

Turn the demo into a single, linear story: land on the homepage → talk/type your ramble → see the AI mirror it back → choose your next move (workspace or plans). One persona (Robert), no picker, no scenario chrome.

## The flow

```
/  (homepage, ramble as hero)
   │  "Here's what I'm hearing →"
   ▼
/understanding
   │  Two equal CTAs:
   │   ├─► /workspace   (hub: your personalized plan of attack)
   │   └─► /plans       (jump straight to filtered plan results)
   ▼
/workspace ◄──────────────────┐
   │  Cards link out to:      │
   ├─► /plans  ──► /compare   │
   ├─► /find-doctors          │
   └─► /learn                 │
        (back returns here) ──┘
```

Workspace is home base after the ramble. Plans/Compare/Doctors are tools you visit *from* workspace. The bottom pill nav (Workspace / Plans / Shop My Way reset) ties the session together.

## Homepage changes (`src/routes/index.tsx`)

- Remove the "Find Your Plan" card (ZIP card was already replaced; now remove the persona picker card too).
- New hero section: **"Shop My Way"** eyebrow, headline "Just tell us what's on your mind.", supporting line, and the ramble box itself — pre-loaded with Robert's seed text, Listening dot, animated waveform, mic button (visual-only).
- Primary CTA below the box: **"Here's what I'm hearing →"** navigates to `/understanding`.
- Tiny "Reset demo" link under the CTA resets the textarea to Robert's seed text.
- Push the other homepage sections (TopNav nav targets, deck links, etc.) below the fold; ramble dominates above the fold.

## Route collapse — drop `$personaId` from URLs

Robert is implicit everywhere. New routes:

- `/understanding`  (was `/understanding/$personaId`)
- `/plans`           (was `/plans/$personaId` — note this replaces the persona version, not the existing `/my-plans`)
- `/compare`         (was `/compare/$personaId` — separate from existing `/compare-plans`)
- `/workspace`       (was `/workspace/$personaId`)
- `/workspace/activity/$activityId`  (was `/workspace/$personaId/activity/$activityId`)

Delete the persona-parameterized route files; create the new flat ones using the same components/content, hardcoded to Robert.

Keep `/ramble/$personaId` deleted too — the homepage is the ramble now.

## Understanding page CTAs

Two equal-weight buttons (no primary/secondary):
- "Open my workspace" → `/workspace`
- "Show me plans that fit" → `/plans`

Same visual weight (both outlined or both filled ink — pick one treatment, no hierarchy).

## Persona data cleanup

- `src/mock/personas.ts`: remove Linda and Susan entries entirely. Keep only Robert. Export `robert` directly alongside the existing `getPersona` (or rename to `getRobert()` / a single `persona` constant) — no lookups needed.
- `src/state/usePersonaStore.ts`: simplify or remove. Since there's one persona, components can import Robert's data directly. Keep the store only if Understanding/Workspace mutate state during the session; otherwise delete.
- `src/mock/plans.ts`: keep as-is (plan catalog isn't persona-specific).

## Components to update

- `src/components/back-row.tsx`: drop `personaId` prop, drop `/ramble/$personaId` from the `backTo` union. Back targets become `/`, `/understanding`, `/workspace`.
- `src/components/app-shell.tsx`: pill nav links go to flat routes (`/workspace`, `/plans`, `/`).
- `src/components/about-more-ramble.tsx`, `self-enroll-moment.tsx`, `workspace-card.tsx`: remove `personaId` props; hardcode to Robert where needed.

## Files added

- (none new — homepage absorbs the ramble inline)

## Files modified

- `src/routes/index.tsx` — replace card with ramble hero
- `src/components/back-row.tsx` — simpler back targets
- `src/components/app-shell.tsx` — flat nav links
- `src/components/about-more-ramble.tsx`, `self-enroll-moment.tsx`, `workspace-card.tsx` — drop persona props
- `src/mock/personas.ts` — keep Robert only
- `src/state/usePersonaStore.ts` — simplify or remove

## Files renamed/recreated (flat routes)

- `src/routes/understanding.tsx`  (from `understanding.$personaId.tsx`)
- `src/routes/plans.tsx`           (from `plans.$personaId.tsx`)
- `src/routes/compare.tsx`         (from `compare.$personaId.tsx`)
- `src/routes/workspace.tsx`        (from `workspace.$personaId.tsx`)
- `src/routes/workspace.activity.$activityId.tsx`  (from `workspace.$personaId.activity.$activityId.tsx`)

## Files deleted

- `src/routes/ramble.$personaId.tsx`
- `src/routes/understanding.$personaId.tsx`
- `src/routes/plans.$personaId.tsx`
- `src/routes/compare.$personaId.tsx`
- `src/routes/workspace.$personaId.tsx`
- `src/routes/workspace.$personaId.activity.$activityId.tsx`

## Out of scope

- Wiring the mic to real STT (still visual-only)
- Touching `/my-plans`, `/compare-plans`, `/find-doctors`, `/learn`, `/deck`
- Persisting ramble state to the backend
- Voice navigator integration with the ramble

## Verification

- Homepage shows the ramble hero pre-filled with Robert's text; "Here's what I'm hearing →" goes to `/understanding`.
- `/understanding` shows the mirror + two equal CTAs.
- Both CTAs work; workspace is reachable; plans is reachable.
- Bottom pill nav uses flat routes.
- No `/ramble/...` or `/$personaId` URLs remain anywhere in the codebase.
