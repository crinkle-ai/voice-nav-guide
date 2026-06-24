
# Bridge v3 → v1 via a shared Workspace

## The shape

Shop Your Way (v3) is the front door. The Workspace (v1) becomes the persistent record of what was captured, and v1's existing pages (compare-plans, find-doctors, my-plans, learn) become the post-intake shopping surface. The v3 `Intake` is the single source of truth for the Workspace — no more hardcoded `persona` mock driving the drawer.

```text
   ┌──────────────── v3 ─────────────────┐      ┌────────── v1 ──────────┐
   │ Ramble / Wizard / Path-picker        │      │  Home · Compare        │
   │   ↓                                  │ ───▶ │  Find Doctors · Learn  │
   │ Intake (ZIP, doctors, meds, …)       │      │  My Plans              │
   │   ↓ Finish                           │      │                        │
   └─ writes shared session ──────────────┘      │  Workspace drawer ◀────┘
                                                    (reads same Intake,
                                                     always on the right)
```

## What changes

### 1. One shared session store

Promote `src/lib/v3/session-store.ts` to `src/lib/workspace-session.ts` (re-exported from the old path so v3 keeps working). Same `Intake` shape, same localStorage key. v1 now reads from it too.

Add a `source: "v3" | "manual" | null` field so the Workspace can show "Captured from your conversation" provenance.

### 2. Workspace drawer reads the Intake, not the mock

`src/components/workspace-drawer.tsx` today pulls from `persona` + `usePersonaStore`. Rewire each section to the Intake:

| Workspace section            | Source today                  | Source after                              |
| ---------------------------- | ----------------------------- | ----------------------------------------- |
| Narrative mirror             | `persona.narrativeMirror`     | `intake.reasonForCall.value` + summary    |
| What will shape your route   | `usePersonaStore().route`     | Derived from filled Intake fields         |
| What to look for in a plan   | `persona.planFilters`         | Derived from `priorities` + `extras` + `budgetSensitivity` |
| Your doctors                 | `persona.doctors`             | `intake.doctors.value` (incl. NPI status) |
| Your medications             | `persona.medications`         | `intake.medications.value` (incl. RxNorm) |
| Saved plans                  | static link                   | unchanged                                 |
| Open questions               | `usePersonaStore().questions` | Derived from `confidence !== "captured"` critical fields |

Empty Intake → each section shows an "Add details" CTA that opens v3 in a sheet (see #5) scoped to that field group.

Keep `usePersonaStore` around for the demo personas page only; it stops driving the drawer.

### 3. Hand-off at the end of v3

Today v3 ends at `/v3/matches`. Add a clear terminal step:

- On `/v3/summary` → "Looks good" already writes the Intake. Add a second CTA **"Take this to my Workspace"** that sets `source: "v3"` and navigates to `/v1` (home) with the drawer auto-opening once (via `useWorkspaceDrawerStore.openWorkspace()` + a one-shot flag so it doesn't keep popping).
- `/v3/matches` keeps working for users who want v3's matching view, but also gets a "Shop in full view →" link to `/v1/compare-plans`.

### 4. v1 surfaces the captured data

- **`/v1` home (RambleHero):** when an Intake exists, replace the default `persona.ramble` textarea seed with `intake.reasonForCall.value`; change the primary CTA from "Show my path" to **"Continue where you left off"** that opens the Workspace; keep "Start over" that resets the shared session.
- **`/v1/compare-plans`, `/v1/find-doctors`:** filter/prefill from `intake.zip`, `intake.doctors`, `intake.priorities`. (Existing pages already render lists — we just feed them from the Intake.)
- **`/v1/my-plans`:** unchanged for now.

### 5. Re-enter v3 from inside the Workspace

Each Workspace section gets a small "Add / update via conversation" link that opens v3 in a right-side `Sheet` pre-scoped to that field set (`?focus=doctors`, `?focus=medications`, etc.). This is the gentle round-trip without making v1 → v3 the primary direction.

Phase this: ship the focused sheet behind one link ("Tell us more →" in the narrative-mirror block) in v1.1; per-section deep links in a follow-up.

### 6. Executive chooser update

`src/routes/index.tsx` chooser stays, but the v1 tile copy changes to make the relationship clear: *"Crinkle Health — the shopping experience that picks up where Shop Your Way left off."* and the v3 tile copy adds *"…then hands off to the full Crinkle experience."*

## File-level changes

- **New / renamed:** `src/lib/workspace-session.ts` (move + re-export from `src/lib/v3/session-store.ts`).
- **Edit:** `src/components/workspace-drawer.tsx` — swap data sources; add empty-state CTAs; add "Tell us more →" link.
- **Edit:** `src/routes/v3.summary.tsx` — add "Take this to my Workspace" CTA + navigate to `/v1`.
- **Edit:** `src/routes/v3.matches.tsx` — add "Shop in full view →" link.
- **Edit:** `src/routes/v1.tsx` — RambleHero reads Intake; CTA copy switches when Intake exists; one-shot Workspace auto-open on arrival from v3.
- **Edit:** `src/routes/compare-plans.tsx`, `src/routes/find-doctors.tsx` — read ZIP/doctors/priorities from Intake when present.
- **Edit:** `src/routes/index.tsx` — chooser tile copy.
- **Add (phase 2, not this plan):** `src/components/workspace-intake-sheet.tsx` — embeds v3 flows inside a v1 Sheet for focused updates.

## Explicitly out of scope (this plan)

- No auth, no backend persistence — still localStorage.
- No changes to v3's intake LLM, NPI/RxNorm verification, or plan-matching engine.
- No removal of `usePersonaStore` (still used by `/workspace` activity pages and demo personas).
- v2 is untouched.
- Per-section deep-link sheets (#5 second half) — deferred to a follow-up.

## Open question (sensible default chosen, won't block)

When a returning v1 visitor has an Intake captured, should `/v1` auto-open the Workspace on first load? **Default: yes, exactly once per session**, via a sessionStorage flag — gives the "your stuff is here" moment without being naggy.
