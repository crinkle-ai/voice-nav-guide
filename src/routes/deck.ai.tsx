import { createFileRoute } from "@tanstack/react-router";
import { DeckShell } from "@/components/deck/DeckShell";
import { AI_SLIDES, AI_MAIN_COUNT } from "@/components/deck/ai-slides";

export const Route = createFileRoute("/deck/ai")({
  head: () => ({
    meta: [
      { title: "AI Navigator Deck · Crinkle" },
      { name: "description", content: "Voice-guided Medicare Navigator — executive preview." },
    ],
  }),
  component: AIDeck,
});

function AIDeck() {
  return (
    <DeckShell
      slides={AI_SLIDES}
      mainCount={AI_MAIN_COUNT}
      siblingHref="/deck/live"
      siblingLabel="Live Agent deck"
    />
  );
}
