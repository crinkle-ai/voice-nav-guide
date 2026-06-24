import { useEffect, useState, useCallback } from "react";
import type { UIMessage } from "ai";
import { emptyIntake, type Intake, type IntakeMode } from "./intake-types";

export type SessionState = {
  mode: IntakeMode | null;
  messages: UIMessage[];
  intake: Intake;
  finalPriorities: string[];
  finished: boolean;
  source: "v3" | "v4" | "manual" | null;
  sourceMode?: "ramble" | "structured" | "hybrid" | null;
  hybridPath?: "doctor-first" | "drug-first" | "budget-first" | "new-to-medicare" | null;
  lensOverride?: string | null;
};

export const V3_SESSION_KEY = "v3-medicare-compass-session-v1";
const KEY = V3_SESSION_KEY;

const initial: SessionState = {
  mode: null,
  messages: [],
  intake: emptyIntake(),
  finalPriorities: [],
  finished: false,
  source: null,
  sourceMode: null,
  hybridPath: null,
  lensOverride: null,
};



function read(): SessionState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initial;
    return { ...initial, ...JSON.parse(raw) };
  } catch {
    return initial;
  }
}

function write(s: SessionState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function useSession() {
  const [state, setState] = useState<SessionState>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(read());
    setReady(true);
  }, []);

  const update = useCallback(
    (patch: Partial<SessionState> | ((s: SessionState) => Partial<SessionState>)) => {
      setState((prev) => {
        const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
        write(next);
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    write(initial);
    setState(initial);
  }, []);

  return { state, update, reset, ready };
}
