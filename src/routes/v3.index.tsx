import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/v3/app-shell";
import { useSession } from "@/lib/v3/session-store";
import type { IntakeMode } from "@/lib/v3/intake-types";
import { Phone, MessageSquare, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/v3/")({
  head: () => ({
    meta: [
      { title: "Medicare Compass — Unified Health" },
      { name: "description", content: "Find the Medicare Advantage plan that actually fits your life. One honest conversation — in your words, at your pace." },
    ],
  }),
  component: V3Home,
});

const MODES: { key: IntakeMode; title: string; tag: string; blurb: string; icon: typeof Phone }[] = [
  {
    key: "ramble",
    title: "Just talk",
    tag: "Open conversation",
    blurb: "Tell us about your life in your own words. We'll listen and only ask when something's missing.",
    icon: MessageSquare,
  },
  {
    key: "structured",
    title: "Step by step",
    tag: "Guided questions",
    blurb: "Short, clear questions in order. Best when you already know what you're looking for.",
    icon: Phone,
  },
  {
    key: "hybrid",
    title: "A bit of both",
    tag: "Open + guided",
    blurb: "Start open, then a few targeted questions to fill in what's left.",
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
          Medicare made human
        </div>
        <h1 className="font-serif text-5xl md:text-6xl leading-[1.05] tracking-tight">
          From confused to confident,<br />
          in one honest conversation.
        </h1>
        <p className="mt-6 text-lg text-muted-2 max-w-2xl">
          Medicare doesn't have to be overwhelming. Tell us about your life and we'll guide you
          to a plan that actually fits — in your words, at your pace.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="font-serif text-2xl mb-6">How would you like to start?</h2>
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
                Start here <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-2xl border border-line bg-paper p-8 max-w-3xl">
        <h2 className="font-serif text-2xl mb-2">How it works</h2>
        <ol className="mt-4 space-y-3 text-sm text-muted-2">
          {[
            "Have a short conversation about your health, your doctors, and what matters to you.",
            "We build a clear picture of your situation as you talk — visible on the right so you can correct anything.",
            "Confirm what matters most: cost, doctors, drugs, or extras like dental and vision.",
            "See the Medicare Advantage plans that fit best, with a plain-English explanation for each.",
          ].map((line, i) => (
            <li key={i} className="flex gap-3">
              <span className="h-6 w-6 shrink-0 rounded-full bg-ink text-paper flex items-center justify-center text-xs font-medium">{i + 1}</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-muted-2">
          You can restart anytime, and nothing is submitted until you say so.
        </p>
      </section>
    </AppShell>
  );
}
