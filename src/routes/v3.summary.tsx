import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Stepper } from "@/components/v3/app-shell";
import { useSession } from "@/lib/v3/session-store";
import { FIELD_LABELS, type Intake, type DoctorEntry, type MedicationEntry, type NpiVerification, type RxVerification } from "@/lib/v3/intake-types";
import { verifyProvider } from "@/lib/v3/providers.functions";
import { verifyMedication } from "@/lib/v3/medications.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { ArrowRight, Plus, Trash2, AlertTriangle, ShieldCheck, Loader2, Search, Pill } from "lucide-react";

export const Route = createFileRoute("/v3/summary")({
  head: () => ({ meta: [{ title: "Your summary — Medicare Compass" }] }),
  component: SummaryPage,
});

function SummaryPage() {
  const { state, update, ready } = useSession();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Intake | null>(null);

  useEffect(() => {
    if (ready && !state.finished) navigate({ to: "/v3" });
    if (ready && !draft) setDraft(state.intake);
  }, [ready, state.finished, state.intake, draft, navigate]);

  if (!draft) {
    return <AppShell step="summary"><p className="text-muted-2">Loading…</p></AppShell>;
  }

  const updateList = (k: keyof Intake, csv: string) => {
    const value = csv.split(",").map((s) => s.trim()).filter(Boolean);
    setDraft({
      ...draft,
      [k]: { value, confidence: value.length ? "captured" : "missing" },
    } as Intake);
  };
  const updateString = (k: keyof Intake, v: string) => {
    setDraft({
      ...draft,
      [k]: { value: v || null, confidence: v ? "captured" : "missing" },
    } as Intake);
  };

  const cont = () => {
    update({ intake: draft });
    navigate({ to: "/v3/priorities" });
  };

  return (
    <AppShell step="summary">
      <Stepper current="summary" />
      <div className="max-w-2xl">
        <h1 className="font-serif text-3xl">Here's what we heard</h1>
        <p className="text-muted-2 mt-2">
          Edit anything that's wrong. This is what we'll use to find your matches.
        </p>

        <div className="mt-8 rounded-2xl border border-line bg-paper p-6 space-y-5">
          <Row label={FIELD_LABELS.reasonForCall}>
            <Input value={draft.reasonForCall.value ?? ""} onChange={(e) => updateString("reasonForCall", e.target.value)} />
          </Row>
          <Row label={FIELD_LABELS.doctors} hint="Name alone isn't enough — add specialty + city/ZIP">
            <DoctorEditor
              doctors={draft.doctors.value}
              onChange={(value: DoctorEntry[]) =>
                setDraft({
                  ...draft,
                  doctors: { value, confidence: value.length ? "captured" : "missing" },
                })
              }
            />
          </Row>
          <Row label={FIELD_LABELS.medications} hint="Name + strength + dose form (e.g. Atorvastatin 20 mg oral tablet)">
            <MedicationEditor
              medications={draft.medications.value}
              onChange={(value: MedicationEntry[]) =>
                setDraft({
                  ...draft,
                  medications: { value, confidence: value.length ? "captured" : "missing" },
                })
              }
            />
          </Row>
          <Row label={FIELD_LABELS.conditions} hint="Comma-separated">
            <Input value={draft.conditions.value.join(", ")} onChange={(e) => updateList("conditions", e.target.value)} />
          </Row>
          <Row label={FIELD_LABELS.priorities} hint="Comma-separated">
            <Input value={draft.priorities.value.join(", ")} onChange={(e) => updateList("priorities", e.target.value)} />
          </Row>
          <Row label={FIELD_LABELS.budgetSensitivity}>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setDraft({ ...draft, budgetSensitivity: { value: b, confidence: "captured" } })}
                  className={`flex-1 py-2 rounded-md text-sm border capitalize ${
                    draft.budgetSensitivity.value === b
                      ? "bg-ink text-paper border-ink"
                      : "bg-paper border-line hover:border-ink"
                  }`}
                >
                  {b === "low" ? "Cost not a concern" : b === "medium" ? "Balanced" : "Tight budget"}
                </button>
              ))}
            </div>
          </Row>
          <Row label={FIELD_LABELS.zip}>
            <Input value={draft.zip.value ?? ""} onChange={(e) => updateString("zip", e.target.value)} maxLength={5} />
          </Row>
        </div>

        <details className="mt-6 rounded-xl border border-line bg-paper p-4 text-sm">
          <summary className="cursor-pointer text-muted-2 hover:text-ink">
            View transcript ({state.messages.filter((m) => m.role === "user").length} of your turns)
          </summary>
          <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
            {state.messages.length === 0 ? (
              <p className="text-muted-2 italic">No transcript captured. If you used voice, the mic may not have picked up your speech.</p>
            ) : (
              state.messages.map((m) => {
                const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                if (!text.trim()) return null;
                return (
                  <p key={m.id} className="leading-relaxed">
                    <span className={`text-xs uppercase tracking-wide mr-2 ${m.role === "user" ? "text-accent" : "text-muted-2"}`}>
                      {m.role === "user" ? "You" : "AI"}
                    </span>
                    {text}
                  </p>
                );
              })
            )}
          </div>
        </details>

        <div className="mt-8 flex justify-end">
          <Button onClick={cont} className="bg-accent hover:bg-accent-2 text-paper">
            Looks good — what matters most <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-sm font-medium text-ink">{label}</label>
        {hint && <span className="text-xs text-muted-2">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function emptyDoctor(): DoctorEntry {
  return { name: "", specialty: "", city: "", zip: "", clinic: "", verification: "unverified" };
}

function computeVerification(d: DoctorEntry): DoctorEntry["verification"] {
  if (!d.name.trim()) return "unverified";
  const hasDetail = [d.specialty, d.city, d.zip, d.clinic].some((v) => v && v.trim());
  return hasDetail ? "high" : "low";
}

function DoctorEditor({
  doctors,
  onChange,
}: {
  doctors: DoctorEntry[];
  onChange: (next: DoctorEntry[]) => void;
}) {
  const list = doctors.length ? doctors : [];
  const verifyFn = useServerFn(verifyProvider);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);

  const update = (i: number, patch: Partial<DoctorEntry>) => {
    const next = list.map((d, idx) => {
      if (idx !== i) return d;
      const merged = { ...d, ...patch };
      return { ...merged, verification: computeVerification(merged) };
    });
    onChange(next);
  };
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  const add = () => onChange([...list, emptyDoctor()]);

  const runVerify = async (i: number) => {
    const d = list[i];
    setLoadingIdx(i);
    try {
      const result = await verifyFn({
        data: {
          name: d.name,
          specialty: d.specialty || undefined,
          city: d.city || undefined,
          postalCode: d.zip || undefined,
        },
      });
      const npiVerification: NpiVerification = {
        status: result.status,
        checkedAt: new Date().toISOString(),
        matches: result.matches,
        selectedNpi: result.status === "verified" && result.matches[0] ? result.matches[0].npi : null,
        message: "message" in result ? result.message : undefined,
      };
      onChange(list.map((row, idx) => (idx === i ? { ...row, npiVerification } : row)));
    } finally {
      setLoadingIdx(null);
    }
  };

  const selectMatch = (i: number, npi: string) => {
    const d = list[i];
    if (!d.npiVerification) return;
    const npiVerification: NpiVerification = {
      ...d.npiVerification,
      status: "verified",
      selectedNpi: npi,
      matches: d.npiVerification.matches.filter((m) => m.npi === npi),
    };
    onChange(list.map((row, idx) => (idx === i ? { ...row, npiVerification } : row)));
  };

  return (
    <div className="space-y-3">
      {list.length === 0 && (
        <p className="text-sm text-muted-2 italic">No doctors captured yet.</p>
      )}
      {list.map((d, i) => {
        const canVerify = d.name.trim().length > 1 && Boolean(d.specialty || d.city || d.zip);
        const v = d.npiVerification;
        const selected = v?.selectedNpi ? v.matches.find((m) => m.npi === v.selectedNpi) : undefined;
        return (
        <div key={i} className="rounded-lg border border-line bg-canvas/40 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Input
              placeholder="Doctor name (e.g. Dr. Anna Lee)"
              value={d.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove doctor"
              className="p-2 text-muted-2 hover:text-ink"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Specialty (e.g. cardiology)"
              value={d.specialty ?? ""}
              onChange={(e) => update(i, { specialty: e.target.value })}
            />
            <Input
              placeholder="Clinic / hospital / group"
              value={d.clinic ?? ""}
              onChange={(e) => update(i, { clinic: e.target.value })}
            />
            <Input
              placeholder="City"
              value={d.city ?? ""}
              onChange={(e) => update(i, { city: e.target.value })}
            />
            <Input
              placeholder="ZIP"
              value={d.zip ?? ""}
              onChange={(e) => update(i, { zip: e.target.value })}
              maxLength={5}
            />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            {d.verification === "low" && d.name.trim() && v?.status !== "verified" ? (
              <div className="flex items-center gap-1.5 text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Name alone isn't enough — add specialty or city/ZIP.
              </div>
            ) : <span />}
            <button
              type="button"
              onClick={() => runVerify(i)}
              disabled={!canVerify || loadingIdx === i}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-2 disabled:text-muted-2 disabled:cursor-not-allowed"
            >
              {loadingIdx === i ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              {v ? "Re-check NPI Registry" : "Verify with NPI Registry"}
            </button>
          </div>
          {v?.status === "verified" && selected && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified · NPI {selected.npi}
              </div>
              <div className="text-emerald-900">
                {selected.firstName} {selected.lastName}{selected.credential ? `, ${selected.credential}` : ""}
              </div>
              {selected.primaryTaxonomy && (
                <div className="text-emerald-900/80">{selected.primaryTaxonomy}</div>
              )}
              {selected.primaryAddress.city && (
                <div className="text-emerald-900/70">
                  {[selected.primaryAddress.line1, selected.primaryAddress.city, selected.primaryAddress.state, selected.primaryAddress.postalCode].filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          )}
          {v?.status === "ambiguous" && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs space-y-1.5">
              <div className="font-medium text-amber-800">Multiple matches — pick the right one:</div>
              {v.matches.slice(0, 3).map((m) => (
                <button
                  key={m.npi}
                  type="button"
                  onClick={() => selectMatch(i, m.npi)}
                  className="w-full text-left rounded border border-amber-200 bg-paper p-2 hover:border-amber-400"
                >
                  <div className="font-medium text-ink">
                    {m.firstName} {m.lastName}{m.credential ? `, ${m.credential}` : ""}
                    <span className="ml-2 text-[10px] text-muted-2">NPI {m.npi}</span>
                  </div>
                  {m.primaryTaxonomy && <div className="text-muted-2">{m.primaryTaxonomy}</div>}
                  {m.primaryAddress.city && (
                    <div className="text-muted-2">
                      {[m.primaryAddress.city, m.primaryAddress.state, m.primaryAddress.postalCode].filter(Boolean).join(", ")}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          {v?.status === "not_found" && (
            <div className="text-xs text-amber-700">
              No NPI match — try adding city, ZIP, or specialty.
            </div>
          )}
          {v?.status === "error" && (
            <div className="text-xs text-muted-2">NPI registry unavailable — try again.</div>
          )}
        </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-2"
      >
        <Plus className="h-4 w-4" /> Add a doctor
      </button>
    </div>
  );
}


function emptyMedication(): MedicationEntry {
  return { name: "", strength: "", doseForm: "", frequency: "" };
}

function MedicationEditor({
  medications,
  onChange,
}: {
  medications: MedicationEntry[];
  onChange: (next: MedicationEntry[]) => void;
}) {
  const list = medications;
  const verifyFn = useServerFn(verifyMedication);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);

  const update = (i: number, patch: Partial<MedicationEntry>) =>
    onChange(list.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  const add = () => onChange([...list, emptyMedication()]);

  const runVerify = async (i: number, overrides?: Partial<MedicationEntry>) => {
    const m = { ...list[i], ...(overrides ?? {}) };
    setLoadingIdx(i);
    try {
      const result = await verifyFn({
        data: {
          name: m.name.trim(),
          strength: m.strength?.trim() || undefined,
          doseForm: m.doseForm?.trim() || undefined,
        },
      });

      const base: RxVerification = {
        status: result.status,
        checkedAt: new Date().toISOString(),
        rxcui: null,
        canonicalName: null,
        tty: null,
        ingredient: null,
        brandNames: [],
        strengthMatch: false,
        doseFormMatch: false,
        spellingCorrected: null,
        candidates: [],
      };
      let rxVerification: RxVerification;
      if (result.status === "verified") {
        rxVerification = {
          ...base,
          status: "verified",
          rxcui: result.rxcui,
          canonicalName: result.canonicalName,
          tty: result.tty,
          ingredient: result.ingredient,
          brandNames: result.brandNames,
          strengthMatch: result.strengthMatch,
          doseFormMatch: result.doseFormMatch,
          spellingCorrected: result.spellingCorrected,
          candidates: result.candidates,
        };
      } else if (result.status === "needs_detail" || result.status === "ambiguous") {
        rxVerification = {
          ...base,
          status: result.status,
          spellingCorrected: result.spellingCorrected,
          candidates: result.candidates,
        };
      } else if (result.status === "not_found") {
        rxVerification = { ...base, status: "not_found", spellingCorrected: result.spellingCorrected };
      } else {
        rxVerification = { ...base, status: "error", message: result.message };
      }

      onChange(list.map((row, idx) => (idx === i ? { ...row, ...(overrides ?? {}), rxVerification } : row)));
    } finally {
      setLoadingIdx(null);
    }
  };

  // Parse a strength + dose form out of a canonical RxNorm SCD/SBD name, e.g.
  // "atorvastatin 20 MG Oral Tablet" -> { strength: "20 mg", doseForm: "Oral Tablet" }
  const parseProduct = (name: string): { strength?: string; doseForm?: string } => {
    const m = name.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|unit|iu|%))\s+(.*)/i);
    if (!m) return {};
    return { strength: m[1].toLowerCase().replace(/\s+/g, " "), doseForm: m[2].trim() };
  };

  const pickCandidate = (i: number, name: string) => {
    const parsed = parseProduct(name);
    void runVerify(i, { name, ...parsed });
  };

  return (
    <div className="space-y-3">
      {list.length === 0 && (
        <p className="text-sm text-muted-2 italic">No medications captured yet.</p>
      )}
      {list.map((m, i) => {
        const incomplete = m.name.trim() && (!m.strength?.trim() || !m.doseForm?.trim());
        const v = m.rxVerification;
        const canVerify = m.name.trim().length > 1;
        return (
          <div key={i} className="rounded-lg border border-line bg-canvas/40 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Input
                placeholder="Medication (brand or generic, e.g. Atorvastatin)"
                value={m.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove medication"
                className="p-2 text-muted-2 hover:text-ink"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                placeholder="Strength (e.g. 20 mg)"
                value={m.strength ?? ""}
                onChange={(e) => update(i, { strength: e.target.value })}
              />
              <Input
                placeholder="Dose form (e.g. oral tablet, weekly pen)"
                value={m.doseForm ?? ""}
                onChange={(e) => update(i, { doseForm: e.target.value })}
              />
              <Input
                placeholder="Frequency (e.g. once daily)"
                value={m.frequency ?? ""}
                onChange={(e) => update(i, { frequency: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              {incomplete && v?.status !== "verified" ? (
                <div className="flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Add strength and dose form to identify the product (e.g. "20 mg oral tablet").
                </div>
              ) : <span />}
              <button
                type="button"
                onClick={() => runVerify(i)}
                disabled={!canVerify || loadingIdx === i}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-2 disabled:text-muted-2 disabled:cursor-not-allowed"
              >
                {loadingIdx === i ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                {v ? "Re-check RxNorm" : "Verify with RxNorm"}
              </button>
            </div>
            {v?.status === "verified" && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified · RxCUI {v.rxcui}
                  {v.tty && <span className="text-[10px] text-emerald-700/80">({v.tty})</span>}
                </div>
                <div className="text-emerald-900">{v.canonicalName}</div>
                {v.ingredient && v.ingredient !== v.canonicalName && (
                  <div className="text-emerald-900/80">Ingredient: {v.ingredient}</div>
                )}
                {v.brandNames.length > 0 && (
                  <div className="text-emerald-900/70">
                    Brands: {v.brandNames.slice(0, 3).join(", ")}
                  </div>
                )}
                {v.spellingCorrected && (
                  <div className="text-emerald-900/60 italic">
                    Auto-corrected from "{m.name}" → "{v.spellingCorrected}"
                  </div>
                )}
                {(!v.strengthMatch || !v.doseFormMatch) && (m.strength || m.doseForm) && (
                  <div className="flex items-center gap-1.5 text-amber-700 pt-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Matched the drug, but {!v.strengthMatch ? "strength" : "dose form"} didn't line up — confirm with your pharmacy.
                  </div>
                )}
              </div>
            )}
            {v?.status === "needs_detail" && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs space-y-1.5">
                <div className="font-medium text-amber-800">
                  Found the drug — pick the exact product:
                </div>
                {v.candidates.slice(0, 4).map((c) => (
                  <button
                    key={c.rxcui}
                    type="button"
                    onClick={() => pickCandidate(i, c.name)}
                    className="w-full text-left rounded border border-amber-200 bg-paper p-2 hover:border-amber-400"
                  >
                    <Pill className="inline h-3 w-3 mr-1 text-amber-700" />
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className="ml-2 text-[10px] text-muted-2">{c.tty} · RxCUI {c.rxcui}</span>
                  </button>
                ))}
              </div>
            )}
            {v?.status === "ambiguous" && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs space-y-1.5">
                <div className="font-medium text-amber-800">Multiple drugs match — pick one:</div>
                {v.candidates.slice(0, 4).map((c) => (
                  <button
                    key={c.rxcui}
                    type="button"
                    onClick={() => pickCandidate(i, c.name)}
                    className="w-full text-left rounded border border-amber-200 bg-paper p-2 hover:border-amber-400"
                  >
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className="ml-2 text-[10px] text-muted-2">{c.tty} · RxCUI {c.rxcui}</span>
                  </button>
                ))}
              </div>
            )}
            {v?.status === "not_found" && (
              <div className="text-xs text-amber-700">
                No RxNorm match.
                {v.spellingCorrected && (
                  <>
                    {" "}Did you mean{" "}
                    <button
                      type="button"
                      className="underline font-medium"
                      onClick={() => runVerify(i, { name: v.spellingCorrected! })}
                    >
                      {v.spellingCorrected}
                    </button>?
                  </>
                )}
              </div>
            )}
            {v?.status === "error" && (
              <div className="text-xs text-muted-2">RxNorm unavailable — try again.</div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-2"
      >
        <Plus className="h-4 w-4" /> Add a medication
      </button>
    </div>
  );
}
