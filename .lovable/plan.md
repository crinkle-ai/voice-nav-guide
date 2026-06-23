## Goal

Let the voice navigator point at the new personalization regions on `/find-doctors` and `/learn` by registering ids in `src/lib/nav-map.ts` and adding matching `id="…"` props in the route files.

## Changes

### 1. `src/lib/nav-map.ts` — register new sections

Add to the `/learn` entry:
- `your-priorities` — "Personalized 'Here's what you told us' panel". When to use: user asks "where do I start" / "what should I read first" / wants the personalized intro.
- `start-here` — "Start here for you reading list". When to use: user wants the recommended order tailored to their priorities.
- `priority-glossary` — "Words you'll hit first". When to use: user asks for the most important terms for their situation.

Add to the `/find-doctors` entry:
- `your-needs-summary` — "Personalized 'Here's what you told us' panel". When to use: user asks what we're optimizing for / wants the recap.
- `doctors-to-keep` — "Doctors you want to keep cards". When to use: user mentions Dr. Patel, Dr. Chen, or "my current doctors".
- `quick-searches` — "Quick search shortcuts". When to use: user wants suggested searches by specialty/city without typing.

(Existing ids stay unchanged.)

### 2. `src/routes/learn.tsx` — add `id` props

- Wrap the top personalized panel with `id="your-priorities"`.
- The "Start here for you" `<ol>`/wrapper `div` gets `id="start-here"`.
- The "Words you'll hit first" wrapper `div` gets `id="priority-glossary"`.

### 3. `src/routes/find-doctors.tsx` — add `id` props

- The summary `<section>` gets `id="your-needs-summary"`.
- The "Doctors you want to keep" `<div>` gets `id="doctors-to-keep"`.
- The "Quick searches" `<div>` gets `id="quick-searches"`.

## Out of scope

- No changes to AI system prompt assembly — `buildNavMapPrompt()` already serializes `NAV_MAP`, so the new ids flow into the voice session prompt automatically.
- No new tools, no new dynamic id patterns, no changes to `search_doctors` / `recommend_plans`.
- No changes to highlight visuals — existing `useHighlightConsumer` ring/scroll behavior covers them.
