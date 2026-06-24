// Shared session store used by both v3 (Shop Your Way intake) and v1 (Workspace).
// The v3 intake is the single source of truth for the Workspace drawer.
export { useSession, type SessionState } from "./v3/session-store";
export type { Intake, DoctorEntry, MedicationEntry } from "./v3/intake-types";
export { intakeCompleteness, CRITICAL_FIELDS, FIELD_LABELS } from "./v3/intake-types";

const HANDOFF_KEY = "workspace-handoff-from-v3";

export function flagWorkspaceHandoff() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HANDOFF_KEY, "1");
  } catch {}
}

export function consumeWorkspaceHandoff(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.sessionStorage.getItem(HANDOFF_KEY);
    if (v) {
      window.sessionStorage.removeItem(HANDOFF_KEY);
      return true;
    }
  } catch {}
  return false;
}
