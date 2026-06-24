import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sparkles, ChevronLeft, ChevronDown, Clock, Filter, ArrowRight, Heart,
  CheckCircle2, Stethoscope, Pill, HelpCircle, Route as RouteIcon, MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSession } from "@/lib/v3/session-store";
import {
  deriveNarrative,
  derivePlanFilters,
  deriveOpenQuestions,
  deriveRouteSteps,
  hasAnyIntake,
} from "@/lib/workspace-derivations";
import { intakeCompleteness } from "@/lib/v3/intake-types";
import { useWorkspaceDrawerStore } from "@/state/useWorkspaceDrawerStore";
import { IntakeHandoffSummary } from "@/components/intake-handoff-summary";

export function WorkspaceDrawer() {
  const open = useWorkspaceDrawerStore((s) => s.open);
  const setOpen = useWorkspaceDrawerStore((s) => s.setOpen);
  const [pulse, setPulse] = useState(false);
  const { state, ready } = useSession();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = sessionStorage.getItem("workspace-drawer-hint");
      if (!seen) {
        setPulse(true);
        sessionStorage.setItem("workspace-drawer-hint", "1");
        const t = setTimeout(() => setPulse(false), 4200);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const intake = state.intake;
  const hasIntake = ready && hasAnyIntake(intake);
  const completeness = hasIntake ? intakeCompleteness(intake) : 0;

  const narrative = hasIntake ? deriveNarrative(intake) : null;
  const planFilters = hasIntake ? derivePlanFilters(intake) : [];
  const questions = hasIntake ? deriveOpenQuestions(intake) : [];
  const steps = hasIntake ? deriveRouteSteps(intake) : [];
  const doctors = intake.doctors.value;
  const meds = intake.medications.value;

  return (
    <>
      <button
        type="button"
        onClick={() => { setPulse(false); setOpen(true); }}
        aria-label="Open Workspace"
        className={[
          "fixed right-0 top-1/2 z-40 -translate-y-1/2",
          "flex items-center gap-1.5 rounded-l-2xl border border-r-0 border-border bg-card/95 backdrop-blur",
          "px-2.5 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)]",
          "hover:bg-card hover:text-ink transition",
          pulse ? "animate-pulse ring-2 ring-primary/40" : "",
        ].join(" ")}
      >
        <ChevronLeft className="h-4 w-4 text-primary" />
        <span className="[writing-mode:vertical-rl] rotate-180">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Workspace
          </span>
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-b border-border px-5 py-5">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-accent-foreground">
              <Sparkles className="h-3 w-3" /> Workspace
            </div>
            <SheetTitle className="font-display text-2xl text-ink">
              {hasIntake ? "Your Medicare workspace" : "Your workspace"}
            </SheetTitle>
            <SheetDescription>
              {hasIntake
                ? state.source === "v3"
                  ? `Built from your Shop Your Way conversation — ${completeness}% complete.`
                  : `Your living record — ${completeness}% complete.`
                : "Nothing here yet. Start with Shop Your Way to populate this in minutes."}
            </SheetDescription>
          </SheetHeader>

          <div className="px-5 py-5 space-y-5">
            {!hasIntake && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center">
                <MessageSquare className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-2 text-sm text-ink">
                  Tell us about you — what you take, who you see, what matters most.
                </p>
                <Link
                  to="/v3"
                  onClick={() => setOpen(false)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-medium text-background hover:bg-ink/90"
                >
                  Start Shop Your Way <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* Narrative mirror */}
            {narrative && (
              <div className="rounded-2xl border border-border bg-primary-soft/40 p-4">
                <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-accent-foreground">
                  <Sparkles className="h-3 w-3" /> Here's what I'm hearing
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-ink">{narrative}</p>
                <Link
                  to="/v3"
                  onClick={() => setOpen(false)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Tell us more → <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}

            {/* Route */}
            <Section icon={RouteIcon} title="What will shape your route" count={`${steps.length} steps`} defaultOpen>
              {steps.length === 0 ? (
                <Empty text="No steps yet — share a bit about you above." />
              ) : (
                <ol className="space-y-2">
                  {steps.map((s) => (
                    <li key={s.id}>
                      {s.to ? (
                        <Link
                          to={s.to}
                          onClick={() => setOpen(false)}
                          className="group flex items-center gap-3 rounded-xl border px-3 py-2.5 border-border bg-card hover:border-primary/30 hover:bg-primary-soft/30"
                        >
                          <StepIcon done={s.done} />
                          <span className="flex-1 min-w-0">
                            <span className={[
                              "block text-[13.5px] font-medium leading-tight",
                              s.done ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-ink",
                            ].join(" ")}>
                              {s.label}
                            </span>
                            <span className="mt-0.5 block truncate text-[12px] leading-snug text-muted-foreground">
                              {s.hint}
                            </span>
                          </span>
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 rounded-xl border px-3 py-2.5 border-border bg-card/60">
                          <StepIcon done={s.done} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13.5px] font-medium leading-tight text-ink">{s.label}</span>
                            <span className="mt-0.5 block truncate text-[12px] leading-snug text-muted-foreground">{s.hint}</span>
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </Section>

            <Section icon={Filter} title="What to look for in a plan" count={planFilters.length ? `${planFilters.length} signals` : undefined}>
              {planFilters.length === 0 ? (
                <Empty text="No signals yet." />
              ) : (
                <>
                  <ul className="grid grid-cols-1 gap-2">
                    {planFilters.map((f) => (
                      <li key={f.id} className="rounded-xl border border-border bg-card px-3 py-2.5">
                        <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                          <Filter className="h-3 w-3 text-primary" />
                          {f.label}
                        </div>
                        <div className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{f.hint}</div>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/compare-plans"
                    onClick={() => setOpen(false)}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-medium text-background hover:bg-ink/90"
                  >
                    Show me plans that fit <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              )}
            </Section>

            <Section icon={Stethoscope} title="Your doctors" count={doctors.length ? `${doctors.length}` : undefined}>
              {doctors.length === 0 ? (
                <Empty text="No doctors captured yet." />
              ) : (
                <ul className="space-y-2">
                  {doctors.map((d, i) => {
                    const v = d.npiVerification;
                    const verified = v?.status === "verified";
                    return (
                      <li key={`${d.name}-${i}`} className="rounded-xl border border-border bg-card px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium text-ink">{d.name}</div>
                          <StatusPill status={verified ? "in-network" : v?.status === "ambiguous" ? "verifying" : "unknown"} />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {[d.specialty, d.city || d.zip].filter(Boolean).join(" · ") || "Specialty / location not yet captured"}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link
                to="/find-doctors"
                onClick={() => setOpen(false)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Find or verify doctors <ArrowRight className="h-3 w-3" />
              </Link>
            </Section>

            <Section icon={Pill} title="Your medications" count={meds.length ? `${meds.length}` : undefined}>
              {meds.length === 0 ? (
                <Empty text="No medications captured yet." />
              ) : (
                <ul className="space-y-2">
                  {meds.map((m, i) => (
                    <li key={`${m.name}-${i}`} className="rounded-xl border border-border bg-card px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-ink">{m.name}</div>
                        {m.rxVerification?.status === "verified" && (
                          <span className="text-[10px] uppercase tracking-widest text-success">verified</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[m.strength, m.doseForm, m.frequency].filter(Boolean).join(" · ") || "Strength / form not yet captured"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section icon={Heart} title="Saved plans">
              <p className="text-xs text-muted-foreground">Plans you've saved for later live in My Plans.</p>
              <Link
                to="/my-plans"
                onClick={() => setOpen(false)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open My Plans <ArrowRight className="h-3 w-3" />
              </Link>
            </Section>

            <Section icon={HelpCircle} title="Open questions" count={questions.length ? `${questions.length}` : undefined}>
              {questions.length === 0 ? (
                <Empty text="No open questions." />
              ) : (
                <ul className="space-y-1.5">
                  {questions.map((q) => (
                    <li key={q.id} className="text-sm text-ink-soft">— {q.text}</li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function StepIcon({ done }: { done: boolean }) {
  return (
    <span className={[
      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
      done ? "bg-success-soft text-success" : "bg-primary-soft text-primary",
    ].join(" ")}>
      {done ? <CheckCircle2 className="h-4 w-4" /> : <RouteIcon className="h-4 w-4" strokeWidth={1.75} />}
    </span>
  );
}

function Section({
  icon: Icon, title, count, defaultOpen = false, children,
}: {
  icon: LucideIcon; title: string; count?: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-2xl border border-border bg-card/60">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left hover:bg-muted/40"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-medium text-ink">{title}</span>
            </span>
            {count && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{count}</span>
            )}
            <ChevronDown className={["h-4 w-4 text-muted-foreground transition-transform", open ? "rotate-180" : ""].join(" ")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/60 px-4 py-3">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground">{text}</p>;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    "in-network": "bg-success-soft text-ink",
    verifying: "bg-warm-soft text-warm-foreground",
    "out-of-network": "bg-warm-soft text-warm-foreground",
    unknown: "bg-muted text-muted-foreground",
  };
  const label = status.replace("-", " ");
  return <span className={["rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest", map[status] ?? ""].join(" ")}>{label}</span>;
}
