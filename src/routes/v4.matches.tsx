import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Stepper } from "@/components/v4/app-shell";
import { useSession } from "@/lib/v4/session-store";
import { rankPlans, type ScoredPlan } from "@/lib/v3/match-plans";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, X, Star, Phone } from "lucide-react";
import { SecondOpinionDialog } from "@/components/v4/second-opinion-dialog";

export const Route = createFileRoute("/v4/matches")({
  head: () => ({ meta: [{ title: "Your matches — Medicare Compass v4" }] }),
  component: MatchesPage,
});

function MatchesPage() {
  const { state, ready } = useSession();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [secondOpinionOpen, setSecondOpinionOpen] = useState(false);

  useEffect(() => {
    if (ready && !state.finished) navigate({ to: "/v4" });
  }, [ready, state.finished, navigate]);

  const scored = useMemo(() => (ready ? rankPlans(state.intake).slice(0, 3) : []), [ready, state.intake]);

  if (!ready) return <AppShell step="matches"><p className="text-muted-2">Loading…</p></AppShell>;

  const selectedPlan = scored.find((s) => s.plan.id === selectedId)?.plan;
  const planContext = selectedPlan
    ? `${selectedPlan.name} and ${scored.length - 1} other matches`
    : `${scored.length} plan matches`;

  return (
    <AppShell step="matches">
      <Stepper current="matches" />
      <div className="flex items-baseline justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl">Your top matches</h1>
          <p className="text-muted-2 mt-2 max-w-xl">Ranked against what you told us.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setSecondOpinionOpen(true)}
            className="gap-2"
          >
            <Phone className="h-4 w-4" /> Get a 2nd opinion
          </Button>
          <Button
            onClick={() => navigate({ to: "/v4/next-step" })}
            disabled={!selectedId}
            className="bg-accent hover:bg-accent-2 text-paper"
          >
            Continue with selection <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {scored.map((s, i) => (
          <PlanCard key={s.plan.id} scored={s} rank={i} selected={selectedId === s.plan.id} onSelect={() => setSelectedId(s.plan.id)} />
        ))}
      </div>

      <SecondOpinionDialog
        open={secondOpinionOpen}
        onOpenChange={setSecondOpinionOpen}
        planContext={planContext}
      />
    </AppShell>
  );
}

function PlanCard({ scored, rank, selected, onSelect }: { scored: ScoredPlan; rank: number; selected: boolean; onSelect: () => void }) {
  const { plan, reasons, concerns, doctorHits, drugCoverage } = scored;
  return (
    <article className={`rounded-2xl border bg-paper transition ${selected ? "border-accent ring-2 ring-accent/30" : "border-line"}`}>
      <div className="p-6 grid md:grid-cols-[1fr_auto] gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {rank === 0 && <span className="inline-flex items-center gap-1 text-xs font-medium bg-accent text-paper px-2 py-0.5 rounded-full"><Star className="h-3 w-3" /> Best overall fit</span>}
            <span className="text-xs uppercase tracking-wider text-muted-2">{plan.type} · {plan.network} network</span>
          </div>
          <h2 className="font-serif text-2xl">{plan.name}</h2>
          <p className="text-sm text-muted-2 mt-1">{plan.highlight}</p>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Monthly premium" value={plan.monthlyPremium === 0 ? "$0" : `$${plan.monthlyPremium}`} />
            <Stat label="Out-of-pocket max" value={`$${plan.moop.toLocaleString()}`} />
            <Stat label="PCP visit" value={plan.pcpCopay === 0 ? "$0" : `$${plan.pcpCopay}`} />
            <Stat label="Specialist" value={`$${plan.specialistCopay}`} />
          </div>

          {reasons.length > 0 && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wider text-accent font-medium mb-2">Why this fits you</p>
              <ul className="space-y-1.5">
                {reasons.map((r) => (
                  <li key={r} className="flex gap-2 text-sm"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" /> {r}</li>
                ))}
              </ul>
            </div>
          )}
          {concerns.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-amber-700 font-medium mb-2">Things to know</p>
              <ul className="space-y-1.5">
                {concerns.map((r) => (
                  <li key={r} className="flex gap-2 text-sm"><X className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" /> {r}</li>
                ))}
              </ul>
            </div>
          )}

          {(doctorHits.length > 0 || drugCoverage.length > 0 || plan.extras.length > 0) && (
            <div className="mt-5 pt-5 border-t border-line grid sm:grid-cols-3 gap-4 text-sm">
              {doctorHits.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-2 mb-1">Doctors in network</div>
                  <div className="capitalize">{doctorHits.join(", ")}</div>
                </div>
              )}
              {drugCoverage.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-2 mb-1">Drug coverage</div>
                  <div>{drugCoverage.map((d) => `${d.drug}${d.tier ? ` (T${d.tier})` : " (not covered)"}`).join(", ")}</div>
                </div>
              )}
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-2 mb-1">Extras</div>
                <div className="capitalize">{plan.extras.length ? plan.extras.join(", ") : "—"}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end justify-between gap-4 min-w-[140px]">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted-2">Match score</div>
            <div className="font-serif text-4xl text-ink">{Math.max(0, Math.round(scored.score))}</div>
          </div>
          <Button onClick={onSelect} variant={selected ? "default" : "outline"} className={selected ? "bg-ink text-paper hover:bg-ink/90" : ""}>
            {selected ? "Selected" : "Choose this plan"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-2">{label}</div>
      <div className="font-serif text-xl mt-0.5">{value}</div>
    </div>
  );
}
