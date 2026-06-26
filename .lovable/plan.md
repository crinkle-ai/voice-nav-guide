## Problem

When the user asks to see plans in the chat, the assistant replies "I can't display specific plans here. The 'Finish intake' button will show you all your matches." The `recommendPlans` tool exists and the chat already renders `PlanComparisonCard` for it (`src/components/v4/intake-chat.tsx:277`), but the model is refusing to use it because the system prompt repeatedly pushes the user toward the "Finish intake" button as the place where matches appear (`src/lib/v4/prompts.ts:89`).

## Fix

Update `src/lib/v4/prompts.ts` and `src/routes/api/v4/chat.ts` so the assistant treats inline plan rendering as a first-class capability.

1. **`src/lib/v4/prompts.ts`**
   - Remove the line "When you have enough, tell them they can click 'Finish intake' to see their matches." from `SHARED_GUARDRAILS`.
   - Add a new `INLINE_PLANS_RULE` block stating:
     - The chat CAN display plans inline — always via the `recommendPlans` tool.
     - If the caller asks to see plans, options, recommendations, comparisons, or "what would you suggest" — call `recommendPlans` immediately with the best-fitting 2–4 UHC plans drawn from the current intake snapshot, even if intake is partial. Note any assumptions in the rationale.
     - Never reply that plans can't be shown here. Never defer plans to the "Finish intake" button.
     - Reframe "Finish intake" as an optional shortcut to a fuller side-by-side view, not the only path.

2. **`src/routes/api/v4/chat.ts`**
   - Strengthen the `recommendPlans` bullet in `TOOL_INSTRUCTIONS`: add "If the caller asks to see plans in the chat, you MUST call this tool in the same turn — do not say plans are unavailable here."

No UI / component changes needed; the renderer already handles the tool output.

## Verification

- Reload `/v4/intake`, ask "Can you show me some plans?" — the assistant should render a `PlanComparisonCard` inline with rationale chips, instead of the refusal message.
