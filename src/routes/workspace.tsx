import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { usePersonaStore } from "@/state/usePersonaStore";
import { persona, activities } from "@/mock/personas";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Sparkles, X, Filter, Clock, Stethoscope, Pill, GitCompare, Clipboard, Plane, Scale, BookOpen, Users, ClipboardCheck, ThumbsUp, ListChecks, FileSearch, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityId } from "@/mock/personas";
import { AboutMoreRamble } from "@/components/about-more-ramble";

export const Route = createFileRoute("/workspace")({
  head: () => ({ meta: [{ title: "My Medicare Workspace" }] }),
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const matches = useMatches();
  const onChild = matches.some((m) => m.routeId.includes("activity"));

  return (
    <AppShell>
      {onChild ? <Outlet /> : <WorkspaceHome />}
    </AppShell>
  );
}

function WorkspaceHome() {
  const steps = usePersonaStore((s) => s.route);
  const questions = usePersonaStore((s) => s.questions);
  const lastToast = usePersonaStore((s) => s.lastToast);
  const clearToast = usePersonaStore((s) => s.clearToast);

  const requiredSteps = steps.filter((s) => !s.optional);
  const current =
    steps.find((s) => s.status === "current" && !s.optional) ??
    requiredSteps.find((s) => s.status !== "completed");
  const completedCount = requiredSteps.filter((s) => s.status === "completed").length;

  return (
    <div className="mx-auto max-w-xl px-5 pb-12 pt-8">
      <AnimatePresence>
        {lastToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex items-start gap-3 rounded-2xl border border-warm/40 bg-warm-soft p-3 text-sm text-warm-foreground"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Rerouting</div>
              <div className="text-warm-foreground/90">{lastToast}</div>
            </div>
            <button onClick={clearToast} className="text-warm-foreground/70 hover:text-warm-foreground"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <header>
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Medicare Workspace</div>
        <h1 className="mt-1 font-display text-2xl text-ink">{persona.name}</h1>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="mt-6 rounded-3xl border border-border bg-primary-soft/40 p-5"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-accent-foreground">
          <Sparkles className="h-3 w-3" /> Here's what I'm hearing
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-ink">
          {persona.narrativeMirror}
        </p>
      </motion.section>

      {current && (() => {
        const meta = activities[current.activity];
        return (
          <motion.section
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="mt-8 rounded-3xl border border-border bg-card p-6"
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Your next step</div>
            <h2 className="mt-2 font-display text-[26px] leading-tight text-ink">{current.label}</h2>
            <div className="mt-1 text-sm text-muted-foreground">About {current.estMinutes} min</div>
            {meta && (
              <div className="mt-4 space-y-2">
                <p className="text-[14px] leading-relaxed text-ink-soft">{meta.objective}</p>
                <p className="text-[13px] leading-relaxed text-muted-foreground"><span className="font-medium text-ink-soft">Why it matters: </span>{meta.whyItMatters}</p>
              </div>
            )}
            <Link
              to="/workspace/activity/$activityId"
              params={{ activityId: current.activity }}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-background hover:bg-ink/90"
            >
              Start <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.section>
        );
      })()}

      <section className="mt-10">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="font-display text-[22px] leading-tight text-ink">What will shape your route</h3>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{requiredSteps.length} steps</span>
        </div>
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
          Things to do — these become your personalized path.
        </p>
        <ol className="space-y-3">
          {requiredSteps.map((s) => {
            const completed = s.status === "completed";
            const isCurrent = s.status === "current";
            const meta = activities[s.activity];
            const Icon = iconForActivity(s.activity);
            return (
              <li key={s.id}>
                <Link
                  to="/workspace/activity/$activityId"
                  params={{ activityId: s.activity }}
                  className={[
                    "group flex items-center gap-4 rounded-2xl border px-4 py-4 transition",
                    isCurrent
                      ? "border-primary/40 bg-primary-soft/50"
                      : completed
                        ? "border-border/70 bg-card"
                        : "border-border bg-card hover:border-primary/30 hover:bg-primary-soft/30",
                  ].join(" ")}
                >
                  <span className={[
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                    completed ? "bg-success-soft text-success" : "bg-primary-soft text-primary",
                  ].join(" ")}>
                    {completed ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" strokeWidth={1.75} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={[
                      "block text-[15px] font-medium leading-tight",
                      completed ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-ink",
                    ].join(" ")}>
                      {s.label}
                    </span>
                    <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
                      {meta?.objective ?? "Open to see what this step covers."}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {s.estMinutes}m
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {persona.needs.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-3 text-[13px] font-medium text-ink">What matters to you</h3>
          <ul className="flex flex-wrap gap-2">
            {persona.needs.map((n) => (
              <li key={n.id} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-ink-soft">
                {n.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      {persona.planFilters.length > 0 && (
        <section className="mt-10">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="font-display text-[22px] leading-tight text-ink">What to look for in a plan</h3>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{persona.planFilters.length} signals</span>
          </div>
          <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
            Signals we'll use to filter plan results when you're ready to shop.
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {persona.planFilters.map((f) => (
              <li key={f.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-2 text-[14px] font-medium text-ink">
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  {f.label}
                </div>
                <div className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{f.hint}</div>
              </li>
            ))}
          </ul>
          <Link
            to="/plans"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-background hover:bg-ink/90"
          >
            Show me plans that fit <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}

      {persona.doctors.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-3 text-[13px] font-medium text-ink">Your doctors</h3>
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
        </section>
      )}

      {persona.medications.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-3 text-[13px] font-medium text-ink">Your medications</h3>
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
        </section>
      )}

      {questions.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-3 text-[13px] font-medium text-ink">Open questions</h3>
          <ul className="space-y-1.5">
            {questions.map((q) => (
              <li key={q.id} className="text-sm text-ink-soft">— {q.text}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <AboutMoreRamble />
      </section>
    </div>
  );
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
