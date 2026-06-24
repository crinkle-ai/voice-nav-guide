import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Sparkles, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medicare Demos — Executive Showcase" },
      {
        name: "description",
        content:
          "Three prototype experiences for shopping Medicare: the production-style Crinkle homepage, a concierge Unified Health assistant, and a guided intake navigator.",
      },
    ],
  }),
  component: ChooserPage,
});

type DemoCard = {
  to: "/v1" | "/v2" | "/v3" | "/v4";
  eyebrow: string;
  title: string;
  blurb: string;
  bullets: string[];
  icon: typeof Compass;
  accent: string;
  ring: string;
};

const DEMOS: DemoCard[] = [
  {
    to: "/v1",
    eyebrow: "Version 1",
    title: "Crinkle Health — Shop My Way",
    blurb:
      "The production-style Medicare homepage with the Ramble hero, plan comparisons, and the Workspace — your living record. Comes pre-filled when you arrive from Shop Your Way.",
    bullets: [
      "Workspace drawer reads from your Shop Your Way intake",
      "Top nav, plan grid, and benefits content",
      "Live-advise overlay and guidance toasts",
    ],
    icon: Compass,
    accent: "bg-emerald-50",
    ring: "ring-emerald-200",
  },
  {
    to: "/v2",
    eyebrow: "Version 2",
    title: "Unified Health — Concierge Assistant",
    blurb:
      "An editorial concierge experience built around a Virtual Assistant. Expanded chat docks to the side, with a Workspace panel and topic journeys.",
    bullets: [
      "Conversational welcome and docked split layout",
      "Diabetes journey + returning-member flow",
      "Editorial palette with serif typography",
    ],
    icon: Sparkles,
    accent: "bg-indigo-50",
    ring: "ring-indigo-200",
  },
  {
    to: "/v4",
    eyebrow: "Version 3",
    title: "Medicare Compass — Shop Your Way",
    blurb:
      "Three different intake experiences — open conversation, a step-by-step wizard, or path-picker — that hand off cleanly into the v1 Workspace when you're ready to shop.",
    bullets: [
      "Ramble chat, real form wizard, or Shop-Your-Way paths",
      "Summary screen hands intake straight to the v1 Workspace",
      "Doctor / drug / budget / new-to-Medicare lenses",
    ],
    icon: Compass,
    accent: "bg-sky-50",
    ring: "ring-sky-200",
  },
];

function ChooserPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-20">
        <header className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white text-xs font-medium px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" /> Executive demo showcase
          </div>
          <h1 className="mt-5 text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">
            Three prototype Medicare experiences.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Each demo explores a different design hypothesis for how seniors
            should shop, learn, and enroll in Medicare. Pick one to dive in —
            you can switch between them at any time.
          </p>
        </header>

        <section className="mt-10 sm:mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {DEMOS.map((d) => {
            const Icon = d.icon;
            return (
              <Link
                key={d.to}
                to={d.to}
                className={`group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 ${d.ring}`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center text-slate-900 ${d.accent}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
                    {d.eyebrow}
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-semibold text-slate-900 leading-snug">
                  {d.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {d.blurb}
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
                  {d.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 rounded-full bg-slate-400 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 group-hover:gap-2.5 transition-all">
                  Open this demo <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </section>

        <footer className="mt-14 text-xs text-slate-500">
          Prototype showcase. Plan details and content are illustrative only and
          not affiliated with CMS.
        </footer>
      </div>
    </main>
  );
}
