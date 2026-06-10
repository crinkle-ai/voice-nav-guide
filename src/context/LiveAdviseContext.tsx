import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

export type LiveAdviseStatus = "idle" | "connecting" | "connected" | "ended";

export interface TranscriptLine {
  id: string;
  speaker: "agent" | "you";
  text: string;
  at: number;
}

export interface PushedPlan {
  id: string;
  name: string;
  carrier: string;
  type: string;
  premium: number;
  deductible: number;
  moop: number;
  dental: boolean;
  vision: boolean;
  drug: boolean;
  highlight?: string;
}

interface LiveAdviseState {
  status: LiveAdviseStatus;
  speaking: boolean;
  transcript: TranscriptLine[];
  highlightSelector: string | null;
  highlightLabel: string | null;
  pushedComparison: PushedPlan[] | null;
  comparisonHighlightRow: string | null;
  agent: {
    name: string;
    title: string;
    license: string;
    state: string;
    avatar: string;
  };
}

interface LiveAdviseContext extends LiveAdviseState {
  startCall: (opts?: { from?: string }) => void;
  endCall: () => void;
  closeComparison: () => void;
  contextSummary: string;
}

const Ctx = createContext<LiveAdviseContext | null>(null);

import agentAvatar from "@/assets/agent-sarah.jpg";

const AGENT = {
  name: "Sarah Chen",
  title: "Licensed Medicare Advisor",
  license: "NPN #19284756",
  state: "TX",
  avatar: agentAvatar,
};

const DEMO_PLANS: PushedPlan[] = [
  {
    id: "demo-aetna",
    name: "Aetna Medicare Premier PPO",
    carrier: "Aetna",
    type: "Medicare Advantage",
    premium: 0,
    deductible: 0,
    moop: 6700,
    dental: true,
    vision: true,
    drug: true,
  },
  {
    id: "demo-humana",
    name: "Humana Gold Plus HMO",
    carrier: "Humana",
    type: "Medicare Advantage",
    premium: 19,
    deductible: 0,
    moop: 4900,
    dental: true,
    vision: true,
    drug: true,
  },
];

type ScriptStep =
  | { at: number; kind: "transcript"; speaker: "agent" | "you"; text: string }
  | { at: number; kind: "highlight"; selector: string | null; label?: string | null }
  | { at: number; kind: "speaking"; on: boolean }
  | { at: number; kind: "pushComparison" }
  | { at: number; kind: "comparisonHighlight"; row: string | null };

function buildScript(pathname: string): ScriptStep[] {
  const onCompare = pathname.startsWith("/compare-plans");
  const onDoctors = pathname.startsWith("/find-doctors");
  const opener = onCompare
    ? "Hi! I'm Sarah — I can see your screen. Looks like you're comparing Medicare Advantage plans. Want me to walk through the top two with you?"
    : onDoctors
      ? "Hi! I'm Sarah — I can see you're checking which doctors are in-network. Happy to help you confirm coverage."
      : "Hi! I'm Sarah — thanks for reaching out. I can see your screen. Mind if I walk you through your options?";

  return [
    { at: 0, kind: "speaking", on: true },
    { at: 0, kind: "transcript", speaker: "agent", text: opener },
    { at: 5500, kind: "speaking", on: false },
    { at: 6000, kind: "highlight", selector: onCompare ? "#plan-results" : "#hero", label: "Here's what I see" },
    { at: 7500, kind: "speaking", on: true },
    {
      at: 7500,
      kind: "transcript",
      speaker: "agent",
      text: onCompare
        ? "I'll pull the two strongest options side-by-side so we can compare premium, out-of-pocket max, and dental together."
        : "Let me share a quick side-by-side of two popular Medicare Advantage plans in your area.",
    },
    { at: 12000, kind: "speaking", on: false },
    { at: 12500, kind: "pushComparison" },
    { at: 13500, kind: "comparisonHighlight", row: "premium" },
    { at: 14000, kind: "speaking", on: true },
    {
      at: 14000,
      kind: "transcript",
      speaker: "agent",
      text: "The Aetna PPO is $0/month with a higher out-of-pocket max. The Humana HMO is $19/month but caps your annual costs lower.",
    },
    { at: 20000, kind: "comparisonHighlight", row: "moop" },
    { at: 20500, kind: "speaking", on: false },
    { at: 22000, kind: "comparisonHighlight", row: "dental" },
    { at: 22500, kind: "speaking", on: true },
    {
      at: 22500,
      kind: "transcript",
      speaker: "agent",
      text: "Both include dental and vision — that's usually the deciding factor for first-timers. Any specific dental work coming up?",
    },
    { at: 28000, kind: "speaking", on: false },
    { at: 30000, kind: "highlight", selector: null, label: null },
    { at: 30000, kind: "comparisonHighlight", row: null },
    { at: 30500, kind: "speaking", on: true },
    {
      at: 30500,
      kind: "transcript",
      speaker: "agent",
      text: "I'm here whenever you're ready — no pressure. Take your time, and ping me if you want to enroll together.",
    },
    { at: 36000, kind: "speaking", on: false },
  ];
}

export function LiveAdviseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LiveAdviseStatus>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [highlightSelector, setHighlightSelector] = useState<string | null>(null);
  const [highlightLabel, setHighlightLabel] = useState<string | null>(null);
  const [pushedComparison, setPushedComparison] = useState<PushedPlan[] | null>(null);
  const [comparisonHighlightRow, setComparisonHighlightRow] = useState<string | null>(null);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const idCounter = useRef(0);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const resetState = useCallback(() => {
    setSpeaking(false);
    setTranscript([]);
    setHighlightSelector(null);
    setHighlightLabel(null);
    setPushedComparison(null);
    setComparisonHighlightRow(null);
  }, []);

  const runScript = useCallback((script: ScriptStep[]) => {
    for (const step of script) {
      const t = setTimeout(() => {
        switch (step.kind) {
          case "transcript":
            setTranscript((prev) => [
              ...prev,
              { id: `t-${idCounter.current++}`, speaker: step.speaker, text: step.text, at: Date.now() },
            ]);
            break;
          case "highlight":
            setHighlightSelector(step.selector);
            setHighlightLabel(step.label ?? null);
            break;
          case "speaking":
            setSpeaking(step.on);
            break;
          case "pushComparison":
            setPushedComparison(DEMO_PLANS);
            break;
          case "comparisonHighlight":
            setComparisonHighlightRow(step.row);
            break;
        }
      }, step.at);
      timersRef.current.push(t);
    }
  }, []);

  const startCall = useCallback(() => {
    clearTimers();
    resetState();
    setStatus("connecting");
    const connectTimer = setTimeout(() => {
      setStatus("connected");
      const script = buildScript(pathRef.current);
      runScript(script);
    }, 1800);
    timersRef.current.push(connectTimer);
  }, [clearTimers, resetState, runScript]);

  const endCall = useCallback(() => {
    clearTimers();
    setStatus("ended");
    setSpeaking(false);
    setHighlightSelector(null);
    setComparisonHighlightRow(null);
    // Auto-reset to idle after a moment so panel can fully unmount
    const t = setTimeout(() => {
      setStatus("idle");
      resetState();
    }, 600);
    timersRef.current.push(t);
  }, [clearTimers, resetState]);

  const closeComparison = useCallback(() => {
    setPushedComparison(null);
    setComparisonHighlightRow(null);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const contextSummary = useMemo(() => {
    if (pathname.startsWith("/compare-plans")) return "Compare Plans · Medicare Advantage, ZIP 78701";
    if (pathname.startsWith("/find-doctors")) return "Find Doctors · checking in-network coverage";
    if (pathname.startsWith("/learn")) return "Medicare Basics · reading about Parts A & B";
    if (pathname.startsWith("/my-plans")) return "My Saved Plans · 2 plans saved";
    return "Crinkle Health home · just getting started";
  }, [pathname]);

  const value = useMemo<LiveAdviseContext>(
    () => ({
      status,
      speaking,
      transcript,
      highlightSelector,
      highlightLabel,
      pushedComparison,
      comparisonHighlightRow,
      agent: AGENT,
      startCall,
      endCall,
      closeComparison,
      contextSummary,
    }),
    [status, speaking, transcript, highlightSelector, highlightLabel, pushedComparison, comparisonHighlightRow, startCall, endCall, closeComparison, contextSummary],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLiveAdvise() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLiveAdvise must be used within LiveAdviseProvider");
  return ctx;
}
