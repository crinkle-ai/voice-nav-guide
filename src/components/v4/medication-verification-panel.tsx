import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyMedication, type VerifyMedicationResult } from "@/lib/v3/medications.functions";
import { useSession } from "@/lib/v4/session-store";
import { useAutoVerifyProgress } from "@/components/v4/auto-verify-context";
import { medFingerprint } from "@/components/v4/use-auto-verify-intake";
import type { MedicationEntry, RxVerification } from "@/lib/v3/intake-types";
import { Button } from "@/components/ui/button";
import { BadgeCheck, AlertTriangle, XCircle, Loader2, ShieldQuestion, HelpCircle } from "lucide-react";

type RowState = { loading: boolean; error?: string };

const BASE_VERIFICATION: RxVerification = {
  status: "error",
  checkedAt: "",
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

function toRxVerification(result: VerifyMedicationResult): RxVerification {
  const base = { ...BASE_VERIFICATION, checkedAt: new Date().toISOString() };
  if (result.status === "verified") {
    return {
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
  }
  if (result.status === "needs_detail" || result.status === "ambiguous") {
    return {
      ...base,
      status: result.status,
      spellingCorrected: result.spellingCorrected,
      candidates: result.candidates,
    };
  }
  if (result.status === "not_found") {
    return { ...base, status: "not_found", spellingCorrected: result.spellingCorrected };
  }
  return { ...base, status: "error", message: result.message };
}

// Parse "atorvastatin 20 MG Oral Tablet" -> { strength: "20 mg", doseForm: "Oral Tablet" }
function parseProduct(name: string): { strength?: string; doseForm?: string } {
  const m = name.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|unit|iu|%))\s+(.*)/i);
  if (!m) return {};
  return { strength: m[1].toLowerCase().replace(/\s+/g, " "), doseForm: m[2].trim() };
}

export function MedicationVerificationPanel() {
  const { state, update } = useSession();
  const verifyFn = useServerFn(verifyMedication);
  const { isMedVerifying } = useAutoVerifyProgress();
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const meds = state.intake.medications.value;

  if (meds.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-paper p-5">
        <h3 className="font-serif text-lg mb-1">Medication verification</h3>
        <p className="text-xs text-muted-2">
          As you mention prescriptions, they'll appear here. We check each one against{" "}
          <span className="font-medium">RxNorm</span> (NLM) to confirm the drug, strength, and dose form.
        </p>
      </div>
    );
  }

  const setRow = (i: number, patch: RowState) => setRows((r) => ({ ...r, [i]: { ...r[i], ...patch } }));

  const persist = (i: number, patch: Partial<MedicationEntry>) => {
    update((prev) => {
      const next = [...prev.intake.medications.value];
      next[i] = { ...next[i], ...patch };
      return {
        intake: {
          ...prev.intake,
          medications: { ...prev.intake.medications, value: next },
        },
      };
    });
  };

  const runVerify = async (i: number, overrides?: Partial<MedicationEntry>) => {
    const m = { ...meds[i], ...(overrides ?? {}) };
    if (!m.name || m.name.trim().length < 2) {
      setRow(i, { loading: false, error: "Add a drug name first." });
      return;
    }
    setRow(i, { loading: true, error: undefined });
    try {
      const result = await verifyFn({
        data: {
          name: m.name.trim(),
          strength: m.strength?.trim() || undefined,
          doseForm: m.doseForm?.trim() || undefined,
        },
      });
      persist(i, { ...(overrides ?? {}), rxVerification: toRxVerification(result) });
      setRow(i, { loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setRow(i, { loading: false, error: message });
    }
  };

  const selectCandidate = async (i: number, candidate: { rxcui: string; name: string; tty: string }) => {
    const parsed = parseProduct(candidate.name);
    // Re-run with the candidate's strength/dose form so the server resolves to a verified SCD/SBD.
    await runVerify(i, {
      name: candidate.name.split(/\s+/)[0],
      strength: parsed.strength ?? meds[i].strength ?? null,
      doseForm: parsed.doseForm ?? meds[i].doseForm ?? null,
    });
  };

  return (
    <div className="rounded-2xl border border-line bg-paper p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-serif text-lg">Medication verification</h3>
        <span className="text-[10px] uppercase tracking-wide text-muted-2">RxNorm · NLM</span>
      </div>
      <p className="text-xs text-muted-2 mb-4">
        Each prescription is checked against the National Library of Medicine's RxNorm database for an exact drug, strength, and dose form match.
      </p>

      <ul className="space-y-3">
        {meds.map((m, i) => {
          const row = rows[i] ?? { loading: false };
          const v = m.rxVerification;
          const autoVerifying = isMedVerifying(medFingerprint(m));
          return (
            <li key={i} className="rounded-lg border border-line bg-canvas/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm flex items-center gap-1.5">
                    {statusBadge(v?.status)}
                    <span className="truncate">{m.name || "(no name)"}</span>
                  </div>
                  <div className="text-xs text-muted-2">
                    {[m.strength, m.doseForm, m.frequency].filter(Boolean).join(" · ") || "No details yet"}
                  </div>
                  {!row.loading && autoVerifying && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-accent font-medium">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Auto-verifying against RxNorm…
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={row.loading || autoVerifying || !m.name}
                  onClick={() => runVerify(i)}
                  className="shrink-0"
                >
                  {row.loading || autoVerifying ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : v ? (
                    "Re-check"
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>

              {row.error && <p className="mt-2 text-xs text-red-600">{row.error}</p>}

              {v && (
                <div className="mt-2.5 space-y-2">
                  <StatusLine v={v} />

                  {v.status === "verified" && v.canonicalName && (
                    <div className="rounded-md border border-accent/40 bg-accent/5 px-2.5 py-1.5 text-xs">
                      <div className="font-medium">{v.canonicalName}</div>
                      <div className="text-muted-2">
                        RxCUI {v.rxcui}
                        {v.tty ? ` · ${v.tty}` : ""}
                        {v.ingredient ? ` · ingredient: ${v.ingredient}` : ""}
                      </div>
                      {v.brandNames.length > 0 && (
                        <div className="text-muted-2 mt-0.5">Brands: {v.brandNames.join(", ")}</div>
                      )}
                      <div className="mt-1 flex gap-3 text-[10px] uppercase tracking-wide">
                        <span className={v.strengthMatch ? "text-green-700" : "text-amber-700"}>
                          Strength {v.strengthMatch ? "match" : "—"}
                        </span>
                        <span className={v.doseFormMatch ? "text-green-700" : "text-amber-700"}>
                          Dose form {v.doseFormMatch ? "match" : "—"}
                        </span>
                      </div>
                    </div>
                  )}

                  {(v.status === "needs_detail" || v.status === "ambiguous") && v.candidates.length > 0 && (
                    <ul className="space-y-1.5">
                      {v.candidates.slice(0, 4).map((c) => (
                        <li key={c.rxcui}>
                          <button
                            type="button"
                            onClick={() => selectCandidate(i, c)}
                            className="w-full text-left rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs transition hover:border-accent/60"
                          >
                            <div className="font-medium">{c.name}</div>
                            <div className="text-muted-2">
                              RxCUI {c.rxcui}
                              {c.tty ? ` · ${c.tty}` : ""}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function statusBadge(status?: RxVerification["status"]) {
  if (status === "verified") return <BadgeCheck className="h-4 w-4 text-green-600" aria-label="Verified" />;
  if (status === "ambiguous") return <AlertTriangle className="h-4 w-4 text-amber-600" aria-label="Ambiguous" />;
  if (status === "needs_detail") return <HelpCircle className="h-4 w-4 text-amber-600" aria-label="Needs detail" />;
  if (status === "not_found") return <XCircle className="h-4 w-4 text-red-600" aria-label="Not found" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-red-600" aria-label="Error" />;
  return <ShieldQuestion className="h-4 w-4 text-muted-2/70" aria-label="Not yet verified" />;
}

function StatusLine({ v }: { v: RxVerification }) {
  const corrected = v.spellingCorrected ? (
    <span className="text-muted-2"> Spelling matched to <em>{v.spellingCorrected}</em>.</span>
  ) : null;
  if (v.status === "verified")
    return (
      <p className="text-xs text-green-700">
        Verified against RxNorm.{corrected}
      </p>
    );
  if (v.status === "needs_detail")
    return (
      <p className="text-xs text-amber-700">
        Found the drug — pick the right strength &amp; form below.{corrected}
      </p>
    );
  if (v.status === "ambiguous")
    return (
      <p className="text-xs text-amber-700">
        Multiple matches — pick the right one below.{corrected}
      </p>
    );
  if (v.status === "not_found")
    return <p className="text-xs text-red-700">No RxNorm match. Double-check spelling or add strength.</p>;
  return <p className="text-xs text-red-700">Lookup failed{v.message ? `: ${v.message}` : ""}.</p>;
}
