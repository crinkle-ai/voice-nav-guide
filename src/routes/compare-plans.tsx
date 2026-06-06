import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPlans } from "@/lib/catalog.functions";
import { useApp, useTrackPage, useHighlightConsumer } from "@/context/AppContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Check, X, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/compare-plans")({
  head: () => ({
    meta: [
      { title: "Compare Medicare Plans — Side by side" },
      { name: "description", content: "Filter and compare Medicare plans by premium, deductible, drug, dental, vision and hearing coverage." },
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
      <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Compare Medicare plans</h1>
      <p className="mt-4 text-xl text-muted-foreground">
        Use the filters to narrow things down. Pick up to 3 plans to compare side-by-side.
      </p>

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
                  <TableRow key={p.id}>
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
