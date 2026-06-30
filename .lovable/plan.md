## Goal

Redesign `PlanComparisonCard` so 5+ plan cards fit horizontally across the chat surface in a single comparison view, instead of stacking vertically.

## Approach

Convert the current vertical list into a horizontal compare strip with compact, scannable cards. Each card stays self-contained (carrier, name, price, key facts, favorite, "why") but is condensed for width-efficiency.

### `src/components/v4/chat-cards/plan-comparison.tsx`

Replace the wrapping `<div className="mt-3 space-y-3">` with a responsive grid:

- Container: `mt-3 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` so 5 cards sit in one row on the wide chat surface, gracefully wrapping on narrower viewports.
- Add a horizontal-scroll fallback (`overflow-x-auto` with `snap-x` and `min-w-[180px]` cards) for the rare case where the chat width is constrained — ensures 5 are always comparable in one window without page scroll.

### Card redesign (compact vertical layout, one column inside each tile)

- Header: small uppercase carrier · type (truncate), serif plan name `text-sm leading-snug` clamped to 2 lines, star rating inline as a small pill.
- Price block: large `$XX/mo` premium as the visual anchor, secondary `Max OOP $X,XXX` underneath in muted-2 text.
- Key facts: collapse `highlights` to the top 2 bullets max (slice), each a tight one-liner with a small dot.
- "Why" section: render only the top 1–2 reasons as `label` chips with a tooltip on hover for the full `detail`; keep `Sparkles` icon as a small header.
- Favorite: move the heart to a small icon-only button in the top-right corner (no "Favorite" text label) to save horizontal space; keep aria-label + pressed state.
- Footer: optional "Compare" / "See details" link that expands the card inline (uses local `useState` per card) to reveal the full highlights + reasons list — preserves all current data without bloating the strip.

### Tokens / styling

- Continue using existing tokens (`bg-paper`, `border-ink/10`, `bg-surface-soft/40`, `text-muted-2`, `text-amber-600`, rose favorite styles). No new custom colors.
- Use `text-[11px]` / `text-xs` for meta rows; `text-base font-serif` for plan name; `text-xl font-semibold` for the premium anchor.
- Cards: `rounded-xl border border-ink/10 bg-paper flex flex-col h-full` so all 5 cards line up to equal height.

### Behavior preserved

- Favorites toggle continues to read/write `state.favoritePlans` via `useSession`.
- Same input contract (`RecommendPlansInput`) — no changes to chat wiring, intake, or API.
- Rationale data still available; just visually condensed with progressive disclosure.

## Out of scope

- No changes to chat layout, intake logic, or data shape.
- No new dependencies.
- No changes to the Favorites workspace card.
