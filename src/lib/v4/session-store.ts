import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import type { UIMessage } from "ai";
import { emptyIntake, type Intake, type IntakeMode } from "@/lib/v3/intake-types";

export type HybridPath = "doctor-first" | "drug-first" | "budget-first" | "new-to-medicare";

export type PermanentAgent = {
  name: string;
  title: string;
  npn: string;
  location: string;
  facts: string[];
  avatar: string;
};

export type SessionState = {
  mode: IntakeMode | null;
  path?: HybridPath;
  messages: UIMessage[];
  intake: Intake;
  finalPriorities: string[];
  finished: boolean;
  permanentAgent?: PermanentAgent;
  sharingActive?: boolean;
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

// Module-level shared store so every useSession() consumer stays in sync.
let current: SessionState = initial;
let resetKey = 0;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  current = read();
  hydrated = true;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot() {
  ensureHydrated();
  return current;
}

function getServerSnapshot() {
  return initial;
}

function getResetKeySnapshot() {
  return resetKey;
}

function setState(patch: Partial<SessionState> | ((s: SessionState) => Partial<SessionState>)) {
  ensureHydrated();
  const next = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
  current = next;
  write(next);
  emit();
}

function resetState() {
  current = initial;
  write(initial);
  resetKey += 1;
  emit();
}

export function useSession() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const key = useSyncExternalStore(subscribe, getResetKeySnapshot, () => 0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureHydrated();
    setReady(true);
  }, []);

  const update = useCallback(setState, []);
  const reset = useCallback(resetState, []);

  return { state, update, reset, ready, resetKey: key };
}
