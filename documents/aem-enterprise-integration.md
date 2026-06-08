# Integrating a Voice AI Navigator into Adobe Experience Manager (AEM)

> A practical guide for embedding a voice-guided navigation layer into a large-scale AEM-powered enterprise website — using the Medicare Navigator prototype as the reference architecture.

---

## Overview

This document outlines how to integrate a **Voice AI Navigator** — a conversational overlay that navigates, highlights, and reads site content aloud — into an existing Adobe Experience Manager (AEM) website without rewriting the CMS or content layer.

The approach treats the navigator as a **progressive enhancement widget** that injects into any AEM page, respects existing auth/session infrastructure, and feeds analytics data back into the Adobe Marketing Cloud.

---

## Recommended Injection Approach: AEM Client Libraries (clientlibs)

AEM's **Client Libraries (clientlibs)** are the standard mechanism for loading CSS and JavaScript across a site. The Voice AI Navigator should be delivered as a single clientlib that any AEM template can include.

### Folder Structure in AEM

```
/apps/<site>/clientlibs/
  └── voice-navigator/
      ├── js/
      │   └── voice-navigator.bundle.js      # Compiled React/Vue widget (UMD or ESM)
      ├── css/
      │   └── voice-navigator.css              # Scoped styles, no global resets
      ├── resources/
      │   ├── manifest.json                   # PWA config for the widget
      │   └── icon-192.png
      │   └── icon-512.png
      └── js.txt / css.txt                    # AEM clientlib descriptor files
```

### Inclusion Strategy

**Option A: Global inclusion via base page template**

Add the clientlib to the base page component (e.g., `/apps/<site>/components/structure/page/head.html`) so every page gets the navigator:

```html
<sly data-sly-use.clientlib="/libs/granite/sightly/templates/clientlib.html"/>
<sly data-sly-call="${clientlib.css @ categories='voice-navigator'}"/>
<sly data-sly-call="${clientlib.js @ categories='voice-navigator'}"/>
```

**Option B: Targeted inclusion via page policy**

Use AEM's template editor to enable the clientlib only on specific template types (e.g., "Medicare Landing Page", "Plan Detail Page") via the template's `jcr:content/policy` configuration. This is preferable for phased rollouts.

**Option C: Lazy injection via dispatcher rules**

For maximum control, inject the widget via a **dispatcher filter or edge function** that appends the script tag to the HTML response only for qualifying requests (e.g., authenticated users, specific campaign URLs, or A/B test buckets).

### Iframe vs. Inline Embedding

| Approach | Pros | Cons |
|----------|------|------|
| **Inline** (recommended) | Full DOM access for highlighting/scroll; shares cookies/session; no CORS issues | Requires CSS scoping to avoid collisions |
| **Iframe** | Complete style isolation; easy to version independently | Cannot highlight parent DOM elements; session sharing requires `document.domain` or postMessage hacks |

For a navigation-layer AI, **inline embedding is strongly recommended** because the core value prop is manipulating the host page (scrolling, highlighting, reading content aloud).

---

## Making the AI Site-Aware

The AI needs to know what content exists on the current page in order to navigate and highlight effectively. There are three approaches, which can be combined:

### 1. DOM Parsing (Client-Side)

The widget parses the rendered AEM page at runtime:

- **Section discovery**: Query for semantic landmarks (`<main>`, `<section>`, `[id]` attributes) to build a map of navigable regions.
- **Content extraction**: Read text from headings, accordions, and data tables to answer user questions without backend round-trips.
- **Heading hierarchy**: Build an outline from `h1` → `h2` → `h3` to support "take me to the section about deductibles" commands.

**When to use**: Fastest to implement; works on any AEM page without CMS changes; ideal for MVP and pilot phases.

**Limitations**: Brittle if AEM markup changes; cannot access structured data (e.g., plan metadata, doctor search indexes) that lives in the backend.

### 2. Content Services / GraphQL (Headless AEM)

AEM's **Content Fragments** and **GraphQL APIs** expose structured content independently of page rendering:

- Expose Medicare parts, glossary terms, plan details, and doctor profiles as **Content Fragment Models**.
- Query them from the voice widget via AEM's GraphQL endpoint (`/content/graphql/global` or a persisted query).
- The AI uses this structured data to answer questions precisely (e.g., "What is the premium for Plan XYZ?") rather than guessing from rendered HTML.

**When to use**: When content is already modeled in Content Fragments; when multiple channels (web, mobile app, voice) consume the same data.

**Limitations**: Requires upfront content modeling work; overkill for static educational pages.

### 3. Intent-to-URL Mapping (Hybrid)

Pre-define a mapping of user intents to AEM page paths and section IDs:

```json
{
  "intents": {
    "learn-medicare-advantage": { "path": "/content/crinkle/en/learn.html", "section": "part-c" },
    "find-doctors": { "path": "/content/crinkle/en/find-doctors.html" },
    "compare-plans": { "path": "/content/crinkle/en/compare-plans.html", "section": "premium-filter" },
    "enroll-now": { "path": "/content/crinkle/en/compare-plans.html", "section": "enroll-now" }
  }
}
```

The AI uses this map as a **fallback** when the LLM's own reasoning isn't confident about navigation targets. It can also be used to **constrain** the LLM — e.g., only allow navigation to URLs in the allowed set, preventing hallucinated paths.

**When to use**: Best for production stability; gives content teams control over the journey map without retraining the AI.

**Recommended hybrid architecture:**

```
User speaks
    ↓
LLM interprets intent
    ↓
├─→ If intent matches known navigation pattern → use Intent-to-URL map
├─→ If question is about structured data → query GraphQL/Content Fragments
└─→ If question is about page content → parse DOM headings/accordions
    ↓
Execute action (navigate, highlight, speak, or show data)
```

---

## Enterprise Integration Stack

### Adobe Analytics (Event Tracking)

The Voice AI Navigator generates rich behavioral data that should feed into Adobe Analytics as **custom events and eVars**:

| Event | Context Data / eVar | Business Value |
|-------|---------------------|----------------|
| `voice:session_started` | `eVar1 = voice_channel` | Track adoption of voice vs. traditional nav |
| `voice:navigate` | `eVar2 = destination_path`, `eVar3 = intent_phrase` | Understand what users ask for most |
| `voice:highlight` | `eVar4 = section_id` | See which content sections generate confusion |
| `voice:callback_requested` | `eVar5 = agent_handoff_point` | Identify where users drop out of self-service |
| `voice:query_failed` | `eVar6 = failed_intent` | Train the model on misunderstood queries |
| `voice:filter_applied` | `eVar7 = filter_type`, `eVar8 = filter_value` | Enrich plan comparison analytics |

**Implementation**: Use the Adobe Launch data layer. The voice widget pushes events to `window.adobeDataLayer` (or `window._satellite`) before executing the action, so Analytics captures the intent even if the subsequent navigation causes a page unload.

### Adobe Target (Personalization Signals)

Adobe Target can use voice interaction data to **personalize the static site** for return visitors:

- **Audience segmentation**: Users who asked about "dental coverage" are added to the "Dental-Interested" audience; subsequent page loads show dental plan promotions above the fold.
- **Offer targeting**: Users who requested a callback but didn't enroll receive a personalized "Talk to an agent" banner on their next visit.
- **A/B test integration**: Adobe Target can bucket users into "Voice Nav Enabled" vs. "Control" and measure enrollment conversion lift.

**Data sync**: Push voice events to Target's `visitorProfile` or `mbox` parameters via the Adobe Experience Cloud ID Service (ECID) to link voice behavior to the unified profile.

### Dispatcher / CDN / Firewall Requirements

| Concern | Requirement |
|---------|-------------|
| **WebSocket (Gemini Live)** | Dispatcher rules must allow `wss://` outbound to the AI gateway. If the enterprise uses a forward proxy, whitelist the gateway domain. |
| **CSP (Content Security Policy)** | Add `connect-src` directives for the AI gateway domain, WebSocket endpoint, and any CDN hosting the widget bundle. |
| **Microphone Permission** | Pages hosting the widget must be served over HTTPS (AEM default). The widget requests `getUserMedia()` on first voice interaction, not on page load. |
| **Caching** | Do NOT cache HTML responses that include user-specific voice state (e.g., callback form). Use dispatcher rules to cache static assets (JS/CSS) aggressively but keep HTML dynamic. |
| **Rate Limiting** | The `/api/chat` and `/api/voice-session` endpoints need rate limiting (e.g., 30 requests/minute per IP) to prevent abuse. Implement at the CDN or API gateway layer. |

### Multi-Site Manager (MSM) Configuration

If the AEM instance supports **multiple brands or regions** (e.g., Medicare, Medicaid, individual market plans), use MSM to roll out the voice navigator across sites:

1. Create the voice navigator clientlib in the **blueprint** site (e.g., `/apps/crinkle-blueprint`).
2. Use **MSM Rollout** to push the clientlib inclusion to live copies (e.g., `/content/crinkle-medicare`, `/content/crinkle-medicaid`).
3. Use **Live Copy Inheritance** for shared components but **suspend inheritance** for site-specific intents:
   - Medicare site maps intents to Medicare pages (`/content/medicare/learn.html`).
   - Medicaid site maps the same intents to Medicaid equivalents (`/content/medicaid/learn.html`).
4. Store site-specific intent maps as **context-aware configurations** (`/conf/<site>/settings`) so each live copy reads its own mapping without code changes.

---

## Phased Rollout Plan

| Phase | Duration | Activities | Success Criteria |
|-------|----------|-----------|------------------|
| **Phase 1: Foundation** (Months 1–2) | 8 weeks | Build the widget bundle; create intent-to-URL map for top 20 pages; implement Adobe Analytics events; test on 1 AEM template (e.g., Medicare homepage) in staging. | Widget loads without console errors; intent mapping covers 80% of pilot page content; analytics events fire correctly. |
| **Phase 2: Controlled Pilot** (Months 3–4) | 8 weeks | Deploy to production behind a feature flag or Adobe Target A/B test (5–10% of traffic). Monitor error rates, callback request rates, and enrollment conversion. Collect qualitative feedback via on-exit surveys. | ≥ 70% of voice requests result in successful navigation or content retrieval; callback request rate < 5% (indicates self-service success); no measurable page-load regression. |
| **Phase 3: Expansion** (Months 5–6) | 8 weeks | Roll out to all Medicare templates; integrate with Content Fragments/GraphQL for plan/doctor data; enable on mobile; add Spanish language support; refine intent map based on Phase 2 logs. | Voice nav available on 100% of Medicare shopping pages; structured data queries replace DOM scraping for plan/doctor lookups. |
| **Phase 4: Scale & Optimize** (Months 7–12) | 6 months | Roll out to additional business lines (Medicaid, employer); integrate with Adobe Target for real-time personalization based on voice history; implement predictive prompts ("You asked about dental last time — want to see plans with dental?"); optimize LLM prompts based on production logs. | Cross-sell lift measured; voice users show ≥ 15% higher enrollment conversion vs. control; support call volume reduced by ≥ 10%. |

---

## Key Stakeholders to Involve

### Content Strategy & UX
- **Responsibility**: Define the intent-to-URL mapping; maintain the glossary and FAQ corpus used by the AI; ensure tone-of-voice guidelines are reflected in LLM system prompts.
- **When to involve**: Phase 1 — they must validate the content model before engineering builds the integration.

### IT / Security / Infrastructure
- **Responsibility**: Approve outbound WebSocket connections; configure Dispatcher/CSP rules; review the widget bundle for security (no inline scripts, no eval, CSP-compliant); ensure GDPR/CCPA compliance for voice transcripts and callback data.
- **When to involve**: Phase 1 — security review gates production deployment.

### Analytics & Data Science
- **Responsibility**: Design the Adobe Analytics event schema; build dashboards for voice funnel analysis (request → navigate → compare → enroll); run the A/B test analysis in Adobe Target.
- **When to involve**: Phase 1 — event instrumentation must be in the initial build, not retrofitted.

### Marketing / Personalization
- **Responsibility**: Define Adobe Target audiences based on voice signals; design follow-up campaigns for users who requested callbacks; manage the A/B test hypothesis and success metrics.
- **When to involve**: Phase 2 — they own the pilot success criteria and expansion business case.

### Customer Service / Operations
- **Responsibility**: Define the agent handoff workflow — what data the callback snapshot should contain; train agents to read the voice journey summary; set SLAs for callback response time.
- **When to involve**: Phase 2 — they must be ready to receive handoffs before the pilot goes live.

### Legal / Compliance
- **Responsibility**: Review LLM-generated content for medical/regulatory accuracy; approve privacy language for voice recording consent; ensure Medicare marketing compliance (e.g., CMS communication guidelines) for AI-generated suggestions.
- **When to involve**: Phase 1 for privacy review; Phase 3 for expanded regulatory review across business lines.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| LLM hallucinates incorrect Medicare advice | Constrain the LLM to only navigate and read pre-approved content; never allow it to generate medical or enrollment advice not present in the CMS. |
| Voice transcripts contain PII | Anonymize transcripts at ingestion; do not persist audio recordings; callback data encrypted in transit and at rest. |
| Widget breaks existing AEM components | Scope all CSS under a single class namespace (e.g., `.voice-nav-widget *`); use Shadow DOM if CSS collisions persist. |
| Performance regression | Lazy-load the widget bundle only after page `load` event; use `requestIdleCallback` for non-critical initialization. |
| Accessibility (WCAG) | Ensure the widget is fully keyboard-navigable; provide captions for voice output; respect `prefers-reduced-motion`; support screen readers. |

---

## Summary

Integrating a Voice AI Navigator into AEM is not a CMS migration — it is a **progressive enhancement** delivered via clientlibs, reading existing content through DOM parsing or GraphQL, and feeding behavioral signals back into the Adobe Marketing Cloud. The key to success is a phased rollout that validates the intent mapping and analytics instrumentation before scaling across the enterprise.
