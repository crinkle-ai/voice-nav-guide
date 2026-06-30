## Goal
When the user picks "Short Videos" (or asks for video explainers), show actual playable video tiles inside the chat — not a raw JSON dump like the screenshot.

## What's wrong today
- `LearningPathsCard` "Short Videos" sends the plain prompt `"Show me short videos that explain Medicare."` to the model.
- The model improvises a `learningPaths` JSON payload in the text body, which renders as a literal JSON blob in the assistant bubble.
- There is no card component that embeds videos and no client-side interception to inject one.

## Changes

### 1. New `ShortVideosCard` (`src/components/v4/chat-cards/short-videos.tsx`)
- Curated list of 3 short Medicare explainers (YouTube IDs already referenced in the leaked JSON: `613nssXuek4`, `q1Yn1xHw_iY`, `8U-alid6h1A`).
- Each tile shows the YouTube thumbnail (`https://img.youtube.com/vi/<id>/hqdefault.jpg`), title, duration, and a play overlay.
- Clicking a tile expands it inline into a responsive 16:9 `<iframe>` (`https://www.youtube.com/embed/<id>?autoplay=1&rel=0`) with a "Close" control. Only one video plays at a time.
- Lightweight follow-up chips below the grid ("Let's look at plans", "I have more questions") wired via the same `onPick` callback the learning paths card already uses.

### 2. Inject the card from the chat client (`src/components/v4/intake-chat.tsx`)
- Add a regex like `SHORT_VIDEOS_RE` matching prompts about short Medicare videos / "Show me videos".
- Mirror the existing `learningInjectedRef` pattern: after a matching user message, find the next assistant message and append a `tool-shortVideos` part (with no input payload — the card is self-contained), then replace the leaked JSON-laden assistant text with a clean lead-in such as: "Here are a few short videos that walk through the basics. Pick one to watch right here, or tell me which topic to dig into."
- Render the part in `MessageRow` (new branch for `tool-shortVideos`) using `ShortVideosCard`.

### 3. Stop the model from emitting the JSON in prose
- Extend `src/lib/v4/prompts.ts` so the system prompt explicitly forbids inlining `learningPaths` / video JSON in assistant text and tells the model that video selection is handled by the UI; it should reply with one short sentence and let the card render.
- Keep the client-side injection as the source of truth so behavior stays consistent even if the model regresses.

## Technical notes
- No new dependencies; iframe embed is plain JSX.
- Reuse the same "inline tool part" pattern already used for `tool-learningPaths` and `tool-recommendPlans` so no transport/server-route changes are required.
- Card respects existing `disabled` prop while the chat is busy (only the follow-up chips disable; videos remain playable).
- Accessibility: each tile is a `<button>` with the video title as label; the iframe gets a `title` attribute.

## Out of scope
- Adding a real server-side `recommendVideos` tool / catalog API.
- Persisting watched-video state into the workspace.
- Replacing the existing learning-paths card layout.