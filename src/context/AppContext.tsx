import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from "react";

export type PageKey = "home" | "education" | "doctor-lookup" | "plan-comparison";
export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface DoctorVoiceFilters {
  specialty?: string;
  city?: string;
  name?: string;
}
export interface PlanVoiceFilters {
  type?: string;
  maxPremium?: number;
  needsDrug?: boolean;
  needsDental?: boolean;
  needsVision?: boolean;
}

export interface AppState {
  currentPage: PageKey;
  previousPage: string | null;
  highlightedSection: string | null;
  navigatorOpen: boolean;
  voiceState: VoiceState;
  transcript: Message[];
  pendingPrompt: string | null;
  savedDoctorIds: string[];
  comparePlanIds: string[];
  doctorVoiceFilters: DoctorVoiceFilters | null;
  planVoiceFilters: PlanVoiceFilters | null;
  journey: {
    visitedPages: string[];
    completedSteps: string[];
    currentStep: number;
    totalSteps: 4;
  };
}

type Action =
  | { type: "SET_PAGE"; page: PageKey; path: string }
  | { type: "SET_HIGHLIGHT"; section: string | null }
  | { type: "TOGGLE_NAVIGATOR"; open?: boolean }
  | { type: "SET_VOICE_STATE"; voiceState: VoiceState }
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "COMPLETE_STEP"; step: string }
  | { type: "SET_PENDING_PROMPT"; prompt: string | null }
  | { type: "TOGGLE_SAVED_DOCTOR"; id: string }
  | { type: "TOGGLE_COMPARE_PLAN"; id: string }
  | { type: "SET_DOCTOR_VOICE_FILTERS"; filters: DoctorVoiceFilters | null }
  | { type: "SET_PLAN_VOICE_FILTERS"; filters: PlanVoiceFilters | null };

const initialState: AppState = {
  currentPage: "home",
  previousPage: null,
  highlightedSection: null,
  navigatorOpen: false,
  voiceState: "idle",
  transcript: [],
  pendingPrompt: null,
  savedDoctorIds: [],
  comparePlanIds: [],
  doctorVoiceFilters: null,
  planVoiceFilters: null,
  journey: {
    visitedPages: [],
    completedSteps: [],
    currentStep: 0,
    totalSteps: 4,
  },
};

const STEP_ORDER: PageKey[] = ["home", "education", "doctor-lookup", "plan-comparison"];

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_PAGE": {
      const visited = state.journey.visitedPages.includes(action.path)
        ? state.journey.visitedPages
        : [...state.journey.visitedPages, action.path];
      const stepIndex = STEP_ORDER.indexOf(action.page);
      return {
        ...state,
        previousPage: state.currentPage,
        currentPage: action.page,
        journey: {
          ...state.journey,
          visitedPages: visited,
          currentStep: Math.max(state.journey.currentStep, stepIndex),
        },
      };
    }
    case "SET_HIGHLIGHT":
      return { ...state, highlightedSection: action.section };
    case "TOGGLE_NAVIGATOR":
      return { ...state, navigatorOpen: action.open ?? !state.navigatorOpen };
    case "SET_VOICE_STATE":
      return { ...state, voiceState: action.voiceState };
    case "ADD_MESSAGE":
      return { ...state, transcript: [...state.transcript, action.message] };
    case "COMPLETE_STEP":
      if (state.journey.completedSteps.includes(action.step)) return state;
      return {
        ...state,
        journey: { ...state.journey, completedSteps: [...state.journey.completedSteps, action.step] },
      };
    case "SET_PENDING_PROMPT":
      return { ...state, pendingPrompt: action.prompt };
    case "TOGGLE_SAVED_DOCTOR": {
      const has = state.savedDoctorIds.includes(action.id);
      return {
        ...state,
        savedDoctorIds: has
          ? state.savedDoctorIds.filter((x) => x !== action.id)
          : [...state.savedDoctorIds, action.id],
      };
    }
    case "TOGGLE_COMPARE_PLAN": {
      const has = state.comparePlanIds.includes(action.id);
      if (has) return { ...state, comparePlanIds: state.comparePlanIds.filter((x) => x !== action.id) };
      if (state.comparePlanIds.length >= 3) return state;
      return { ...state, comparePlanIds: [...state.comparePlanIds, action.id] };
    }
    case "SET_DOCTOR_VOICE_FILTERS":
      return { ...state, doctorVoiceFilters: action.filters };
    case "SET_PLAN_VOICE_FILTERS":
      return { ...state, planVoiceFilters: action.filters };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function useTrackPage(page: PageKey, path: string) {
  const { dispatch } = useApp();
  useEffect(() => {
    dispatch({ type: "SET_PAGE", page, path });
  }, [dispatch, page, path]);
}

/** Consume highlighted section: scrolls to + flashes the element, then clears. */
export function useHighlightConsumer() {
  const { state, dispatch } = useApp();
  useEffect(() => {
    const sec = state.highlightedSection;
    if (!sec) return;
    const el = document.getElementById(sec);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-4", "ring-primary", "ring-offset-2", "rounded-lg");
      const t = setTimeout(() => {
        el.classList.remove("ring-4", "ring-primary", "ring-offset-2", "rounded-lg");
        dispatch({ type: "SET_HIGHLIGHT", section: null });
      }, 2400);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => dispatch({ type: "SET_HIGHLIGHT", section: null }), 800);
      return () => clearTimeout(t);
    }
  }, [state.highlightedSection, dispatch]);
}

export function useOpenNavigatorWithPrompt() {
  const { dispatch } = useApp();
  return useCallback(
    (prompt: string) => {
      dispatch({ type: "SET_PENDING_PROMPT", prompt });
      dispatch({ type: "TOGGLE_NAVIGATOR", open: true });
    },
    [dispatch],
  );
}
