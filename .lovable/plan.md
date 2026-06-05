## Phase 2 — Voice-Guided Medicare Journey Navigator

Replace every Phase 1 placeholder with real, working features and wire up an AI voice navigator that can answer Medicare questions and drive the app.

### 1. Enable Lovable Cloud + seed data

Turn on Lovable Cloud and create two tables with RLS + grants:

- `doctors` — id, name, specialty, city, state, zip, address, phone, accepting_new_patients, medicare_assignment, network_tags (text[]), languages (text[])
- `plans` — id, name, type (Original Medicare / Advantage / Supplement / Part D), carrier, monthly_premium, annual_deductible, oop_max, drug_coverage (bool), dental (bool), vision (bool), hearing (bool), star_rating, summary, highlights (text[])

Both publicly readable (read-only reference data); writes service-role only. Seed ~12 doctors across a few cities/specialties and ~8 plans covering each type.

### 2. Home page — real welcome

- Hero with headline, subhead, "Talk to your guide" CTA (opens voice navigator) and "Start with Step 1" link
- 3 step cards (Learn → Find Doctors → Compare Plans) with visited/completed checkmarks pulled from `journey` state
- "What can I ask?" example-prompt chips that, when clicked, open the navigator pre-loaded with that question
- Trust strip (no jargon, voice-friendly, your data stays on this device)

### 3. Learn page — Medicare education

- Tabbed/accordion explainers for Parts A, B, C, D + Medigap, in plain language
- Glossary section (Premium, Deductible, Coinsurance, Copay, OOP max, Network, Formulary) with short definitions
- "Read aloud" button per section using browser SpeechSynthesis (free, no extra cost) — separate from the AI navigator
- Marks `education` step complete after the user expands ≥1 section

### 4. Find Doctors page

- Search inputs: name, specialty (select), city/zip
- Results list (cards) from `doctors` table via TanStack Query + `createServerFn`
- Each card: name, specialty, address, phone, "Accepts Medicare assignment" badge, "Accepting new patients" badge
- "Save to my list" toggle (stored in AppContext journey state for this session)
- Empty state + loading skeletons

### 5. Compare Plans page

- Filter bar: plan type, max monthly premium (slider), needs drug coverage (switch), needs dental/vision (switches)
- Side-by-side comparison table (shadcn Table): premium, deductible, OOP max, drug/dental/vision, star rating, highlights
- "Select to compare" checkboxes — up to 3 plans pinned to a sticky compare bar
- Marks `plan-comparison` step complete after first filter or selection

### 6. Voice Navigator (the headline feature)

Upgrade the floating mic button into a working assistant:

- **Speech-to-text**: browser Web Speech API (`SpeechRecognition`) — free, fast, runs locally
- **LLM brain**: Lovable AI Gateway via `createServerFn` at `src/lib/navigator.functions.ts` using `streamText` with `google/gemini-3-flash-preview`. System prompt grounds the model as a Medicare guide and exposes navigation tools.
- **Tools the model can call** (via AI SDK `tool()` with Zod schemas):
  - `navigate_to({ page })` — returns a route to push (`/`, `/learn`, `/find-doctors`, `/compare-plans`)
  - `highlight_section({ section })` — sets `highlightedSection` in AppContext so the target page can pulse/scroll
  - `search_doctors({ specialty?, city? })` — queries `doctors` table, returns summary
  - `recommend_plans({ needs_drug, max_premium?, type? })` — queries `plans`, returns top 3
- **Text-to-speech**: browser SpeechSynthesis to read the assistant reply aloud (no TTS credits burned). Voice toggle in panel.
- **Panel UI**: transcript bubbles (user/assistant), live "listening…" / "thinking…" / "speaking…" status using `voiceState`, suggested prompts, mute button, text input fallback for users who can't/won't speak
- Client uses `useChat` from `@ai-sdk/react` pointed at a `/api/chat` server route (streaming) for the conversation, with tool results dispatched into AppContext to actually navigate and highlight.

### 7. Cross-cutting

- TopNav: animate step checkmarks as `completedSteps` grows
- Add `highlightedSection` consumer hook so pages can scroll-into-view + ring-pulse the targeted section when the navigator highlights it
- Update SEO `head()` on each route with real titles/descriptions
- Keep senior-friendly type scale (already 18px base), large tap targets, AA contrast

### Technical notes

- Stack: TanStack Start + Supabase (Lovable Cloud) + AI SDK + `@ai-sdk/openai-compatible` against `https://ai.gateway.lovable.dev/v1` using server-side `LOVABLE_API_KEY`.
- Server route `src/routes/api/chat.ts` handles the streaming chat with tools; client tools (navigate, highlight) execute on receipt of tool-call parts.
- Doctor/plan queries live in `src/lib/catalog.functions.ts` (public reads via `supabaseAdmin` inside the handler) and are reused by both the UI pages and the AI tools.
- Web Speech API is browser-only — feature-detect and fall back to text input on unsupported browsers (Safari desktop, Firefox).
- No new secrets needed from the user; `LOVABLE_API_KEY` is auto-provisioned with Cloud.

### Out of scope (save for later)

- User accounts / saving lists across sessions
- Real Medicare.gov / CMS API integration
- Premium TTS voices
- Multi-language support
