import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Minus, Plus, Sliders, Sparkles } from "lucide-react";
import { getPersona } from "@/mock/personas";
import { plansByPersona, type Plan } from "@/mock/plans";
import { PersonaAvatar } from "@/components/workspace-card";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/plans/$personaId")({
  head: () => ({ meta: [{ title: "Plans that fit · Medicare Decision Companion" }] }),
  component: () => (
    <AppShell>
      <PlansPage />
    </AppShell>
  ),
});

function PlansPage() {
  const { personaId } = Route.useParams();
  const persona = getPersona(personaId);
  const plans = plansByPersona[persona.id];
  const needs = persona.needs;
  const totalNeeds = needs.length;

  const finalists = plans.filter((p) => p.finalist);
  const rest = plans.filter((p) => !p.finalist);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 pb-20 pt-6">
        <div className="flex items-center justify-between">
          <Link
            to="/understanding/$personaId" params={{ personaId: persona.id }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to what matters
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-ink">Change scenario</Link>
        </div>

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
            <Sparkles className="h-3 w-3" /> Plans that fit
          </div>
          <h1 className="mt-4 font-display text-3xl leading-tight text-ink">
            {plans.length} plans built around what matters to you.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We compared every plan in your area against your list. Here are the ones that line up best.
          </p>
        </motion.div>

        {/* Needs summary header */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Filtering by what matters to you
            </div>
            <Link
              to="/understanding/$personaId" params={{ personaId: persona.id }}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Sliders className="h-3.5 w-3.5" /> Refine what matters to me
            </Link>
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {needs.map((n) => (
              <li key={n.id} className="rounded-full bg-primary-soft px-3 py-1 text-[12px] text-accent-foreground">
                {n.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Susan's finalists side-by-side */}
        {finalists.length === 2 && (
          <div className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-lg text-ink">Your two finalists</h2>
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Side by side</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {finalists.map((p, i) => (
                <PlanCard key={p.id} plan={p} needs={needs} totalNeeds={totalNeeds} index={i} compact />
              ))}
            </div>
          </div>
        )}

        {/* Main list */}
        <div className="mt-8">
          {finalists.length === 2 && (
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-lg text-ink">Other options to consider</h2>
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{rest.length} more</span>
            </div>
          )}
          <ul className="space-y-3">
            {(finalists.length === 2 ? rest : plans).map((p, i) => (
              <li key={p.id}>
                <PlanCard plan={p} needs={needs} totalNeeds={totalNeeds} index={i} />
              </li>
            ))}
          </ul>
        </div>

        <Link
          to="/workspace/$personaId" params={{ personaId: persona.id }}
          className="mt-10 flex items-center justify-center gap-2 rounded-full bg-ink py-4 font-medium text-background hover:bg-ink/90"
        >
          Open my workspace <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function PlanCard({
  plan, needs, totalNeeds, index, compact = false,
}: {
  plan: Plan;
  needs: { id: string; label: string }[];
  totalNeeds: number;
  index: number;
  compact?: boolean;
}) {
  const matchCount = plan.matches.length;
  const isFullMatch = matchCount === totalNeeds;
  const matchPct = Math.round((matchCount / totalNeeds) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.35 }}
      className={`rounded-3xl border bg-card p-5 transition ${
        isFullMatch ? "border-primary/40 shadow-sm" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{plan.carrier} · {plan.type}</div>
          <div className="mt-1 font-display text-xl text-ink">{plan.name}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl text-ink">
            {plan.premium === 0 ? "$0" : `$${plan.premium}`}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">per month</div>
        </div>
      </div>

      {!compact && (
        <p className="mt-3 text-sm text-muted-foreground">{plan.blurb}</p>
      )}

      {/* Match score */}
      <div className="mt-4 flex items-center gap-2">
        <div
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${
            isFullMatch ? "bg-ink text-background" : "bg-primary-soft text-accent-foreground"
          }`}
        >
          <Check className="h-3 w-3" /> Matches {matchCount} of your {totalNeeds} things
        </div>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${isFullMatch ? "bg-ink" : "bg-primary"}`}
            style={{ width: `${matchPct}%` }}
          />
        </div>
      </div>

      {/* Fits your needs */}
      <div className="mt-4">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Fits your needs</div>
        <ul className="mt-2 space-y-1.5">
          {needs.map((n) => {
            const hit = plan.matches.includes(n.id);
            const proof = plan.proofs[n.id];
            return (
              <li key={n.id} className="flex items-start gap-2 text-[13px]">
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                    hit ? "bg-ink text-background" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {hit ? <Check className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                </span>
                <div className="min-w-0">
                  <span className={hit ? "text-ink" : "text-muted-foreground line-through"}>{n.label}</span>
                  {hit && proof && (
                    <div className="text-[12px] text-muted-foreground">{proof}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* CTAs */}
      <div className="mt-5 flex items-center gap-2">
        <button
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition ${
            isFullMatch
              ? "bg-ink text-background hover:bg-ink/90"
              : "border border-border text-ink hover:border-primary/40"
          }`}
        >
          <Plus className="h-3.5 w-3.5" /> Add to workspace
        </button>
        <button className="rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-ink">
          Learn more
        </button>
      </div>
    </motion.div>
  );
}