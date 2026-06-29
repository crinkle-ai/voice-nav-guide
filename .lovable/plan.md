## V4 Theme Overhaul: Dark Blue Header on White Canvas

Switch V4 from a full-blue canvas to a white canvas with a dark blue header, and tune accent colors on the landing surface.

### 1. Header (`src/components/v4/app-shell.tsx`)
- Header background: `#131F69` (replaces current `#E5F5F8`).
- All header text + sign-in icon: white.
- Swap `emblemAsset` (blue mark) → `uhc-emblem-white.png` (white mark).
- Tighten "UnitedHealthcare" wordmark to the logo: reduce `gap-3` → `gap-1.5` and trim the logo's right whitespace via `-ml-1` on the text block.
- "← Back" link: white at ~70% opacity, white on hover.

### 2. Canvas + body text
- `.v4-scope` in `src/styles.css`: change `--canvas` from `#033592` → `#ffffff`. Keep `--ink` and `--accent` as `#033592` so text/icons directly on the canvas invert to blue.
- `AppShell` root: `text-white` → `text-[#033592]` (so default body text on the white canvas is blue). Footer text → blue at reduced opacity.
- `v4.intake.tsx`: replace `text-white`/`text-white/80` on the "Let's talk Medicare" heading + subhead with the blue ink color.

### 3. Landing path cards (`src/components/v4/path-cards.tsx`)
- "I'm just starting Medicare" card icon tile: background `#DADADA`, icon stays blue (for contrast on grey).
- "I want to see plans" card icon tile: background `#59D1E2`, icon blue.
- Card surface stays white; titles stay blue.

### 4. Prompt chips (`src/components/v4/prompt-chips.tsx`)
- Now sit on white instead of blue. Restyle to a light grey pill:
  - background `#F1F1F1` (slight grey to stand out on white)
  - border `#E2E2E2`
  - text blue `#033592`
  - hover: background `#E8E8E8`

### 5. Composer (`src/components/v4/composer.tsx`)
- Field stays white (already is).
- Vertically center the "Ask anything" placeholder + typed text. Switch the textarea from top-aligned multi-line to a single-row flex item: set a fixed line height matching the field height, remove top padding asymmetry, and use `flex items-center` on the wrapping row so placeholder sits on the vertical midline. (Auto-grow on multi-line stays.)

### 6. Chat surface (`src/components/v4/intake-chat.tsx`)
- Main scroll area: background already `#FCF6F1` per prior change → switch to white (`#ffffff`).
- Remove the card border/ring around the chat container (no border, no shadow).
- Assistant bubbles: keep as-is (white background, blue text, UHC emblem avatar on blue circle).
- User bubbles: keep the existing blue bubble with white text (the "bubble as it currently is").

### 7. Workspace drawer
- No changes. `worksheet-drawer.tsx` stays exactly as it is.

### Files touched
- `src/styles.css`
- `src/components/v4/app-shell.tsx`
- `src/components/v4/path-cards.tsx`
- `src/components/v4/prompt-chips.tsx`
- `src/components/v4/composer.tsx`
- `src/components/v4/intake-chat.tsx`
- `src/routes/v4.intake.tsx`

### Out of scope
- Workspace drawer styling, chat logic, header indicators behavior, matches/summary/priorities pages (only the intake + landing surface and global shell are restyled here; downstream pages can follow in a separate pass if needed).
