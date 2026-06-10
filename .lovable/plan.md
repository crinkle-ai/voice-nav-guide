# Live Advise — Human Agent Co-Browse Demo

A faux-live demo where a consumer can "call" a licensed Crinkle agent who joins their session, sees their context, highlights things on the page, and pushes a side-by-side plan comparison. Frames the human handoff as the safety net to the Voice AI Navigator.

## What gets built

### 1. `LiveAdviseProvider` + global state
New context (`src/context/LiveAdviseContext.tsx`) holding:
- `status`: `idle | connecting | connected | ended`
- `agent`: `{ name: "Sarah Chen", title: "Licensed Medicare Advisor", license: "NPN #19284756", state: "TX", avatar }`
- `contextSummary`: derived from existing `AppContext` (current route, saved doctors, saved plans, ZIP, last AI intent)
- `highlightSelector`: CSS selector the "agent" is currently spotlighting
- `pushedComparison`: array of plan IDs to show side-by-side
- Scripted timeline runner that advances the demo

### 2. `LiveAdvisePanel` (the call UI)
Bottom-right docked panel (resizable / minimizable), sits above the existing voice bar:
- **Agent video tile** — looping muted MP4 of a friendly agent (generated/stock); waveform when "speaking"
- **Agent identity card** — name, headshot, license #, state, "Licensed in TX • Online now"
- **Context summary** — "I can see you're on Compare Plans, viewing 3 Medicare Advantage options, saved Dr. Patel, ZIP 78701" (pulled live from AppContext)
- **Live transcript** — scripted agent dialogue appearing line-by-line
- **Action chips** — "End call", "Mute", "Stop sharing"

### 3. `AgentHighlightOverlay`
Renders a pulsing outlined box + tooltip over whatever element the agent is "pointing at" (driven by `highlightSelector`). Smooth scrolls into view. Used on /compare-plans to highlight specific plan cards.

### 4. `PushedComparisonDrawer`
When the agent "pushes" a comparison, a drawer slides up showing 2 plans side-by-side (premium, deductible, MOOP, networks, drug tiers, dental/vision). Reuses existing plan data.

### 5. Entry points
- **Top nav** (`TopNav.tsx`) — new "Talk to an agent" button (phone + video icon), green accent, always visible
- **Voice AI handoff** — `BottomVoiceBar` / `VoiceNavigator` gains a "Connect me to a licensed agent" intent that triggers Live Advise with the AI's current context passed in
- **`/compare-plans` CTA** — sticky banner: "Review these plans with a licensed agent →"
- **Deck slide** — new slide between Solution and MVP: **"The Human Safety Net: Live Advise Co-Browse"** explaining AI → human handoff with full context, why this is the differentiator vs. pure-AI competitors

### 6. Scripted demo flow
When started, runs ~45-second timeline:
1. 0s — "Connecting you to a licensed Crinkle agent…" spinner
2. 3s — Sarah's video tile fades in, "Hi! I'm Sarah, I can see your screen. Looks like you're comparing Medicare Advantage plans in 78701 — want me to walk through the top 2 with you?"
3. 8s — Highlight overlay pulses around first plan card
4. 14s — "This Aetna PPO has a $0 premium but a higher MOOP — here's how it compares to the Humana plan you saved…"
5. 18s — Pushed comparison drawer slides up with both plans
6. 28s — Highlight jumps to "Dental coverage" row in comparison
7. 38s — "Any questions on coverage for Dr. Patel? I can confirm she's in-network." → highlights saved doctor pill
8. Call stays open; user can end anytime

### 7. Deck slide content
Title: **The Human Safety Net** • Subtitle: *AI handles 80%. Live Advise handles the moments that matter.*
Three columns:
- **Seamless handoff** — AI passes full context (page, intent, saved items) so the agent doesn't ask "what's your ZIP?" again
- **Co-browse, not screen share** — agent highlights, scrolls, and pushes comparisons inside the consumer's existing browser session — no Zoom, no install
- **Trust + compliance** — licensed agent identity surfaced, NPN visible, call recorded for QA

CTA at bottom: "Try Live Advise →" links to home with `?liveadvise=1` to auto-trigger the demo.

## Technical details

- **No real WebRTC.** Agent "video" is a looping MP4 asset (generated via imagegen or stock). Waveform is CSS animation tied to a scripted "speaking" boolean.
- **Highlight overlay** uses `getBoundingClientRect()` on the target selector, renders a fixed-position div with `outline` + `box-shadow` pulse animation, recalculates on scroll/resize.
- **Context summary** reads from existing `AppContext` (no new persistence). Updates live if user navigates during the call.
- **Z-index stack:** highlight overlay (40) < pushed drawer (45) < Live Advise panel (50) < existing voice bar (50, repositioned left when call active).
- **Bottom padding** already handles voice bar; panel docks above it without further changes.
- **Mobile:** panel collapses to a compact pill ("📞 On call with Sarah") that expands on tap.
- **Auto-trigger:** `?liveadvise=1` query param on any route starts the demo flow immediately — used by the deck slide CTA.

## Files

New:
- `src/context/LiveAdviseContext.tsx` — provider, state, scripted timeline
- `src/components/LiveAdvisePanel.tsx` — docked call UI
- `src/components/AgentHighlightOverlay.tsx` — page highlight box
- `src/components/PushedComparisonDrawer.tsx` — side-by-side plans
- `src/components/TalkToAgentButton.tsx` — reusable entry button
- `src/assets/agent-sarah.mp4.asset.json` — looping agent video (generated)

Edited:
- `src/routes/__root.tsx` — wrap in `LiveAdviseProvider`, mount panel + overlay
- `src/components/TopNav.tsx` — add "Talk to an agent" button
- `src/routes/compare-plans.tsx` — add sticky "Review with agent" CTA
- `src/components/BottomVoiceBar.tsx` (or `VoiceNavigator.tsx`) — add "Connect to agent" intent that calls `startLiveAdvise()` with current AI context
- `src/routes/deck.tsx` — insert new "Human Safety Net" slide; bump total slide count

## Out of scope (can add later)
- Real WebRTC / Twilio / Daily integration
- Actual scheduling / agent routing
- Recording / transcript persistence
- Two-way video (consumer camera)
