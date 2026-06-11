## Goal
Stop cropping the agent's face in the LiveAdvisePanel header. Switch the image tile from a wide 420×288 (h-72) crop to a portrait 4:5 aspect that matches the source photo, so her full face shows with `object-cover`.

## Change
Single file: `src/components/LiveAdvisePanel.tsx`

1. Replace the header container's fixed `h-72` with `aspect-[4/5]` (≈ 420×525 at the current panel width). Keep everything else on that wrapper (`relative overflow-hidden bg-gradient-to-br …`).
2. On the `<img>`, simplify to `h-full w-full object-cover object-center` and drop the inline `objectPosition: 'center 20%'` — at portrait aspect the natural center already frames the face correctly.
3. Leave all overlays (top-right minimize button, speaking waveform, connecting spinner, bottom name/title gradient) unchanged — they're absolutely positioned to the wrapper and will reflow with the new height automatically.
4. Reduce the transcript area from `h-48` to `h-40` so the overall panel doesn't grow taller than the viewport on smaller laptop screens. (Panel is `fixed bottom-44 right-4`; with the taller header + context strip + transcript + controls we want to stay within ~720px total.)

## Out of scope
- No changes to image asset, panel width, position, or any other component.
- No changes to the minimized state.
- No changes to voice/connection logic.

## Verification
- View `/` with the LiveAdvise panel open (call started) — Sarah's full face visible, not cropped at chin or forehead.
- "Connecting…" state still shows the spinner centered, image blurred underneath.
- Speaking state still shows the waveform pill bottom-left.
- Panel still fits above the bottom voice bar on a typical 800–900px-tall laptop viewport.
