import { useEffect, useState } from "react";
import { Sparkles, Heart, ChevronDown, ChevronUp, ShieldCheck, Plus, Stethoscope, Pill, HeartHandshake, FileSignature } from "lucide-react";
import { useSession } from "@/lib/v4/session-store";
import { useStartEnrollment } from "@/lib/v4/enrollment-dialog-store";

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

export type CoverageStrategy = "medicare-advantage" | "medigap-plus-partd" | "dsnp";

export type RecommendPlansInput = {
  plans: RecommendedPlan[];
  rationale: PlanRationale[];
  recommendedPlanId?: string;
  pairedPlanId?: string;
  strategy?: CoverageStrategy;
  strategyRationale?: string;
  confidence?: number;
};

export function PlanComparisonCard({ data }: { data: RecommendPlansInput }) {
  const { state, update } = useSession();
  const startEnrollment = useStartEnrollment();
  const favorites = state.favoritePlans ?? [];
  const recommendedId = data.recommendedPlanId ?? data.plans[0]?.id;
  const pairedId = data.pairedPlanId;
  const confidence = data.confidence;
  const hasRecommendation = !!recommendedId && typeof confidence === "number" && confidence >= 80;
  const strategy: CoverageStrategy =
    data.strategy ??
    (pairedId ? "medigap-plus-partd" : "medicare-advantage");
  const isPaired = strategy === "medigap-plus-partd" && !!pairedId;

  const initialSelectedId = recommendedId ?? data.plans[0]?.id;
  const [selectedId, setSelectedId] = useState<string | undefined>(initialSelectedId);
  useEffect(() => {
    setSelectedId(initialSelectedId);
  }, [initialSelectedId]);

  const recommendedPlan = data.plans.find((p) => p.id === recommendedId);
  const pairedPlan = isPaired ? data.plans.find((p) => p.id === pairedId) : undefined;
  const runners = data.plans.filter(
    (p) => p.id !== recommendedId && (!isPaired || p.id !== pairedId),
  );

  const toggleFavorite = (plan: RecommendedPlan) => {
    const exists = favorites.some((p) => p.id === plan.id);
    let next = exists
      ? favorites.filter((p) => p.id !== plan.id)
      : [...favorites, plan];
    // Auto-bundle: favoriting/unfavoriting the Medigap recommendation also
    // toggles its paired Part D companion.
    if (isPaired && recommendedPlan && pairedPlan && plan.id === recommendedPlan.id) {
      if (exists) {
        next = next.filter((p) => p.id !== pairedPlan.id);
      } else if (!next.some((p) => p.id === pairedPlan.id)) {
        next = [...next, pairedPlan];
      }
    }
    update({ favoritePlans: next });
  };

  const strategyBadge =
    strategy === "medicare-advantage"
      ? { icon: HeartHandshake, label: "Medical + prescription in one plan" }
      : strategy === "dsnp"
        ? { icon: HeartHandshake, label: "Medicare + Medicaid" }
        : null;

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

      {hasRecommendation && isPaired && recommendedPlan && pairedPlan && (
        <div className="mb-4 rounded-2xl border-2 border-[#033592] bg-[#033592]/[0.03] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#033592] mb-3">
            Your recommended coverage
          </div>
          <div className="flex flex-col md:flex-row gap-3 items-stretch">
            <BundleSlot
              label="Medical Coverage"
              icon={Stethoscope}
              plan={recommendedPlan}
              isFav={favorites.some((f) => f.id === recommendedPlan.id)}
              onToggleFavorite={() => toggleFavorite(recommendedPlan)}
            />
            <div className="flex items-center justify-center md:flex-col text-[#033592]">
              <div className="rounded-full bg-[#033592] text-white h-8 w-8 flex items-center justify-center shadow">
                <Plus className="h-4 w-4" />
              </div>
            </div>
            <BundleSlot
              label="Prescription Coverage"
              icon={Pill}
              plan={pairedPlan}
              isFav={favorites.some((f) => f.id === pairedPlan.id)}
              onToggleFavorite={() => toggleFavorite(pairedPlan)}
            />
          </div>
          {data.strategyRationale && (
            <div className="mt-4 rounded-lg bg-white/70 border border-[#033592]/15 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-[#033592] mb-1 inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Why this combination
              </div>
              <p className="text-sm text-ink leading-snug m-0">{data.strategyRationale}</p>
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => startEnrollment(recommendedPlan, pairedPlan)}
              className="inline-flex items-center gap-2 rounded-full bg-[#131F69] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d1650]"
            >
              <FileSignature className="h-4 w-4" /> Enroll in this coverage
            </button>
          </div>
        </div>
      )}

      {hasRecommendation && !isPaired && recommendedPlan && data.strategyRationale && (
        <div className="mb-3 rounded-lg border border-[#033592]/20 bg-[#033592]/[0.04] p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#033592] mb-1">
            <Sparkles className="h-3.5 w-3.5" /> Why this coverage
            {strategyBadge && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#033592] text-white px-2 py-0.5 text-[10px] normal-case tracking-normal">
                <strategyBadge.icon className="h-3 w-3" /> {strategyBadge.label}
              </span>
            )}
          </div>
          <p className="text-sm text-ink leading-snug m-0">{data.strategyRationale}</p>
        </div>
      )}

      {(runners.length > 0 || !hasRecommendation || !isPaired) && (
        <>
          {hasRecommendation && isPaired && runners.length > 0 && (
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-2 px-1 mb-2">
              Also considered
            </div>
          )}
          <div className="-mx-1 overflow-x-auto">
            <div className="flex gap-4 px-1 items-stretch">
              {(isPaired ? runners : data.plans).map((p) => {
                const r = data.rationale.find((x) => x.planId === p.id);
                const isFav = favorites.some((f) => f.id === p.id);
                const isRecommended = !isPaired && hasRecommendation && p.id === recommendedId;
                const isSelected = !isPaired && p.id === selectedId;
                return (
                  <PlanTile
                    key={p.id}
                    plan={p}
                    rationale={r}
                    isFav={isFav}
                    isRecommended={isRecommended}
                    isSelected={isSelected}
                    deemphasize={hasRecommendation && !isRecommended && !isSelected}
                    onSelect={() => setSelectedId(p.id)}
                    onToggleFavorite={() => toggleFavorite(p)}
                    onEnroll={() => {
                      setSelectedId(p.id);
                      startEnrollment(p);
                    }}
                    className="flex-1 min-w-[220px]"
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BundleSlot({
  label,
  icon: Icon,
  plan,
  isFav,
  onToggleFavorite,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  plan: RecommendedPlan;
  isFav: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="flex-1 rounded-xl border border-[#033592]/25 bg-white p-3 relative">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#033592] mb-1.5">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
        aria-pressed={isFav}
        className={`absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full border transition ${
          isFav
            ? "border-rose-200 bg-rose-50 text-rose-600"
            : "border-ink/15 bg-white text-ink/60 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
        }`}
      >
        <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
      </button>
      <div className="text-[11px] uppercase tracking-wide text-muted-2 pr-8">
        {plan.carrier} · {plan.type}
      </div>
      <div className="font-serif text-[15px] leading-snug text-ink mt-0.5 pr-8 break-words">
        {plan.name}
      </div>
      <div className="mt-2 text-lg font-semibold text-ink leading-none">
        ${plan.monthlyPremium}
        <span className="text-xs font-normal text-muted-2">/mo</span>
      </div>
    </div>
  );
}


function PlanTile({
  plan: p,
  rationale: r,
  isFav,
  isRecommended,
  isSelected,
  deemphasize,
  onSelect,
  onToggleFavorite,
  onEnroll,
  className,
}: {
  plan: RecommendedPlan;
  rationale?: PlanRationale;
  isFav: boolean;
  isRecommended?: boolean;
  isSelected?: boolean;
  deemphasize?: boolean;
  onSelect?: () => void;
  onToggleFavorite: () => void;
  onEnroll?: () => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const highlights = p.highlights ?? [];
  const visibleHighlights = expanded ? highlights : highlights.slice(0, 2);
  const reasons = r?.reasons ?? [];
  const visibleReasons = expanded ? reasons : reasons.slice(0, 2);

  const highlighted = isSelected;
  const borderCls = highlighted
    ? "border-[3px] border-[#033592] shadow-[0_0_0_4px_rgba(3,53,146,0.12),0_12px_32px_-8px_rgba(3,53,146,0.35)]"
    : deemphasize
      ? "border border-ink/10 opacity-70"
      : "border border-ink/10";

  return (
    <article
      onClick={onSelect}
      className={`relative rounded-xl ${borderCls} bg-paper overflow-hidden flex flex-col h-full cursor-pointer transition ${className}`}
    >
      {isRecommended && (
        <div className="absolute -top-2 right-3 z-10 rounded-full bg-[#033592] text-white text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 shadow">
          Recommended
        </div>
      )}
      <div className="p-4 border-b border-ink/10 relative">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
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
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
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

      {onEnroll && (
        <div className="p-3 border-t border-ink/10 bg-white">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEnroll(); }}
            className={
              isSelected
                ? "w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#131F69] px-3 py-2 text-sm font-medium text-white hover:bg-[#0d1650]"
                : "w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#131F69] bg-white px-3 py-2 text-sm font-medium text-[#131F69] hover:bg-[#131F69]/5"
            }
          >
            <FileSignature className="h-4 w-4" /> Enroll in this plan
          </button>
        </div>
      )}
    </article>
  );
}
