
# Align sign-in flow with HealthSafe ID (CH's real identity system)

Today's mock SSO dialog offers a single "Continue with CH account" button, which implies every visitor already has one. In reality, CH members authenticate with a **HealthSafe ID** — new visitors first have to *create* one, existing members *sign in* with theirs. The save moment on `/v4/intake` should reflect that split so the demo reads true to a UHC pilot audience.

## What changes (UX only)

### 1. `UhcSsoDialog` — two clear paths

Replace the single primary button with a two-option layout:

```text
┌───────────────────────────────────────────────┐
│  Crinkle Health — Save your workspace      │
│                                               │
│  Sign in with your HealthSafe ID              │
│  the secure account you use for               │
│  Crinkle Health, myuhc.com, and the app.   │
│                                               │
│  ┌───────────────────────────────────────┐    │
│  │  Sign in with HealthSafe ID    →     │   ← primary
│  └───────────────────────────────────────┘    │
│                                               │
│  New to Crinkle Health?                    │
│  ┌───────────────────────────────────────┐    │
│  │  Create a HealthSafe ID        →     │   ← secondary (outlined)
│  └───────────────────────────────────────┘    │
│                                               │
│  🛡 Protected by CH's HIPAA-secure identity  │
│     system. Download or delete anytime.       │
│                                               │
│  Not now — keep exploring without saving      │
└───────────────────────────────────────────────┘
```

- **Sign in** path: simulated handshake (existing 850 ms delay) → signs the user in as returning Margaret.
- **Create** path: brief simulated "creating your HealthSafe ID…" state (~1.1 s) with a small helper line ("We'll use this to save your doctors, medications, and plan favorites."), then signs the user in as a brand-new account (empty `lastServerChangeAt`, no recap card fires).
- Both paths land in the same signed-in state so the rest of the flow is unchanged.
- Dialog copy at top updates to name-drop HealthSafe ID once, in plain language ("the secure account you use across Crinkle Health").

### 2. `SavePromptCard` — match the two-path framing

The inline save card in the chat currently says "Sign in with CH". Update to:

- Headline stays: "Want me to save this to your CH account?"
- Body adds one short line: "You can sign in with your HealthSafe ID, or create one in about a minute."
- Buttons become two chips side-by-side: **Sign in** (filled navy) and **Create HealthSafe ID** (outlined). Both open `UhcSsoDialog` with a `defaultMode` prop preselecting the right tab so the click feels continuous.
- "Not now" link is unchanged.

### 3. `auth-store` — track how they got in (small addition)

Extend `UhcUser` with an optional `accountCreatedAt?: number` and add a `signUp()` helper alongside `signIn()`. `signUp()` sets `accountCreatedAt = signedInAt`, leaves `lastServerChangeAt` undefined, and clears any prior recap summary — this guarantees the returning-user recap card doesn't misfire for a brand-new account.

No other stored fields change; existing sessions stay valid.

### 4. Docs

Update `documents/plans/workspace-save-signin-ux.md` "The sign-in / sign-up moment" section to describe the HealthSafe ID split (sign in vs create) instead of the current single-SSO-button description, and note it as the resolved answer to open question #1.

## Out of scope

- No real HealthSafe ID OAuth integration — still a mock handshake.
- No email + one-time code alternative (superseded by the HealthSafe ID create path).
- No changes to caregiver invite, Your Data panel, header user menu, or recap card logic beyond the `accountCreatedAt` guard.

## Files touched

- `src/components/v4/uhc-sso-dialog.tsx` — two-path UI, optional `defaultMode` prop, sign-up simulated state.
- `src/components/v4/chat-cards/save-prompt.tsx` — two buttons, updated body copy, pass `defaultMode` when opening the dialog.
- `src/lib/v4/auth-store.ts` — add `accountCreatedAt`, add `signUp()` helper.
- `documents/plans/workspace-save-signin-ux.md` — reflect HealthSafe ID split.

## Open question

Should the "Create a HealthSafe ID" path collect anything in the mock (e.g. an email field for realism), or stay a single click like the current sign-in? I'd default to **single click** to keep the demo snappy unless you want the extra beat.
