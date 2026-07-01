# Workspace Save & Sign-In UX Flow

Focus: the user-facing experience for identifying users and persisting their workspace. Infra/BAA is handled on the UHC side — this plan is only about screens, prompts, and transitions.

## Guiding principles

- **Explore first, commit later.** A visitor can build a full workspace without signing in. We never block the demo behind a login wall.
- **One save moment, clearly explained.** We ask for identity only when there's something worth saving, and we say exactly what gets stored and why.
- **Returning users feel recognized.** Coming back should surface "Welcome back, Margaret — pick up where you left off" instead of an empty chat.
- **The workspace is the anchor.** Save/sign-in prompts live in Your Workspace, not scattered across the chat.

## The three states a user can be in

```text
┌──────────────┐   builds workspace    ┌───────────────┐   signs in    ┌────────────────┐
│  Anonymous   │ ────────────────────► │  Prompted to  │ ────────────► │  Signed in &   │
│  (local)     │                       │  save         │               │   syncing      │
└──────────────┘                       └───────────────┘               └────────────────┘
```

1. **Anonymous** — today's behavior. Workspace lives in the browser only. Small "Not saved" chip in the Workspace header.
2. **Prompted to save** — triggered by meaningful progress (see triggers below). Non-blocking banner in Workspace: "Save your progress so you can come back to it."
3. **Signed in** — Workspace header shows name + "Saved just now". Auto-syncs on every change.

## When we prompt to save (progressive, not naggy)

Prompt appears once per session, dismissible, and only after one of these:

- User adds their first doctor, medication, or caregiver
- User favorites a plan
- Profile progress crosses 40%
- User clicks "Call an agent" or "Get a 2nd opinion" (they'll want the follow-up)
- User tries to close the tab (browser `beforeunload` hint)

The prompt copy is outcome-focused: *"Save your workspace so Sarah can see it when you call, and so you don't lose it if you close this tab."*

## The sign-in / sign-up moment

CrinkleHealthcare members authenticate with **HealthSafe ID** — the same account used across myuhc.com and the CHC mobile app. New visitors don't have one yet, so the save dialog offers two clear paths:

- **Primary:** "Sign in with HealthSafe ID" — for returning members.
- **Secondary:** "Create a HealthSafe ID" — for first-time visitors, framed as a ~1-minute setup.
- Tiny link: "Not now — keep exploring without saving" → dismisses, stays anonymous.

The inline chat save card mirrors the same two buttons, and preselects the right mode when the dialog opens so the click feels continuous. After sign-in or sign-up, we merge the anonymous workspace into the account (see conflict handling below). Newly created accounts skip the returning-user recap card on that first session.

## Returning-user experience

When a signed-in user lands on `/v4/intake`:

- Header greeting: "Welcome back, Margaret" + last-visit timestamp
- Workspace opens auto-populated
- Chat opens with a short recap card:

  > *"Last time we found 3 plans that fit your doctors and Metformin. Want to keep comparing, or has something changed?"*
  >
  > Buttons: **Continue** · **Something changed** · **Start over**

This is the "I'm Already a Member" experience we already prototyped for Margaret, now wired to real accounts.

## Conflict handling (anonymous → signed in)

If the person already has a saved workspace and just built a new one anonymously, show a merge screen:

- Side-by-side: "What's saved" vs "What you just added"
- Per-card choice: Keep saved · Use new · Merge both
- Default = Merge both, user confirms

Only shown when there's an actual conflict; if the saved workspace is empty, we silently adopt the new one.

## Auto-save behavior (once signed in)

- Debounced save on every workspace change (existing `useSession` hook)
- Header shows subtle status: "Saved just now" → "Saving…" → "Saved"
- If offline: "Saved on this device — will sync when you're back online"
- No manual "Save" button needed

## Trust & control surfaces

Small "Your data" link in the Workspace footer opens a panel with:

- What's saved (list of cards)
- Who can see it ("Only you, and any agent you call")
- **Download my data** (JSON)
- **Delete my data** (wipes account + local)
- Link to UHC privacy notice

This is the HIPAA-visible surface — even though UHC handles the infra, the *user* needs to see and control their data here.

## Caregiver sharing (UX only)

From the Caregiver card:

- "Invite [Name] to view your workspace" → sends email with a magic link
- Caregiver signs in with their own UHC account, sees a read-only (or read/write, user's choice) view marked "Viewing Margaret's workspace"
- Toggle per-card: what the caregiver can see (e.g. hide budget)
- Revoke access anytime

## Sign-out

- Menu in header: name → Sign out
- Confirmation: "Sign out? Your workspace stays saved to your account."
- After sign-out, local copy is cleared so the next visitor on that device starts fresh.

## Open questions

1. ~~**Auth method** — UHC SSO only, or also allow email + one-time code for people without a UHC account yet?~~ **Resolved:** HealthSafe ID with two paths — sign in for existing members, create-account for new visitors. No separate email + one-time code path.
2. **Save prompt tone** — soft banner in Workspace (recommended), or a modal at the trigger moment?
3. **Caregiver default** — read-only or read/write when first invited?
4. **Recap card on return** — always show, or only when it's been >7 days?

Answer these and I'll turn the flow into concrete implementation items (sign-in screen, save banner, merge screen, recap card, data panel, caregiver invite).
