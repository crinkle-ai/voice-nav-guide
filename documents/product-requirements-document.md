# Medicare Navigator AI Guide — Product Requirements Document

**Status:** Draft v1 (Prototype → Production)
**Audience:** AI/ML engineer scoping a branded, customer-testable build
**Owner:** Product (TBD)
**Last updated:** 2026-06-11

---

## 1. Product Overview

The Medicare Navigator AI Guide is a voice-first conversational layer that sits on top of a Medicare information and shopping website. Instead of asking users to read menus, click through pages, and parse dense plan tables, the Navigator lets users speak (or type) what they want — "I just turned 65, where do I start?", "show me plans under $50 with dental", "find a cardiologist in Austin who takes Medicare" — and the AI drives the website on their behalf: navigating pages, scrolling to the right section, filtering plans, opening accordions, and handing off to a licensed human agent when needed.

### Problem
Medicare is the most-searched and least-understood consumer benefit in the U.S. The current digital experience (medicare.gov, carrier sites, broker portals) assumes users can:
- Read 8th-grade-or-above prose for 20+ minutes
- Understand jargon (Part A/B/C/D, IRMAA, MOOP, formulary)
- Navigate multi-step filter UIs on a desktop
- Decide between 30–60 plans on their own

The result: high abandonment, low enrollment confidence, and expensive agent calls for questions the website could have answered.

### Solution
A voice-driven navigator that:
1. Listens to the user's actual question in plain English.
2. Decides what page/section answers it.
3. **Drives the live website** so the user *sees* the answer as the AI speaks it.
4. Escalates to a human agent with full context when the AI is out of depth or the user asks.

### Who it's for
Medicare-eligible consumers age 64–70, their adult-child caregivers, and licensed agents who inherit warm handoffs.

---

## 2. Core Concept — AI as a Navigation Layer

The Navigator is **not a chatbot**. It does not answer in a chat bubble and end the interaction there. Every utterance is paired with a UI action on the host site.

| Traditional Web | Chatbot | Navigator (this product) |
|---|---|---|
| User reads, clicks, scrolls | User reads chat replies in a sidebar | User talks; AI speaks AND moves the page |
| Cognitive load on user | Replaces site with chat | Augments site with voice |
| No memory across pages | No persistent UI state | Tracks journey across pages |
| Hand-off = "call this number" | Hand-off = transcript dump | Hand-off = warm transfer with full context |

The AI's primary output is a **tool call** (navigate, highlight, filter, request callback). Speech is the narration of that action.

---

## 3. User Personas

### P1 — Approaching 65 ("Margaret, 64")
- Receives Initial Enrollment Period notice; overwhelmed.
- Needs: "where do I start?", "what does each part cover?", "do I need to do anything if I have employer coverage?"
- Comfortable speaking; less comfortable with multi-column comparison tables.

### P2 — Active shopper ("Jim, 67, switching during AEP")
- Already on Medicare; comparing Advantage vs Supplement for next plan year.
- Needs: filter by premium, drug list, preferred doctors; verify in-network status.

### P3 — Caregiver ("Sarah, 42, helping her father")
- Operating the site on behalf of a parent who isn't present.
- Needs: collect plan options to email/print/share, schedule an agent call her father can answer.

### P4 — Returning member ("Robert, 70, lost his card / forgot which plan he has")
- Authenticated user returning for account self-service.
- Needs: view saved plans, ID card, agent contact.

---

## 4. User Journeys & Scenarios

Five demoable end-to-end flows. Each is the contract between the AI prompt, the tool catalog, and the host site.

### 4.1 New to Medicare
| Step | User intent | AI action | Site response |
|---|---|---|---|
| 1 | "I just turned 65, where do I start?" | `navigate_to({ page: "/learn" })` + spoken intro | /learn loads, hero visible |
| 2 | "What's Part A again?" | `highlight_section({ section: "part-a" })` | Part A card scrolls into view, outlined, expanded |
| 3 | "OK what about Part B?" | `highlight_section({ section: "part-b" })` | Same, for Part B |
| 4 | "Got it, what's next?" | `navigate_to({ page: "/compare-plans" })` | Comparison page loads |

### 4.2 Compare Plans
| Step | Intent | Action | Response |
|---|---|---|---|
| 1 | "Show me plans under $50 with drug coverage" | `filter_plans({ maxPremium: 50, needsDrug: true })` | Compare page filters apply visibly |
| 2 | "Add dental" | `filter_plans({ ...prev, needsDental: true })` | Result set narrows |
| 3 | "Save the first one" | (post-auth) save to /my-plans | Toast + count badge updates |

### 4.3 Find Doctors
| Step | Intent | Action | Response |
|---|---|---|---|
| 1 | "I need a cardiologist in Austin" | `search_doctors({ specialty: "Cardiology", city: "Austin" })` | /find-doctors with filters preset |
| 2 | "Does Dr. Lee take Medicare?" | `search_doctors({ name: "Lee" })` + highlight | Card highlights with acceptance badge |

### 4.4 View Saved Plans (protected)
| Step | Intent | Action | Response |
|---|---|---|---|
| 1 (signed-out) | "Show me my saved plans" | `navigate_to({ page: "/login" })` + "You'll need to sign in" | /login renders, post-auth redirect param = /my-plans |
| 2 (signed-in) | (same) | `navigate_to({ page: "/my-plans" })` | Saved list renders |

### 4.5 Connect with Agent
| Step | Intent | Action | Response |
|---|---|---|---|
| 1 | "I want to talk to a person" | `request_agent_callback()` | Callback form panel opens |
| 2 | User enters phone | Submit pushes context to CRM | Confirmation; live-advise panel slides in while waiting |

---

## 5. Functional Requirements

| ID | Requirement |
|---|---|
| F-1 | **Voice input** via the browser microphone, streaming to a real-time speech model. Wake by tapping the bottom voice bar (no hot-word required in v1). |
| F-2 | **Voice output** with low-latency TTS, barge-in supported (user can interrupt). |
| F-3 | **Intent recognition** via the model's native tool-calling — no separate NLU layer. |
| F-4 | **Navigation actions**: `navigate_to(page, section?)`, `highlight_section(section)`, `scroll_to_section`, `expand_accordion`, `filter_plans`, `search_doctors`, `explain_term`, `request_agent_callback`. |
| F-5 | **Journey awareness**: AI receives current route + auth state + last N user utterances on each turn; never offers "take me to X" when already on X. |
| F-6 | **Protected page flow**: any request for `/my-plans` while signed-out must route to `/login` with a return URL, then auto-resume the original intent post-auth. |
| F-7 | **Agent handoff**: a single tool call opens a callback form, captures phone + best time, and POSTs a context bundle (journey, utterances, current filters, auth user) to CRM. |
| F-8 | **State sharing across pages**: filter selections set by voice on /compare-plans persist when the user returns later in the same session. |
| F-9 | **Highlight & section-deep-link**: `navigate_to` accepts an optional `section` id; destination page auto-expands and outlines that section on render. |
| F-10 | **Typed fallback**: a text input on the voice bar accepts the same intents when mic is unavailable or denied. |

---

## 6. AI & Voice Architecture Requirements

### 6.1 Real-time voice
- **Provider (prototype):** Google Gemini Live API (`gemini-2.5-flash` realtime/audio variant), ephemeral auth tokens minted server-side.
- **Provider (production candidates):** Gemini Live, OpenAI Realtime, ElevenLabs Conversational AI. Selection criteria: end-to-end latency < 800 ms, robust tool-calling, barge-in, multilingual roadmap.
- **Token model:** server mints short-lived (single-use) session tokens; browser never sees the long-lived API key.

### 6.2 Tool-calling interface
- Tools declared in `functionDeclarations` schema (JSON Schema subset).
- AI must emit a tool call in the **same turn** as any spoken sentence that implies movement ("let me pull up…", "taking you to…"). Speech without tool call is a defect.
- Tool results return to the model as `functionResponse` parts so the model can narrate the outcome ("Found 4 plans under $50…").

### 6.3 System prompt design
A single system prompt enforces:
- Persona ("warm, plain-language Medicare guide, never medical/legal advice")
- Routing rules (which tool, when; never chain `navigate_to + highlight_section` — pass `section` arg)
- Hard guardrails (no PHI requests, no premium quotes the system can't back up, no refusal of `request_agent_callback`)
- Confidence/fallback policy (see §12)

### 6.4 Confidence thresholds
- High confidence → execute tool, speak.
- Medium confidence → ask one clarifying question, max once per intent.
- Low confidence / out-of-scope → trigger lateral search fallback or offer human handoff.

### 6.5 Graceful degradation
- TTS provider 5xx / quota → server returns `{ fallback: true }` (HTTP 200); client uses browser `SpeechSynthesis`.
- Realtime audio drops → reconnect once, then surface "I lost you for a second" + typed-input mode.
- Model returns no tool call when one is expected → "I can help with that — want me to take you to Compare Plans?"

---

## 7. Navigation Action Specification

Authoritative list of tools the AI must be able to invoke. Names mirror the current prototype (`src/routes/api/voice-session.ts`).

| Tool | Parameters | Effect |
|---|---|---|
| `navigate_to` | `page` enum `/`, `/learn`, `/find-doctors`, `/compare-plans`, `/my-plans`, `/login`; optional `section` (string id) | Client router push; if `section` provided, destination page mounts with that section expanded + outlined |
| `highlight_section` | `section` (string id) | Scroll-into-view + outline ring on the current page |
| `scroll_to_section` | `section` (string id) | Scroll only, no highlight (for read-along) |
| `expand_accordion` | `id` (string) | Open a collapsed accordion item |
| `filter_plans` | `type?`, `maxPremium?`, `needsDrug?`, `needsDental?`, `needsVision?` | Apply filter state on /compare-plans |
| `search_doctors` | `specialty?`, `city?`, `name?` | Apply filter state on /find-doctors |
| `explain_term` | `term` enum (premium, deductible, copay, …) | Navigate to /learn glossary, highlight term |
| `request_agent_callback` | none | Open callback form panel |

**Section catalog** is defined in code and must remain the single source of truth shared between the AI prompt and the page components (avoid drift).

---

## 8. Content & Data Requirements

| Domain | v1 (prototype) | Production |
|---|---|---|
| Plan data | Hand-curated demo set (~12 plans) | CMS Medicare Plan Finder API; carrier-supplied feeds for off-exchange Supplement |
| Provider network | Static demo directory | Per-carrier provider directory APIs (FHIR `PractitionerRole`/`Network`), NPPES NPI registry |
| Drug formulary | Out of scope | CMS Part D formulary files; per-plan drug tiering |
| Eligibility | None | CMS Beneficiary Eligibility (BEQ) via authorized broker integration |
| Educational copy | In-page MDX | CMS-published, version-stamped; reviewed by compliance |
| Glossary | Hard-coded list | CMS glossary + plain-language overlay |

All consumer-facing copy must be reviewable by a CMS-marketing compliance reviewer; the AI must not invent plan details.

---

## 9. Authentication & Protected Flows

- **Auth provider:** Lovable Cloud auth (Supabase under the hood) with email + Google. No anonymous sign-ups.
- **Session:** access token in memory; refresh token httpOnly cookie. AI session token is independent and short-lived.
- **Protected routes:** `/my-plans` (and any future account routes) require auth.
- **Redirect contract:** unauthenticated visit to a protected route → `/login?redirect=<path>` → on success, router replaces with the saved redirect. AI restates the original intent ("Now pulling up your saved plans.").
- **Voice-initiated auth gating:** when AI calls `navigate_to({page: "/my-plans"})` in signed-out state, the prompt requires `navigate_to({page: "/login"})` instead, with a one-sentence explanation.

---

## 10. Agent Handoff Requirements

### 10.1 Pre-call context push
On `request_agent_callback` submission, POST to CRM (Salesforce):

```
Case.Subject     = "Medicare Navigator handoff — <topic>"
Case.Origin      = "Web — AI Navigator"
Case.Description = <last 10 user utterances + AI summary>
Case.Priority    = derived (callback urgency)
Custom fields:
  Navigator__Journey         = ["/", "/learn", "/compare-plans"]
  Navigator__CurrentFilters  = { maxPremium: 50, needsDrug: true }
  Navigator__AuthUserId      = <uuid or null>
  Navigator__PreferredCallback = "2026-06-11T18:00Z"
```

Integration uses the Salesforce connector gateway (no direct Salesforce OAuth in the browser).

### 10.2 Callback receipt UI
- Confirmation toast + persistent banner with estimated callback window.
- Live-advise panel (`LiveAdvisePanel.tsx`) shows assigned agent's name/photo and a "they'll call shortly" state.

### 10.3 Agent screen pop spec
When the case is routed in Salesforce, the agent's softphone screen-pop opens a Lightning page that displays:
- Journey breadcrumb (pages visited, in order, with timestamps)
- Last filter state
- Verbatim final 3 user utterances
- AI's last spoken summary
- Quick links: open the same `/compare-plans?...` URL the user last saw

This is the difference between a cold call and a warm transfer.

---

## 11. Non-Functional Requirements

| Category | Target |
|---|---|
| Voice response latency | First audio token < 800 ms p50, < 1.5 s p95 |
| Tool execution latency | Route change visible < 300 ms after tool call |
| Uptime | 99.5% (prototype), 99.9% (production) |
| Accessibility | WCAG 2.1 AA; keyboard-only operable; visible focus rings; live-region announcements for AI-driven navigation |
| Mobile | Fully responsive 360–1440 px; voice bar pinned bottom; hamburger nav < md |
| Senior-friendly UX | Base font ≥ 16 px (18 px preferred), heading scale generous, contrast ≥ 7:1 for primary text, tap targets ≥ 44 × 44 px, no reliance on hover, motion respects `prefers-reduced-motion` |
| Browser support | Latest 2 versions of Chrome, Edge, Safari, Firefox; iOS 16+, Android 10+ |
| Privacy | No PHI requested; transcripts redacted before CRM push; voice audio not retained beyond session unless user opts in |
| Compliance | CMS Marketing Guidelines (MCMG), HIPAA-aware data handling, TCPA-compliant callback consent capture |

---

## 12. Graceful Degradation & Fallback Spec

| Trigger | Behavior |
|---|---|
| Model returns no tool call but speaks "I'll take you to…" | Client logs a defect; surfaces a "Take me there" button as recovery |
| Confidence below threshold | One clarifying question max, then offer `request_agent_callback` |
| Out-of-scope (e.g. life insurance) | "I'm built for Medicare — want me to connect you with a human who can help?" → `request_agent_callback` |
| Lateral search fallback | If `highlight_section` target doesn't exist, fall back to in-page search and outline best match |
| TTS quota / 5xx | Server returns `{ fallback: true }`; client uses `window.speechSynthesis` |
| Mic permission denied | Auto-switch to typed input; voice bar shows "Type instead" |
| Network drop mid-turn | Auto-reconnect once; if it fails, persistent banner + typed input |
| Human handoff trigger words | "agent", "person", "representative", "call me" → `request_agent_callback` immediately, never refuse |

---

## 13. MVP Scope

### In v1 (customer-testable)
- 5 demo journeys (§4) end-to-end
- Real Gemini Live voice with full tool catalog (§7)
- Branded UI with senior-friendly defaults
- Auth + protected `/my-plans`
- Curated plan + provider data (not yet live CMS feeds)
- Salesforce callback handoff with context push (sandbox org)
- Browser-TTS fallback path
- Analytics events for every tool call + journey step

### Future iterations
- Live CMS Plan Finder integration; real eligibility checks
- Per-user saved comparisons and shareable plan bundles
- Drug formulary lookup; pharmacy cost estimation
- Spanish language voice + UI
- Hot-word ("Hey Medicare") wake
- Caregiver mode (shared session with read-only observer)
- Native mobile wrappers
- Agent-side Lightning component (full screen pop)

---

## 14. Success Metrics

| Metric | Definition | v1 target |
|---|---|---|
| Task completion rate | % of sessions where user reaches a terminal action (filter applied, plan saved, callback requested) | ≥ 65% |
| Time-to-enroll-intent | Session start → first plan saved or callback requested | < 4 min median |
| Agent deflection rate | Sessions resolved without callback / total | ≥ 50% |
| Callback show-up rate | Callbacks answered when agent dials / requested | ≥ 70% |
| CSAT (post-session) | 1–5 star prompt; target average | ≥ 4.3 |
| Tool-call accuracy | Tool fired matches labeled intent in audit sample | ≥ 90% |
| First audio latency | Time from end-of-user-speech to first AI audio | p50 < 800 ms |
| Fallback rate | Sessions that hit browser-TTS or typed fallback | < 5% |

Instrument every tool call with `{tool, args, routeBefore, routeAfter, latency_ms, sessionId}` for offline eval.

---

## 15. Open Questions

1. **Voice provider commitment.** Gemini Live for prototype is decided. Production: Gemini Live, OpenAI Realtime, or ElevenLabs Conversational? Latency, pricing per-minute, and compliance posture (BAA availability) need a head-to-head.
2. **Real plan data source.** Direct CMS Plan Finder API access, or licensed feed from an aggregator (e.g. Sunfire, Connecture)? Affects launch timeline and per-quote cost.
3. **Provider directory accuracy.** Industry-wide problem; do we trust carrier-supplied FHIR feeds, NPPES, or a third-party verified directory (e.g. Ribbon, h1)?
4. **CRM depth.** Just Cases + custom fields, or full Lead → Opportunity → Policy lifecycle inside Salesforce? Drives schema and licensing.
5. **TCPA consent capture.** Where in the callback flow does explicit consent text + audit log live? Legal review required.
6. **Compliance review loop.** Who approves the AI system prompt and educational copy each model update? CMS marketing materials are subject to MCMG; the prompt may itself be considered marketing.
7. **Multi-tenant carriers?** Is this a single-brand product or a white-label platform multiple FMOs / carriers will deploy?
8. **Identity for returning users.** Email/password + Google in v1; do we add SMS OTP for senior-friendliness in v1.1?
9. **Audio retention.** Default off, but agents may want to replay the last 60 s of the user's session for context — legal + UX trade-off.
10. **Eligibility check timing.** Do we ever ask date of birth / Medicare number, or do we keep the navigator pre-eligibility and let the agent collect that on the warm transfer?

---

*End of document.*
