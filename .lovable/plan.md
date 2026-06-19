## Goal

Bring the Medicare Compass "Decision Companion" flow (talk/type ramble → narrative mirror → personalized plans/workspace) into this project as a parallel persona-driven experience, and make the homepage's "Find your plan" card the entry point.

## Scope (full Compass flow)

Port these Compass surfaces into this repo, keeping their look and behavior:

1. `/ramble/$personaId` — "Just tell us what's on your mind" (the screenshot). Visual-only mic with animated waveform, editable textarea pre-filled from persona, "Here's what I'm hearing…" CTA → `/understanding/$personaId`.
2. `/understanding/$personaId` — narrative mirror + needs cards + route drivers + extra-ramble add-on.
3. `/plans/$personaId` — persona-filtered plan list (uses Compass mock plans).
4. `/compare/$personaId` — side-by-side compare.
5. `/workspace/$personaId` and `/workspace/$personaId/activity/$activityId` — workspace shell + activity drill-in.
6. Floating bottom pill nav (AppShell) shown only inside the persona flow.

These live alongside the existing app — no current route is deleted.

## Homepage entry point

Replace the ZIP-code "Find your plan" card on `/` (`src/routes/index.tsx`) with a "Find your plan — pick a scenario" card that lists the three personas (Linda / Robert / Susan) and links each to `/ramble/$personaId`. The rest of the homepage stays as-is.

## Personas & data

Bring the persona mock as the single source of truth:

- `src/mock/personas.ts` (copied from Compass — Linda, Robert, Susan, with ramble text, needs, route drivers, plans filters, doctors, meds, etc.)
- `src/mock/plans.ts` (Compass plan catalog used by `/plans` and `/compare`).
- `src/state/usePersonaStore.ts` (zustand store the Compass screens hydrate from). Adds `zustand` as a dependency.

## Components to copy from Compass

- `src/components/app-shell.tsx` — floating bottom pill nav for the persona flow.
- `src/components/back-row.tsx`
- `src/components/workspace-card.tsx` (exports `PersonaAvatar`)
- `src/components/confidence-ring.tsx` (`ReadinessRing`)
- `src/components/about-more-ramble.tsx`
- `src/components/self-enroll-moment.tsx`

Where Compass uses tokens like `bg-ink`, `text-ink-soft`, `font-display`, port the matching CSS variables / Tailwind utilities into `src/styles.css` so the Compass look renders correctly without polluting the rest of the app.

## Voice (visual-only)

The mic button + animated waveform are decorative. No connection to this app's `BottomVoiceBar` / `voice-session`. The textarea is the source of truth; clicking the mic does nothing functional (matches Compass demo). The existing voice nav on the rest of the app is untouched.

## Files added

```
src/routes/
  ramble.$personaId.tsx
  understanding.$personaId.tsx
  plans.$personaId.tsx
  compare.$personaId.tsx
  workspace.$personaId.tsx
  workspace.$personaId.activity.$activityId.tsx
src/components/
  app-shell.tsx
  back-row.tsx
  workspace-card.tsx
  confidence-ring.tsx
  about-more-ramble.tsx
  self-enroll-moment.tsx
src/mock/
  personas.ts
  plans.ts
src/state/
  usePersonaStore.ts
```

## Files modified

- `src/routes/index.tsx` — swap the ZIP card body for the three-persona scenario list (keeps the "Find your plan" heading). No other homepage changes.
- `src/styles.css` — add the few Compass design tokens (`--ink`, `--ink-soft`, font-display family) so ported components look correct.
- `package.json` — add `zustand` and `framer-motion` if not present.

## Routing details

- File names use TanStack's dotted convention (e.g. `ramble.$personaId.tsx`) and `createFileRoute("/ramble/$personaId")`.
- Navigation uses `<Link to="/ramble/$personaId" params={{ personaId }} />` — never string interpolation.
- The new routes do NOT render the existing `TopNav` AppShell; they use the Compass `AppShell` floating pill so the demo matches the screenshot.

## Out of scope

- Wiring the ramble mic to real STT.
- Replacing `/my-plans`, `/compare-plans`, `/find-doctors`, `/learn`, or `/deck`.
- Server functions / DB persistence — persona state stays in `usePersonaStore` (in-memory) like in Compass.
- AEM / Lovable AI calls inside the ported flow.

## Verification

- Build passes.
- Click each persona on `/` → lands on `/ramble/:personaId` with the right pre-filled ramble.
- "Here's what I'm hearing…" advances to `/understanding/:personaId`.
- Floating pill nav switches between Workspace / Plans / Shop My Way for the active persona.
- Visual parity with the Compass screenshot for `/ramble`.
