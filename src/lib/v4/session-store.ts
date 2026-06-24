import { useEffect, useState, useCallback } from "react";
import type { UIMessage } from "ai";
import { emptyIntake, type Intake, type IntakeMode } from "@/lib/v3/intake-types";
import { V3_SESSION_KEY } from "@/lib/v3/session-store";

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

function mirrorToV3(s: SessionState) {
  // Single source of truth: feed the v1 Workspace from v3 store.
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(V3_SESSION_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    const next = {
      ...prev,
      mode: s.mode,
      intake: s.intake,
      finalPriorities: s.finalPriorities,
      finished: s.finished,
      source: "v4",
    };
    window.localStorage.setItem(V3_SESSION_KEY, JSON.stringify(next));
  } catch {}
}

function write(s: SessionState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
  mirrorToV3(s);
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
