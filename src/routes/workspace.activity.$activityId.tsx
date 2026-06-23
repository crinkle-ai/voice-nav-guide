import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Clock, TrendingUp } from "lucide-react";
import { activities, persona } from "@/mock/personas";
import { usePersonaStore } from "@/state/usePersonaStore";

export const Route = createFileRoute("/workspace/activity/$activityId")({
  head: ({ params }) => ({ meta: [{ title: `${activities[params.activityId as keyof typeof activities]?.title ?? "Activity"} · Workspace` }] }),
  component: ActivityDetail,
});

function ActivityDetail() {
  const { activityId } = Route.useParams();
  const activity = activities[activityId as keyof typeof activities];
  const navigate = useNavigate();
  const complete = usePersonaStore((s) => s.completeActivity);
  const step = usePersonaStore((s) => s.route.find((x) => x.activity === activityId));

  if (!activity) return <div className="p-8">Unknown activity.</div>;

  const onComplete = () => {
    complete(activity.id);
    navigate({ to: "/" });
  };

  const isCompleted = step?.status === "completed";

  return (
    <div className="mx-auto max-w-xl px-5 pb-8 pt-6">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back home
      </Link>

      <div className="mt-5 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary">
        Activity · {isCompleted ? "Completed" : step?.status === "current" ? "You are here" : "Upcoming"}
      </div>
      <h1 className="mt-2 font-display text-3xl text-ink">{activity.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{activity.objective}</p>

      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        <Chip icon={<Clock className="h-3.5 w-3.5" />}>{activity.estMinutes} min</Chip>
        {step && <Chip icon={<TrendingUp className="h-3.5 w-3.5" />}>+{step.confidenceImpact} confidence</Chip>}
      </div>

      <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="mt-6 rounded-3xl border border-warm/40 bg-warm-soft p-5">
        <div className="text-[11px] uppercase tracking-widest text-warm-foreground/80">Why this matters for {persona.name}</div>
        <p className="mt-2 text-[15px] leading-relaxed text-warm-foreground">{activity.whyItMatters}</p>
      </motion.section>

      <ActivityBody kind={activity.kind} />

      {!isCompleted ? (
        <button onClick={onComplete} className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-4 font-medium text-background hover:bg-ink/90">
          <Check className="h-4 w-4" /> Mark complete and continue
        </button>
      ) : (
        <Link to="/" className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-4 font-medium text-ink hover:border-primary/40">
          Back home
        </Link>
      )}
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-ink-soft">{icon}{children}</span>;
}

function ActivityBody({ kind }: { kind: string }) {
  if (kind === "lesson") {
    return (
      <div className="mt-5 space-y-3">
        {["Part A — Hospital", "Part B — Doctors & outpatient", "Part C — Medicare Advantage (combines A+B, often D)", "Part D — Prescription drugs"].map((t) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <div className="font-display text-base text-ink">{t}</div>
            <p className="mt-1 text-sm text-muted-foreground">Short, plain-language explanation tailored to what {persona.name} cares about.</p>
          </div>
        ))}
      </div>
    );
  }
  if (kind === "doctors") {
    return (
      <div className="mt-5 space-y-3">
        <div className="rounded-2xl border border-primary/30 bg-primary-soft/40 p-5">
          <div className="font-display text-base text-ink">Find &amp; verify a doctor</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Search for your doctor, save the ones you want to keep, and we'll check them against every plan you compare.
          </p>
          <Link
            to="/find-doctors"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-background hover:bg-ink/90"
          >
            Open doctor finder <ArrowLeft className="h-4 w-4 rotate-180" />
          </Link>
        </div>
        {persona.doctors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            No doctors added yet — we'll help you add the ones that matter most.
          </div>
        ) : persona.doctors.map((d) => (
          <div key={d.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-ink">{d.name}</div>
              <span className="text-[10px] uppercase tracking-widest text-success">{d.status === "in-network" ? "Confirmed in-network" : "Verifying coverage"}</span>
            </div>
            <div className="text-xs text-muted-foreground">{d.specialty} · {d.location}</div>
          </div>
        ))}
      </div>
    );
  }
  if (kind === "medications") {
    return (
      <div className="mt-5 space-y-3">
        {persona.medications.map((m) => (
          <div key={m.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-ink">{m.name} <span className="text-muted-foreground">· {m.dosage}</span></div>
              {m.tier && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{m.tier}</span>}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Estimated monthly cost: <span className="text-ink">$8–$24</span> depending on plan formulary.</div>
          </div>
        ))}
      </div>
    );
  }
  if (kind === "compare") {
    return (
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { name: "BlueShield Choice PPO", premium: "$28/mo", moop: "$5,900", net: "Broad" },
          { name: "AARP MedicareComplete HMO", premium: "$0/mo", moop: "$4,200", net: "Local" },
        ].map((p) => (
          <div key={p.name} className="rounded-2xl border border-border bg-card p-4">
            <div className="font-display text-base text-ink">{p.name}</div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row k="Premium" v={p.premium} />
              <Row k="Out-of-pocket max" v={p.moop} />
              <Row k="Network" v={p.net} />
            </dl>
          </div>
        ))}
      </div>
    );
  }
  if (kind === "travel") {
    return (
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="font-display text-base text-ink">Coverage by state</div>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-center justify-between"><span>Minnesota</span><span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] uppercase tracking-widest text-ink">Full coverage</span></li>
          <li className="flex items-center justify-between"><span>Arizona</span><span className="rounded-full bg-warm-soft px-2 py-0.5 text-[10px] uppercase tracking-widest text-warm-foreground">Routine only</span></li>
        </ul>
      </div>
    );
  }
  if (kind === "expert") {
    return (
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="font-display text-base text-ink">Book a 20-minute call</div>
        <p className="mt-1 text-sm text-muted-foreground">A licensed advisor will walk through your situation. No sales pitch.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Today 2:30 PM", "Tomorrow 10:00 AM", "Tomorrow 4:15 PM"].map((s) => (
            <button key={s} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-primary/40">{s}</button>
          ))}
        </div>
      </div>
    );
  }
  if (kind === "tradeoffs") {
    return (
      <div className="mt-5 space-y-3">
        {[
          { a: "Lower monthly premium", b: "Higher out-of-pocket max", lean: "B" },
          { a: "Wider network", b: "Slightly higher cost", lean: "A" },
        ].map((t, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span>{t.a}</span><span className="text-muted-foreground">vs.</span><span>{t.b}</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Based on what you told us, this leans toward <span className="text-ink">option {t.lean}</span>.</div>
          </div>
        ))}
      </div>
    );
  }
  if (kind === "confidence" || kind === "readiness") {
    return (
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="font-display text-base text-ink">A quick check before you commit</div>
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Doctors confirmed</li>
          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Medications covered at expected tier</li>
          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Costs reviewed end-to-end</li>
        </ul>
      </div>
    );
  }
  if (kind === "enroll") {
    return (
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="font-display text-base text-ink">Enrollment checklist</div>
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          <li>· Medicare number</li>
          <li>· Effective date confirmation</li>
          <li>· Payment method</li>
        </ul>
      </div>
    );
  }
  return null;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-ink">{v}</dd>
    </div>
  );
}
