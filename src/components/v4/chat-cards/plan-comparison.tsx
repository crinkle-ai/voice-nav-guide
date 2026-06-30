import { useState } from "react";
import { Sparkles, Heart, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { useSession } from "@/lib/v4/session-store";

export type RecommendedPlan = {
  id: string;
  name: string;
  carrier: string;
  type: string;
  monthlyPremium: number;
  maxOOP: number;
  starRating?: number;
  highlights?: string[];
};

export type PlanRationale = {
  planId: string;
  reasons: { label: string; detail: string; sourceField?: string }[];
};

export type RecommendPlansInput = {
  plans: RecommendedPlan[];
  rationale: PlanRationale[];
  recommendedPlanId?: string;
  confidence?: number;
};

export function PlanComparisonCard({ data }: { data: RecommendPlansInput }) {
  const { state, update } = useSession();
  const favorites = state.favoritePlans ?? [];
  const recommendedId = data.recommendedPlanId ?? data.plans[0]?.id;
  const confidence = data.confidence;
  const hasRecommendation = !!recommendedId && typeof confidence === "number" && confidence >= 80;

  const toggleFavorite = (plan: RecommendedPlan) => {
    const exists = favorites.some((p) => p.id === plan.id);
    const next = exists
      ? favorites.filter((p) => p.id !== plan.id)
      : [...favorites, plan];
    update({ favoritePlans: next });
  };

  return (
    <div className="mt-3">
      {hasRecommendation && (
        <div className="mb-3 flex items-center gap-3 px-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#033592]">
            <ShieldCheck className="h-4 w-4" /> Recommendation Confidence
          </div>
          <div className="flex-1 h-1.5 rounded-full bg-[#033592]/10 overflow-hidden max-w-[180px]">
            <div className="h-full bg-[#033592] transition-all" style={{ width: `${confidence}%` }} />
          </div>
          <div className="text-sm font-semibold text-[#033592] tabular-nums">{confidence}%</div>
        </div>
      )}
      <div className="-mx-1 overflow-x-auto">
        <div className="flex gap-4 px-1 items-stretch">
          {data.plans.map((p) => {
            const r = data.rationale.find((x) => x.planId === p.id);
            const isFav = favorites.some((f) => f.id === p.id);
            const isRecommended = hasRecommendation && p.id === recommendedId;
            return (
              <PlanTile
                key={p.id}
                plan={p}
                rationale={r}
                isFav={isFav}
                isRecommended={isRecommended}
                deemphasize={hasRecommendation && !isRecommended}
                onToggleFavorite={() => toggleFavorite(p)}
                className="flex-1 min-w-[220px]"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlanTile({
  plan: p,
  rationale: r,
  isFav,
  isRecommended,
  deemphasize,
  onToggleFavorite,
  className,
}: {
  plan: RecommendedPlan;
  rationale?: PlanRationale;
  isFav: boolean;
  isRecommended?: boolean;
  deemphasize?: boolean;
  onToggleFavorite: () => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const highlights = p.highlights ?? [];
  const visibleHighlights = expanded ? highlights : highlights.slice(0, 2);
  const reasons = r?.reasons ?? [];
  const visibleReasons = expanded ? reasons : reasons.slice(0, 2);

  const borderCls = isRecommended
    ? "border-[3px] border-[#033592] shadow-[0_0_0_4px_rgba(3,53,146,0.12),0_12px_32px_-8px_rgba(3,53,146,0.35)]"
    : deemphasize
      ? "border border-ink/10 opacity-70"
      : "border border-ink/10";

  return (
    <article className={`relative rounded-xl ${borderCls} bg-paper overflow-hidden flex flex-col h-full ${className}`}>
      {isRecommended && (
        <div className="absolute -top-2 right-3 z-10 rounded-full bg-[#033592] text-white text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 shadow">
          Recommended
        </div>
      )}
      <div className="p-4 border-b border-ink/10 relative">
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
          aria-pressed={isFav}
          title={isFav ? "Saved to Your Workspace" : "Save to Your Workspace"}
          className={`absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
            isFav
              ? "border-rose-200 bg-rose-50 text-rose-600"
              : "border-ink/15 bg-white text-ink/60 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
          }`}
        >
          <Heart className={`h-4 w-4 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>
        <div className="text-[11px] uppercase tracking-wide text-muted-2 truncate pr-10">
          {p.carrier} · {p.type}
        </div>
        <div className="font-serif text-base leading-snug text-ink mt-0.5 pr-10 break-words">
          {p.name}
        </div>
      </div>

      <div className="px-4 py-3 border-b border-ink/10 bg-surface-soft/40">
        <div className="text-2xl font-semibold text-ink leading-none">
          ${p.monthlyPremium}
          <span className="text-sm font-normal text-muted-2">/mo</span>
        </div>
        <div className="text-xs text-muted-2 mt-1">
          Max OOP <span className="font-medium text-ink">${p.maxOOP.toLocaleString()}</span>
        </div>
      </div>

      {visibleHighlights.length > 0 && (
        <ul className="px-4 py-3 text-sm space-y-1.5 border-b border-ink/10">
          {visibleHighlights.map((h, i) => (
            <li key={i} className="text-ink leading-snug flex gap-1.5">
              <span className="text-muted-2">•</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      )}

      {visibleReasons.length > 0 && (
        <div className="px-4 py-3 bg-surface-soft/40 flex-1">
          <div className="flex items-center gap-1 text-[11px] font-medium text-ink mb-2 uppercase tracking-wide">
            <Sparkles className="h-4 w-4" /> Why for you
          </div>
          <ul className="space-y-1.5 text-sm">
            {visibleReasons.map((reason, i) => (
              <li key={i} className="leading-snug">
                <span
                  className="font-medium text-ink"
                  title={reason.detail}
                >
                  {reason.label}
                </span>
                {expanded && (
                  <span className="text-muted-2"> — {reason.detail}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(highlights.length > 2 || reasons.length > 2) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="px-4 py-3 text-xs font-medium text-accent hover:bg-surface-soft/60 border-t border-ink/10 inline-flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>
              Less <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              See details <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </article>
  );
}
