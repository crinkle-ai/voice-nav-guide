import { Star, Sparkles } from "lucide-react";

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
  return (
    <div className="mt-3 space-y-3">
      {data.plans.map((p) => {
        const r = data.rationale.find((x) => x.planId === p.id);
        return (
      <article key={p.id} className="rounded-xl border border-ink/10 bg-paper overflow-hidden">
        <div className="p-4 border-b border-ink/10 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-2">{p.carrier} · {p.type}</div>
            <div className="font-serif text-lg leading-tight text-ink">{p.name}</div>
          </div>
          {typeof p.starRating === "number" && (
            <div className="flex items-center gap-1 text-amber-600 text-sm">
              <Star className="h-4 w-4 fill-amber-500" /> {p.starRating.toFixed(1)}
            </div>
          )}
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-2 text-sm border-b border-ink/10 bg-surface-soft/40">
          <div><span className="text-muted-2">Premium</span> <span className="font-medium text-ink">${p.monthlyPremium}/mo</span></div>
          <div><span className="text-muted-2">Max out-of-pocket</span> <span className="font-medium text-ink">${p.maxOOP.toLocaleString()}</span></div>
        </div>

            {p.highlights && p.highlights.length > 0 && (
              <ul className="px-4 py-3 text-sm space-y-1 border-b border-line">
                {p.highlights.map((h, i) => (
                  <li key={i} className="text-ink">• {h}</li>
                ))}
              </ul>
            )}
            {r && r.reasons.length > 0 && (
              <div className="px-4 py-3 bg-accent-soft/40">
                <div className="flex items-center gap-1.5 text-xs font-medium text-accent mb-2 uppercase tracking-wide">
                  <Sparkles className="h-3.5 w-3.5" /> Why we recommend this for you
                </div>
                <ul className="space-y-1.5 text-sm">
                  {r.reasons.map((reason, i) => (
                    <li key={i} className="leading-snug">
                      <span className="font-medium">{reason.label}.</span>{" "}
                      <span className="text-muted-2">{reason.detail}</span>
                      {reason.sourceField && (
                        <span className="ml-1 text-[10px] uppercase tracking-wide text-accent/70">
                          [{reason.sourceField}]
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
