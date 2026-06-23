import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sparkles, ChevronLeft, ChevronDown, Clock, Filter, ArrowRight, Heart,
  CheckCircle2, Stethoscope, Pill, GitCompare, Clipboard, Plane, Scale,
  BookOpen, Users, ClipboardCheck, ThumbsUp, ListChecks, FileSearch, Compass,
  Route as RouteIcon, HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AboutMoreRamble } from "@/components/about-more-ramble";
import { persona, activities } from "@/mock/personas";
import type { ActivityId } from "@/mock/personas";
import { usePersonaStore } from "@/state/usePersonaStore";

export function AboutYouDrawer() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = sessionStorage.getItem("about-you-drawer-hint");
      if (!seen) {
        setPulse(true);
        sessionStorage.setItem("about-you-drawer-hint", "1");
        const t = setTimeout(() => setPulse(false), 4200);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const steps = usePersonaStore((s) => s.route);
  const questions = usePersonaStore((s) => s.questions);
  const requiredSteps = steps.filter((s) => !s.optional);

  return (
    <>
      <button
        type="button"
        onClick={() => { setPulse(false); setOpen(true); }}
        aria-label="Open About you"
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
            <Sparkles className="h-3 w-3" /> About you
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
              <Sparkles className="h-3 w-3" /> About you
            </div>
            <SheetTitle className="font-display text-2xl text-ink">{persona.name}</SheetTitle>
            <SheetDescription>
              Your living workspace — everything we've learned, always within reach.
            </SheetDescription>
          </SheetHeader>

          <div className="px-5 py-5 space-y-5">
            {/* Narrative mirror */}
            <div className="rounded-2xl border border-border bg-primary-soft/40 p-4">
              <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-accent-foreground">
                <Sparkles className="h-3 w-3" /> Here's what I'm hearing
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-ink">{persona.narrativeMirror}</p>
            </div>

            {/* Add more about you */}
            <AboutMoreRamble />

            {/* Collapsible sections */}
            <Section
              icon={RouteIcon}
              title="What will shape your route"
              count={`${requiredSteps.length} steps`}
              defaultOpen
              onNavigate={() => setOpen(false)}
            >
              {requiredSteps.length === 0 ? (
                <Empty text="No steps yet — share a bit about you above." />
              ) : (
                <ol className="space-y-2">
                  {requiredSteps.map((s) => {
                    const completed = s.status === "completed";
                    const isCurrent = s.status === "current";
                    const meta = activities[s.activity];
                    const Icon = iconForActivity(s.activity);
                    return (
                      <li key={s.id}>
                        <Link
                          to={s.activity === "compare-plans" ? "/compare-plans" : "/workspace/activity/$activityId"}
                          params={s.activity === "compare-plans" ? undefined : { activityId: s.activity }}
                          onClick={() => setOpen(false)}
                          className={[
                            "group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                            isCurrent
                              ? "border-primary/40 bg-primary-soft/50"
                              : "border-border bg-card hover:border-primary/30 hover:bg-primary-soft/30",
                          ].join(" ")}
                        >
                          <span className={[
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                            completed ? "bg-success-soft text-success" : "bg-primary-soft text-primary",
                          ].join(" ")}>
                            {completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" strokeWidth={1.75} />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className={[
                              "block text-[13.5px] font-medium leading-tight",
                              completed ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-ink",
                            ].join(" ")}>
                              {s.label}
                            </span>
                            <span className="mt-0.5 block truncate text-[12px] leading-snug text-muted-foreground">
                              {meta?.objective ?? "Open to see what this step covers."}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {s.estMinutes}m
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Section>

            <Section
              icon={Filter}
              title="What to look for in a plan"
              count={persona.planFilters.length ? `${persona.planFilters.length} signals` : undefined}
            >
              {persona.planFilters.length === 0 ? (
                <Empty text="No signals yet." />
              ) : (
                <>
                  <ul className="grid grid-cols-1 gap-2">
                    {persona.planFilters.map((f) => (
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

            <Section
              icon={Stethoscope}
              title="Your doctors"
              count={persona.doctors.length ? `${persona.doctors.length}` : undefined}
            >
              {persona.doctors.length === 0 ? (
                <Empty text="No doctors added yet." />
              ) : (
                <ul className="space-y-2">
                  {persona.doctors.map((d) => (
                    <li key={d.id} className="rounded-xl border border-border bg-card px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-ink">{d.name}</div>
                        <StatusPill status={d.status} />
                      </div>
                      <div className="text-xs text-muted-foreground">{d.specialty} · {d.location}</div>
                    </li>
                  ))}
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

            <Section
              icon={Pill}
              title="Your medications"
              count={persona.medications.length ? `${persona.medications.length}` : undefined}
            >
              {persona.medications.length === 0 ? (
                <Empty text="No medications added yet." />
              ) : (
                <ul className="space-y-2">
                  {persona.medications.map((m) => (
                    <li key={m.id} className="rounded-xl border border-border bg-card px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-ink">{m.name}</div>
                        {m.tier && <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.tier}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.dosage} · {m.frequency}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section icon={Heart} title="Saved plans">
              <p className="text-xs text-muted-foreground">
                Plans you've saved for later live in My Plans.
              </p>
              <Link
                to="/my-plans"
                onClick={() => setOpen(false)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open My Plans <ArrowRight className="h-3 w-3" />
              </Link>
            </Section>

            <Section
              icon={HelpCircle}
              title="Open questions"
              count={questions.length ? `${questions.length}` : undefined}
            >
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

function Section({
  icon: Icon,
  title,
  count,
  defaultOpen = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count?: string;
  defaultOpen?: boolean;
  onNavigate?: () => void;
  children: ReactNode;
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

const ACTIVITY_ICONS: Partial<Record<ActivityId, LucideIcon>> = {
  "verify-doctors": Stethoscope,
  "review-prescriptions": Pill,
  "compare-plans": GitCompare,
  "compare-final-plans": GitCompare,
  "compare-coverage-models": GitCompare,
  enroll: Clipboard,
  "enrollment-review": Clipboard,
  "enrollment-readiness": ClipboardCheck,
  "evaluate-travel": Plane,
  "review-costs": Scale,
  "evaluate-tradeoffs": Scale,
  "medicare-basics": BookOpen,
  "learn-plan-types": BookOpen,
  "dental-vision": BookOpen,
  "speak-expert": Users,
  "expert-review": Users,
  "spousal-coordination": Users,
  "spouse-future-enrollment": ListChecks,
  "confidence-review": ThumbsUp,
};

function iconForActivity(id: ActivityId): LucideIcon {
  return ACTIVITY_ICONS[id] ?? FileSearch;
}

// Keep Compass import used to avoid TS unused warnings
void Compass;
