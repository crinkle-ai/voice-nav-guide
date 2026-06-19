
## Goal

Stop forcing folks through a separate "Understanding" page. After Ramble, drop them straight into their Workspace — which now also carries the "Here's what I'm hearing" summary, "What will shape your route," and "What to look for in a plan."

This is a demo, no auth needed anywhere.

## New flow

```text
/  (Ramble hero)
   └─► Generate ──► /workspace  (single hub for everything)
                         │
                         ├─► /workspace/activity/$id  (do a step)
                         └─► /plans                   (when ready to shop)
```

## /workspace — new structure (top → bottom)

1. **Header** — "Medicare Workspace" kicker + persona name (unchanged).
2. **Here's what I'm hearing** — moved from /understanding. Smaller than today: ~16–17px body text in a soft card with the sparkle chip, not the giant 26px display type. Sits right under the header so it grounds everything.
3. **Your next step** card (unchanged).
4. **Your route** list (unchanged) — replaces the old "What will shape your route" section since they're the same idea.
5. **What matters to you** chips (unchanged — these double as "what to look for in a plan" at the human level).
6. **Plan signals** — new section, moved from /understanding's "What to look for in a plan." Small filter-chip list ("In-network for Dr. Patel & Dr. Chen", etc.) with a "Show me plans that fit →" button underneath linking to `/plans`.
7. **Your doctors** (unchanged).
8. **Your medications** (unchanged).
9. **Anything else we should know** — the `AboutMoreRamble` component moves down here so folks can add more context without leaving the workspace.
10. **Open questions** (unchanged, if any).

## Routing & nav changes

- **`/` Ramble "Generate" button** → navigates to `/workspace` (currently `/understanding`).
- **Top nav "Shop My Way"** → points to `/workspace` (currently `/understanding`). Icon/label unchanged.
- **`/understanding` route** → deleted. Any stragglers redirect to `/workspace`.
- **Bottom nav** in `AppShell` updated so the "Shop My Way" tab's `match` is `/workspace` (it'll share active state with the Workspace tab — we'll drop the duplicate Workspace tab since they're now the same destination; nav becomes: **Shop My Way · Plans · Restart**).

## Files touched

- `src/routes/workspace.tsx` — add hearing summary, plan signals section, AboutMoreRamble at bottom.
- `src/routes/understanding.tsx` — delete.
- `src/routes/index.tsx` — Ramble navigate target → `/workspace`.
- `src/components/app-shell.tsx` — collapse Workspace + Shop My Way into one tab pointing at `/workspace`; remove `/understanding` references.
- `src/components/back-row.tsx` / any lingering links to `/understanding` — point to `/workspace`.

## Out of scope (call out)

- No auth / login flows — demo stays fully open.
- No changes to `/plans`, `/compare`, or activity pages.
- No persona switching — Robert only (already done).
