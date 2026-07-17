# plan.md — HOW

## Architecture

TanStack Start v1 (React 19, Vite 7, Tailwind v4) with file-based routing under `src/routes/`. The `/v4/*` tree is the current prototype. Chat runs through `src/routes/api/v4/chat.ts` using the `ai` SDK's `streamText` against the Lovable AI Gateway (Gemini). Voice uses `/api/v4/transcribe` and a Gemini Live token endpoint. State lives in a client-side session store (`src/lib/v4/session-store.ts`) persisted to localStorage via `useSyncExternalStore`, with all storage access wrapped in try/catch for iframe safety. Extraction of doctors/meds/priorities from the transcript runs via a server function (`intake.functions.ts`) and merges into the store (`intake-merge.ts`). Plan matching runs client-side against a static catalog (`plan-catalog.ts`, `match-plans.functions.ts`). Auto-verification hits NPPES and RxNorm from the browser through helpers in `src/lib/v3/providers.functions.ts` and `medications.functions.ts`. Auth is mock (`mock-auth.ts`, `auth-store.ts`). Backend uses Lovable Cloud (Supabase) primarily for the older v1/v2 doctor/plan tables; the v4 prototype is largely client-state.

## Integrations

- Lovable AI Gateway (Gemini) → chat streaming + tool cards → real.
- Gemini Live API → real-time voice conversation → real.
- NPPES NPI Registry → doctor NPI verification → real (public API).
- RxNorm (NLM) → medication RxCUI verification → real (public API).
- ID.me → verified identity sign-in → mocked.
- CLEAR → verified identity sign-in → mocked.
- MyChart / Epic → provider + appointment import → mocked.
- CMS Blue Button 2.0 → claims history import → mocked.
- Pharmacy (GoodRx-style) → fill history → mocked.
- UnitedHealthcare HealthSafe ID (SSO) → account save → mocked.
- Carrier enrollment submission → application intake → mocked (PDF/SOA path removed).
- Payment method capture (EFT/card/SSA withhold) → collected → mocked, not processed.
- Caregiver invite email/SMS → invite delivery → mocked (token stored locally).
- Lovable Cloud / Supabase → legacy v1/v2 tables, plus auth scaffolding → real but largely unused by /v4.
- Pastel / feedback iframes → embedding for review → real (app hardened for cross-site storage).

## Risks

- No real auth; anyone with the URL can see all mock data. Not safe for real PHI.
- Client-side session store is the source of truth for enrollment applications — data loss on cache clear.
- Plan catalog is a small hand-curated static set; scoring logic won't generalize to a national catalog without a real plan/formulary data source.
- NPPES and RxNorm are unauthenticated public APIs; rate limiting, downtime, and name-matching ambiguity are unmitigated.
- LLM output is used to drive UI cards via a `__FORM_RESPONSE__` convention; prompt drift can silently break card rendering.
- Multiple prior demo trees (`/v1`, `/v2`, `/v3`) still ship in the bundle and add surface area for reviewers to wander into.
- Enrollment collects sensitive fields (MBI, SSN last 4, DOB, payment info) with no encryption at rest — must never touch real customer data as-is.
- Mock ID.me/CLEAR flow could be mistaken for real by non-technical reviewers; the "Mock demo" pill is the only guardrail.
- iframe safety relies on try/catch guarding every storage call site; new code can silently reintroduce a crash.
- Verified-import merge assumes name normalization is correct; wrong normalization would silently duplicate or drop imported doctors.
- Voice + streaming chat both talk to the Lovable AI Gateway; a gateway outage blocks the entire experience.
