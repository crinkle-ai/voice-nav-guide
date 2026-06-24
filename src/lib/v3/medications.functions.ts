import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  name: z.string().min(2),
  strength: z.string().optional(),
  doseForm: z.string().optional(),
});

export type MedicationCandidate = {
  rxcui: string;
  name: string;
  tty: string;
};

export type VerifyMedicationResult =
  | {
      status: "verified";
      rxcui: string;
      canonicalName: string;
      tty: string;
      ingredient: string | null;
      brandNames: string[];
      strengthMatch: boolean;
      doseFormMatch: boolean;
      spellingCorrected: string | null;
      candidates: MedicationCandidate[];
    }
  | {
      status: "needs_detail";
      candidates: MedicationCandidate[];
      spellingCorrected: string | null;
    }
  | {
      status: "ambiguous";
      candidates: MedicationCandidate[];
      spellingCorrected: string | null;
    }
  | { status: "not_found"; spellingCorrected: string | null }
  | { status: "error"; message: string };

const BASE = "https://rxnav.nlm.nih.gov/REST";

async function rxFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    signal: AbortSignal.timeout(6000),
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`RxNorm ${res.status}`);
  return (await res.json()) as T;
}

// --- Normalizers ---

const FORM_SYNONYMS: Record<string, string[]> = {
  tablet: ["tablet", "tab", "oral tablet"],
  pill: ["tablet", "oral tablet"],
  capsule: ["capsule", "cap", "oral capsule"],
  pen: ["pen", "prefilled syringe", "injection"],
  shot: ["injection", "injectable", "prefilled syringe"],
  injection: ["injection", "injectable", "prefilled syringe"],
  inhaler: ["inhaler", "metered dose", "inhalation"],
  solution: ["solution", "oral solution"],
  liquid: ["solution", "oral solution", "suspension"],
  cream: ["cream", "topical cream"],
  patch: ["patch", "transdermal"],
};

function normalizeDoseForm(s: string | undefined): string[] {
  if (!s) return [];
  const lower = s.toLowerCase().trim();
  const out = new Set<string>([lower]);
  for (const [key, syns] of Object.entries(FORM_SYNONYMS)) {
    if (lower.includes(key)) syns.forEach((v) => out.add(v));
  }
  return [...out];
}

function normalizeStrength(s: string | undefined): { num: string; unit: string } | null {
  if (!s) return null;
  const m = s.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|unit|iu|%)/);
  if (!m) return null;
  return { num: m[1], unit: m[2] };
}

function nameContainsStrength(name: string, str: { num: string; unit: string } | null): boolean {
  if (!str) return false;
  const lower = name.toLowerCase();
  const unitAliases: Record<string, string[]> = {
    mg: ["mg", "milligram"],
    mcg: ["mcg", "microgram"],
    g: ["g", "gram"],
    ml: ["ml", "milliliter"],
    unit: ["unit"],
    iu: ["iu", "unit"],
    "%": ["%"],
  };
  const units = unitAliases[str.unit] ?? [str.unit];
  return units.some((u) => new RegExp(`\\b${str.num}\\s*${u}\\b`).test(lower));
}

function nameContainsForm(name: string, forms: string[]): boolean {
  if (forms.length === 0) return false;
  const lower = name.toLowerCase();
  return forms.some((f) => lower.includes(f));
}

// --- RxNorm API shapes ---

type ApproxResp = {
  approximateGroup?: {
    candidate?: Array<{ rxcui?: string; score?: string; rank?: string; name?: string }>;
  };
};

type PropsResp = {
  properties?: { rxcui?: string; name?: string; tty?: string } | null;
};

type RelatedResp = {
  relatedGroup?: {
    conceptGroup?: Array<{
      tty?: string;
      conceptProperties?: Array<{ rxcui?: string; name?: string; tty?: string }>;
    }>;
  };
};

type SpellingResp = {
  suggestionGroup?: { suggestionList?: { suggestion?: string[] } | null };
};

async function spellingSuggest(name: string): Promise<string | null> {
  try {
    const res = await rxFetch<SpellingResp>(
      `/spellingsuggestions.json?name=${encodeURIComponent(name)}`,
    );
    const top = res.suggestionGroup?.suggestionList?.suggestion?.[0];
    if (!top) return null;
    if (top.toLowerCase() === name.toLowerCase()) return null;
    return top;
  } catch {
    return null;
  }
}

async function approximateMatch(term: string): Promise<MedicationCandidate[]> {
  const res = await rxFetch<ApproxResp>(
    `/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=8`,
  );
  const candidates = res.approximateGroup?.candidate ?? [];
  // dedupe by rxcui
  const seen = new Set<string>();
  const out: MedicationCandidate[] = [];
  for (const c of candidates) {
    if (!c.rxcui || seen.has(c.rxcui)) continue;
    seen.add(c.rxcui);
    out.push({ rxcui: c.rxcui, name: c.name ?? "", tty: "" });
  }
  return out;
}

async function getProperties(rxcui: string): Promise<{ name: string; tty: string } | null> {
  try {
    const res = await rxFetch<PropsResp>(`/rxcui/${rxcui}/properties.json`);
    const p = res.properties;
    if (!p?.name) return null;
    return { name: p.name, tty: p.tty ?? "" };
  } catch {
    return null;
  }
}

async function getRelated(
  rxcui: string,
  ttys: string[],
): Promise<Array<{ rxcui: string; name: string; tty: string }>> {
  try {
    const res = await rxFetch<RelatedResp>(
      `/rxcui/${rxcui}/related.json?tty=${ttys.join("+")}`,
    );
    const groups = res.relatedGroup?.conceptGroup ?? [];
    const out: Array<{ rxcui: string; name: string; tty: string }> = [];
    for (const g of groups) {
      const tty = g.tty ?? "";
      for (const c of g.conceptProperties ?? []) {
        if (c.rxcui && c.name) out.push({ rxcui: c.rxcui, name: c.name, tty });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export const verifyMedication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<VerifyMedicationResult> => {
    try {
      const rawName = data.name.trim();
      const strength = normalizeStrength(data.strength);
      const forms = normalizeDoseForm(data.doseForm);

      // 1. Approximate match on the raw name
      let candidates = await approximateMatch(rawName);
      let spellingCorrected: string | null = null;

      // 2. If nothing came back, try a spelling suggestion
      if (candidates.length === 0) {
        const suggestion = await spellingSuggest(rawName);
        if (suggestion) {
          spellingCorrected = suggestion;
          candidates = await approximateMatch(suggestion);
        }
      }

      if (candidates.length === 0) {
        return { status: "not_found", spellingCorrected };
      }

      // 3. Resolve the top candidate's properties so the user sees a real name + TTY
      const top = candidates[0];
      const topProps = await getProperties(top.rxcui);
      if (topProps) {
        top.name = topProps.name;
        top.tty = topProps.tty;
      }

      // Enrich a couple more for the candidate list
      for (let i = 1; i < Math.min(candidates.length, 4); i++) {
        const p = await getProperties(candidates[i].rxcui);
        if (p) {
          candidates[i].name = p.name;
          candidates[i].tty = p.tty;
        }
      }

      // 4. If the top concept is an ingredient/brand-name (IN/BN/MIN/PIN), we need a strength/form
      //    to pick an SCD/SBD. Pull related SCD/SBD/IN/BN.
      const related = await getRelated(top.rxcui, ["SCD", "SBD", "IN", "BN"]);
      const products = related.filter((r) => r.tty === "SCD" || r.tty === "SBD");
      const ingredients = related.filter((r) => r.tty === "IN");
      const brands = related.filter((r) => r.tty === "BN");

      const isTopAProduct = top.tty === "SCD" || top.tty === "SBD" || top.tty === "GPCK" || top.tty === "BPCK";

      // If the top hit is already a specific product, score it directly
      if (isTopAProduct) {
        const strengthMatch = nameContainsStrength(top.name, strength);
        const doseFormMatch = nameContainsForm(top.name, forms);
        return {
          status: "verified",
          rxcui: top.rxcui,
          canonicalName: top.name,
          tty: top.tty,
          ingredient: ingredients[0]?.name ?? null,
          brandNames: brands.slice(0, 3).map((b) => b.name),
          strengthMatch: strength ? strengthMatch : true,
          doseFormMatch: forms.length ? doseFormMatch : true,
          spellingCorrected,
          candidates: candidates.slice(0, 4),
        };
      }

      // Top hit is an ingredient or brand — try to narrow with strength + dose form
      if (products.length > 0 && (strength || forms.length)) {
        const scored = products
          .map((p) => {
            let score = 0;
            if (strength && nameContainsStrength(p.name, strength)) score += 3;
            if (forms.length && nameContainsForm(p.name, forms)) score += 2;
            return { p, score };
          })
          .sort((a, b) => b.score - a.score);
        const best = scored[0];
        if (best && best.score >= 3) {
          return {
            status: "verified",
            rxcui: best.p.rxcui,
            canonicalName: best.p.name,
            tty: best.p.tty,
            ingredient: ingredients[0]?.name ?? top.name,
            brandNames: brands.slice(0, 3).map((b) => b.name),
            strengthMatch: strength ? nameContainsStrength(best.p.name, strength) : true,
            doseFormMatch: forms.length ? nameContainsForm(best.p.name, forms) : true,
            spellingCorrected,
            candidates: products.slice(0, 4).map((p) => ({ rxcui: p.rxcui, name: p.name, tty: p.tty })),
          };
        }
      }

      // Need more detail to pin down a product
      if (products.length > 0) {
        return {
          status: "needs_detail",
          candidates: products.slice(0, 4).map((p) => ({ rxcui: p.rxcui, name: p.name, tty: p.tty })),
          spellingCorrected,
        };
      }

      // Multiple top-level candidates and we couldn't expand — ambiguous
      if (candidates.length > 1) {
        return {
          status: "ambiguous",
          candidates: candidates.slice(0, 4),
          spellingCorrected,
        };
      }

      // Single hit, ingredient-level, no products to narrow into — call it verified at the ingredient level
      return {
        status: "verified",
        rxcui: top.rxcui,
        canonicalName: top.name,
        tty: top.tty,
        ingredient: top.name,
        brandNames: brands.slice(0, 3).map((b) => b.name),
        strengthMatch: false,
        doseFormMatch: false,
        spellingCorrected,
        candidates: candidates.slice(0, 4),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { status: "error", message };
    }
  });
