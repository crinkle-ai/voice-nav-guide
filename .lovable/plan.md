## Rebrand UnitedHealthcare → CrinkleHealthcare

Global text replacement across the app so nothing proprietary ships when we publish.

### Replacements

- `UnitedHealthcare` → `CrinkleHealthcare`
- `United Healthcare` → `CrinkleHealthcare`
- `UHC` → `CHC` (as a standalone brand token in user-facing strings, aria labels, alt text, badges, plan names, prompt copy, deck slides)

### Files updated (user-facing copy)

- V4: `src/components/v4/app-shell.tsx`, `user-menu.tsx`, `uhc-sso-dialog.tsx`, `your-data-panel.tsx`, `save-chip.tsx`, `worksheet-drawer.tsx`, `intake-chat.tsx`, `chat-cards/save-prompt.tsx`
- V4 data/prompts: `src/lib/v4/prompts.ts`, `auth-store.ts`, `plan-catalog.ts`, `src/routes/api/v4/chat.ts`, `src/routes/v4.deck.tsx`
- Mocks: `src/mock/plans.ts`
- Docs: `documents/v4-demo-script-data.md`, `documents/v4-diabetic-55410-demo.md`
- Head/meta titles and descriptions updated to match

### Not renamed (internal only, no user impact)

- Asset filenames (`uhc-emblem.png`, `uhc-logo-white.png`) and their `.asset.json` sidecars — internal paths, never rendered as text. The visible logo images will keep displaying but the surrounding brand text becomes CrinkleHealthcare.
- CSS class fragments and variable/component identifiers containing `uhc` (e.g. `UhcSsoDialog`, `#uhc-*` tokens in `styles.css`) — code identifiers, not shown to users.

If you'd also like the logo images swapped to a Crinkle mark, say the word and I'll generate replacements in a follow-up.