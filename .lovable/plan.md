## Pivot: "About You" becomes a global right-side drawer

Move the "About you / Listening" panel (currently `<AboutMoreRamble />` at the bottom of `/workspace`) out of the page and into a global Sheet drawer that slides in from the right and is reachable from every route.

### Behavior

- **Trigger:** A small floating tab button anchored to the right edge of the viewport (vertically centered, fixed position, above the bottom nav). Label: "About you" with a Sparkles icon. Visible on every route except `/deck/*` (matches existing voice-bar hide rule).
- **Drawer:** Right-side `Sheet` (shadcn) at ~420px wide on desktop, full-width on mobile. Header shows "About you" + short subtitle. Body contains:
  1. The **narrative mirror** ("Here's what I'm hearing" — `persona.narrativeMirror`) at the top as a read-only summary card.
  2. The existing **AboutMoreRamble** flow (prompt → listening → apply) below it.
  3. After the ramble is applied, the success state stays in the drawer, plus a small "Route updated" toast continues to surface via existing `lastToast` mechanism on `/workspace`.
- **Auto-open hint:** On first visit per session, briefly pulse the trigger tab to draw attention (no auto-open).
- **Persistence:** No state changes — the existing `usePersonaStore` already drives everything.

### Page cleanup

- `/workspace`: Remove the bottom `<section><AboutMoreRamble /></section>`. Keep the top "Here's what I'm hearing" mirror card in place (it's the page's intro) — the drawer mirrors the same content for cross-page access; we don't duplicate-remove from workspace.
  - Alternative if you'd prefer: also remove the mirror from `/workspace` so the drawer is the single home for it. Let me know.

### Files to change

- **New** `src/components/about-you-drawer.tsx` — Sheet trigger tab + Sheet content (mirror card + `<AboutMoreRamble />`).
- **Edit** `src/routes/__root.tsx` — mount `<AboutYouDrawer />` in `RootComponent` next to other globals, gated by the same `hideVoiceBar` pathname check.
- **Edit** `src/routes/workspace.tsx` — remove the bottom `AboutMoreRamble` section (and its import).

### Out of scope

- No changes to `AboutMoreRamble` internals or persona store.
- No new keyboard shortcuts or voice-bar integration this pass.

### Open question

Should the "Here's what I'm hearing" mirror card stay on `/workspace` as today, or move exclusively into the drawer so the workspace page starts with "Your next step"?