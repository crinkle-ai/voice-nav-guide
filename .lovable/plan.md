## Goal
Let the consumer pick a plan other than the AI-recommended one before enrolling, with clear visual feedback about which plan is currently selected.

## Behavior

- On render, the recommended plan (top pick) is the initial **selected** plan.
- Clicking anywhere on a plan tile in the comparison grid selects it:
  - That tile gets the blue border + subtle glow currently used for "Recommended".
  - The previously selected tile loses the blue border and returns to the normal outline.
  - The "Recommended" badge stays on the AI's original recommendation regardless of selection, so the user always sees which one Crinkle suggested.
- Enroll button styling reflects selection:
  - Selected tile → **dark blue filled** button ("Enroll in this plan").
  - Unselected tiles → **outline** button (same label), so it's still clickable but visually secondary.
- Clicking any Enroll button starts the enrollment flow for that plan (unchanged) and also promotes that plan to selected first.
- Selection is local to the plan-comparison card instance (not persisted to session).

## Scope

- Only the "Also considered" grid tiles in `src/components/v4/chat-cards/plan-comparison.tsx`.
- The bundled "Why this combination" hero card at the top keeps its single dark-blue "Enroll in this coverage" button — combos aren't part of the tile selection model.
- Standalone recommended-plan hero (non-bundled path) stays as-is; its Enroll is already dark blue.

## Technical notes

- Add `const [selectedId, setSelectedId] = useState<string>(recommendedId ?? plans[0]?.id)` inside `PlanComparison`.
- Pass `isSelected` down to `PlanTile` and derive:
  - `borderCls` → blue border when `isSelected || isRecommended`.
  - Enroll button className → `primaryBtn` (dark blue fill) when `isSelected`, else outline variant.
- Tile click handler: `onClick={() => setSelectedId(p.id)}` on the outer `<article>`; stop propagation on the heart favorite button and the Enroll button so those don't double-fire selection unexpectedly (Enroll should still set selection then start enrollment).
- No changes to session store, enrollment dialog, or plan catalog.
