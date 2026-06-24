## Goal

Let the v3 Medicare Compass demo prove how accurately the AI captured doctor info by checking each doctor against the public NPPES NPI Registry (no API key required, free CMS endpoint at `https://npiregistry.cms.hhs.gov/api/?version=2.1`).

## What to build

### 1. `verifyProvider` server function
New file: `src/lib/v3/providers.functions.ts`

- `createServerFn({ method: "POST" })` from `@tanstack/react-start`.
- Zod input validator: `{ name?: string, firstName?: string, lastName?: string, specialty?: string, city?: string, state?: string, postalCode?: string, npi?: string }`. Requires either `npi` or a usable name (last name or full `name`).
- Handler:
  - Split `name` into first/last if `firstName`/`lastName` not provided.
  - Build NPPES query: `version=2.1`, `enumeration_type=NPI-1` (individual providers), `first_name`, `last_name`, `city`, `state`, `postal_code`, `taxonomy_description` (from specialty, wildcarded), `limit=10`. If `npi` is supplied, query by `number` only.
  - `fetch` NPPES with a 6s `AbortSignal.timeout`. On non-200 or fetch error, return `{ status: "error", message }` rather than throwing.
  - Map results to a compact shape: `{ npi, firstName, lastName, credential, primaryTaxonomy, primaryAddress: { line1, city, state, postalCode }, phone, soleProprietor, enumerationDate }`.
  - Score each match against the input (last-name exact, city/zip match, taxonomy substring) and return them sorted, plus a top-level `status`: `"verified"` (1 high-confidence match), `"ambiguous"` (multiple), `"not_found"`, or `"error"`.

### 2. Extend the doctor data shape
`src/lib/v3/intake-types.ts`

- Add an optional `npiVerification` block to `DoctorEntry`:
  ```ts
  npiVerification: z.object({
    status: z.enum(["verified", "ambiguous", "not_found", "error"]),
    checkedAt: z.string(),
    matches: z.array(z.object({ npi, firstName, lastName, credential, primaryTaxonomy, primaryAddress, phone })),
    selectedNpi: z.string().nullable(),
  }).optional()
  ```
- Backwards compatible: existing entries without it keep working.

### 3. Wire it into the summary doctor editor
`src/routes/v3.summary.tsx`

- Import `useServerFn` and the new `verifyProvider` function.
- In `DoctorEditor`, per row add a "Verify with NPI Registry" button (disabled until `name` plus at least one of specialty/city/zip is present).
- On click: set a per-row `loading` state, call `verifyProvider({ data: {...row} })`, store the response on the row via `onChange` (under `npiVerification`).
- Render results inline beneath the row:
  - `verified`: green badge "Verified · NPI 1234567890" + matched name, taxonomy, address.
  - `ambiguous`: small list (up to 3) of candidate matches; clicking one sets `selectedNpi` and collapses to the verified view.
  - `not_found`: amber note "No NPI match — try adding city, ZIP, or specialty."
  - `error`: muted "NPI registry unavailable — try again."
- Keep the existing "low confidence" warning; suppress it once `npiVerification.status === "verified"`.

### 4. Nothing else changes
- No schema migration, no secrets (NPPES is public).
- v3 chooser, intake, priorities, matches, next-step screens are untouched.
- v1 and v2 untouched.

## Technical notes

- NPPES sample call: `GET https://npiregistry.cms.hhs.gov/api/?version=2.1&first_name=anna&last_name=lee&city=Austin&state=TX&limit=10`.
- The endpoint is CORS-restricted in browsers, which is why this must run server-side via `createServerFn` (not a client `fetch`).
- State derivation: if the user provided only `city` (no state), pass `city` but no `state`; if only `zip`, pass `postal_code` only. NPPES tolerates partials.
- Use `enumeration_type=NPI-1` to skip organizations; if zero results, retry once without that filter to catch group-listed providers.
- Public server fn (no auth middleware) — read-only call to a public registry, safe to expose.

## Out of scope

- Saving verification results to a database.
- Bulk-verify-all button (can add later if useful).
- Verifying organizations/clinics by name (NPI-2). Easy to extend later.
