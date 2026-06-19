import { motion } from "framer-motion";
import { Check, Minus, Plus } from "lucide-react";
import type { Plan } from "@/mock/plans";

export function PlanCard({
  plan,
  needs,
  totalNeeds,
  index,
  compact = false,
  onAdd,
  onLearnMore,
  ctaLabel = "See in compare table",
}: {
  plan: Plan;
  needs: { id: string; label: string }[];
  totalNeeds: number;
  index: number;
  compact?: boolean;
  onAdd?: () => void;
  onLearnMore?: () => void;
  ctaLabel?: string;
}) {
  const matchCount = plan.matches.length;
  const isFullMatch = matchCount === totalNeeds;
  const matchPct = Math.round((matchCount / totalNeeds) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.35 }}
      className={`rounded-3xl border bg-card p-5 transition ${
        isFullMatch ? "border-primary/40 shadow-sm" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {plan.carrier} · {plan.type}
          </div>
          <div className="mt-1 font-display text-xl text-ink">{plan.name}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl text-ink">
            {plan.premium === 0 ? "$0" : `$${plan.premium}`}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">per month</div>
        </div>
      </div>

      {!compact && <p className="mt-3 text-sm text-muted-foreground">{plan.blurb}</p>}

      <div className="mt-4 flex items-center gap-2">
        <div
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${
            isFullMatch ? "bg-ink text-background" : "bg-primary-soft text-accent-foreground"
          }`}
        >
          <Check className="h-3 w-3" /> Matches {matchCount} of your {totalNeeds} things
        </div>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${isFullMatch ? "bg-ink" : "bg-primary"}`}
            style={{ width: `${matchPct}%` }}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Fits your needs</div>
        <ul className="mt-2 space-y-1.5">
          {needs.map((n) => {
            const hit = plan.matches.includes(n.id);
            const proof = plan.proofs[n.id];
            return (
              <li key={n.id} className="flex items-start gap-2 text-[13px]">
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                    hit ? "bg-ink text-background" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {hit ? <Check className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                </span>
                <div className="min-w-0">
                  <span className={hit ? "text-ink" : "text-muted-foreground line-through"}>{n.label}</span>
                  {hit && proof && <div className="text-[12px] text-muted-foreground">{proof}</div>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={onAdd}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition ${
            isFullMatch
              ? "bg-ink text-background hover:bg-ink/90"
              : "border border-border text-ink hover:border-primary/40"
          }`}
        >
          <Plus className="h-3.5 w-3.5" /> {ctaLabel}
        </button>
        {onLearnMore && (
          <button
            onClick={onLearnMore}
            className="rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-ink"
          >
            Learn more
          </button>
        )}
      </div>
    </motion.div>
  );
}
