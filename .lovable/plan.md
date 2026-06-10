## Problem

The voice navigator now speaks warmly but says it will take you somewhere (e.g. "let me pull up the Learn page") without actually calling `navigate_to`. The recent prompt rewrite emphasized reassurance and added "ONE action per turn" so strongly that the model is treating speech itself as the action and skipping the tool call.

## Fix

Update the system prompt in `src/routes/api/voice-session.ts` to make tool-calling and speech tightly bound:

1. **Make "say it = do it" a hard rule.** Add an explicit invariant: if the voice promises a destination ("let me pull up X", "taking you to Y", "let's look at Z together"), the matching `navigate_to` (or `highlight_section` / `filter_plans` / `search_doctors`) tool MUST be called in the SAME turn. Never narrate a navigation without firing the tool.

2. **Reframe "ONE THOUGHT PER TURN".** Clarify that a tool call + the short sentence describing it counts as ONE thought, not two. The rule is meant to stop chaining navigate → explain → next-step-pitch, not to suppress the tool when the voice is already committing to it.

3. **Add a concrete contrast block** in the prompt:
   - GOOD: voice says "That's a common worry — let me pull up the Learn page so we can walk through it together." AND `navigate_to("/learn")` is called same turn.
   - BAD: voice says the same sentence but no tool is called — user is left on the current page.

4. **Lower the bar for direct destinations.** Strengthen rule 5 / "RESPECT EXPLICIT DESTINATIONS": any time the user names a page ("learn", "compare plans", "doctors", "home") OR the assistant itself decides to take them somewhere, fire `navigate_to` immediately — no clarifying question, no "want me to?" gate.

## Scope

- Single file edited: `src/routes/api/voice-session.ts` (system prompt only).
- No changes to `BottomVoiceBar.tsx`, tool definitions, or routing.

## Verification

After the edit, test by saying "I'm overwhelmed, take me to learn" and "help me understand Medicare" — both should produce a warm sentence AND an actual page navigation.
