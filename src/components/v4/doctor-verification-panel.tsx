import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyProvider, type VerifyProviderResult } from "@/lib/v3/providers.functions";
import { useSession } from "@/lib/v4/session-store";
import type { DoctorEntry, NpiVerification } from "@/lib/v3/intake-types";
import { Button } from "@/components/ui/button";
import { BadgeCheck, AlertTriangle, XCircle, Loader2, ShieldQuestion } from "lucide-react";

type RowState = { loading: boolean; error?: string };

export function DoctorVerificationPanel() {
  const { state, update } = useSession();
  const verifyFn = useServerFn(verifyProvider);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const doctors = state.intake.doctors.value;

  if (doctors.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-paper p-5">
        <h3 className="font-serif text-lg mb-1">Provider verification</h3>
        <p className="text-xs text-muted-2">
          As you mention doctors, they'll appear here. We check each one against the{" "}
          <span className="font-medium">NPPES NPI Registry</span> (CMS) to confirm name, specialty, and practice address.
        </p>
      </div>
    );
  }

  const setRow = (i: number, patch: RowState) => setRows((r) => ({ ...r, [i]: { ...r[i], ...patch } }));

  const persist = (i: number, patch: Partial<DoctorEntry>) => {
    update((prev) => {
      const next = [...prev.intake.doctors.value];
      next[i] = { ...next[i], ...patch };
      return {
        intake: {
          ...prev.intake,
          doctors: { ...prev.intake.doctors, value: next },
        },
      };
    });
  };

  const runVerify = async (i: number, d: DoctorEntry) => {
    setRow(i, { loading: true, error: undefined });
    try {
      const result: VerifyProviderResult = await verifyFn({
        data: {
          name: d.name,
          specialty: d.specialty ?? undefined,
          city: d.city ?? undefined,
          postalCode: d.zip ?? undefined,
        },
      });
      const matches = result.matches.map(({ score: _score, ...rest }) => rest);
      const verification: NpiVerification = {
        status: result.status,
        checkedAt: new Date().toISOString(),
        matches,
        selectedNpi: result.status === "verified" && matches[0] ? matches[0].npi : null,
        message: result.status === "error" ? result.message : undefined,
      };
      const flag: DoctorEntry["verification"] =
        result.status === "verified" ? "high" : result.status === "ambiguous" ? "low" : "unverified";
      persist(i, { npiVerification: verification, verification: flag });
      setRow(i, { loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setRow(i, { loading: false, error: message });
    }
  };

  const selectMatch = (i: number, npi: string) => {
    const d = doctors[i];
    if (!d.npiVerification) return;
    persist(i, {
      npiVerification: { ...d.npiVerification, selectedNpi: npi, status: "verified" },
      verification: "high",
    });
  };

  return (
    <div className="rounded-2xl border border-line bg-paper p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-serif text-lg">Provider verification</h3>
        <span className="text-[10px] uppercase tracking-wide text-muted-2">NPPES · CMS</span>
      </div>
      <p className="text-xs text-muted-2 mb-4">
        Each doctor is checked against the federal NPI Registry. Confirm the match so plan fit reflects real providers.
      </p>

      <ul className="space-y-3">
        {doctors.map((d, i) => {
          const row = rows[i] ?? { loading: false };
          const v = d.npiVerification;
          return (
            <li key={i} className="rounded-lg border border-line bg-canvas/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm flex items-center gap-1.5">
                    {statusBadge(v?.status)}
                    <span className="truncate">{d.name || "(no name)"}</span>
                  </div>
                  <div className="text-xs text-muted-2">
                    {[d.specialty, d.city, d.zip].filter(Boolean).join(" · ") || "No details yet"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={row.loading || !d.name}
                  onClick={() => runVerify(i, d)}
                  className="shrink-0"
                >
                  {row.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : v ? "Re-check" : "Verify"}
                </Button>
              </div>

              {row.error && <p className="mt-2 text-xs text-red-600">{row.error}</p>}

              {v && (
                <div className="mt-2.5">
                  <StatusLine v={v} />
                  {v.matches.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {v.matches.slice(0, 3).map((m) => {
                        const selected = v.selectedNpi === m.npi;
                        const addr = [m.primaryAddress.city, m.primaryAddress.state, m.primaryAddress.postalCode]
                          .filter(Boolean)
                          .join(" ");
                        return (
                          <li key={m.npi}>
                            <button
                              type="button"
                              onClick={() => selectMatch(i, m.npi)}
                              className={`w-full text-left rounded-md border px-2.5 py-1.5 text-xs transition ${
                                selected
                                  ? "border-accent bg-accent/5"
                                  : "border-line bg-paper hover:border-accent/60"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">
                                  {m.firstName} {m.lastName}
                                  {m.credential ? `, ${m.credential}` : ""}
                                </span>
                                <span className="text-[10px] text-muted-2">NPI {m.npi}</span>
                              </div>
                              <div className="text-muted-2">
                                {m.primaryTaxonomy ?? "Specialty unknown"}
                                {addr ? ` · ${addr}` : ""}
                              </div>
                              <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-2">
                                {selected ? "Selected" : "Tap to select"}
                              </div>
                            </button>
                          </li>
                        );
                      })}
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

function statusBadge(status?: NpiVerification["status"]) {
  if (status === "verified") return <BadgeCheck className="h-4 w-4 text-green-600" aria-label="Verified" />;
  if (status === "ambiguous") return <AlertTriangle className="h-4 w-4 text-amber-600" aria-label="Ambiguous" />;
  if (status === "not_found") return <XCircle className="h-4 w-4 text-red-600" aria-label="Not found" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-red-600" aria-label="Error" />;
  return <ShieldQuestion className="h-4 w-4 text-muted-2/70" aria-label="Not yet verified" />;
}

function StatusLine({ v }: { v: NpiVerification }) {
  if (v.status === "verified")
    return <p className="text-xs text-green-700">Verified against NPPES{v.matches.length > 1 ? " — top match selected" : ""}.</p>;
  if (v.status === "ambiguous")
    return <p className="text-xs text-amber-700">Multiple possible matches — pick the right one below.</p>;
  if (v.status === "not_found")
    return <p className="text-xs text-red-700">No NPPES match. Try adding specialty, city, or ZIP.</p>;
  return <p className="text-xs text-red-700">Lookup failed{v.message ? `: ${v.message}` : ""}.</p>;
}
