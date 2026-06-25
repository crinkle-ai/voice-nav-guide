## Goal

Make `/v4/intake` feel like ChatGPT/Gemini: a single primary chat column where the user types or speaks, answers stream in above the composer, and the assistant can render rich content (plan comparisons, questionnaires, diagrams) inline as part of its reply — with a clear "why we recommended this" rationale on every plan.

## Layout changes

```text
┌──────────────────────────────────────────────────┐
│  Header (existing)                               │
├──────────────────────────────────────────────────┤
│                                                  │
│   Conversation transcript (scrolls)              │
│   • user bubble (right)                          │
│   • assistant reply (left, may contain cards)    │
│       └─ PlanComparison / Questionnaire /        │
│          Diagram / Suggestion chips              │
│                                                  │
├──────────────────────────────────────────────────┤
│  [ Type a message…              ] [🎤] [🎙️voice] │
└──────────────────────────────────────────────────┘
```

- One centered column (max-w ~3xl), no side capture sidebar (Workspace drawer already covers that).
- Composer pinned to bottom, mic + voice-to-voice buttons on the right of the input.
- Structured wizard and Path picker modes stay, but the default Ramble mode becomes this surface.

## Composer

Replace the current Send-only composer in `src/components/v4/intake-chat.tsx`:

- Text input (auto-grow textarea).
- 🎤 **Mic (dictation)**: press-and-hold or toggle; uses existing browser STT path from `voice-intake.tsx` (Lovable AI `openai/gpt-4o-mini-transcribe`) and drops the transcript into the textarea — user reviews and sends.
- 🎙️ **Voice-to-voice**: opens the existing `VoiceIntake` realtime session in an inline panel above the composer (not a separate route). Toggling it back returns to text mode. Same `onMessagesChange` so transcript merges into the chat.
- Submit on Enter; Shift+Enter newline; disabled while streaming.

## Rich in-chat content (assistant "parts")

Extend the AI route at `src/routes/api/v4.chat.ts` to emit tool calls the UI renders as cards inline in the assistant message. New tools (server-side, AI SDK `tool()` with Zod input):

1. `askQuestionnaire` — { title, questions:[{id,label,type:'single'|'multi'|'text',options?}] } → renders an inline form; on submit, the answers post back as the next user message.
2. `recommendPlans` — { plans:[{id,name,carrier,type,monthlyPremium,maxOOP,starRating,highlights[]}], rationale:[{planId, reasons:[{label,detail,sourceField}]}] } → renders a comparison card with a **"Why we recommended this"** section per plan that cites which intake fields drove the pick (e.g. "Keeps Dr. Patel in-network", "$0 copay on metformin", "Under your $80 budget").
3. `showDiagram` — { kind:'coverage-gaps'|'cost-breakdown'|'timeline', data } → small SVG/Recharts viz.
4. `suggestNext` — { chips:[string] } → quick-reply chips under the message; clicking sends as user text.

Each card is a React component under `src/components/v4/chat-cards/`. The chat renderer iterates `message.parts` and switches on `part.type` (`text` vs `tool-<name>`) per AI SDK UI conventions, so cards stream in alongside text.

## "Why this plan" rationale

- Server prompt updated (`src/lib/v4/prompts.ts`) to require the model to call `recommendPlans` whenever it surfaces plan options, and to always include a `rationale[]` array tying each pick to specific captured intake values (doctors, meds, conditions, budget, Medicaid, ZIP).
- UI surfaces rationale as a labeled list under each plan card ("Because you said…") with the source field tag visible.
- `/v4/matches` page reuses the same `PlanComparison` card for consistency.

## Files

New:
- `src/components/v4/chat-cards/plan-comparison.tsx`
- `src/components/v4/chat-cards/questionnaire.tsx`
- `src/components/v4/chat-cards/diagram.tsx`
- `src/components/v4/chat-cards/suggest-next.tsx`
- `src/components/v4/composer.tsx` (text + mic + voice-to-voice button row)
- `src/lib/v4/dictation.ts` (thin wrapper around existing STT for press-to-talk)

Edited:
- `src/components/v4/intake-chat.tsx` — center column, render tool parts, embed new composer, inline voice panel toggle.
- `src/routes/api/v4.chat.ts` — register the 4 tools, pass current intake snapshot into the system prompt for rationale grounding.
- `src/lib/v4/prompts.ts` — instruct model when to call each tool and the rationale requirement.
- `src/routes/v4.intake.tsx` — drop the text/voice tab toggle (voice now lives in the composer), keep Finish intake button.

## Out of scope

- Image upload in composer (can add later).
- Persisting cards to DB (in-memory in chat state, like existing messages).
- Changes to Structured wizard mode.
