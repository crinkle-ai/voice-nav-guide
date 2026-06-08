
## Diagnosis

Both bugs share one root cause: the Gemini Live model sometimes **answers in voice without emitting the corresponding tool call**, so the app never navigates or opens the callback form. Looking at the wiring in `src/components/BottomVoiceBar.tsx`:

- The `handleToolCall` switch for `navigate_to`, `highlight_section`, `explain_term`, and `request_agent_callback` is correct — when the model emits the tool, the app does the right thing.
- There is already a **scripted regex fallback** on the user's transcribed input for two intents: `matchesAgentIntent` (opens the callback form) and `matchesMyPlansIntent` (routes to `/my-plans`).
- There is **no fallback** for Learn topics (Part A/B/C/D, Medigap) or glossary terms (deductible, premium, etc.). When the model decides to just explain "Part B covers doctor visits…" without calling `highlight_section`, the user stays put.
- The agent fallback regexes do trigger on "talk to an agent" but **fail on modifiers like "talk to a telesales agent"** — the regex `(real\s+)?(person|human|agent|…)` only allows the literal modifier "real", so "telesales agent" / "licensed agent" / "Medicare agent" slip through and nothing opens.

The system prompt is already strong about tool-first behavior; tightening it further is high-effort and low-yield (Gemini Live tool calling has known flakiness). The right fix is to make the client guarantee the navigation behavior whenever the user's transcript clearly signals intent.

## Plan

Edit `src/components/BottomVoiceBar.tsx` only — this is a UI/client behavior fix, no backend changes.

### 1. Loosen the agent-callback regex

Replace the modifier capture group so any adjective(s) between "a/an" and `person|human|agent|representative|rep|someone|advisor|broker` are allowed (e.g. "telesales agent", "licensed agent", "Medicare agent", "real human"). Same change applied to all four agent triggers that currently use `(real\s+)?`.

### 2. Add a Learn-topic intent matcher

Add `matchesLearnTopic(text)` that returns `{ topic: "part-a" | "part-b" | "part-c" | "part-d" | "medigap" } | null` for phrases like:
- "what is Part A", "tell me about Part B", "explain Part C", "Medicare Advantage"
- "what's Part D", "prescription drug coverage"
- "what is Medigap", "supplement plan"

### 3. Add a glossary-term intent matcher

Add `matchesGlossaryTerm(text)` that returns one of `premium | deductible | copay | coinsurance | out-of-pocket-max | network | formulary` for phrases like "what is a deductible", "what does formulary mean", "what's a copay", "explain coinsurance", "out of pocket maximum", "in-network".

### 4. Wire the new matchers into the existing transcript handler

In the `inputTranscription` block (around line 504-525), after the existing `matchesAgentIntent` / `matchesMyPlansIntent` checks, add:

- If `matchesLearnTopic` returns a topic and the user is not already on `/learn` highlighting that section: `navigate({ to: "/learn" })`, then `setTimeout(() => { highlightSection(topic); dispatch({ type: "SET_HIGHLIGHT", section: topic }); }, 400)`.
- If `matchesGlossaryTerm` returns a term: same as above with `section = `glossary-${term}``.
- Use a `lastFallbackRef` (per-turn) so we don't re-fire the same navigation while the user keeps talking in the same turn — reset it on `turnComplete`.

These run alongside any tool call the model does emit; the `handleToolCall` path is idempotent for navigation (same destination just re-navigates), and the scripted highlight uses the same `highlightSection` helper, so double-firing is harmless.

### 5. (Optional, small) Tighten one prompt line

In `src/routes/api/voice-session.ts` SYSTEM_PROMPT, add one sentence under "TOOL RULES" reinforcing that any answer about a Medicare Part, glossary term, or callback request **must** be preceded by the matching tool call — never explain first. Keep this small; the scripted fallback is the real fix.

## Files touched

- `src/components/BottomVoiceBar.tsx` — regex loosening, two new matchers, hook them into the transcript handler.
- `src/routes/api/voice-session.ts` — one-sentence prompt nudge (optional).

No schema, server-function, or routing changes.
