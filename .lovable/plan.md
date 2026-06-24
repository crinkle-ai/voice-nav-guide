## Goal

Turn the homepage into an executive "pick a demo" chooser that links to three full prototype experiences:

- **V1** — current Crinkle/Shop My Way homepage (moved to `/v1`)
- **V2** — Unified Health / Welcome to Medicare conversational experience (already at `/v2`)
- **V3** — Medicare Navigator (UHC AI Intake Pilot) ported in under `/v3/*`

## Changes

### 1. New executive chooser at `/`

Rewrite `src/routes/index.tsx` to render a clean chooser page with three large cards (V1 / V2 / V3), short descriptions, and screenshots/icons. Each card links to its demo. Chooser hides the global TopNav, BottomVoiceBar, WorkspaceDrawer, and other chrome (same treatment as `/v2`).

### 2. Move V1 home to `/v1`

- Create `src/routes/v1.tsx` containing the existing `Home` / `RambleHero` / `PlanCard` / etc. components verbatim from today's `src/routes/index.tsx`.
- All V1 sub-pages (`/learn`, `/find-doctors`, `/compare-plans`, `/plans`, `/my-plans`, `/understanding`, `/workspace`, `/compare`, `/login`, `/deck/*`) stay at their current paths — they're the V1 experience. The chooser's "V1" card links to `/v1`.
- Update `src/routes/__root.tsx` so global chrome (TopNav, BottomVoiceBar, WorkspaceDrawer, overlays) shows on `/v1` and all the existing V1 sub-routes, but is hidden on `/`, `/v2/*`, and `/v3/*`.
- Add a small "← Back to demos" link in V1's top-left (mirrors the V2 pattern).

### 3. V2 — minor touch

- Add the same "← Back to demos" link wording on `/v2` (already exists; just relabel its target text from "Back to main view" to "Back to demos").

### 4. Port Medicare Navigator as `/v3/*`

Copy the full Medicare Navigator flow into this project under a `/v3` namespace so it runs end-to-end without touching V1 or V2.

Routes to create (all gated chrome-less in `__root.tsx`, each uses its own ported AppShell so it looks like the original):

- `src/routes/v3.tsx` — layout route, just renders `<Outlet />`; ensures `/v3/*` paths exist.
- `src/routes/v3.index.tsx` — home page (mode chooser: Ramble / Structured / Hybrid).
- `src/routes/v3.intake.tsx`
- `src/routes/v3.priorities.tsx`
- `src/routes/v3.matches.tsx`
- `src/routes/v3.summary.tsx`
- `src/routes/v3.next-step.tsx`

Supporting files copied from the Medicare Navigator project, namespaced to avoid collisions with this project's existing components:

- `src/components/v3/app-shell.tsx` (ported, with "← Back to demos" link)
- `src/components/v3/capture-sidebar.tsx`
- `src/components/v3/intake-chat.tsx`
- `src/components/v3/voice-intake.tsx`
- `src/lib/v3/session-store.ts`
- `src/lib/v3/intake-types.ts`
- any other `src/lib/*` and `src/data/*` files the V3 routes depend on (resolved during port)
- any V3-only API routes from `Medicare Navigator/src/routes/api/*` copied under `src/routes/api/v3/*` if the flow calls them

All V3 imports rewritten to point at the namespaced `@/components/v3/*` / `@/lib/v3/*` paths so V1's existing `app-shell.tsx`, `mock/`, etc. are untouched.

### 5. Chrome rules in `__root.tsx`

Update the path checks so:

- `/` (chooser) → no TopNav, no BottomVoiceBar, no overlays, no WorkspaceDrawer.
- `/v1` and existing legacy routes → full V1 chrome (today's behavior).
- `/v2/*` → unchanged (no chrome).
- `/v3/*` → no global chrome; V3 uses its own ported AppShell.

## Out of scope (this turn)

- Visual polish of the chooser beyond a clean card layout.
- Any new functionality inside V3 beyond what the source project already has.
- Sharing state across V1/V2/V3 (each demo is independent).

## Technical notes

- TanStack file-based routing: `v3.intake.tsx` → `/v3/intake`, etc. `v3.tsx` is the layout and must render `<Outlet />`.
- `routeTree.gen.ts` regenerates automatically; do not hand-edit it.
- V1's existing global components (`TopNav`, `BottomVoiceBar`, `WorkspaceDrawer`, `LiveAdvisePanel`, `AgentHighlightOverlay`, `PushedComparisonDrawer`, `GuidanceToast`) and `AppProvider` / `LiveAdviseProvider` continue to wrap everything, but their render is gated by pathname so V2 / V3 / chooser stay clean.
- The Medicare Navigator project uses its own `session-store` (likely Zustand) — copying it as `src/lib/v3/session-store.ts` keeps it isolated from V1's `usePersonaStore` / `useWorkspaceDrawerStore`.
- If any V3 dependency isn't already installed in this project, install it with `bun add` before the port compiles.
