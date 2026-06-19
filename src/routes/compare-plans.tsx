import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPlans, searchDoctors } from "@/lib/catalog.functions";
import { useApp, useTrackPage, useHighlightConsumer } from "@/context/AppContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Check, X, ShieldCheck, ArrowRight, CheckCircle2, Video, Sparkles, Sliders, Stethoscope } from "lucide-react";
import { TalkToAgentButton } from "@/components/TalkToAgentButton";
import { persona } from "@/mock/personas";
import { robertPlans } from "@/mock/plans";
import { PersonaAvatar } from "@/components/workspace-card";
import { PlanCard } from "@/components/plan-card";

export const Route = createFileRoute("/compare-plans")({
  head: () => ({
    meta: [
      { title: "Plans that fit — Compare Medicare Plans" },
      { name: "description", content: "See plans matched to what matters to you, then filter and compare side-by-side." },
    ],
  }),
  component: ComparePlans,
});

const TYPES = ["All", "Original Medicare", "Medicare Advantage", "Medicare Supplement", "Part D"];

function ComparePlans() {
  useTrackPage("plan-comparison", "/compare-plans");
  useHighlightConsumer();
  const { state, dispatch } = useApp();
  const fetchPlans = useServerFn(listPlans);
  const fetchDoctors = useServerFn(searchDoctors);

  const { data: doctorData } = useQuery({
    queryKey: ["saved-doctors-all"],
    queryFn: () => fetchDoctors({ data: {} }),
  });
  const savedDoctors = (doctorData?.doctors ?? []).filter((d: { id: string }) => state.savedDoctorIds.includes(d.id));

  const [type, setType] = useState("All");
  const [maxPremium, setMaxPremium] = useState(300);
  const [needsDrug, setNeedsDrug] = useState(false);
  const [needsDental, setNeedsDental] = useState(false);
  const [needsVision, setNeedsVision] = useState(false);
  const [touched, setTouched] = useState(false);
  const [enrollStarted, setEnrollStarted] = useState(false);

  useEffect(() => { if (touched) dispatch({ type: "COMPLETE_STEP", step: "plan-comparison" }); }, [touched, dispatch]);

  // Voice agent can pre-fill filters via context.
  useEffect(() => {
    const vf = state.planVoiceFilters;
    if (!vf) return;
    if (vf.type !== undefined) setType(vf.type || "All");
    if (typeof vf.maxPremium === "number") setMaxPremium(vf.maxPremium);
    if (typeof vf.needsDrug === "boolean") setNeedsDrug(vf.needsDrug);
    if (typeof vf.needsDental === "boolean") setNeedsDental(vf.needsDental);
    if (typeof vf.needsVision === "boolean") setNeedsVision(vf.needsVision);
    setTouched(true);
    dispatch({ type: "SET_PLAN_VOICE_FILTERS", filters: null });
  }, [state.planVoiceFilters, dispatch]);

  const filters = useMemo(() => ({
    type: type === "All" ? undefined : type,
    maxPremium,
    needsDrug: needsDrug || undefined,
    needsDental: needsDental || undefined,
    needsVision: needsVision || undefined,
  }), [type, maxPremium, needsDrug, needsDental, needsVision]);

  const { data, isLoading } = useQuery({
    queryKey: ["plans", filters],
    queryFn: () => fetchPlans({ data: filters }),
  });
  const plans = data?.plans ?? [];
  const selected = plans.filter((p) => state.comparePlanIds.includes(p.id));

  const onChange = (fn: () => void) => () => { setTouched(true); fn(); };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 pb-32">
      <div className="flex items-center gap-3">
        <PersonaAvatar name={persona.name} hue={persona.hue} size={36} />
        <div className="text-xs text-muted-foreground">
          For <span className="text-ink">{persona.name}</span>
        </div>
      </div>

      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-accent-foreground">
        <Sparkles className="h-3 w-3" /> Plans that fit
      </div>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
        Plans built around what matters to you
      </h1>
      <p className="mt-4 text-xl text-muted-foreground">
        Start with the matches to your needs, then filter the full list and pick up to 3 to compare side-by-side.
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            What matters to you
          </div>
          <Link to="/workspace" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Sliders className="h-3.5 w-3.5" /> Refine what matters to me
          </Link>
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {persona.needs.map((n) => (
            <li key={n.id} className="rounded-full bg-primary-soft px-3 py-1 text-[12px] text-accent-foreground">
              {n.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg text-ink">Top matches for you</h2>
          <a href="#plan-results" className="text-[12px] font-medium text-primary hover:underline">
            Or browse all plans ↓
          </a>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {robertPlans.map((p, i) => (
            <PlanCard
              key={p.id}
              plan={p}
              needs={persona.needs}
              totalNeeds={persona.needs.length}
              index={i}
              compact
              ctaLabel="See in compare table"
              onAdd={() => {
                document.getElementById("plan-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          ))}
        </div>
      </section>

      <DoctorNetworkMatrix
        doctors={savedDoctors}
        plans={selected.length > 0 ? selected.map((p) => ({ id: p.id, name: p.name, carrier: p.carrier })) : robertPlans.slice(0, 3).map((p) => ({ id: p.id, name: p.name, carrier: p.carrier ?? "" }))}
        usingFallback={selected.length === 0}
      />



      <div className="mt-10 flex flex-col gap-3 rounded-xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-50 to-transparent p-4 dark:from-emerald-950/30 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">Want a licensed agent to review these with you?</div>
            <div className="text-xs text-muted-foreground">Sarah can join your screen, walk through comparisons, and answer questions live — no install, no callback.</div>
          </div>
        </div>
        <TalkToAgentButton variant="ghost" label="Review with an agent" className="shrink-0" />
      </div>


      <section id="premium-filter" className="mt-8 grid gap-5 rounded-xl border bg-card p-5 md:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-foreground">Plan type</label>
          <Select value={type} onValueChange={(v) => { setTouched(true); setType(v); }}>
            <SelectTrigger className="mt-2 h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground">Max monthly premium: <span className="text-primary">${maxPremium}</span></label>
          <Slider value={[maxPremium]} min={0} max={300} step={5} onValueChange={(v) => { setTouched(true); setMaxPremium(v[0]); }} className="mt-4" />
        </div>
        <ToggleRow label="Needs prescription drug coverage" checked={needsDrug} onChange={(v) => { setTouched(true); setNeedsDrug(v); }} />
        <ToggleRow label="Needs dental coverage" checked={needsDental} onChange={(v) => { setTouched(true); setNeedsDental(v); }} />
        <ToggleRow label="Needs vision coverage" checked={needsVision} onChange={(v) => { setTouched(true); setNeedsVision(v); }} />
      </section>

      <section id="plan-results" className="mt-8 overflow-hidden rounded-xl border bg-card scroll-mt-24">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Pick</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Premium</TableHead>
                <TableHead className="text-right">Deductible</TableHead>
                <TableHead className="text-center">Drug</TableHead>
                <TableHead className="text-center">Dental</TableHead>
                <TableHead className="text-center">Vision</TableHead>
                <TableHead className="text-right">Stars</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((p) => {
                const checked = state.comparePlanIds.includes(p.id);
                return (
                  <TableRow key={p.id} id={`plan-${p.id}`} className="scroll-mt-24">
                    <TableCell>
                      <Checkbox checked={checked} onCheckedChange={() => { setTouched(true); dispatch({ type: "TOGGLE_COMPARE_PLAN", id: p.id }); }} />
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.carrier}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{p.type}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">${Number(p.monthly_premium).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">${Number(p.annual_deductible).toFixed(0)}</TableCell>
                    <TableCell className="text-center">{p.drug_coverage ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />}</TableCell>
                    <TableCell className="text-center">{p.dental ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />}</TableCell>
                    <TableCell className="text-center">{p.vision ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.star_rating ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
              {plans.length === 0 && (
                <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">No plans match those filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </section>

      {selected.length >= 2 && (
        <section id="side-by-side" className="mt-8 overflow-hidden rounded-2xl border bg-card scroll-mt-24">
          <div className="border-b bg-muted/40 px-5 py-3">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Side-by-side</div>
            <h2 className="mt-1 font-display text-lg text-ink">
              Comparing {selected.length} plan{selected.length === 1 ? "" : "s"}
            </h2>
          </div>
          <div className="grid gap-px bg-border md:grid-cols-3">
            {selected.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 bg-card p-5">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{p.carrier}</div>
                  <div className="mt-1 font-display text-lg text-ink">{p.name}</div>
                  <Badge variant="outline" className="mt-2">{p.type}</Badge>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Premium</dt>
                  <dd className="text-right tabular-nums text-ink">${Number(p.monthly_premium).toFixed(2)}/mo</dd>
                  <dt className="text-muted-foreground">Deductible</dt>
                  <dd className="text-right tabular-nums text-ink">${Number(p.annual_deductible).toFixed(0)}</dd>
                  <dt className="text-muted-foreground">Drug</dt>
                  <dd className="text-right">{p.drug_coverage ? <Check className="ml-auto h-4 w-4 text-primary" /> : <X className="ml-auto h-4 w-4 text-muted-foreground" />}</dd>
                  <dt className="text-muted-foreground">Dental</dt>
                  <dd className="text-right">{p.dental ? <Check className="ml-auto h-4 w-4 text-primary" /> : <X className="ml-auto h-4 w-4 text-muted-foreground" />}</dd>
                  <dt className="text-muted-foreground">Vision</dt>
                  <dd className="text-right">{p.vision ? <Check className="ml-auto h-4 w-4 text-primary" /> : <X className="ml-auto h-4 w-4 text-muted-foreground" />}</dd>
                  <dt className="text-muted-foreground">Stars</dt>
                  <dd className="text-right tabular-nums text-ink">{p.star_rating ?? "—"}</dd>
                </dl>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-auto"
                  onClick={() => dispatch({ type: "TOGGLE_COMPARE_PLAN", id: p.id })}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section
        id="enroll-now"
        className="mt-8 overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 shadow-sm scroll-mt-24 md:p-8"
      >
        {enrollStarted ? (
          <div className="flex items-start gap-4">
            <CheckCircle2 className="mt-1 h-8 w-8 shrink-0 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">Enrollment started</h2>
              <p className="mt-1 text-base text-muted-foreground">
                (Demo) In a real flow, you'd now confirm your information, verify your Medicare number, and submit your application — typically under 10 minutes.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                <ShieldCheck className="h-3.5 w-3.5" /> Final step
              </div>
              <h2 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
                Ready? Enroll online in minutes.
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                You've reviewed your options and confirmed your doctors. Complete your Medicare enrollment online — no phone calls required.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setEnrollStarted(true)}
              className="h-14 px-8 text-lg font-semibold shadow-md md:shrink-0"
            >
              Start Enrollment <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </section>

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground">Comparing ({selected.length}/3):</span>
            {selected.map((p) => (
              <Badge key={p.id} className="text-sm cursor-pointer" onClick={() => dispatch({ type: "TOGGLE_COMPARE_PLAN", id: p.id })}>
                {p.name} ×
              </Badge>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
      <span className="text-base text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

type DoctorRow = { id: string; name: string; specialty?: string };
type PlanCol = { id: string; name: string; carrier: string };

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function DoctorNetworkMatrix({ doctors, plans, usingFallback }: { doctors: DoctorRow[]; plans: PlanCol[]; usingFallback: boolean }) {
  if (doctors.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-dashed border-border bg-card/60 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-ink">Check whether your doctors are in-network</div>
            <p className="mt-1 text-xs text-muted-foreground">Add doctors from Find Doctors and we'll show you which plans cover them.</p>
            <Link to="/find-doctors" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-background hover:bg-ink/90">
              Find &amp; save doctors <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border bg-card">
      <div className="border-b bg-muted/40 px-5 py-3">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Doctor network check</div>
        <h2 className="mt-1 font-display text-lg text-ink">Your doctors in these plans</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {usingFallback ? "Showing your top matches — pick plans below to swap these columns." : "Showing the plans you've selected to compare."}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20 text-left">
              <th className="px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground">Doctor</th>
              {plans.map((p) => (
                <th key={p.id} className="px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <div className="text-ink normal-case">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground">{p.carrier}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doctors.map((d) => (
              <tr key={d.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{d.name}</div>
                  {d.specialty && <div className="text-xs text-muted-foreground">{d.specialty}</div>}
                </td>
                {plans.map((p) => {
                  const inNetwork = hashStr(p.id + d.id) % 4 !== 0;
                  return (
                    <td key={p.id} className="px-4 py-3">
                      {inNetwork ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs text-ink">
                          <Check className="h-3.5 w-3.5 text-success" /> In-network
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-soft px-2.5 py-1 text-xs text-warm-foreground">
                          <X className="h-3.5 w-3.5" /> Out-of-network
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t bg-muted/20 px-5 py-2 text-right">
        <Link to="/find-doctors" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Verify another doctor <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}
