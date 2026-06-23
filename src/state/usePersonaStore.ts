import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { persona, type ActivityId, type RouteStep } from "@/mock/personas";

type PersonaState = {
  confidence: number;
  progressPct: number;
  route: RouteStep[];
  concerns: string[];
  priorities: string[];
  questions: { id: string; text: string; answered: boolean }[];
  adaptiveTriggered: boolean;
  lastToast: string | null;
  selfEnrollUnlocked: boolean;
  enrollMomentSeen: boolean;
  extraRambleApplied: boolean;
  reset: () => void;
  completeActivity: (activityId: ActivityId) => { toast?: string; addedStepId?: string };
  clearToast: () => void;
  dismissEnrollMoment: () => void;
  applyExtraRamble: () => { toast?: string; addedStepId?: string };
};

export const SELF_ENROLL_CONFIDENCE_THRESHOLD = 7;

const seed = () => {
  const startingConfidence = persona.understanding.confidence;
  return {
    confidence: startingConfidence,
    progressPct: persona.progressPct,
    route: persona.route.map((s) => ({ ...s })),
    concerns: [...persona.understanding.concerns],
    priorities: [...persona.understanding.priorities],
    questions: persona.questions.map((q) => ({ ...q })),
    adaptiveTriggered: false,
    lastToast: null,
    selfEnrollUnlocked: startingConfidence >= SELF_ENROLL_CONFIDENCE_THRESHOLD,
    enrollMomentSeen: startingConfidence >= SELF_ENROLL_CONFIDENCE_THRESHOLD,
    extraRambleApplied: false,
  };
};

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set, get) => ({
      ...seed(),
  reset: () => set(seed()),
  clearToast: () => set({ lastToast: null }),
  dismissEnrollMoment: () => set({ enrollMomentSeen: true }),
  applyExtraRamble: () => {
    const state = get();
    if (state.extraRambleApplied) return {};
    const extra = persona.extraRamble;
    if (!extra) return {};

    const route = state.route.map((s) => ({ ...s }));
    for (let i = 0; i < route.length; i++) {
      if (route[i].status === "current") route[i] = { ...route[i], status: "upcoming" };
    }
    let insertAt = 0;
    for (let i = route.length - 1; i >= 0; i--) {
      if (route[i].status === "completed") { insertAt = i + 1; break; }
    }
    const inserted: RouteStep = { ...extra.insertStep };
    route.splice(insertAt, 0, inserted);

    const newConfidence = Math.min(10, state.confidence + extra.confidenceImpact);
    const requiredSteps = route.filter((s) => !s.optional);
    const completedRequired = requiredSteps.filter((s) => s.status === "completed").length;
    const newProgress = requiredSteps.length === 0
      ? 100
      : Math.min(100, Math.round((completedRequired / requiredSteps.length) * 100));

    const concerns = state.concerns.includes(extra.newConcern)
      ? state.concerns
      : [...state.concerns, extra.newConcern];
    const priorities = extra.newPriority && !state.priorities.includes(extra.newPriority)
      ? [...state.priorities, extra.newPriority]
      : state.priorities;
    const questions = extra.newQuestion
      ? [...state.questions, { id: `q-extra-${persona.id}`, text: extra.newQuestion, answered: false }]
      : state.questions;

    set({
      route,
      confidence: newConfidence,
      progressPct: newProgress,
      concerns,
      priorities,
      questions,
      lastToast: extra.toast,
      extraRambleApplied: true,
    });

    if (!get().selfEnrollUnlocked && newConfidence >= SELF_ENROLL_CONFIDENCE_THRESHOLD) {
      set({ selfEnrollUnlocked: true, enrollMomentSeen: false });
    }

    return { toast: extra.toast, addedStepId: inserted.id };
  },
  completeActivity: (activityId) => {
    const state = get();
    const route = state.route.map((s) => ({ ...s }));
    const idx = route.findIndex((s) => s.activity === activityId);
    if (idx === -1) return {};
    const step = route[idx];
    if (step.status === "completed") return {};
    route[idx] = { ...step, status: "completed" };
    const nextIdx = route.findIndex((s, i) => i > idx && s.status !== "completed" && !s.optional);
    if (nextIdx !== -1) route[nextIdx] = { ...route[nextIdx], status: "current" };

    const newConfidence = Math.min(10, state.confidence + step.confidenceImpact);
    const requiredSteps = route.filter((s) => !s.optional);
    const completedRequired = requiredSteps.filter((s) => s.status === "completed").length;
    const newProgress = requiredSteps.length === 0
      ? 100
      : Math.min(100, Math.round((completedRequired / requiredSteps.length) * 100));

    let toast: string | undefined;
    let addedStepId: string | undefined;
    let concerns = state.concerns;
    let adaptiveTriggered = state.adaptiveTriggered;

    if (persona.adaptiveMoment && !state.adaptiveTriggered && persona.adaptiveMoment.afterActivity === activityId) {
      const insertAt = idx + 1;
      const inserted: RouteStep = { ...persona.adaptiveMoment.insertStep };
      for (let i = 0; i < route.length; i++) {
        if (route[i].status === "current") route[i] = { ...route[i], status: "upcoming" };
      }
      route.splice(insertAt, 0, inserted);
      concerns = [...concerns, persona.adaptiveMoment.newConcern];
      adaptiveTriggered = true;
      toast = persona.adaptiveMoment.toast;
      addedStepId = inserted.id;
    }

    set({ route, confidence: newConfidence, progressPct: newProgress, concerns, adaptiveTriggered, lastToast: toast ?? null });

    if (!get().selfEnrollUnlocked && newConfidence >= SELF_ENROLL_CONFIDENCE_THRESHOLD) {
      set({ selfEnrollUnlocked: true, enrollMomentSeen: false });
    }

    return { toast, addedStepId };
  },
}));
