import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/v4/app-shell";
import { useSession } from "@/lib/v4/session-store";
import type { IntakeMode } from "@/lib/v3/intake-types";
import { MessageSquare, ClipboardList, Compass, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/v4/")({
  head: () => ({
    meta: [
      { title: "Medicare Compass v4 — Unified Health" },
      { name: "description", content: "Three genuinely different ways to shop Medicare: open conversation, step-by-step wizard, or pick your path." },
    ],
  }),
  component: V4Home,
});

const MODES: {
  key: IntakeMode;
  eyebrow: string;
  title: string;
  blurb: string;
  icon: typeof MessageSquare;
}[] = [
  {
    key: "ramble",
    eyebrow: "Open conversation",
    title: "Just tell us everything",
    blurb: "One open invitation — talk or type as much as you want. We listen, then ask only what's missing. No forms, no scripts.",
    icon: MessageSquare,
  },
  {
    key: "structured",
    eyebrow: "Step-by-step wizard",
    title: "Fill out a quick form",
    blurb: "A clean stepped form: ZIP, doctors, meds, priorities, budget. Predictable and fast — no chat at all.",
    icon: ClipboardList,
  },
  {
    key: "hybrid",
    eyebrow: "Pick your path",
    title: "Shop your way",
    blurb: "First tell us what matters most — keeping doctors, drug costs, lowest price, or learning the basics. We tailor the questions to that path.",
    icon: Compass,
  },
];

function V4Home() {
  const { update, reset } = useSession();
  const navigate = useNavigate();

  const start = (mode: IntakeMode) => {
    reset();
    update({ mode, messages: [], finished: false });
    navigate({ to: "/v4/intake" });
  };

  return (
    <AppShell>
      <section className="max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-soft text-accent text-xs font-medium mb-6">
          Three different ways to shop
        </div>
        <h1 className="font-serif text-5xl md:text-6xl leading-[1.05] tracking-tight">
          Shop Medicare the way<br />
          that suits you.
        </h1>
        <p className="mt-6 text-lg text-muted-2 max-w-2xl">
          Some people want to talk. Some want a form. Some want a guided path tailored to
          what matters most. Pick whichever fits — every route leads to the same clear,
          ranked plan match.
        </p>
      </section>

      <section className="mt-14">
        <div className="grid md:grid-cols-3 gap-5">
          {MODES.map(({ key, eyebrow, title, blurb, icon: Icon }) => (
            <button
              key={key}
              onClick={() => start(key)}
              className="group text-left rounded-2xl border border-line bg-paper p-6 hover:border-accent hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="h-10 w-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-2">{eyebrow}</span>
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
        <h2 className="font-serif text-2xl mb-2">How it works</h2>
        <ol className="mt-4 space-y-3 text-sm text-muted-2">
          {[
            "Pick the experience that matches how you like to make decisions — conversation, form, or guided path.",
            "Share what's going on with your health, your doctors, and what matters most.",
            "Review and tweak the picture we've built before we score plans.",
            "See the Medicare Advantage matches that fit best, with plain-English reasons for each.",
          ].map((line, i) => (
            <li key={i} className="flex gap-3">
              <span className="h-6 w-6 shrink-0 rounded-full bg-ink text-paper flex items-center justify-center text-xs font-medium">{i + 1}</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
      </section>
    </AppShell>
  );
}
