import { useEffect, useState, useCallback } from "react";
import type { UIMessage } from "ai";
import { emptyIntake, type Intake, type IntakeMode } from "@/lib/v3/intake-types";

export type HybridPath = "doctor-first" | "drug-first" | "budget-first" | "new-to-medicare";

export type SessionState = {
  mode: IntakeMode | null;
  path?: HybridPath;
  messages: UIMessage[];
  intake: Intake;
  finalPriorities: string[];
  finished: boolean;
};

const KEY = "v4-medicare-compass-session-v1";

const initial: SessionState = {
  mode: null,
  messages: [],
  intake: emptyIntake(),
  finalPriorities: [],
  finished: false,
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
