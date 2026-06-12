# Make the live voice guide reliable: fix the cut-off welcome + missed navigation

## What's actually going wrong

**1. The welcome cuts off mid-sentence — found the cause.**
The moment the session goes live, the app sends the greeting prompt and then *immediately* sends a `[CURRENT PAGE: /]` context message (the page-tracking effect fires right away because the "last sent path" is reset to null on activation). Gemini Live treats any new client message as a reason to cancel what it's currently generating — so Sarah's welcome gets chopped off by our own context push.

**2. False "interruptions" also cut her off.**
Voice detection is tuned to maximum sensitivity (`START_SENSITIVITY_HIGH`, 400ms silence). Any tiny noise — a breath, keyboard click, or speaker echo — registers as the user barging in, which instantly stops her audio mid-sentence.

**3. "Take me to the learn page" sometimes does nothing.**
In the live voice path there is NO safety net for navigation. (We added one to the text chat widget earlier, but the bottom voice bar is a separate system.) If the model says "I'll take you to the Learn page" without firing the `navigate_to` tool, nothing happens. There are already deterministic fallbacks for "talk to an agent" and "my plans" — but not for the four main pages.

## The fix (3 changes, all in `src/components/BottomVoiceBar.tsx` + 1 in `src/routes/api/voice-session.ts`)

### A. Stop interrupting our own greeting
- Hold the `[CURRENT PAGE]` context push while the model is mid-turn (speaking/generating). Queue it and send it only after `turnComplete`.
- Include the current page directly in the greeting prompt instead, so she still knows where the user is from the very first turn.

### B. Calm down the barge-in sensitivity
- Change voice detection from HIGH start sensitivity to default, and raise silence duration from 400ms → ~800ms. Real interruptions still work; random noise stops killing her sentences.

### C. Deterministic navigation safety net (same approach as the agent-callback fallback that already works well)
- **User-side**: when the user's transcribed speech contains an explicit destination ("take me to learn", "go to compare plans", "find doctors page", "go home"), navigate immediately — no waiting on the model. Same `fireOnce` pattern used for agent intent.
- **Model-side**: track whether a `navigate_to` tool call happened during the turn. At `turnComplete`, if her spoken transcript announced navigation ("taking you to the Learn page…") but no tool fired, navigate based on her own words — identical to the fallback we built for the text chat.

## Result
- Welcome plays to the end, every time.
- Saying "take me to the learn page" navigates even if the model flakes — guaranteed by code, not model behavior.
- Fewer random mid-sentence cutoffs during normal conversation.

## Technical notes
- Files touched: `src/components/BottomVoiceBar.tsx` (queued context push, transcript-based nav fallbacks, turn-level tool tracking), `src/routes/api/voice-session.ts` (VAD config).
- No backend/database changes. The text-chat widget (VoiceNavigator) already has its fallback and is untouched.
- I'll verify by exercising the live flow in a real browser session after the changes.