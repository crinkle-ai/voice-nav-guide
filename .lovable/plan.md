
# Verified identity sign-in (ID.me / CLEAR) — mocked data import

Add a second, higher-trust sign-in path alongside the existing HealthSafe ID flow. Instead of just saving what the user already typed, this path *imports* pre-existing health data (doctors from MyChart/Epic, medications, claims-derived usage from CMS Blue Button 2.0) and pipes it straight into the Workspace and the plan-matching engine. Fully mocked — no real OAuth, no PHI — but scripted to look and feel like a real verified-identity connect.

## User-facing flow

1. **Entry points** — same places `UhcSsoDialog` opens today:
   - `SavePromptCard` in chat
   - `SaveChip` in header
   - The Enrollment dialog's "sign in to prefill" affordance
   - New: a prompt chip on the landing hero: *"Import my health history"*

2. **New dialog: `VerifiedSignInDialog`** replaces the current single-button sheet with a two-tab / two-card layout:
   - **Left/primary: "Verified sign-in"** — ID.me and CLEAR buttons (with real brand marks, "Mock demo" pill). Copy: *"Pull in your doctors, medications, and CMS claims history so we can recommend a plan that fits what you already use."*
   - **Right/secondary: HealthSafe ID** — the existing flow, unchanged.

3. **Provider picker step** (after clicking ID.me or CLEAR): a scripted "Choose what to connect" screen with three toggles, all on by default:
   - MyChart / Epic (doctors + upcoming appointments)
   - CMS Blue Button 2.0 (Medicare claims: providers seen, drugs filled, costs)
   - Pharmacy history (GoodRx-style fills)
   Below: fake consent line *"You're sharing read-only data with Hello Medicare. Revoke anytime in Your Data."*

4. **Import progress screen** — a 3–4 second animated sequence with checkmarks appearing in order:
   - ✓ Verified identity via ID.me (Margaret Chen, DOB •••• )
   - ✓ Connected to MyChart — 3 providers, 12 visits found
   - ✓ Connected to CMS Blue Button — 47 claims in last 24 months
   - ✓ Connected to pharmacy — 4 active medications
   Each row streams in with a spinner→check to sell the beat.

5. **Import summary card** appears in chat (new `chat-cards/imported-history.tsx`) — collapsible, shows what came in, with a "Review in Workspace" CTA. The Workspace cards (Doctors, Meds, About You) light up with a small "Imported from CMS" / "Imported from MyChart" badge on each row. Verification is auto-set to `verified` for imported items (skip the NPPES/RxNorm ping since these are already authoritative).

6. **Downstream effects**:
   - Profile progress jumps to ~85% instantly.
   - Assistant's next message narrates: *"I pulled in your 3 doctors and 4 medications from your Medicare record. I also see you had a knee MRI in March — that suggests imaging access matters. Want me to weight that in your plan match?"*
   - `match-plans` scoring receives the imported doctors/drugs the same way manually-entered ones do — no separate path.

## Files to add

- `src/lib/v4/mock-verified-import.ts` — the demo dataset (Margaret's imported record: 3 providers with NPIs, 4 RxCUIs, claims summary counts, one "notable event" the AI can reference). Also exports `simulateImport(providers: string[])` returning a stream of milestone events for the progress UI.
- `src/components/v4/verified-signin-dialog.tsx` — new multi-step dialog (choose provider → consent → import progress → done). Uses existing shadcn `Dialog`. Calls `auth.signIn({...Margaret})` on success and merges the mock record into session state via `intake-merge.ts`.
- `src/components/v4/chat-cards/imported-history.tsx` — the summary card injected into chat after import.
- `src/assets/idme-logo.png` and `src/assets/clear-logo.png` — brand marks (generated, marked "Mock").

## Files to modify

- `src/components/v4/uhc-sso-dialog.tsx` — restructure into the two-column layout; keep existing HealthSafe ID path intact as secondary; add ID.me / CLEAR buttons that open `VerifiedSignInDialog`. (Or: keep `uhc-sso-dialog` as-is and have call sites open the new dialog, which contains both flows. Leaning toward this — one new file, existing dialog untouched, call sites swap the import.)
- `src/components/v4/save-chip.tsx`, `chat-cards/save-prompt.tsx`, `enrollment-dialog.tsx`, `landing-hero.tsx` (or `path-cards.tsx` / `prompt-chips.tsx` for the new entry chip) — point at `VerifiedSignInDialog` instead of `UhcSsoDialog`.
- `src/lib/v4/session-store.ts` — add `importedFrom?: "idme" | "clear" | null` and per-item `source?: "mychart" | "cms" | "pharmacy" | "manual"` on doctors/meds so the Workspace can render the badges.
- `src/components/v4/worksheet-drawer.tsx` — render source badges on imported rows and skip the verify-spinner for them.
- `src/lib/v4/prompts.ts` — add a small system-prompt branch: if `importedFrom` is set, the assistant should acknowledge the import once, reference one specific detail (e.g. the MRI), and move on without re-asking for doctors/meds already present.
- `src/components/v4/demo-cheatsheet.tsx` — add a "Verified sign-in (ID.me)" script row so the VP can trigger the demo cleanly.

## Not doing (out of scope for this pass)

- Real OAuth to ID.me / CLEAR / CMS. Everything is client-side mock.
- Real NPPES / RxNorm calls for imported items — imported = trusted for demo.
- Persistence beyond the existing `localStorage` session store.
- A separate "revoke connection" screen inside Your Data (can add later; current "Delete my data" already covers the demo story).

## Open question

Should the two verified providers (ID.me and CLEAR) show *different* imported datasets (e.g. CLEAR = identity only, ID.me = identity + CMS Blue Button), or should they be interchangeable for the demo? Interchangeable is simpler; differentiated is a better talking point for the VP. Default: interchangeable, both pull the same mock record — I'll flag the distinction in cheatsheet copy.
