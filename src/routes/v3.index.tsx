import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/v3/app-shell";
import { useSession } from "@/lib/v3/session-store";
import type { IntakeMode } from "@/lib/v3/intake-types";
import { Phone, MessageSquare, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/v3/")({
  head: () => ({
    meta: [
      { title: "Medicare Compass — UHC Pilot" },
      { name: "description", content: "A clickable pilot for testing telephonic vs. digital Medicare intake experiences." },
    ],
  }),
  component: V3Home,
});

const MODES: { key: IntakeMode; title: string; tag: string; blurb: string; icon: typeof Phone }[] = [
  {
    key: "ramble",
    title: "Ramble",
    tag: "Open narrative",
    blurb: "One open invitation. Tell us everything in your own words — we'll listen and only ask follow-ups for what's missing.",
    icon: MessageSquare,
  },
  {
    key: "structured",
    title: "Structured",
    tag: "Step-by-step",
    blurb: "Short, single-purpose questions in a clear order. Predictable and quick — best when you know what you want.",
    icon: Phone,
  },
  {
    key: "hybrid",
    title: "Hybrid",
    tag: "Open + targeted",
    blurb: "Start with an open invitation, then a short structured pass to confirm and fill only what's missing.",
    icon: Sparkles,
  },
];

function V3Home() {
  const { update, reset } = useSession();
  const navigate = useNavigate();

  const start = (mode: IntakeMode) => {
    reset();
    update({ mode, messages: [], finished: false });
    navigate({ to: "/v3/intake" });
  };

  return (
    <AppShell>
      <section className="max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-soft text-accent text-xs font-medium mb-6">
          {"Text or Voice AI Intake\u00a0"}
        </div>
        <h1 className="font-serif text-5xl md:text-6xl leading-[1.05] tracking-tight">
          From confused to confident,<br />
          in one honest conversation.
        </h1>
        <p className="mt-6 text-lg text-muted-2 max-w-2xl">
          Pick the intake style you want to test. The AI listens, captures the details that matter,
          and walks you to a Medicare Advantage plan that actually fits — no jargon, no pressure.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="font-serif text-2xl mb-6">Choose an intake style</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {MODES.map(({ key, title, tag, blurb, icon: Icon }) => (
            <button
              key={key}
              onClick={() => start(key)}
              className="group text-left rounded-2xl border border-line bg-paper p-6 hover:border-accent hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="h-10 w-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-2">{tag}</span>
              </div>
              <h3 className="font-serif text-2xl mb-2">{title}</h3>
              <p className="text-sm text-muted-2 leading-relaxed">{blurb}</p>
              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent group-hover:gap-2.5 transition-all">
                Start this experience <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-2xl border border-line bg-paper p-8 max-w-3xl">
        <h2 className="font-serif text-2xl mb-2">How the pilot works</h2>
        <ol className="mt-4 space-y-3 text-sm text-muted-2">
          {[
            "Pick an intake style and have a short conversation with the AI.",
            "The AI builds a structured picture of you in real time — visible in the right rail.",
            "Confirm and rank what matters most: cost, doctors, drugs, or extras.",
            "See your top matches from a curated Medicare Advantage catalog, with a plain-English explanation for each.",
          ].map((line, i) => (
            <li key={i} className="flex gap-3">
              <span className="h-6 w-6 shrink-0 rounded-full bg-ink text-paper flex items-center justify-center text-xs font-medium">{i + 1}</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-muted-2">
          This prototype mirrors the telephonic AI intake from the UHC pilot guide so you can compare the digital and voice experiences side by side.{" "}
          <Link to="/v3" className="underline">Restart anytime.</Link>
        </p>
      </section>
    </AppShell>
  );
}
