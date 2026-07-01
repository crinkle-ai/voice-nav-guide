import { useEffect, useState, useCallback, useSyncExternalStore } from "react";

import type { UIMessage } from "ai";
import type { RecommendedPlan } from "@/components/v4/chat-cards/plan-comparison";
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

export type EnrollmentStep =
  | "intro"
  | "soa"
  | "info"
  | "disclosures"
  | "signature"
  | "review"
  | "submitted"
  | "handed_off";

export type EnrollmentApplication = {
  planId: string;
  pairedPlanId?: string;
  strategy?: "medicare-advantage" | "medigap-plus-partd" | "dsnp";
  status: "draft" | "packaged" | "submitted" | "handed_off";
  step: EnrollmentStep;
  startedAt: number;
  planName?: string;
  pairedPlanName?: string;
  soa?: {
    signedAt: number;
    typedName: string;
    products: string[];
    appointmentDate?: string;
    appointmentWindow?: string;
  };
  info?: {
    legalName?: string;
    dob?: string;
    sex?: "F" | "M" | "X";
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    county?: string;
    mailingSameAsResidence?: boolean;
    mailingAddress1?: string;
    mailingAddress2?: string;
    mailingCity?: string;
    mailingState?: string;
    mailingZip?: string;
    phone?: string;
    email?: string;
    preferredLanguage?: string;
    race?: string;
    ethnicity?: string;
    emergencyContact?: { name?: string; relationship?: string; phone?: string };
    mbi?: string;
    partAEffective?: string;
    partBEffective?: string;
    ssnFull?: string;
    oevPreference?: "phone" | "email" | "mail";
    enrollmentPeriod?: "IEP" | "AEP" | "MA-OEP" | "SEP";
    sepReason?: string;
    requestedEffective?: string;
    // Eligibility & other coverage
    esrd?: "no" | "yes" | "transplant_recovery";
    otherCoverage?: string[]; // ["employer","union","cobra","va","tricare","ihs","medicaid","other"]
    otherCoverageCarrier?: string;
    otherCoveragePolicy?: string;
    medicaidStatus?: "no" | "full" | "partial" | "qmb" | "slmb";
    medicaidId?: string;
    lis?: "no" | "yes" | "unsure";
    institutional?: "community" | "ltc" | "hcbs";
    workingAged?: boolean;
    // MA-specific
    pcp?: { name?: string; npi?: string; currentPatient?: boolean };
    // Medigap-specific
    giReason?: string;
    giLossDate?: string;
    giDocName?: string;
    replacing?: boolean;
    replacePriorCarrier?: string;
    replacePriorPolicy?: string;
    replaceTerminationDate?: string;
    householdDiscount?: boolean;
    heightIn?: string;
    weightLb?: string;
    payment?: {
      method?: "monthly_bill" | "eft" | "card" | "ssa";
      accountLast4?: string;
      routingNumber?: string;
      accountNumber?: string;
      cardPan?: string;
      cardExp?: string;
      cardCvv?: string;
      cardBillingZip?: string;
    };
    tobacco?: boolean;
    ssnLast4?: string;
  };
  attestations?: {
    tpmo?: boolean;
    sob?: boolean;
    stars?: boolean;
    preEnrollment?: boolean;
    maVsMedigap?: boolean;
    releaseInfo?: boolean;
    truthful?: boolean;
    lisAttest?: boolean;
    esrdAck?: boolean;
    oevConsent?: boolean;
    electronicDelivery?: boolean;
    medigapReplacement?: boolean;
    maNetwork?: boolean;
  };
  signature?: {
    signedAt: number;
    typedName: string;
    ip: string;
    onBehalfOf?: { repName: string; relationship: string; authorityType: string };
  };
  handoff?: { agentName: string; agentNpn: string; at: number };
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
  favoritePlans?: RecommendedPlan[];
  cardOrder?: string[];
  enabledCards?: string[];
  enrollment?: EnrollmentApplication;
  caregiver?: {
    name?: string;
    relationship?: string;
    email?: string;
    phone?: string;
    permissions?: string[];
    notes?: string;
    invite?: {
      access: "read" | "write";
      sentAt: number;
      status: "pending" | "accepted";
      token: string;
      inviteUrl: string;
    };
  };

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
