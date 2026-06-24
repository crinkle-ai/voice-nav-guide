import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/v3/session-store";
import {
  deriveLens,
  rankPlansByLens,
  ALL_LENSES,
  type LensKey,
  type ScoredPlan,
} from "@/lib/recommended-path";
import { hasAnyIntake } from "@/lib/workspace-derivations";
import { useWorkspaceDrawerStore } from "@/state/useWorkspaceDrawerStore";
import { ArrowRight, Check, Sparkles, Star, X } from "lucide-react";
import { IntakeHandoffSummary } from "@/components/intake-handoff-summary";

export const Route = createFileRoute("/my-matches")({
  head: () => ({ meta: [{ title: "Your matches — Unified Health" }] }),
  component: MyMatchesPage,
});

function MyMatchesPage() {
  const { state, update, ready } = useSession();
  const navigate = useNavigate();
  const openWorkspace = useWorkspaceDrawerStore((s) => s.setOpen);

  const recommended = useMemo(
    () => (ready ? deriveLens(state.intake, { hybridPath: state.hybridPath }) : null),
    [ready, state.intake, state.hybridPath],
  );
  const activeLensKey: LensKey =
    (state.lensOverride as LensKey | null) ?? recommended?.key ?? "balanced";

  const scored = useMemo<ScoredPlan[]>(
    () => (ready ? rankPlansByLens(state.intake, activeLensKey).slice(0, 3) : []),
    [ready, state.intake, activeLensKey],
  );

  useEffect(() => {
    if (ready && !hasAnyIntake(state.intake)) {
      // No intake yet — bounce back to the chooser.
      navigate({ to: "/v4" });
    }
  }, [ready, state.intake, navigate]);

  if (!ready || !recommended) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-muted-foreground">
        Loading your matches…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-accent-foreground">
            <Sparkles className="h-3 w-3" /> Recommended path
          </div>
          <h1 className="font-display text-4xl mt-3 leading-tight">
            {recommended.label}
          </h1>
          <p className="text-muted-foreground mt-2">{recommended.rationale}</p>
        </div>
        <button
          onClick={() => openWorkspace(true)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Open Workspace <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-6">
        <IntakeHandoffSummary compact />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground uppercase tracking-widest">Lens:</span>
        {ALL_LENSES.map((l) => {
          const active = l.key === activeLensKey;
          return (
            <button
              key={l.key}
              onClick={() =>
                update({
                  lensOverride: l.key === recommended.key ? null : l.key,
                })
              }
              className={[
                "rounded-full px-3 py-1.5 border transition",
                active
                  ? "bg-ink text-background border-ink"
                  : "bg-card border-border text-ink-soft hover:border-ink/40",
              ].join(" ")}
            >
              {l.label}
              {l.key === recommended.key && (
                <span className="ml-1 text-[9px] uppercase tracking-widest opacity-70">
                  rec
                </span>
              )}
            </button>
          );
        })}
        {state.lensOverride && (
          <button
            onClick={() => update({ lensOverride: null })}
            className="text-xs text-primary hover:underline"
          >
            Reset to recommended
          </button>
        )}
      </div>

      <div className="mt-8 space-y-5">
        {scored.map((sp, i) => (
          <PlanCard key={sp.plan.id} sp={sp} rank={i} />
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <h3 className="font-display text-lg">Want to see them side-by-side?</h3>
          <p className="text-sm text-muted-foreground">
            Compare every plan with full details and your filters pre-applied.
          </p>
        </div>
        <Link
          to="/compare-plans"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-background hover:bg-ink/90"
        >
          Compare all plans <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}

function PlanCard({ sp, rank }: { sp: ScoredPlan; rank: number }) {
  const { plan, reasons, concerns } = sp;
  return (
    <article className="rounded-2xl border border-border bg-card p-6 grid md:grid-cols-[1fr_auto] gap-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          {rank === 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary text-background px-2 py-0.5 rounded-full">
              <Star className="h-3 w-3" /> Best fit
            </span>
          )}
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {plan.type} · {plan.network} network
          </span>
        </div>
        <h2 className="font-display text-2xl">{plan.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">{plan.highlight}</p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Premium" value={plan.monthlyPremium === 0 ? "$0" : `$${plan.monthlyPremium}`} />
          <Stat label="Max out-of-pocket" value={`$${plan.moop.toLocaleString()}`} />
          <Stat label="PCP" value={plan.pcpCopay === 0 ? "$0" : `$${plan.pcpCopay}`} />
          <Stat label="Specialist" value={`$${plan.specialistCopay}`} />
        </div>

        {reasons.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {reasons.slice(0, 3).map((r) => (
              <li key={r} className="flex gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {r}
              </li>
            ))}
          </ul>
        )}
        {concerns.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {concerns.slice(0, 2).map((r) => (
              <li key={r} className="flex gap-2 text-sm text-muted-foreground">
                <X className="h-4 w-4 shrink-0 mt-0.5" /> {r}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col items-end justify-between gap-3 min-w-[120px]">
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Match</div>
          <div className="font-display text-4xl">{Math.max(0, Math.round(sp.score))}</div>
        </div>
        <Link
          to="/compare-plans"
          className="text-sm font-medium text-primary hover:underline"
        >
          See details →
        </Link>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-xl mt-0.5">{value}</div>
    </div>
  );
}
