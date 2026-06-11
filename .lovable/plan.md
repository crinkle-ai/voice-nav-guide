
## Goal

"View Deck" currently jumps straight into the 4-slide AI Navigator story. The Live Agent + Co-browse experience is a different pane, different business case, different demo — it deserves its own 4-slide deck, parallel to the AI one. Add a chooser screen that mirrors the homepage's "See how it works" two-up layout (with each video previewed), and let the user pick which deck to enter.

## UX

```text
/deck                          ← NEW chooser landing
   ┌──────────────────┬──────────────────┐
   │ AI GUIDE         │ LIVE AGENT       │
   │ [demo video]     │ [co-browse video]│
   │ Medicare         │ Hand off to a    │
   │ Navigator        │ licensed agent   │
   │ 4 slides         │ 4 slides         │
   │ [Open deck →]    │ [Open deck →]    │
   └──────────────────┴──────────────────┘
   Appendix: MVP · Validation · LiveAdvise (links below)

/deck/ai          ← existing 4 main slides + appendix (current behavior)
/deck/live        ← NEW 4 live-agent slides + shared appendix
```

- Top nav "View Deck" → `/deck` chooser.
- Each card autoplays muted/looped preview on hover (same `.mp4.asset.json` sources already on the homepage), with a "Open deck" CTA.
- Inside either deck, keep the existing slide chrome (arrows, swipe, Esc to launch app). Add a small "Switch deck" pill in the corner so a viewer can jump between the two without going back to `/deck`.

## New slides — Live Agent · Co-browse (parallel to the AI 4)

1. **Opportunity** — "AI guidance gets people 80% of the way. The last mile is human." Stats on abandonment at enrollment, trust gap for high-stakes choices (Medicare specifically), what a licensed agent unlocks that an AI can't (binding advice, plan-specific recs, compliance).
2. **Navigator: Live Co-browse** — what the product *is*. Sarah joins the same session, sees what the member sees, can highlight and drive without a screen-share install. Uses the existing `LiveAdvisePanel` screenshot/explainer beats.
3. **Business case** — different math from the AI deck: conversion lift on assisted sessions, AHT reduction vs. a cold callback, licensed-agent utilization, CSAT/NPS deltas. Frame as *complement* to the AI deck's deflection story.
4. **Demo** — embeds the `live-agent-cobrowse.mp4` (already uploaded) with the same "Launch the live experience" CTA the AI demo slide uses.

Appendix (MVP, Validation, LiveAdvise) stays shared — both decks link into the same 3 appendix slides.

## Implementation sketch

- New route `src/routes/deck.tsx` becomes the chooser (replace current SlideDeck component).
- Move existing deck content to `src/routes/deck.ai.tsx` (renders today's `SLIDES` array; URL becomes `/deck/ai`).
- New `src/routes/deck.live.tsx` with the 4 new slide components above + the same appendix imports.
- Extract `SlideDeck` shell (keyboard nav, swipe, arrows, progress) into `src/components/deck/SlideDeck.tsx` so both `/deck/ai` and `/deck/live` reuse it; each route passes its own `SLIDES` array and `mainCount`.
- Extract the 3 appendix slides into `src/components/deck/appendix.tsx` so both decks import them.
- Update the top-nav "View Deck" link target stays `/deck` (no change needed — it now lands on the chooser).
- Add a "Switch deck" control in the shell that links to the sibling route.

## Out of scope

- No changes to the homepage "See how it works" section, the LiveAdvisePanel, or any video assets.
- No new copy for appendix slides.
- No analytics wiring beyond the existing `useTrackPage` hook (will add one call per route).

## Open question

I'm assuming you want the chooser to be the *default* `/deck` landing. Alternative: keep `/deck` going straight to AI (today's behavior) and only expose the Live deck via a "See the live-agent deck" link from slide 4. Which do you prefer?
