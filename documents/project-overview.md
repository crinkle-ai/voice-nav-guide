# Medicare Navigator AI — Technical Overview

> A prototype voice-guided navigation layer for Medicare shopping, built as a demo for Crinkle Health.

---

## What It Is (and What It Isn't)

This is **not a chatbot**.

It is a **Voice AI navigation layer** that sits on top of a standard Medicare website. Users speak naturally — "What is Medicare Advantage?", "Find a cardiologist in Houston", "Show me plans under $50" — and the AI responds by **navigating the actual website**, **highlighting content**, and **surfacing data** rather than dumping text into a chat window.

The goal is to reduce abandonment, improve comprehension for seniors, and guide users through a complex multi-step journey (learn → find doctors → compare plans → enroll) without ever leaving the site or reading walls of text.

---

## Architecture

| Layer | Technology | Role |
|-------|-----------|------|
| Framework | TanStack Start v1 | Full-stack React with SSR, file-based routing, and server functions |
| UI | React 19 + Tailwind CSS v4 | Component model with CSS-variable-based design tokens |
| Voice (real-time) | Gemini Live API (WebSocket) | Low-latency bidirectional audio for live conversation |
| Voice (fallback) | Web Speech API (`SpeechRecognition` + `speechSynthesis`) | Text-based chat with optional speech input/output |
| AI Orchestration | `ai` SDK (`streamText`, `convertToModelMessages`) | Streaming LLM responses with tool calling |
| AI Provider | Lovable AI Gateway → Google Gemini 3 Flash | Server-side model access via gateway |
| Database | Lovable Cloud (PostgreSQL) | Doctors and plans tables with Supabase client |
| Auth | Mock sessionStorage auth | Demo-only; gates `/my-plans` with a fake login flow |
| PWA | `manifest.json` + service worker ready | Standalone installable app, theme color, icons |

---

## Key Components

### `BottomVoiceBar` (`src/components/BottomVoiceBar.tsx`)
The **primary voice interface**. A floating bar at the bottom of every page that provides:

- **Real-time WebSocket connection** to Gemini Live API with pre-warmed socket, automatic reconnect, and keepalive silence packets.
- **Bidirectional audio**: microphone → 16-bit PCM → base64 → WebSocket; incoming audio → Int16Array → Web Audio API playback with queue management.
- **Client-side intent detection** for fast-path actions (agent handoff, "my plans", learn topics, glossary terms) without waiting for LLM latency.
- **Tool call execution**: `navigate_to`, `highlight_section`, `search_doctors`, `recommend_plans`.
- **Agent callback flow**: deterministic form UI that collects name/phone, snapshots journey state, and nudges the model with a system turn.
- **Idle management**: auto-disconnect after inactivity with warning, reconnect on next interaction.

### `VoiceNavigator` (`src/components/VoiceNavigator.tsx`)
The **fallback text-chat interface**. A floating panel (bottom-right) used when:

- The browser doesn't support the Gemini Live WebSocket flow.
- The user prefers typing.
- The user taps the floating mic button.

Uses the `ai` SDK's `useChat` hook with `DefaultChatTransport` posting to `/api/chat`. Supports:
- Speech recognition for voice input (`webkitSpeechRecognition`).
- Text-to-speech for reading assistant replies (`speechSynthesis`).
- Same tool calls as BottomVoiceBar: `navigate_to`, `highlight_section`, `request_agent_callback`, `confirm_agent_callback`.
- Identical callback form with journey snapshot.

### `TopNav` (`src/components/TopNav.tsx`)
Standard site navigation with:
- Route links: Home, Learn, Find Doctors, Compare Plans, My Plans.
- **Journey progress indicator**: a step-by-step breadcrumb (Learn → Find Doctors → Compare Plans) showing visited pages, current page, and completion state with checkmarks.
- Auth state: lock icon on "My Plans" when signed out; logout button when signed in.
- **Info button** (ℹ️) linking to `/deck` — the executive slide deck.

### `AppContext` (`src/context/AppContext.tsx`)
Central state management via React `useReducer`:

| State Key | Purpose |
|-----------|---------|
| `currentPage` / `previousPage` | Page tracking for journey awareness |
| `journey.visitedPages` | Which routes the user has been to |
| `journey.completedSteps` | Which educational/action steps are done |
| `savedDoctorIds` | Bookmarked doctors for "My Plans" |
| `comparePlanIds` | Plans selected for side-by-side compare (max 3) |
| `doctorVoiceFilters` / `planVoiceFilters` | Pre-fill filters when voice agent sends user to a page |
| `navigatorOpen` | Whether the VoiceNavigator panel is visible |
| `voiceState` | `idle` / `listening` / `thinking` / `speaking` |
| `highlightedSection` | Target element ID to scroll to and flash ring |

Hooks:
- `useTrackPage(page, path)` — dispatches `SET_PAGE` on mount.
- `useHighlightConsumer()` — watches `highlightedSection`, scrolls, flashes a ring, auto-clears.
- `useOpenNavigatorWithPrompt()` — opens the navigator and injects a pre-written prompt.

---

## Route Structure

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/routes/index.tsx` | Homepage — hero, demo video, plan types, benefits, resources |
| `/learn` | `src/routes/learn.tsx` | Medicare 101 — accordion for Parts A–D + Medigap, glossary |
| `/find-doctors` | `src/routes/find-doctors.tsx` | Doctor search with filters and map |
| `/compare-plans` | `src/routes/compare-plans.tsx` | Plan table with premium/drug/dental/vision filters, compare bar |
| `/my-plans` | `src/routes/my-plans.tsx` | Saved plans (protected, requires mock login) |
| `/login` | `src/routes/login.tsx` | Mock login page with `?redirect=` support |
| `/deck` | `src/routes/deck.tsx` | Executive slide deck (6 slides, swipe/keyboard nav) |
| `/api/chat` | `src/routes/api/chat.ts` | Streaming chat endpoint with tool definitions |
| `/api/voice-session` | `src/routes/api/voice-session.ts` | Token/session endpoint for Gemini Live API |

---

## Five Demo Scenarios

The deck at `/deck` (slide 6) documents the five primary user journeys:

1. **Learn about Medicare** — "What is Medicare Advantage?"  
   AI navigates to `/learn`, auto-expands the Part C accordion, and highlights the section.

2. **Compare Plans** — "Show me plans under $50 with drug coverage"  
   AI navigates to `/compare-plans`, pre-fills the premium slider and drug toggle, and highlights the results table.

3. **Find a Doctor** — "Find a cardiologist in Austin"  
   AI navigates to `/find-doctors`, sets specialty/city filters, and highlights results.

4. **View My Saved Plans** — "Show me my saved plans"  
   If not authenticated, AI routes through `/login?redirect=/my-plans`, then lands on personalized saved plans with a contextual "now that you're signed in…" message.

5. **Request a Callback** — "Can someone call me back?"  
   AI triggers the callback form (name + phone), the user submits, and the AI confirms with a warm closing sentence while passing journey context (visited pages, topics, transcript snippet) to the mock agent system.

---

## Navigation Action System

The AI does not describe clicks. It **calls tools**. All tools are defined in the server-side system prompt (`/api/chat`) and executed by both the BottomVoiceBar (Gemini Live) and VoiceNavigator (text chat).

| Tool | Arguments | Effect |
|------|-----------|--------|
| `navigate_to` | `page: "/" \| "/learn" \| "/find-doctors" \| "/compare-plans"` | Client-side `useNavigate()` to the route |
| `highlight_section` | `section: string` | Scroll + ring-flash the element ID; auto-expands accordions if matched |
| `search_doctors` | `specialty?, city?` | Server query to `doctors` table; results shown on `/find-doctors` |
| `recommend_plans` | `needs_drug?, max_premium?, type?` | Server query to `plans` table; results shown on `/compare-plans` |
| `request_agent_callback` | — | Opens the callback form UI in the chat/voice bar |
| `confirm_agent_callback` | — | Confirms submission; shows confirmation card with journey summary |

System prompt rules:
- **One thought per turn** — each response contains exactly one action (tool call OR short explanation) then stops.
- No auto-advancing; the user always initiates the next move.
- Only suggest next steps when explicitly asked.
- Only offer agent callback when the user expresses confusion or asks for a person.

---

## Journey Awareness & State Management

The app maintains a **journey graph** in `AppContext`:

- **Visited pages** (`journey.visitedPages`) — tracked on every route mount via `useTrackPage()`.
- **Completed steps** (`journey.completedSteps`) — e.g., opening an accordion on `/learn` or toggling a filter on `/compare-plans`.
- **Current step index** (`journey.currentStep`) — derived from the step order: `home → education → doctor-lookup → plan-comparison`.

This state is **read by the voice agent** in two ways:

1. **Callback snapshot** — when the user requests an agent callback, the app compiles a human-readable summary of what they did ("Reviewed Medicare parts & glossary", "Saved 2 doctors", "Compared 3 plans") and injects it into the model as context.
2. **Pre-fill filters** — voice commands like "show me plans under $50" set `planVoiceFilters` in context; the `/compare-plans` page reads these on mount and applies them immediately.

---

## PWA Setup

The app is configured as a Progressive Web App:

- `public/manifest.json` — `standalone` display mode, theme color `#4CAF50`, icons at 192×192 and 512×512.
- `src/routes/__root.tsx` — injects `<link rel="manifest">`, favicons, apple-touch-icon, and meta viewport.
- `src/router.tsx` — scroll restoration enabled.

The intent is to demonstrate how the navigator could feel like a native app experience on mobile, especially for seniors who may pin the site to their home screen.

---

## Protected Routes & Mock Auth Flow

Auth is **sessionStorage-based** and purely for demo purposes (`src/lib/mock-auth.ts`):

- `isAuthed()` reads `mockAuth === "1"` from `sessionStorage`.
- `signIn(username)` sets the flag and a mock username.
- `signOut()` clears the session and redirects to `/`.

**Auth gate behavior:**
- `/my-plans` is accessible to anyone, but shows a lock icon in the nav when signed out.
- If the **voice agent** tries to navigate to `/my-plans` while the user is signed out, the client intercepts it and routes to `/login?redirect=/my-plans` instead, storing the target in `sessionStorage` (`POST_LOGIN_VOICE_KEY`).
- After login, the redirect completes and the voice agent receives a contextual system message to acknowledge the successful sign-in.
- The `TopNav` re-checks auth on every route change so the UI stays synchronized.

---

## Agent Handoff / Callback Flow

When a user says they want to talk to a person, the system follows a **deterministic, deterministic UI flow** rather than relying on the LLM to collect information:

### BottomVoiceBar (Gemini Live)
1. Client-side regex intent detection (`matchesAgentIntent()`) recognizes phrases like "talk to an agent", "call me back", "connect me with someone".
2. The callback form UI overlays the voice bar immediately — no LLM round-trip required to show it.
3. User enters **name** (optional) and **phone** (required).
4. `submitCallback()` snapshots:
   - Name & phone
   - `visitedPages` array
   - Derived topics ("Reviewed Medicare parts", "Saved 2 doctors", etc.)
   - Timestamp
5. A **system turn** is injected into the WebSocket:  
   `"[SYSTEM] The user just submitted the on-screen callback form... Respond with ONE short, warm confirmation sentence..."`
6. The model speaks a single warm confirmation and stops.

### VoiceNavigator (Text Chat)
1. The LLM calls `request_agent_callback` tool.
2. The tool execution handler sets `callbackPhase = "form"`.
3. User fills the form and submits.
4. A chat message is sent: `"Callback request submitted — Phone: ..."`
5. The LLM calls `confirm_agent_callback` tool.
6. Confirmation card renders with the same journey summary as the live flow.

The callback snapshot is designed to be **serializable and sendable to a real CRM** (e.g., Salesforce) in production — it contains everything an agent needs to pick up the conversation without making the user repeat themselves.

---

## Design System

- **Color**: Healthcare green primary (`oklch(0.58 0.17 150)`), clean white surfaces, accessible contrast.
- **Typography**: System font stack at 18px base with 1.6 line-height for readability.
- **Spacing**: Generous padding, rounded cards, clear visual hierarchy — optimized for older users.
- **Motion**: Minimal, purposeful — ring flash on highlights, smooth scroll, subtle transitions.
