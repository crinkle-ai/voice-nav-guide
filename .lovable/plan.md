Plan: align the Executive Chooser landing page with the actual V4 route.

The current landing page shows the /v4 demo card with the eyebrow "Version 3", while the URL and codebase refer to it as /v4. This mismatch is confusing.

Change to make:
- In `src/routes/index.tsx`, update the V4 demo card's `eyebrow` from `"Version 3"` to `"Version 4"`.
- Leave the title and description unchanged unless the user wants them updated.

Verification:
- Run the build and confirm no errors.
- Confirm the landing page card shows "Version 4" and clicking it still navigates to /v4/intake.