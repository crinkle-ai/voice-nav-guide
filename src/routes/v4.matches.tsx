import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Stepper } from "@/components/v4/app-shell";
import { useSession } from "@/lib/v4/session-store";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, X, Star, Phone, AlertTriangle, Loader2 } from "lucide-react";
import { SecondOpinionDialog } from "@/components/v4/second-opinion-dialog";
import { rankDemoPlans, type DemoScoredPlan } from "@/lib/v4/match-plans.functions";

export const Route = createFileRoute("/v4/matches")({
  head: () => ({ meta: [{ title: "Your matches — Medicare Compass v4" }] }),
  component: MatchesPage,
});

function MatchesPage() {
  const { state, ready } = useSession();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [secondOpinionOpen, setSecondOpinionOpen] = useState(false);

  const zip = state.intake.zip?.value?.trim() ?? "";
  const hasZip = /^\d{5}$/.test(zip);

  useEffect(() => {
    if (!ready) return;
    if (!hasZip) {
      navigate({ to: "/v4/intake" });
      return;
    }
    if (!state.finished) navigate({ to: "/v4" });
  }, [ready, state.finished, hasZip, navigate]);

  const { data: scored, isLoading, error } = useQuery({
    queryKey: ["v4-rank", state.intake],
    queryFn: () => rankDemoPlans({ data: { intake: state.intake } }),
    enabled: ready && state.finished && hasZip,
  });

  const top = (scored ?? []).slice(0, 5);
  const selectedPlan = top.find((s) => s.plan.id === selectedId)?.plan;
  const planContext = selectedPlan
    ? `${selectedPlan.name} and ${top.length - 1} other matches`
    : `${top.length} plan matches`;

  if (!ready || isLoading)
    return (
      <AppShell step="matches">
        <Stepper current="matches" />
        <div className="flex items-center gap-2 text-white/80">
          <Loader2 className="h-4 w-4 animate-spin" /> Scoring plans against your captured info…
        </div>
      </AppShell>
    );

  return (
    <AppShell step="matches">
      <Stepper current="matches" />
      <div className="flex items-baseline justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-white">Your top matches</h1>
          <p className="text-white/80 mt-2 max-w-xl">
            Ranked against your doctors, medications, and budget — using real Twin Cities providers
            and 55410-area plans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSecondOpinionOpen(true)} className="gap-2">
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

      {error && <p className="text-amber-300">Couldn't load the plan catalog. Please try again.</p>}

      <div className="space-y-5">
        {top.map((s, i) => (
          <PlanCard
            key={s.plan.id}
            scored={s}
            rank={i}
            selected={selectedId === s.plan.id}
            onSelect={() => setSelectedId(s.plan.id)}
          />
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

function PlanCard({
  scored,
  rank,
  selected,
  onSelect,
}: {
  scored: DemoScoredPlan;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { plan, buckets, reasons, concerns, eligible } = scored;
  return (
    <article
      className={`rounded-2xl border bg-paper transition ${
        selected ? "border-accent ring-2 ring-accent/30" : "border-line"
      } ${!eligible ? "opacity-60" : ""}`}
    >
      <div className="p-6 grid md:grid-cols-[1fr_auto] gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {rank === 0 && eligible && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-accent text-paper px-2 py-0.5 rounded-full">
                <Star className="h-3 w-3" /> Best overall fit
              </span>
            )}
            <span className="text-xs uppercase tracking-wider text-muted-2">
              {plan.type} · {plan.carrier}
            </span>
            {plan.requires_medicaid && (
              <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                Requires Medicaid
              </span>
            )}
          </div>
          <h2 className="font-serif text-2xl">{plan.name}</h2>
          <p className="text-sm text-muted-2 mt-1">{plan.summary}</p>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat
              label="Monthly premium"
              value={Number(plan.monthly_premium) === 0 ? "$0" : `$${plan.monthly_premium}`}
            />
            <Stat label="Deductible" value={`$${plan.annual_deductible}`} />
            <Stat label="Out-of-pocket max" value={`$${Number(plan.moop).toLocaleString()}`} />
            <Stat label="Star rating" value={plan.star_rating ? `${plan.star_rating} ★` : "—"} />
          </div>

          <div className="mt-5 pt-5 border-t border-line grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <FitBlock
              title="Network"
              score={buckets.network.score}
              max={buckets.network.max}
              body={
                buckets.network.doctors.length === 0 ? (
                  <span className="text-muted-2">No doctors entered yet</span>
                ) : (
                  <ul className="space-y-0.5">
                    {buckets.network.doctors.map((d, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        {d.inNetwork ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                        )}
                        <span>
                          {d.matchedName ?? d.name}
                          {d.specialty && (
                            <span className="text-muted-2"> · {d.specialty}</span>
                          )}
                          {!d.matchedNpi && (
                            <span className="text-muted-2 italic"> (no NPI match)</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )
              }
            />
            <FitBlock
              title="Formulary"
              score={buckets.formulary.score}
              max={buckets.formulary.max}
              body={
                buckets.formulary.drugs.length === 0 ? (
                  <span className="text-muted-2">No medications entered yet</span>
                ) : (
                  <ul className="space-y-0.5">
                    {buckets.formulary.drugs.map((d, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        {d.covered ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                        )}
                        <span>
                          {d.drug}
                          {d.covered && d.tier && (
                            <span className="text-muted-2"> · Tier {d.tier}</span>
                          )}
                          {d.priorAuth && (
                            <span className="ml-1 text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 px-1 py-0.5 rounded">
                              PA
                            </span>
                          )}
                          {d.stepTherapy && (
                            <span className="ml-1 text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 px-1 py-0.5 rounded">
                              Step therapy
                            </span>
                          )}
                          {d.copay !== null && d.covered && (
                            <span className="text-muted-2"> · ${Number(d.copay)} copay</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )
              }
            />
            <FitBlock
              title="Budget"
              score={buckets.budget.score}
              max={buckets.budget.max}
              body={
                <ul className="space-y-0.5">
                  <li className="flex items-center gap-1.5">
                    {buckets.budget.premiumOk ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    Premium ${plan.monthly_premium}/mo
                  </li>
                  <li className="flex items-center gap-1.5">
                    {buckets.budget.deductibleOk ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    Deductible ${plan.annual_deductible}
                  </li>
                </ul>
              }
            />
            <FitBlock
              title="Extras"
              score={buckets.extras.score}
              max={buckets.extras.max}
              body={
                plan.extras.length === 0 ? (
                  <span className="text-muted-2">None</span>
                ) : (
                  <span className="capitalize">{plan.extras.join(", ")}</span>
                )
              }
            />
          </div>

          {reasons.length > 0 && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wider text-accent font-medium mb-2">
                Why this fits you
              </p>
              <ul className="space-y-1.5">
                {reasons.map((r) => (
                  <li key={r} className="flex gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {concerns.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-amber-700 font-medium mb-2">
                Things to know
              </p>
              <ul className="space-y-1.5">
                {concerns.map((r) => (
                  <li key={r} className="flex gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end justify-between gap-4 min-w-[140px]">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted-2">Match score</div>
            <div className="font-serif text-4xl text-ink">{Math.max(0, Math.round(scored.score))}</div>
          </div>
          <Button
            onClick={onSelect}
            variant={selected ? "default" : "outline"}
            className={selected ? "bg-ink text-paper hover:bg-ink/90" : ""}
            disabled={!eligible}
          >
            {selected ? "Selected" : "Choose this plan"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function FitBlock({
  title,
  score,
  max,
  body,
}: {
  title: string;
  score: number;
  max: number;
  body: React.ReactNode;
}) {
  const pct = Math.round((score / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-2 mb-1">
        <span>{title}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-canvas overflow-hidden mb-2">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-sm">{body}</div>
    </div>
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
