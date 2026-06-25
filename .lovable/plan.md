## V3 (route `/v4`) Home Page Redesign

Rebuild the `/v4/intake` landing as a clean, focused entry surface with a welcome, two path cards, a prominent chat field, and quick-prompt chips.

### Layout (top → bottom, centered column, generous whitespace)

```text
        [ Large serif headline ]
   "Let's figure out Medicare, together."
        [ short supporting line ]

  ┌────────────────────┐   ┌────────────────────┐
  │ I'm just starting  │   │ I want to see      │
  │ Medicare           │   │ plans              │
  │ short description  │   │ short description  │
  └────────────────────┘   └────────────────────┘

      [ chip ] [ chip ] [ chip ] [ chip ]

  ┌──────────────────────────────────────────┐
  │ What's on your mind?                  ➤ │
  └──────────────────────────────────────────┘
```

### Behavior

- **Welcome heading**: Source Serif Pro, large, left-aligned. Subline in muted tone.
- **Two path cards**:
  - "I'm just starting Medicare" → acts like a link to content (still to come)
  - "I want to see plans" → acts like a link to content (still to come)
  - Cards are equally weighted, hover-elevated, with a small illustration/icon and one-line description.
- **Quick-prompt chips** (4 max): clicking a chip **appends** its text into the chat textarea with auto-send.  
  - "I'm most concerned about money"
  - "I don't know where to start"
  - "When am I eligible?"
  - "I have specific doctors I want to keep"
- **Chat field**: Large, prominent composer.  Revise existing to look more like ChatGPT.  with placeholder "What's on your mind?". Submitting transitions into the existing chat experience (`IntakeChat`) — first user message kicks off the conversation just like today.
- Keep the existing AppShell header (UHC logo, Medicare, Sign in). Remove the current mode-picker / status content from the landing state.

### Files to change

- `src/routes/v4.intake.tsx` — replace the pre-chat empty state with the new hero (heading, two cards, chips, composer). Once a message is sent (state already tracked), continue rendering the existing `IntakeChat` transcript unchanged.
- `src/components/v4/composer.tsx` — accept an external `value` / `onChange` (or expose a ref-based append) so chip clicks can inject text. Minimal change if it already supports controlled value.
- New small components colocated in `src/components/v4/`:
  - `landing-hero.tsx` (heading + subline)
  - `path-cards.tsx` (two cards)
  - `prompt-chips.tsx` (chip row)

### Out of scope

- No change to `/api/v4/chat`, tool calls, plan recommendation, workspace drawer, or Sign-in.
- No change to V1/V2 or other routes.