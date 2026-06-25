## Chat avatar + user bubble updates (V4 only)

Two small visual tweaks in `src/components/v4/intake-chat.tsx`:

### 1. Assistant avatar: UHC logo in a white circle
Replace the current "M" avatar (a light-blue circle with a serif "M") with the dark-blue UHC emblem inside a white circle.

- Import `emblemAsset from "@/assets/uhc-emblem.png.asset.json"` (the dark blue emblem already used in the header).
- Swap the `<div>…M…</div>` block for a white circular avatar with the emblem image centered inside:
  - `bg-white`, same `h-8 w-8 rounded-full`, with a small inner padding so the emblem doesn't touch the edge.
  - `<img src={emblemAsset.url} alt="UnitedHealthcare" className="h-5 w-5 object-contain" />`

### 2. User chat bubbles: white background, blue text
The user bubble currently uses `bg-ink text-paper` (dark blue on white-ish). Against the new `#033592` page background it blends in.

- Change the user bubble classes to: `bg-white text-[#033592]` (keep existing rounded/padding/`whitespace-pre-wrap`).
- Keep the assistant text rendering unchanged (plain white text on blue, no bubble).

No other components, no logic, no API changes.