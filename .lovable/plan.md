## Goal

Strip the Live Agent / Talk to an Agent surfaces from the app so the demo focuses solely on the Medicare Navigator (voice + AI guide).

## Changes

1. **TopNav (`src/components/TopNav.tsx`)**
   - Remove the `TalkToAgentButton` from desktop and mobile nav.

2. **Homepage (`src/routes/index.tsx`)**
   - Remove the "Live Agent" video card from the demo section.
   - Keep the Medicare Navigator (AI Guide) card; let it span the row.

3. **Deck chooser (`src/routes/deck.index.tsx`)**
   - Remove the "Live Agent · Co-browse" card. Keep only the AI Navigator entry.

4. **Deck Live route (`src/routes/deck.live.tsx`)**
   - Redirect to `/deck/ai` (or `/`) so any stale link doesn't land on a broken/hidden experience.

## Kept intact (no deletions)

- `TalkToAgentButton.tsx`, `LiveAdvisePanel.tsx`, `LiveAdviseContext.tsx`, `AgentHighlightOverlay.tsx`, `deck/live-slides.tsx`, `deck.live.tsx` source files remain on disk — just unreferenced from the UI — so we can re-enable later without rebuilding.

## Out of scope

- No changes to VoiceNavigator / BottomVoiceBar / voice-session reliability work.
- No backend / route-tree restructuring.