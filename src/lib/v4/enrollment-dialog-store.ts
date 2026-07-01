import { useSyncExternalStore } from "react";
import { useSession, type EnrollmentApplication } from "@/lib/v4/session-store";
import type { RecommendedPlan } from "@/components/v4/chat-cards/plan-comparison";

type State = { open: boolean };
let state: State = { open: false };
const listeners = new Set<() => void>();
function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function openEnrollment() {
  set({ open: true });
}
export function closeEnrollment() {
  set({ open: false });
}

export function useEnrollmentDialogOpen(): [boolean, (v: boolean) => void] {
  const open = useSyncExternalStore(
    subscribe,
    () => state.open,
    () => false,
  );
  return [open, (v: boolean) => set({ open: v })];
}

export function useStartEnrollment() {
  const { state: session, update } = useSession();
  return (primary: RecommendedPlan, paired?: RecommendedPlan) => {
    const strategy: EnrollmentApplication["strategy"] =
      primary.type === "Medigap"
        ? "medigap-plus-partd"
        : primary.type === "D-SNP"
          ? "dsnp"
          : "medicare-advantage";
    const existing = session.enrollment;
    const isSame = existing && existing.planId === primary.id;
    const app: EnrollmentApplication = isSame
      ? existing!
      : {
          planId: primary.id,
          planName: primary.name,
          pairedPlanId: paired?.id,
          pairedPlanName: paired?.name,
          strategy,
          status: "draft",
          step: "intro",
          startedAt: Date.now(),
          info: {
            zip: session.intake.zip.value,
          } as EnrollmentApplication["info"],
        };
    update({ enrollment: app });
    openEnrollment();
  };
}
