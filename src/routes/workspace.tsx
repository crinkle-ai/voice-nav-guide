import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { usePersonaStore } from "@/state/usePersonaStore";
import { persona } from "@/mock/personas";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Sparkles, X, Filter } from "lucide-react";
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

      {current && (
        <motion.section
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="mt-8 rounded-3xl border border-border bg-card p-6"
        >
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Your next step</div>
          <h2 className="mt-2 font-display text-[26px] leading-tight text-ink">{current.label}</h2>
          <div className="mt-1 text-sm text-muted-foreground">About {current.estMinutes} min</div>
          <Link
            to="/workspace/activity/$activityId"
            params={{ activityId: current.activity }}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-background hover:bg-ink/90"
          >
            Start <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[13px] font-medium text-ink">Your route</h3>
          <span className="text-[11px] text-muted-foreground">{completedCount} of {requiredSteps.length}</span>
        </div>
        <ol className="space-y-1.5">
          {requiredSteps.map((s) => {
            const completed = s.status === "completed";
            const isCurrent = s.status === "current";
            return (
              <li key={s.id}>
                <Link
                  to="/workspace/activity/$activityId"
                  params={{ activityId: s.activity }}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                    isCurrent ? "bg-primary-soft text-ink" : "hover:bg-muted/60",
                  ].join(" ")}
                >
                  <span className={[
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                    completed ? "bg-success text-white" : isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  ].join(" ")}>
                    {completed ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className={[
                    "flex-1",
                    completed ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-ink",
                  ].join(" ")}>
                    {s.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{s.estMinutes}m</span>
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
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-[13px] font-medium text-ink">Plan signals</h3>
            <span className="text-[11px] text-muted-foreground">{persona.planFilters.length} signal{persona.planFilters.length === 1 ? "" : "s"}</span>
          </div>
          <p className="mb-3 text-[12.5px] text-muted-foreground">
            We'll use these to filter plans when you're ready to shop.
          </p>
          <ul className="flex flex-wrap gap-2">
            {persona.planFilters.map((f) => (
              <li key={f.id} className="rounded-2xl border border-border bg-card px-3 py-2">
                <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
                  <Filter className="h-3 w-3 text-accent-foreground" />
                  {f.label}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{f.hint}</div>
              </li>
            ))}
          </ul>
          <Link
            to="/plans"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-background hover:bg-ink/90"
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
