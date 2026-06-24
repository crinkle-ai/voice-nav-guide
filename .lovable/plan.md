
## Goal

Add a new `/v4` experience that is a fork of `/v3` (Medicare Compass), differentiating the three intake modes so each tests a real hypothesis instead of being "the same chat with a different opener." `/v3` stays untouched as a reference.

## Approach: fork, don't refactor

To keep `/v3` working as the current baseline, copy the relevant v3 surface into v4-scoped files. Shared business logic (extraction, matching, intake types, plan data, providers/medications verification functions) is reused as-is — no duplication of backend logic.

## New files

Routes (file-based, `v4.*`):
- `src/routes/v4.tsx` — pathless layout wrapper (mirrors `v3.tsx`)
- `src/routes/v4.index.tsx` — landing page with 3 redesigned mode cards
- `src/routes/v4.intake.tsx` — branches on mode: ramble → chat, structured → wizard, hybrid → path-picker then chat
- `src/routes/v4.summary.tsx`, `v4.priorities.tsx`, `v4.matches.tsx`, `v4.next-step.tsx` — thin copies of the v3 equivalents pointing at v4 routes

New v4 components (`src/components/v4/`):
- `app-shell.tsx` — copy of v3 shell, v4 back link / nav
- `structured-wizard.tsx` — real stepped form: ZIP → Doctors → Medications → Health → Priorities → Budget → Extras. Writes directly into `state.intake`. No chat, no extraction LLM for owned fields. Progress bar, Back / Next / Skip. Reuses existing `DoctorEditor` and `MedicationEditor` (with NPI / RxNorm verify) for the doctor/med steps.
- `path-picker.tsx` — 4 cards for Shop Your Way: Keep my doctors / Afford my medications / Lowest cost / New to Medicare. Stores choice in v4 session.
- `intake-chat.tsx`, `voice-intake.tsx`, `capture-sidebar.tsx` — copies of v3 components, importing v4 session + v4 prompts. Capture sidebar renders as a live preview (no extraction spinner) when mode is `structured`.

New v4 lib (`src/lib/v4/`):
- `session-store.ts` — copy of v3 store with a new localStorage key (`v4-medicare-compass-session-v1`) and an added `path?: "doctor-first" | "drug-first" | "budget-first" | "new-to-medicare"` field.
- `prompts.ts` — tightened Ramble prompt; 4 path-specific Hybrid prompts that front-load the relevant fields; Structured prompt only used by the optional sidebar helper.
- `intake.functions.ts` — re-export `extractIntake` from v3 (single source of truth for extraction).

API:
- `src/routes/api/v4/chat.ts` — copy of `api/v3/chat.ts` but imports `SYSTEM_PROMPTS` from `src/lib/v4/prompts.ts` and accepts an optional `path` to select a Hybrid sub-prompt.

## Behavior summary

- **Ramble**: same chat UI as v3. Tighter system prompt: one warm invitation, follow-ups only for missing critical fields. Voice + text.
- **Structured**: no chat. Real wizard, each step a real form using existing structured shapes. "Need help?" sidebar helper is optional and does not drive flow.
- **Shop Your Way (hybrid)**: after mode select, `/v4/intake` shows `PathPicker` if no `path` set. Once picked, renders `IntakeChat` / `VoiceIntake` with the path-specific system prompt and a "Path: …" chip at the top. Voice remains available.

## Landing page copy (`v4.index.tsx`)

Three cards exactly as in the attached screenshot:
- Open conversation — "Just tell us everything"
- Step-by-step wizard — "Fill out a quick form"
- Pick your path — "Shop your way" (internal key stays `hybrid`)

"How it works" section rewritten to describe the three distinct experiences.

## Out of scope

- No changes to `/v3` behavior, copy, or files.
- No schema changes; intake / matching / summary logic unchanged.
- No new backend besides the v4 chat route (which delegates to existing AI gateway helpers).
- Executive chooser (`/`) is not modified in this plan — happy to add a v4 tile in a follow-up if you want it surfaced there.

## Open question

Wizard step order defaults to: ZIP → Doctors → Medications → Health → Priorities → Budget → Extras. Say the word if you want it re-sequenced.
