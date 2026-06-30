import { useState } from "react";
import { Star, Sparkles, Heart, ChevronDown, ChevronUp } from "lucide-react";
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
};

export function PlanComparisonCard({ data }: { data: RecommendPlansInput }) {
  const { state, update } = useSession();
  const favorites = state.favoritePlans ?? [];

  const toggleFavorite = (plan: RecommendedPlan) => {
    const exists = favorites.some((p) => p.id === plan.id);
    const next = exists
      ? favorites.filter((p) => p.id !== plan.id)
      : [...favorites, plan];
    update({ favoritePlans: next });
  };

  return (
    <div className="mt-3 -mx-1 overflow-x-auto">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 px-1 min-w-[860px] lg:min-w-0">
        {data.plans.map((p) => {
          const r = data.rationale.find((x) => x.planId === p.id);
          const isFav = favorites.some((f) => f.id === p.id);
          return (
            <PlanTile
              key={p.id}
              plan={p}
              rationale={r}
              isFav={isFav}
              onToggleFavorite={() => toggleFavorite(p)}
            />
          );
        })}
      </div>
    </div>
  );
}

function PlanTile({
  plan: p,
  rationale: r,
  isFav,
  onToggleFavorite,
}: {
  plan: RecommendedPlan;
  rationale?: PlanRationale;
  isFav: boolean;
  onToggleFavorite: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const highlights = p.highlights ?? [];
  const visibleHighlights = expanded ? highlights : highlights.slice(0, 2);
  const reasons = r?.reasons ?? [];
  const visibleReasons = expanded ? reasons : reasons.slice(0, 2);

  return (
    <article className="rounded-xl border border-ink/10 bg-paper overflow-hidden flex flex-col h-full">
      <div className="p-3 border-b border-ink/10 relative">
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
          aria-pressed={isFav}
          title={isFav ? "Saved to Your Workspace" : "Save to Your Workspace"}
          className={`absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full border transition ${
            isFav
              ? "border-rose-200 bg-rose-50 text-rose-600"
              : "border-ink/15 bg-white text-ink/60 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>
        <div className="text-[10px] uppercase tracking-wide text-muted-2 truncate pr-9">
          {p.carrier} · {p.type}
        </div>
        <div className="font-serif text-sm leading-snug text-ink mt-0.5 pr-9 line-clamp-2 min-h-[2.5rem]">
          {p.name}
        </div>
        {typeof p.starRating === "number" && (
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 text-[11px] px-1.5 py-0.5">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            {p.starRating.toFixed(1)}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-b border-ink/10 bg-surface-soft/40">
        <div className="text-xl font-semibold text-ink leading-none">
          ${p.monthlyPremium}
          <span className="text-xs font-normal text-muted-2">/mo</span>
        </div>
        <div className="text-[11px] text-muted-2 mt-1">
          Max OOP <span className="font-medium text-ink">${p.maxOOP.toLocaleString()}</span>
        </div>
      </div>

      {visibleHighlights.length > 0 && (
        <ul className="px-3 py-2 text-[12px] space-y-1 border-b border-ink/10">
          {visibleHighlights.map((h, i) => (
            <li key={i} className="text-ink leading-snug flex gap-1.5">
              <span className="text-muted-2">•</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      )}

      {visibleReasons.length > 0 && (
        <div className="px-3 py-2 bg-surface-soft/40 flex-1">
          <div className="flex items-center gap-1 text-[10px] font-medium text-ink mb-1.5 uppercase tracking-wide">
            <Sparkles className="h-3 w-3" /> Why for you
          </div>
          <ul className="space-y-1 text-[12px]">
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
          className="px-3 py-2 text-[11px] font-medium text-accent hover:bg-surface-soft/60 border-t border-ink/10 inline-flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>
              Less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              See details <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </article>
  );
}
