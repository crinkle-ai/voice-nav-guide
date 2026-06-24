import { Link } from "@tanstack/react-router";
import { Sparkles, MessageCircle, ListChecks, Compass, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSession } from "@/lib/v3/session-store";
import {
  deriveNarrative,
  derivePlanFilters,
  hasAnyIntake,
} from "@/lib/workspace-derivations";
import { deriveLens, type LensKey } from "@/lib/recommended-path";
import { intakeCompleteness } from "@/lib/v3/intake-types";

const MODE_META: Record<
  string,
  { label: string; icon: LucideIcon }
> = {
  ramble: { label: "Ramble", icon: MessageCircle },
  structured: { label: "Step-by-step", icon: ListChecks },
  hybrid: { label: "Shop your way", icon: Compass },
};

const PATH_LABEL: Record<string, string> = {
  "doctor-first": "Keep my doctors",
  "drug-first": "Afford my meds",
  "budget-first": "Lowest cost",
  "new-to-medicare": "New to Medicare",
};

/**
 * Single, mode-agnostic handoff summary. Every intake mode (Ramble,
 * Structured, Shop Your Way) lands in the same shape: narrative,
 * recommended lens, top filters, and a CTA into matches.
 */
export function IntakeHandoffSummary({ compact = false }: { compact?: boolean }) {
  const { state, ready } = useSession();
  if (!ready || !hasAnyIntake(state.intake)) return null;

  const mode = state.sourceMode ?? state.mode ?? "ramble";
  const meta = MODE_META[mode] ?? MODE_META.ramble;
  const Icon = meta.icon;
  const pathLabel = state.hybridPath ? PATH_LABEL[state.hybridPath] : null;
  const pct = intakeCompleteness(state.intake);

  const narrative = deriveNarrative(state.intake);
  const filters = derivePlanFilters(state.intake).slice(0, 3);
  const recommended = deriveLens(state.intake, { hybridPath: state.hybridPath });
  const activeKey: LensKey =
    (state.lensOverride as LensKey | null) ?? recommended.key;
  const lensLabel =
    activeKey === recommended.key
      ? recommended.label
      : `${recommended.label} (you chose another lens)`;

  return (
    <div className={[
      "rounded-2xl border border-border bg-primary-soft/40",
      compact ? "p-4" : "p-5",
    ].join(" ")}>
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-accent-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2 py-0.5">
          <Icon className="h-3 w-3" /> {meta.label}
        </span>
        {pathLabel && (
          <span className="inline-flex items-center rounded-full bg-background/70 px-2 py-0.5">
            Path: {pathLabel}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5">
          <Sparkles className="h-3 w-3" /> {pct}% captured
        </span>
      </div>

      {narrative && (
        <p className={["mt-3 leading-relaxed text-ink", compact ? "text-[13px]" : "text-sm"].join(" ")}>
          {narrative}
        </p>
      )}

      <div className="mt-3 text-xs text-ink-soft">
        <span className="font-medium text-ink">Plan lens:</span> {lensLabel}
      </div>

      {filters.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <li
              key={f.id}
              className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-ink-soft"
            >
              {f.label}
            </li>
          ))}
        </ul>
      )}

      {!compact && (
        <Link
          to="/my-matches"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-medium text-background hover:bg-ink/90"
        >
          See my matches <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
