import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp, useTrackPage, useOpenNavigatorWithPrompt } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { BookOpen, Stethoscope, ClipboardList, Mic, ShieldCheck, Heart, Check, MessageCircleQuestion } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medicare Navigator — Your voice-guided path through Medicare" },
      { name: "description", content: "Understand Medicare, find doctors, and compare plans — guided by a friendly AI voice assistant." },
      { property: "og:title", content: "Medicare Navigator" },
      { property: "og:description", content: "A voice-guided journey through your Medicare options." },
    ],
  }),
  component: Home,
});

const PROMPTS = [
  "What's the difference between Parts A, B, C, and D?",
  "Find a primary care doctor in Austin",
  "Recommend a plan under $50 a month with drug coverage",
  "I just turned 65 — where do I start?",
];

function Home() {
  useTrackPage("home", "/");
  const { state } = useApp();
  const askNavigator = useOpenNavigatorWithPrompt();
  const visited = (p: string) => state.journey.visitedPages.includes(p);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {/* Hero */}
      <section id="hero" className="grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
            <ShieldCheck className="h-4 w-4" /> Friendly • Plain language • Voice-guided
          </div>
          <h1 className="mt-5 text-5xl font-bold tracking-tight text-foreground md:text-6xl">
            Medicare, in your own words.
          </h1>
          <p className="mt-5 text-xl text-muted-foreground">
            Talk to your Navigator. Ask anything — what Part B covers, which doctors take your plan, how plans compare. We'll walk you through it, step by step.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="h-14 px-7 text-lg" onClick={() => askNavigator("Hi! I'm new to Medicare. Where should I start?")}>
              <Mic className="h-5 w-5" /> Talk to your guide
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-7 text-lg">
              <Link to="/learn">Start with Step 1 →</Link>
            </Button>
          </div>
        </div>
        <div id="try-asking" className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <MessageCircleQuestion className="h-4 w-4" /> Try asking…
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => askNavigator(p)}
                className="rounded-lg border bg-background px-4 py-3 text-left text-base text-foreground transition-colors hover:border-primary hover:bg-accent"
              >
                "{p}"
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section id="steps" className="mt-16">
        <h2 className="text-3xl font-bold text-foreground">Three steps. Take them in any order.</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <StepCard to="/learn" icon={<BookOpen className="h-6 w-6" />} step="1" title="Learn the basics" desc="Parts A, B, C, D — without the jargon." done={visited("/learn")} />
          <StepCard to="/find-doctors" icon={<Stethoscope className="h-6 w-6" />} step="2" title="Find your doctors" desc="Check who's nearby and accepts Medicare." done={visited("/find-doctors")} />
          <StepCard to="/compare-plans" icon={<ClipboardList className="h-6 w-6" />} step="3" title="Compare your plans" desc="Side-by-side: premiums, coverage, extras." done={visited("/compare-plans")} />
        </div>
      </section>

      {/* Trust strip */}
      <section id="trust" className="mt-16 grid gap-4 rounded-xl border bg-muted/40 p-6 md:grid-cols-3">
        <TrustItem icon={<Heart className="h-5 w-5" />} title="Senior-friendly" desc="Large type, simple language, read-aloud support." />
        <TrustItem icon={<Mic className="h-5 w-5" />} title="Voice-first" desc="Ask out loud. We'll answer and take you there." />
        <TrustItem icon={<ShieldCheck className="h-5 w-5" />} title="No sales pitch" desc="Education first. We never push a specific plan." />
      </section>
    </main>
  );
}

function StepCard({ to, icon, step, title, desc, done }: { to: string; icon: React.ReactNode; step: string; title: string; desc: string; done: boolean }) {
  return (
    <Link to={to} className="group rounded-xl border bg-card p-6 transition-all hover:border-primary hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Step {step}</span>
        </div>
        {done && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            <Check className="h-3 w-3" /> Visited
          </span>
        )}
      </div>
      <h3 className="mt-4 text-xl font-semibold text-foreground group-hover:text-primary">{title}</h3>
      <p className="mt-2 text-muted-foreground">{desc}</p>
    </Link>
  );
}

function TrustItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div>
        <div className="font-semibold text-foreground">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}
