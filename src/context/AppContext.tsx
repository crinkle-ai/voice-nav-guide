import { createContext, useContext, useReducer, useEffect, type ReactNode } from "react";

export type PageKey = "home" | "education" | "doctor-lookup" | "plan-comparison";
export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface AppState {
  currentPage: PageKey;
  previousPage: string | null;
  highlightedSection: string | null;
  navigatorOpen: boolean;
  voiceState: VoiceState;
  transcript: Message[];
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
  | { type: "COMPLETE_STEP"; step: string };

const initialState: AppState = {
  currentPage: "home",
  previousPage: null,
  highlightedSection: null,
  navigatorOpen: false,
  voiceState: "idle",
  transcript: [],
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
        journey: {
          ...state.journey,
          completedSteps: [...state.journey.completedSteps, action.step],
        },
      };
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
