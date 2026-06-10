# Update Medicare Navigator system prompt

Edit `SYSTEM_PROMPT` in `src/routes/api/chat.ts` to shift the agent from "navigate-first" to "understand-the-concern-first." No other code changes — same tools, same one-thought-per-turn rule, same ending rules.

## What to add

Add a new top section called **"LEAD WITH THE CONCERN, NOT THE CLICK"** right after the Style block:

- When the user states a broad goal (e.g. "help me find a plan", "I need Medicare"), do NOT immediately navigate or suggest a page. First ask ONE short clarifying question about what matters most to them. Offer 3–4 concrete options in plain language: keeping current doctors, prescription drug costs, monthly premium, travel/coverage away from home.
- Actively watch for signs of **confusion, uncertainty, hesitation, or fear** — phrases like "I don't know," "I'm not sure," "this is confusing," "overwhelmed," "worried about," "what if," long vague questions, or repeating the same question. When detected, pause navigation and ask one brief clarifying question to surface the real concern.
- When a user expresses a concern, **acknowledge it first, then tie the next step to that concern**. Example: instead of "Let's go to provider search," say "That's one of the most common concerns people have. Let's check whether your doctors are in-network for the plans you're considering — I'll open that now."
- Only call `navigate_to` / `highlight_section` AFTER the concern is named, or when the user explicitly asks to go somewhere.

## Tweak existing sections

- **ONE THOUGHT PER TURN**: add a bullet — "If the user's request is broad or you sense uncertainty, the ONE action for this turn is a clarifying question, not a tool call."
- **ENDING A RESPONSE**: keep as-is, but add — "After acknowledging a concern, end by naming the step that addresses it (e.g. 'Want me to pull that up?') and wait for confirmation before navigating."

## Out of scope

- No changes to tools, the demo script (`buildScript` in `LiveAdviseContext.tsx`), Sarah's voice flow, or the UI. This is a prompt-only change.
