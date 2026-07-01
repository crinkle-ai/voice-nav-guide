import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type UhcUser = {
  name: string;
  memberId: string;
  email: string;
  signedInAt: number;
  lastVisitAt: number;
  // Simulated server-side change marker; the recap card fires only when this
  // is newer than lastVisitAt. CH handles the real HIPAA-compliant sync.
  lastServerChangeAt?: number;
  serverChangeSummary?: string;
  // Set when the account was created in this session via the HealthSafe ID
  // signup path (vs. an existing HealthSafe ID sign-in).
  accountCreatedAt?: number;
};

export type AuthState = {
  user: UhcUser | null;
  // Once dismissed in a session, don't re-nag with the inline save card.
  savePromptDismissed?: boolean;
  // Once the inline save card has been shown, don't show it a second time.
  savePromptShown?: boolean;
  // A local "share invite" for the caregiver (mock — no real email is sent).
  caregiverInvite?: {
    email: string;
    access: "read" | "write";
    sentAt: number;
    token: string;
  };
};

const KEY = "v4-uhc-auth-v1";

const initial: AuthState = { user: null };

function read(): AuthState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initial;
    return { ...initial, ...JSON.parse(raw) };
  } catch {
    return initial;
  }
}

function write(s: AuthState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

let current: AuthState = initial;
let hydrated = false;
const listeners = new Set<() => void>();

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
function setState(patch: Partial<AuthState> | ((s: AuthState) => Partial<AuthState>)) {
  ensureHydrated();
  const next = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
  current = next;
  write(next);
  listeners.forEach((l) => l());
}

const SAMPLE_NAMES = [
  { name: "Margaret Chen", email: "margaret.chen@example.com", memberId: "CH-4728-1930" },
];

export function useAuth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureHydrated();
    setReady(true);
  }, []);

  const signIn = useCallback(
    (partial?: Partial<UhcUser>) => {
      const now = Date.now();
      const sample = SAMPLE_NAMES[0];
      const prior = current.user;
      const user: UhcUser = {
        name: partial?.name ?? prior?.name ?? sample.name,
        memberId: partial?.memberId ?? prior?.memberId ?? sample.memberId,
        email: partial?.email ?? prior?.email ?? sample.email,
        signedInAt: now,
        lastVisitAt: prior?.lastVisitAt ?? now,
        lastServerChangeAt: prior?.lastServerChangeAt,
        serverChangeSummary: prior?.serverChangeSummary,
      };
      setState({ user, savePromptShown: true });
    },
    [],
  );

  const signUp = useCallback(
    (partial?: Partial<UhcUser>) => {
      const now = Date.now();
      const sample = SAMPLE_NAMES[0];
      const user: UhcUser = {
        name: partial?.name ?? sample.name,
        memberId: partial?.memberId ?? sample.memberId,
        email: partial?.email ?? sample.email,
        signedInAt: now,
        lastVisitAt: now,
        // Brand-new account — no prior server-side state, so the recap card
        // should not fire on this session.
        lastServerChangeAt: undefined,
        serverChangeSummary: undefined,
        accountCreatedAt: now,
      };
      setState({ user, savePromptShown: true });
    },
    [],
  );

  const signOut = useCallback(() => {
    setState({
      user: null,
      savePromptShown: false,
      savePromptDismissed: false,
    });
  }, []);

  const markVisit = useCallback(() => {
    setState((s) => (s.user ? { user: { ...s.user, lastVisitAt: Date.now() } } : {}));
  }, []);

  const dismissSavePrompt = useCallback(() => {
    setState({ savePromptDismissed: true, savePromptShown: true });
  }, []);

  const markSavePromptShown = useCallback(() => {
    setState({ savePromptShown: true });
  }, []);

  const setCaregiverInvite = useCallback(
    (invite: AuthState["caregiverInvite"]) => setState({ caregiverInvite: invite }),
    [],
  );

  // Demo helper — simulate a server-side change so the recap card fires.
  const simulateServerChange = useCallback((summary: string) => {
    setState((s) =>
      s.user
        ? {
            user: {
              ...s.user,
              lastServerChangeAt: Date.now(),
              serverChangeSummary: summary,
            },
          }
        : {},
    );
  }, []);

  return {
    state,
    user: state.user,
    ready,
    signIn,
    signUp,
    signOut,
    markVisit,
    dismissSavePrompt,
    markSavePromptShown,
    setCaregiverInvite,
    simulateServerChange,
  };
}

