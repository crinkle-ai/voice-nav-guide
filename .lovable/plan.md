## Rebrand header to "Hello Medicare"

Scope: header/footer visuals only. Leave PDFs, AI prompts, meta tags, SSO dialog, and mock data as "Crinkle Health".

### Steps

1. **Upload logo asset**
   - Run `lovable-assets create --file /mnt/user-uploads/hello_medicare.png --filename hello-medicare.png > src/assets/hello-medicare.png.asset.json`.

2. **Update `src/components/v4/app-shell.tsx` header**
   - Change header `backgroundColor` from `#131F69` to `#ffffff` and add a bottom border (`border-b border-black/10`) so it separates from the canvas.
   - Set header text color (`V4_HEADER_TEXT`) to `#131F69` so the sign-in / user menu / indicators stay legible.
   - Replace the emblem `<img>` + the "Crinkle Health / Medicare" stacked text with a single `<img>` of the new wordmark (`hello-medicare.png.asset.json`), sized ~`h-8 w-auto`.
   - Verify `UserMenu` and `HeaderIndicators` children inherit the new dark color (pass through style prop if they hardcode white).

3. **Footer copy**
   - In the same file, change the footer line's leading text from "© Crinkle Health." to "© Hello Medicare." Keep the rest ("Medicare Advantage plans. Plan availability and benefits vary by region.") unchanged.

4. **Verify**
   - Spot-check `HeaderIndicators` and `UserMenu` render correctly on white (they currently assume white text on blue — may need a `text-[#131F69]` override).

### Out of scope (per user)
- PDF text in `enrollment-dialog.tsx`
- AI prompts in `src/lib/v4/prompts.ts`
- Meta titles/descriptions in route `head()`
- SSO dialog copy
- `public/manifest.json`
- Deck routes, v1/v2/v3 branding
