## Why the Workspace bookmark keeps disappearing

In `src/components/v4/worksheet-drawer.tsx` the entire drawer (including the right-edge bookmark tab) is gated by:

```ts
if (!ready || !state.mode) return null;
```

`state.mode` is `null` until the user picks a path on the landing screen (or after a Reset). So:

- On `/v4/intake` first load → no mode → bookmark hidden.
- After clicking the Reset icon → mode cleared → bookmark hidden again.
- It "reappears" only once you click *I'm starting Medicare* / *I want to see plans* / *Already a member*, which sets a mode.

That's the "keeps disappearing" behavior — it's not getting unmounted by layout/CSS, it's the mode guard.

## Fix

Remove the `state.mode` half of the guard so the Workspace is always reachable on V4 intake. Keep the `ready` check so we don't render before the session store hydrates.

### Change

`src/components/v4/worksheet-drawer.tsx`

```diff
- if (!ready || !state.mode) return null;
+ if (!ready) return null;
```

That's the only change needed. Cards already render gracefully with empty intake values (Fields show the em-dash placeholder), so showing the drawer pre-mode is safe.

### Optional follow-up (not in this plan unless you want it)

If you'd rather the bookmark only appears once the user has actually started a conversation (not on the bare landing hero), we can gate on `state.intake` having any non-empty field instead of on `mode`. Say the word and I'll switch to that variant.