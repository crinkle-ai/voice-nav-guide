# spec.md — WHAT and WHY

## Overview

Hello Medicare is a conversational Medicare shopping prototype that guides consumers — especially those aging into Medicare or shopping AEP — through intake, coverage-strategy education, plan matching, and mock enrollment. It combines a ChatGPT-style AI assistant, a live "Workspace" that auto-captures doctors/medications/priorities from the conversation, verified-identity sign-in that imports a mock health history, and a stepped in-chat enrollment flow. It is a demo/pitch artifact for Crinkle Health leadership, not a production application.

## Primary user

As a Medicare-eligible consumer, I want to describe my situation in plain language and see plans matched to my doctors, drugs, and budget, so that I can pick coverage confidently without navigating a traditional broker portal.

## Features

### Three intake experiences

Users pick between an open-ended "Ramble" chat, a "Structured" step-by-step wizard, or a "Hybrid / Shop your way" path picker (doctor-first, drug-first, budget-first, new-to-Medicare).

**User story:** As a shopper, I want to choose how I share my info, so that I can use the style that matches my comfort level.

**Acceptance criteria:**

- Given the landing page, when the user selects a mode, then the correct surface (chat, wizard, or path picker) renders under `/v4/intake`.
- Given Hybrid mode, when the user picks a path, then the assistant's opening prompt is tailored to that path.

### Conversational AI assistant (chat + voice)

A Gemini-backed streaming assistant with ChatGPT-style pacing that narrates reasoning, explains "why," summarizes priorities, and injects visual cards (plans, videos, learning paths, questionnaires).

**User story:** As a shopper, I want the assistant to reason out loud and ask one thing at a time, so that I trust its recommendations.

**Acceptance criteria:**

- Given the user types or dictates a message, when they send it, then the assistant streams a concise (20–60 word) reply.
- Given a plan recommendation moment, when the assistant responds, then a `recommendPlans` card renders inline instead of prose.
- Given the user opens the composer's phone icon, when they connect, then the CallDialog shows agent "Sarah Chen" with a Pin-to-Workspace action.
- Given the user opens the mic, when they speak, then the voice-intake surface transcribes and appends to chat.

### Workspace (live captured profile)

A drawer with color-coded cards (About You, Doctors, Meds, Priorities, Plans, Caregiver, Agent) that auto-populates from the conversation and drives plan matching.

**User story:** As a shopper, I want to see what the assistant learned about me, so that I can correct or add details.

**Acceptance criteria:**

- Given the user mentions a doctor or medication in chat, when extraction completes, then the item appears in the Workspace card within ~1s.
- Given a duplicate name in different casing, when captured, then it merges into a single row.
- Given an imported record, when the row renders, then it shows a "Imported from CMS/MyChart" badge and skips the verify spinner.
- Given the user clicks "Show my path," then the Workspace drawer opens.

### Auto-verification (NPPES + RxNorm)

Doctors are verified against the NPPES NPI registry and medications against RxNorm in the background.

**User story:** As a shopper, I want doctor/drug entries validated automatically, so that plan matches use real identifiers.

**Acceptance criteria:**

- Given a captured doctor with name + specialty + city/ZIP, when auto-verify runs, then the row shows a verified NPI or an "ambiguous match" flag.
- Given a captured medication name, when auto-verify runs, then it resolves to an RxCUI or flags as unresolved.

### Plan matching and recommendation

A scoring engine ranks a 12-plan catalog against captured doctors, drugs, ZIP, budget caps, and priorities, and highlights a single best-fit with a blue glow.

**User story:** As a shopper, I want one clearly recommended plan plus close alternatives, so that I don't have to compare a wall of options.

**Acceptance criteria:**

- Given a valid 5-digit ZIP and at least one doctor or drug captured, when the recommendation card renders, then plans display in a 5-column horizontal grid with reasons.
- Given no ZIP, when the assistant would recommend, then plan cards are gated behind a ZIP prompt.
- Given the user clicks the heart on a plan, then it toggles favorite state and syncs the header plan count.
- Given the user selects a non-recommended plan, then it becomes the active selection for enrollment.

### Profile progress indicator

A header ring/bar shows completeness confidence for making a recommendation.

**User story:** As a shopper, I want to see how close I am to a good match, so that I know what to share next.

**Acceptance criteria:**

- Given each captured field (ZIP, doctors, meds, budget, priorities), when saved, then the progress % increases.
- Given verified imported data, when applied, then progress jumps to ~85% instantly.

### Verified-identity sign-in (ID.me / CLEAR mock)

A mocked ID.me / CLEAR flow imports a demo health record (Margaret Chen: 3 providers, 4 meds, CMS claims summary, notable MRI event) into the Workspace and plan matcher.

**User story:** As a returning member, I want to sign in and pull my existing health history, so that I don't re-enter doctors and drugs.

**Acceptance criteria:**

- Given a first-time sign-in, when the user selects ID.me or CLEAR, then a consent → animated import → summary card sequence plays and merges data into the Workspace with source badges.
- Given a returning user with an existing import, when they sign in again, then the "Welcome back" screen shows a resync animation with "new since last visit" items.
- Given a signed-in user clicks "Not you? Start fresh," then the import state resets.
- Given the user signs out, then signing back in requires an explicit click (no auto-reopen).

### HealthSafe ID / UHC SSO save flow

An alternate mocked SSO path plus in-chat Save prompts and a header Save chip that ask the user to save progress at natural moments.

**User story:** As a shopper mid-conversation, I want an easy way to save, so that I can resume later.

**Acceptance criteria:**

- Given the assistant reaches a save moment, when the SavePromptCard renders, then the user can save or dismiss.
- Given the user clicks Save chip or the prompt, then the sign-in dialog opens.

### In-chat enrollment flow

A stepped enrollment dialog with intro → info → disclosures → signature → review → submitted, supporting MA, Medigap + Part D, and D-SNP strategies and three actions (submit, get 2nd opinion, hand off to agent).

**User story:** As a decided shopper, I want to enroll from the same chat, so that I don't switch tools.

**Acceptance criteria:**

- Given a selected plan, when the user opens enrollment, then all required demographic, eligibility, other-coverage, and payment fields are collected.
- Given the signature step, when the user types their name, then a signed record with timestamp is stored on the application.
- Given the user picks "Get 2nd opinion," then the SecondOpinionDialog opens.
- Given the user picks "Hand off to agent," then the application status transitions to `handed_off` and the assigned agent is recorded.

### Coverage-strategy education

The assistant frames choices as strategies (Medicare Advantage vs. Medigap + Part D vs. D-SNP) rather than raw product SKUs.

**User story:** As a new-to-Medicare user, I want the tradeoffs framed as strategies, so that I understand the shape of my choice.

**Acceptance criteria:**

- Given the user asks a "which is better" question, when the assistant responds, then it uses strategy language and can inject a learning-paths card.

### Learning paths and short videos

Chat cards that surface curated topics and inline-playing short videos.

**User story:** As a learner, I want quick topics and videos in-line, so that I don't lose my place in chat.

**Acceptance criteria:**

- Given a learning intent, when the assistant responds, then a `learningPaths` or `shortVideos` card renders and videos play inline.

### Agent directory

A 10-agent directory in the Workspace with pinning support and a permanent "your agent" state.

**User story:** As a shopper, I want to pick or pin a human agent, so that I know who's helping me.

**Acceptance criteria:**

- Given the directory view, when the user pins an agent, then that agent persists in the Workspace across sessions.

### Caregiver invite

A Workspace card to capture a caregiver's contact and grant read or write access via a mock invite link.

**User story:** As a shopper, I want to share access with a family member, so that they can help me decide.

**Acceptance criteria:**

- Given caregiver info is entered, when the user sends the invite, then a pending invite with token + URL is stored on the session.

### Your Data panel

A panel that summarizes what's captured and offers "Delete my data."

**User story:** As a privacy-conscious user, I want to see and delete my data, so that I feel in control.

**Acceptance criteria:**

- Given the panel is open, when the user clicks Delete, then session state is cleared.

### Demo cheatsheet

A hidden operator panel with scripted demo triggers (diabetic 55410 profile, verified sign-in, etc.).

**User story:** As a demoer, I want one-click scripted scenarios, so that live demos are reliable.

**Acceptance criteria:**

- Given the cheatsheet is opened, when a row is triggered, then the corresponding state is loaded.

### Pitch deck routes

`/v4/deck` renders an executive pitch deck (AI and live variants).

**User story:** As a stakeholder, I want a slide view, so that I can present the concept without demoing the app.

**Acceptance criteria:**

- Given `/v4/deck`, when opened, then the deck renders and navigates between slides.

### Iframe-safe session persistence

All localStorage/sessionStorage access is try/catch-guarded so the app runs inside cross-site iframes (e.g. Pastel).

**User story:** As a reviewer, I want to open the app in a feedback tool, so that I can leave comments.

**Acceptance criteria:**

- Given storage access throws, when the app loads, then it renders with in-memory state instead of hanging.

## Non-goals

- Real OAuth to ID.me, CLEAR, MyChart/Epic, or CMS Blue Button 2.0.
- Real enrollment submission to CMS or carrier systems.
- Real PHI storage or HIPAA-compliant persistence.
- Real payment processing.
- A production auth system (only mock sessionStorage auth).
- Real broker/agent handoff.
- Persistence beyond browser localStorage.
- Mobile-native apps.

## Constraints & assumptions

- All external integrations (ID.me, CLEAR, MyChart, CMS, pharmacy, payment, SOA, e-signature) are mocked in-client.
- NPPES and RxNorm calls are real read-only public endpoints used for verification.
- LLM access is via Lovable AI Gateway → Gemini; no direct model keys in the client.
- Plan catalog is a static 12-plan seed focused on Twin Cities ZIP 55410.
- Auth is mock sessionStorage; there is no real user account.
- The prototype targets `/v4/*` routes; `/v1`, `/v2`, `/v3` are prior demo generations kept for comparison.
- Branding is "Hello Medicare" (a Crinkle Health innovation prototype).
- SOA (Scope of Appointment) has been intentionally removed for demo flow.
