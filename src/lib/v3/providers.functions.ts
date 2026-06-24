import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  specialty: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  npi: z.string().optional(),
});

export type ProviderMatch = {
  npi: string;
  firstName: string;
  lastName: string;
  credential: string | null;
  primaryTaxonomy: string | null;
  primaryAddress: {
    line1: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
  };
  phone: string | null;
  score: number;
};

export type VerifyProviderResult =
  | { status: "verified" | "ambiguous"; matches: ProviderMatch[] }
  | { status: "not_found"; matches: [] }
  | { status: "error"; matches: []; message: string };

const NPPES_URL = "https://npiregistry.cms.hhs.gov/api/";

function splitName(full: string): { first?: string; last?: string } {
  const cleaned = full.replace(/^(dr\.?|doctor)\s+/i, "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { last: parts[0] };
  return { first: parts[0], last: parts[parts.length - 1] };
}

function normalize(s: string | null | undefined): string {
  return (s ?? "").toString().trim().toLowerCase();
}

type NppesAddress = {
  address_1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  telephone_number?: string;
  address_purpose?: string;
};

type NppesTaxonomy = {
  desc?: string;
  primary?: boolean;
};

type NppesResult = {
  number?: string | number;
  basic?: {
    first_name?: string;
    last_name?: string;
    credential?: string;
  };
  addresses?: NppesAddress[];
  taxonomies?: NppesTaxonomy[];
};

function mapResult(
  r: NppesResult,
  input: { first?: string; last?: string; city?: string; state?: string; postalCode?: string; specialty?: string },
): ProviderMatch {
  const addresses = r.addresses ?? [];
  const location = addresses.find((a) => a.address_purpose === "LOCATION") ?? addresses[0] ?? {};
  const taxonomies = r.taxonomies ?? [];
  const primaryTax = taxonomies.find((t) => t.primary) ?? taxonomies[0];

  const first = r.basic?.first_name ?? "";
  const last = r.basic?.last_name ?? "";

  let score = 0;
  if (input.last && normalize(last) === normalize(input.last)) score += 3;
  if (input.first && normalize(first).startsWith(normalize(input.first))) score += 2;
  if (input.postalCode && location.postal_code?.startsWith(input.postalCode)) score += 3;
  if (input.city && normalize(location.city) === normalize(input.city)) score += 2;
  if (input.state && normalize(location.state) === normalize(input.state)) score += 1;
  if (input.specialty && normalize(primaryTax?.desc).includes(normalize(input.specialty))) score += 2;

  return {
    npi: String(r.number ?? ""),
    firstName: first,
    lastName: last,
    credential: r.basic?.credential ?? null,
    primaryTaxonomy: primaryTax?.desc ?? null,
    primaryAddress: {
      line1: location.address_1 ?? null,
      city: location.city ?? null,
      state: location.state ?? null,
      postalCode: location.postal_code ?? null,
    },
    phone: location.telephone_number ?? null,
    score,
  };
}

async function queryNppes(params: URLSearchParams): Promise<NppesResult[]> {
  const url = `${NPPES_URL}?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`NPPES ${res.status}`);
  const json = (await res.json()) as { results?: NppesResult[] };
  return json.results ?? [];
}

export const verifyProvider = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<VerifyProviderResult> => {
    try {
      // NPI direct lookup
      if (data.npi && /^\d{10}$/.test(data.npi)) {
        const params = new URLSearchParams({ version: "2.1", number: data.npi });
        const results = await queryNppes(params);
        if (results.length === 0) return { status: "not_found", matches: [] };
        const matches = results.map((r) => mapResult(r, {}));
        return { status: "verified", matches };
      }

      // Resolve name
      let first = data.firstName?.trim();
      let last = data.lastName?.trim();
      if ((!first || !last) && data.name) {
        const split = splitName(data.name);
        first = first || split.first;
        last = last || split.last;
      }
      if (!last) {
        return { status: "error", matches: [], message: "A last name is required to search." };
      }

      const buildParams = (includeType: boolean) => {
        const p = new URLSearchParams({ version: "2.1", limit: "10" });
        if (includeType) p.set("enumeration_type", "NPI-1");
        if (first) p.set("first_name", `${first}*`);
        p.set("last_name", `${last}*`);
        if (data.city) p.set("city", data.city);
        if (data.state) p.set("state", data.state.toUpperCase());
        if (data.postalCode) p.set("postal_code", data.postalCode);
        if (data.specialty) p.set("taxonomy_description", `*${data.specialty}*`);
        return p;
      };

      let results = await queryNppes(buildParams(true));
      if (results.length === 0) {
        // Retry without enumeration_type to catch group-listed providers
        results = await queryNppes(buildParams(false));
      }

      if (results.length === 0) return { status: "not_found", matches: [] };

      const ctx = { first, last, city: data.city, state: data.state, postalCode: data.postalCode, specialty: data.specialty };
      const matches = results.map((r) => mapResult(r, ctx)).sort((a, b) => b.score - a.score);
      const top = matches[0];
      const second = matches[1];

      const isVerified =
        matches.length === 1 ||
        (top.score >= 5 && (!second || top.score - second.score >= 3));

      return { status: isVerified ? "verified" : "ambiguous", matches: matches.slice(0, 5) };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { status: "error", matches: [], message };
    }
  });
