import { createFileRoute } from "@tanstack/react-router";
import { DeckShell } from "@/components/deck/DeckShell";
import { LIVE_SLIDES, LIVE_MAIN_COUNT } from "@/components/deck/live-slides";

export const Route = createFileRoute("/deck/live")({
  head: () => ({
    meta: [
      { title: "Live Agent Co-browse Deck · Crinkle" },
      { name: "description", content: "Licensed-agent co-browse handoff — executive preview." },
    ],
  }),
  component: LiveDeck,
});

function LiveDeck() {
  return (
    <DeckShell
      slides={LIVE_SLIDES}
      mainCount={LIVE_MAIN_COUNT}
      siblingHref="/deck/ai"
      siblingLabel="AI Navigator deck"
    />
  );
}
