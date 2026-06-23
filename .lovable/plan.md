## Goal

Make `/learn` feel like it was written for *her* — pulling the persona's priorities and concerns to the top instead of dumping a generic Medicare 101 page. Same pattern as Find Doctors: a "Here's what you told us" panel + signposting that ties each Medicare topic back to a specific need she expressed.

## What to add

### 1. Personalized header panel (top of page, above the existing Parts accordion)

- Eyebrow: "Here's what you told us"
- One-sentence narrative tuned to learning (e.g. *"Since keeping Dr. Patel and Dr. Chen and traveling between MN and AZ are what matter, here's what to focus on first."*)
- Chips for `persona.understanding.priorities` and `persona.understanding.concerns` (visual only).

### 2. "Start here for you" reading list

A small ordered list above the full Parts accordion with 2–3 picks chosen from the persona's priorities. Each item links to the matching accordion section (sets `openId` and scrolls). Mapping:

- *Keep doctors / Provider networks* → **Part C — Medicare Advantage** + **Medigap** (network vs. no-network framing)
- *Prescription coverage* → **Part D — Prescription Drugs**
- *Travel flexibility / Multi-state* → **Medigap** (and a note about PPO Advantage)

Each item shows: the topic title, a one-line "why this matters to you" pulled/derived from the persona need, and a "Read this section" button.

### 3. "Why this matters to you" callout inside each accordion item

When an accordion item maps to one of her priorities, render a small inline callout under the body text: *"Matters to you because: keeping Dr. Patel and Dr. Chen depends on this plan's network."* For non-matching items, nothing changes.

### 4. Personalized glossary ordering (light touch)

Surface 3 glossary terms first as "Words you'll hit first" based on her priorities — Network, Formulary, Out-of-pocket max — then render the rest of the glossary unchanged below. No new terms, just reordering + a small header.

## Files to touch

- `src/routes/learn.tsx` — add the header panel, reading list, per-item callouts, and the glossary "first" subsection. Import `persona` from `@/mock/personas`.

## Out of scope

- No new persona fields. We use `persona.understanding.priorities`, `persona.understanding.concerns`, `persona.doctors`, and `persona.narrativeMirror`.
- No changes to the read-aloud behavior, accordion mechanics, or routing.
- No new copy for Medicare parts themselves — bodies stay as-is.
- No changes to nav or workspace links.

## Open question

Should the header panel also have a "Skip ahead to what matters" button that auto-opens the most relevant accordion section on load? Default: no, the reading list already handles that — but easy to add if you want it pre-opened.
