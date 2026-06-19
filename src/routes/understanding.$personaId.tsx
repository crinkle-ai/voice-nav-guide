import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Compass,
  Shield,
  Wallet,
  Headset,
  Stethoscope,
  Pill,
  Plane,
  Scale,
  GitCompare,
  CheckCircle2,
  FileSearch,
  Sparkles,
  BookOpen,
  Users,
  ListChecks,
  Clipboard,
  ThumbsUp,
  Clock,
  Filter,
  type LucideIcon,
} from "lucide-react";
import { getPersona, type RouteDriver } from "@/mock/personas";
import { PersonaAvatar } from "@/components/workspace-card";
import { BackRow } from "@/components/back-row";
import { AppShell } from "@/components/app-shell";
import { AboutMoreRamble } from "@/components/about-more-ramble";

export const Route = createFileRoute("/understanding/$personaId")({
  head: () => ({ meta: [{ title: "Here's what I'm hearing · Medicare Decision Companion" }] }),
  component: () => (
    <AppShell>
      <Understanding />
    </AppShell>
  ),
});

const iconMap: Record<RouteDriver["icon"], LucideIcon> = {
  compass: Compass,
  shield: Shield,
  wallet: Wallet,
  headset: Headset,
  stethoscope: Stethoscope,
  pill: Pill,
  plane: Plane,
  scale: Scale,
  "git-compare": GitCompare,
  "check-circle": CheckCircle2,
  "file-search": FileSearch,
  book: BookOpen,
  users: Users,
  "list-checks": ListChecks,
  clipboard: Clipboard,
  "thumbs-up": ThumbsUp,
};

type CtaTarget =
  | "/plans/$personaId"
  | "/workspace/$personaId"
  | "/compare/$personaId";

function Understanding() {
  const { personaId } = Route.useParams();
  const persona = getPersona(personaId);

  const drivers = persona.routeDrivers;
  const filters = persona.planFilters;
  const filtersSparse = filters.length <= 2;

  const cta: {
    label: string;
    to: CtaTarget;
    secondary: { label: string; to: CtaTarget };
  } = (() => {
    switch (persona.id) {
      case "robert":
        return {
          label: "Show me plans that fit",
          to: "/plans/$personaId",
          secondary: { label: "Open my workspace", to: "/workspace/$personaId" },
        };
      case "susan":
        return {
          label: "Compare my final options",
          to: "/compare/$personaId",
          secondary: { label: "Open my workspace", to: "/workspace/$personaId" },
        };
      case "linda":
      default:
        return {
          label: "Open my workspace",
          to: "/workspace/$personaId",
          secondary: { label: "Browse plans anyway", to: "/plans/$personaId" },
        };
    }
  })();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-5 pb-16 pt-6">
        <BackRow backTo="/ramble/$personaId" backLabel="Back to what you said" personaId={persona.id} />

        <div className="mt-6 flex items-center gap-3">
          <PersonaAvatar name={persona.name} hue={persona.hue} size={36} />
          <div className="text-xs text-muted-foreground">
            For <span className="text-ink">{persona.name}</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="mt-6"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-accent-foreground">
            <Sparkles className="h-3 w-3" /> Here's what I'm hearing
          </div>
          <p className="mt-4 font-display text-[26px] leading-[1.25] text-ink">
            {persona.narrativeMirror}
          </p>
        </motion.div>

        {/* Bucket 1 — Route drivers */}
        <section className="mt-10">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="font-display text-lg text-ink">What will shape your route</h2>
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {drivers.length} step{drivers.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mb-3 text-[13px] text-muted-foreground">
            Things to do — these become your personalized path.
          </p>
          <ul className="space-y-2.5">
            {drivers.map((d, i) => {
              const Icon = iconMap[d.icon];
              return (
                <motion.li
                  key={d.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.04, duration: 0.3 }}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-accent-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-medium text-ink">{d.label}</div>
                    <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{d.hint}</p>
                  </div>
                  <div className="mt-1 flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" /> {d.estMinutes}m
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </section>

        {/* Bucket 2 — Plan filters */}
        <section className="mt-10">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="font-display text-lg text-ink">What to look for in a plan</h2>
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {filters.length} signal{filters.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mb-3 text-[13px] text-muted-foreground">
            {filtersSparse
              ? "You haven't told me enough to narrow plans yet — and that's okay. We'll add filters as you learn."
              : "Signals we'll use to filter plan results when you're ready to shop."}
          </p>
          {filters.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-transparent p-4 text-[13px] text-muted-foreground">
              Nothing specific yet.
            </div>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {filters.map((f, i) => (
                <motion.li
                  key={f.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.04, duration: 0.3 }}
                  className="rounded-2xl border border-border bg-card px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                    <Filter className="h-3 w-3 text-accent-foreground" />
                    {f.label}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">{f.hint}</div>
                </motion.li>
              ))}
            </ul>
          )}
        </section>

        <Link
          to={cta.to} params={{ personaId: persona.id }}
          className="mt-10 flex items-center justify-center gap-2 rounded-full bg-ink py-4 font-medium text-background hover:bg-ink/90"
        >
          {cta.label} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to={cta.secondary.to} params={{ personaId: persona.id }}
          className="mt-3 flex items-center justify-center text-sm text-muted-foreground hover:text-ink"
        >
          {cta.secondary.label}
        </Link>
        <div className="mt-10">
          <AboutMoreRamble personaId={persona.id} />
        </div>
      </div>
    </div>
  );
}