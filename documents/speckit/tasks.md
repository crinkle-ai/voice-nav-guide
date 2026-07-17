# tasks.md — BREAKDOWN

## Open work

- Replace mock ID.me and CLEAR flows with real OAuth/OIDC integrations, including token storage, refresh, and revocation UI.
- Replace mock MyChart/Epic, CMS Blue Button 2.0, and pharmacy imports with real FHIR/Blue Button clients and a server-side import job.
- Replace mock HealthSafe ID / UHC SSO with the real UHC identity provider.
- Move enrollment data off client localStorage into a HIPAA-eligible backend with encryption at rest and audit logging.
- Implement real authentication (Supabase Auth or equivalent) with account recovery, MFA, and session revocation; remove `mock-auth.ts`.
- Add role-based access (member, caregiver, agent, admin) using a separate `user_roles` table and `has_role` security-definer function; enforce via RLS on every table.
- Add RLS policies and GRANTs to every table used by the production build; add tests that fail if a public table is missing policies.
- Replace static `plan-catalog.ts` with a real Medicare plan + formulary data source (CMS Plan Finder data or a licensed feed) and rebuild `match-plans` against it.
- Harden NPPES/RxNorm calls behind a server proxy with caching, rate limiting, and fallback for ambiguous matches; add manual reconciliation UI.
- Formalize the LLM tool-card contract (replace the `__FORM_RESPONSE__` string convention with typed tool calls) and add regression tests for each card type.
- Add server-side prompt/response logging with PII redaction for QA and safety review.
- Add CMS marketing compliance review pass: TPMO disclaimer, Star Ratings language, SOA workflow (restore SOA if required by compliance), Pre-Enrollment Checklist, MA vs Medigap disclosure.
- Add real e-signature (typed + audit trail meeting CMS enrollment standards) and generate a real 1-page enrollment PDF for member records.
- Add real payment method tokenization (Stripe/Paddle or carrier billing) — never store PAN/CVV in app state.
- Add real caregiver invite delivery (email + SMS), token expiry, and permission enforcement server-side.
- Add real agent handoff: assignment queue, agent-side inbox, telephony/CTI integration for warm transfer.
- Add accessibility audit (WCAG 2.1 AA) — keyboard navigation of drawer, dialog focus traps, screen-reader labels on all voice/mic controls, captions on inline videos.
- Add internationalization (English + Spanish minimum for Medicare audiences).
- Remove or gate `/v1`, `/v2`, `/v3` legacy trees before production; keep only `/v4` (or promote to `/`).
- Add server-side rate limiting and abuse protection on `/api/v4/chat`, `/api/v4/transcribe`, and Gemini Live token endpoints.
- Add error tracking, uptime monitoring, and a graceful degraded state when the AI gateway is down.
- Add automated tests for `intake-merge`, plan-matching scoring, verified-import merging, and enrollment field validation.
- Add analytics/telemetry for funnel steps (intake → workspace complete → plan viewed → enrollment started → submitted) with consented tracking only.
- Add data export + deletion endpoints backing "Your Data" — currently only clears local state.
- Add a real "revoke connection" screen for verified imports.
- Verify all extension/hydration warnings (Dashlane etc.) are handled without breaking iframe embedding.
- Security review and penetration test before any real member data is accepted.
