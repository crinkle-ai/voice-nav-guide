import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { persona } from "@/mock/personas";
import { robertPlans } from "@/mock/plans";
import { PersonaAvatar } from "@/components/workspace-card";
import { BackRow } from "@/components/back-row";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "Compare my final options · Medicare Decision Companion" }] }),
  component: () => (
    <AppShell>
      <ComparePage />
    </AppShell>
  ),
});

function ComparePage() {
  const plans = robertPlans;
  const finalists = plans.filter((p) => p.finalist).slice(0, 2);
  const pair = finalists.length === 2 ? finalists : plans.slice(0, 2);

  const rows: { label: string; values: [string, string] }[] = [
    { label: "Plan type", values: [pair[0]?.type ?? "—", pair[1]?.type ?? "—"] },
    {
      label: "Monthly premium",
      values: [
        pair[0] ? (pair[0].premium === 0 ? "$0" : `$${pair[0].premium}`) : "—",
        pair[1] ? (pair[1].premium === 0 ? "$0" : `$${pair[1].premium}`) : "—",
      ],
    },
    {
      label: "How it shows up",
      values: [pair[0]?.blurb ?? "—", pair[1]?.blurb ?? "—"],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-6">
        <BackRow backTo="/workspace" backLabel="Back to my workspace" />

        <div className="mt-6 flex items-center gap-3">
          <PersonaAvatar name={persona.name} hue={persona.hue} size={36} />
          <div className="text-xs text-muted-foreground">
            For <span className="text-ink">{persona.name}</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mt-4"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-accent-foreground">
            <Sparkles className="h-3 w-3" /> Your top matches
          </div>
          <h1 className="mt-4 font-display text-3xl leading-tight text-ink">
            Side-by-side, just the differences that matter.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Two of your strongest matches, lined up so you can name the tradeoff.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {pair.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.35 }}
              className="rounded-3xl border border-border bg-card p-5"
            >
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {p.carrier} · {p.type}
              </div>
              <div className="mt-1 font-display text-xl text-ink">{p.name}</div>
              <div className="mt-3 font-display text-3xl text-ink">
                {p.premium === 0 ? "$0" : `$${p.premium}`}
                <span className="ml-1 text-[11px] uppercase tracking-widest text-muted-foreground">/mo</span>
              </div>
              <ul className="mt-4 space-y-1.5 text-[13px]">
                {Object.values(p.proofs).slice(0, 3).map((proof, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink text-background">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    <span className="text-ink">{proof}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            The tradeoffs, lined up
          </div>
          <ul>
            {rows.map((row, i) => (
              <li
                key={row.label}
                className={`grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[140px_1fr_1fr] ${
                  i % 2 === 1 ? "bg-muted/40" : ""
                }`}
              >
                <div className="text-[12px] uppercase tracking-widest text-muted-foreground">
                  {row.label}
                </div>
                <div className="text-[14px] text-ink">{row.values[0]}</div>
                <div className="text-[14px] text-ink">{row.values[1]}</div>
              </li>
            ))}
          </ul>
        </div>

        <Link
          to="/workspace"
          className="mt-10 flex items-center justify-center gap-2 rounded-full bg-ink py-4 font-medium text-background hover:bg-ink/90"
        >
          Take this to my workspace <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
