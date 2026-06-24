import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Sparkles, X } from "lucide-react";
import demoVideo from "@/assets/medicare-parts-a-b.mp4.asset.json";

export const Route = createFileRoute("/deck/")({
  head: () => ({
    meta: [
      { title: "Executive Deck · Crinkle Navigator" },
      { name: "description", content: "Medicare Navigator — voice-guided AI executive preview." },
    ],
  }),
  component: DeckChooser,
});

function DeckChooser() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground overflow-y-auto">
      <button
        onClick={() => navigate({ to: "/" })}
        className="absolute top-4 right-4 md:top-6 md:right-6 z-20 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-card/90 border shadow-lg backdrop-blur transition hover:bg-card"
        aria-label="Close"
      >
        <X className="h-5 w-5 md:h-6 md:w-6" />
      </button>

      <div className="mx-auto w-full max-w-5xl px-6 md:px-10 py-10 md:py-16">
        <div className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Executive preview
        </div>
        <h1 className="mt-2 text-2xl sm:text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] max-w-4xl">
          Medicare Navigator. <span className="text-primary">Open the deck.</span>
        </h1>
        <p className="mt-3 md:mt-5 text-sm md:text-xl text-muted-foreground max-w-3xl">
          Voice-guided AI that drives the site for you — open enrollment without the maze.
        </p>

        <div className="mt-8 md:mt-12 grid gap-5 md:gap-8">
          <DeckCard
            to="/deck/ai"
            kicker="AI Guide"
            badge={<Sparkles className="h-3.5 w-3.5" />}
            title="Medicare Navigator"
            desc="Voice-guided AI that drives the site for you — open enrollment without the maze."
            videoSrc={demoVideo.url}
            slideCount={4}
            appendixCount={3}
          />
        </div>

        <section id="demo" className="mt-12 sm:mt-16">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">See how it works</h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            Talk to your AI Medicare guide — it drives the site for you, from learning the basics to comparing plans.
          </p>
          <div className="mt-4 sm:mt-6 grid gap-5 sm:gap-6">
            <DemoVideoCard
              kicker="AI Guide"
              title="Find & compare Medicare plans with AI"
              desc="A quick walkthrough of using your AI guide to shop plans."
              src={demoVideo.url}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function DeckCard({
  to,
  kicker,
  badge,
  title,
  desc,
  videoSrc,
  slideCount,
  appendixCount,
}: {
  to: "/deck/ai" | "/deck/live";
  kicker: string;
  badge: React.ReactNode;
  title: string;
  desc: string;
  videoSrc: string;
  slideCount: number;
  appendixCount: number;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-2xl border bg-card shadow-sm overflow-hidden transition hover:border-primary/40 hover:shadow-xl"
    >
      <div className="bg-black aspect-video overflow-hidden">
        <video
          src={videoSrc}
          muted
          loop
          playsInline
          preload="metadata"
          autoPlay
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-5 md:p-7 flex flex-col flex-1">
        <div className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-semibold uppercase tracking-[0.15em] text-primary">
          {badge}
          {kicker}
        </div>
        <h2 className="mt-2 text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm md:text-base text-muted-foreground flex-1">{desc}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[11px] md:text-xs text-muted-foreground">
            {slideCount} main slides · {appendixCount} appendix
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm md:text-base font-semibold text-primary group-hover:gap-2.5 transition-all">
            Open deck <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
