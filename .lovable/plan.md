## Goal

When the user lands on **Find Doctors** from her workspace, the page should immediately reflect *her* situation (the persona's "Shop my way" needs), not look like a generic provider directory. Right now it's a blank search form with no context tying it to the rest of her journey.

## What to add

A new summary panel at the top of `/find-doctors` (above the search form) that mirrors the workspace persona — Robert's case: keep Dr. Patel and Dr. Chen, multi-state coverage (MN ↔ AZ), and the specialties he already needs covered.

### Panel contents

1. **Heading line** — small "Here's what you told us" eyebrow + one-sentence narrative pulled from `persona.narrativeMirror` (trimmed to the doctor-relevant bits, or a doctor-focused variant like *"You want to keep Dr. Patel and Dr. Chen, and you need coverage that follows you between Minnesota and Arizona."*).

2. **The doctors she wants to keep** — a row of small cards built from `persona.doctors`, each showing name, specialty, current city, and an "in-network / verifying" status pill. Each card has a "Find this doctor" button that pre-fills the search (name + specialty) and runs it.

3. **Need chips** — the doctor-relevant items from `persona.needs` and `persona.planFilters` rendered as chips (e.g. "Keep my doctors", "Multi-state PPO coverage", "Accepting new patients"). Visual only — no filter wiring yet.

4. **Quick-search shortcuts** — 2–3 buttons derived from her specialties ("Primary Care in Minneapolis", "Cardiology in Minneapolis", "Primary Care in Phoenix") that set the form filters and search in one click.

The existing search form, filter row, and result list stay as-is below the panel.

## Files to touch

- `src/routes/find-doctors.tsx` — add the summary panel above the `<form>`. Import `persona` from `@/mock/personas`. Reuse `setName/setSpecialty/setCity` + `setFilters` to wire the "Find this doctor" and quick-search buttons.
- No changes to `AppContext`, server functions, or routing.

## Out of scope

- No changes to the search backend or the doctor schema.
- No new persona fields. We render what's already in `persona.doctors`, `persona.needs`, `persona.planFilters`, and `persona.narrativeMirror`.
- The workspace "Verify Doctors" activity link is not changed in this pass.

## Open question

Should the panel be **collapsible** (so repeat visits aren't noisy) or **always-visible** (so the context is unmissable)? Default is always-visible unless you say otherwise.
