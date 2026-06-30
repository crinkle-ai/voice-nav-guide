## Goal
Make the `/v4/intake` active chat surface always span the full page width and height, regardless of whether plan cards are present. Demo cheat sheet (left) and Workspace drawer (right) overlay on top via their existing `fixed` positioning.

## Changes

**`src/routes/v4.intake.tsx`** — active chat view only (landing + structured wizard unchanged)
- Swap the `max-w-3xl mx-auto` wrapper for a full-width flex column container that fills the viewport height (e.g. `w-full px-6 flex flex-col min-h-[calc(100vh-160px)]`).
- Header (title + `HeaderIndicators`) stays at the top.
- `IntakeChat` wrapper gets `flex-1` so the transcript expands and the composer hugs the bottom.

**`src/components/v4/intake-chat.tsx`** — verify
- Ensure the chat root uses `h-full` / `flex-1` so it actually fills the new tall container, and that the inner transcript scrolls within it.
- Remove any internal `max-w-*` that would re-narrow the surface.

**`src/components/v4/app-shell.tsx`** — verify
- Confirm the children slot doesn't impose a max-width on `/v4/intake`. If it does, relax it for this route.

**Overlap behavior**
- No layout reservation for the cheat sheet or Workspace drawer — both are already `fixed` and will float over the wider chat.

## Out of scope
- Plan card grid layout (no changes — it will naturally flow horizontally inside the wider container).
- Landing screen and structured wizard layouts.
- Cheat sheet / Workspace drawer styling.
