import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyProvider } from "@/lib/v3/providers.functions";
import { verifyMedication } from "@/lib/v3/medications.functions";
import { useSession } from "@/lib/v4/session-store";
import { useAutoVerifyProgress } from "@/components/v4/auto-verify-context";
import type { DoctorEntry, MedicationEntry, NpiVerification, RxVerification } from "@/lib/v3/intake-types";

const BASE_RX: RxVerification = {
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

function medFingerprint(m: MedicationEntry): string {
  return [m.name, m.strength, m.doseForm].map((s) => (s ?? "").trim().toLowerCase()).join("|");
}
function docFingerprint(d: DoctorEntry): string {
  return [d.name, d.specialty, d.city, d.zip].map((s) => (s ?? "").trim().toLowerCase()).join("|");
}

/**
 * Auto-verifies any captured doctors / medications against NPPES + RxNorm whenever
 * the assistant extracts a new entry (or the user edits one). Skips entries that
 * already carry a verification result and entries we've already attempted in this
 * session to prevent retry loops on error / not_found.
 */
export function useAutoVerifyIntake() {
  const { state, update, ready } = useSession();
  const { startDoc, finishDoc, startMed, finishMed } = useAutoVerifyProgress();
  const verifyDoc = useServerFn(verifyProvider);
  const verifyMed = useServerFn(verifyMedication);

  const attemptedDocs = useRef<Set<string>>(new Set());
  const attemptedMeds = useRef<Set<string>>(new Set());

  const doctors = state.intake.doctors.value;
  const medications = state.intake.medications.value;

  useEffect(() => {
    if (!ready) return;
    doctors.forEach((d, i) => {
      if (!d.name || d.name.trim().length < 2) return;
      if (d.npiVerification) return; // already verified (manually or previously)
      const fp = docFingerprint(d);
      if (attemptedDocs.current.has(fp)) return;
      attemptedDocs.current.add(fp);

      void (async () => {
        try {
          const result = await verifyDoc({
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
          update((prev) => {
            const next = [...prev.intake.doctors.value];
            // Re-find by name in case the list shifted between issue & resolve.
            const idx = next.findIndex((x) => docFingerprint(x) === fp);
            const target = idx >= 0 ? idx : i;
            if (!next[target]) return {};
            next[target] = { ...next[target], npiVerification: verification, verification: flag };
            return { intake: { ...prev.intake, doctors: { ...prev.intake.doctors, value: next } } };
          });
        } catch {
          // Silent fail — user can still hit Re-check in the panel.
        }
      })();
    });
  }, [doctors, ready, update, verifyDoc]);

  useEffect(() => {
    if (!ready) return;
    medications.forEach((m, i) => {
      if (!m.name || m.name.trim().length < 2) return;
      if (m.rxVerification) return;
      const fp = medFingerprint(m);
      if (attemptedMeds.current.has(fp)) return;
      attemptedMeds.current.add(fp);

      void (async () => {
        try {
          const result = await verifyMed({
            data: {
              name: m.name.trim(),
              strength: m.strength?.trim() || undefined,
              doseForm: m.doseForm?.trim() || undefined,
            },
          });
          const base = { ...BASE_RX, checkedAt: new Date().toISOString() };
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
          update((prev) => {
            const next = [...prev.intake.medications.value];
            const idx = next.findIndex((x) => medFingerprint(x) === fp);
            const target = idx >= 0 ? idx : i;
            if (!next[target]) return {};
            next[target] = { ...next[target], rxVerification };
            return { intake: { ...prev.intake, medications: { ...prev.intake.medications, value: next } } };
          });
        } catch {
          // Silent fail.
        }
      })();
    });
  }, [medications, ready, update, verifyMed]);
}
