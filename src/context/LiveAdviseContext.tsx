import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

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
  guidanceToast: string | null;
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
  | { delay?: number; kind: "agentSay"; text: string }
  | { delay?: number; kind: "highlight"; selector: string | null; label: string | null }
  | { delay?: number; kind: "pushComparison" }
  | { delay?: number; kind: "comparisonHighlight"; row: string | null }
  | { delay?: number; kind: "navigate"; to: string }
  | { delay?: number; kind: "scrollTo"; selector: string }
  | { delay?: number; kind: "guidance"; text: string };

function buildScript(pathname: string): ScriptStep[] {
  const onCompare = pathname.startsWith("/compare-plans");
  const onDoctors = pathname.startsWith("/find-doctors");

  const permissionAsk =
    "Hi! I'm Sarah. Before we get started, would it be okay if I viewed your screen so I can walk you through this together? You'll see a prompt from your browser — just hit Allow.";
  const followUp = onCompare
    ? "Perfect, thanks for sharing. Looks like you're comparing Medicare Advantage plans. Mind if I drive for a moment?"
    : onDoctors
      ? "Perfect, thanks for sharing. I can see you're checking which doctors are in-network. Let me pull up plan comparisons that include your saved doctors."
      : "Perfect, thanks for sharing. Mind if I take you to the plan comparison screen so I can show you a couple of strong options?";

  const steps: ScriptStep[] = [
    { kind: "agentSay", text: permissionAsk },
    { delay: 200, kind: "guidance", text: "You allowed Sarah to view your screen" },
    { delay: 800, kind: "agentSay", text: followUp },
  ];

  if (!onCompare) {
    steps.push(
      { delay: 400, kind: "guidance", text: "Sarah is taking you to plan comparison" },
      { delay: 200, kind: "navigate", to: "/compare-plans" },
      { delay: 1200, kind: "agentSay", text: "Okay, I've got us on the comparison screen. Let me scroll down to the results." },
    );
  }

  steps.push(
    { delay: 500, kind: "guidance", text: "Sarah is scrolling to the plan results" },
    { delay: 100, kind: "scrollTo", selector: "#plan-results" },
    { delay: 700, kind: "highlight", selector: "#plan-results", label: "Here's what I see" },
    { delay: 700, kind: "agentSay", text: "I'll pull the two strongest options side-by-side so we can compare premium, out-of-pocket max, and dental together." },
    { delay: 300, kind: "guidance", text: "Sarah pulled up a side-by-side comparison" },
    { delay: 200, kind: "pushComparison" },
    { delay: 1000, kind: "comparisonHighlight", row: "premium" },
    { delay: 500, kind: "agentSay", text: "The Aetna PPO is $0/month with a higher out-of-pocket max. The Humana HMO is $19/month but caps your annual costs lower." },
    { delay: 400, kind: "comparisonHighlight", row: "moop" },
    { delay: 1400, kind: "comparisonHighlight", row: "dental" },
    { delay: 600, kind: "agentSay", text: "Both include dental and vision — that's usually the deciding factor for first-timers. Any specific dental work coming up?" },
    { delay: 600, kind: "highlight", selector: null, label: null },
    { delay: 0, kind: "comparisonHighlight", row: null },
  );

  return steps;
}

// --- Sarah voice (Gemini TTS) ---
let currentSarahAudio: HTMLAudioElement | null = null;
let currentSarahAudioUrl: string | null = null;
let currentSarahRequest: AbortController | null = null;
let currentSarahAudioDone: (() => void) | null = null;
let sarahVoiceRunId = 0;
let sarahVoiceQueue: Promise<void> = Promise.resolve();

function stopSarahVoice() {
  sarahVoiceRunId += 1;

  if (currentSarahRequest) {
    currentSarahRequest.abort();
    currentSarahRequest = null;
  }

  if (currentSarahAudio) {
    currentSarahAudio.pause();
    currentSarahAudio.removeAttribute("src");
    currentSarahAudio.load();
    currentSarahAudio = null;
  }

  if (currentSarahAudioDone) {
    currentSarahAudioDone();
    currentSarahAudioDone = null;
  }

  if (currentSarahAudioUrl) {
    URL.revokeObjectURL(currentSarahAudioUrl);
    currentSarahAudioUrl = null;
  }

  sarahVoiceQueue = Promise.resolve();
}

async function playSarahVoice(text: string) {
  if (typeof window === "undefined") return;

  const runId = sarahVoiceRunId;

  sarahVoiceQueue = sarahVoiceQueue
    .catch(() => {})
    .then(() => playSarahVoiceNow(text, runId));
}

async function playSarahVoiceNow(text: string, runId: number) {
  if (runId !== sarahVoiceRunId) return;

  const controller = new AbortController();
  currentSarahRequest = controller;

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: "Kore" }),
      signal: controller.signal,
    });
    if (!res.ok || controller.signal.aborted || runId !== sarahVoiceRunId) return;
    const blob = await res.blob();
    if (controller.signal.aborted || runId !== sarahVoiceRunId) return;
    const url = URL.createObjectURL(blob);
    if (runId !== sarahVoiceRunId) {
      URL.revokeObjectURL(url);
      return;
    }
    const audio = new Audio(url);
    currentSarahAudioUrl = url;
    currentSarahAudio = audio;
    const cleanup = () => {
      if (currentSarahAudio === audio) currentSarahAudio = null;
      if (currentSarahAudioUrl === url) {
        URL.revokeObjectURL(url);
        currentSarahAudioUrl = null;
      }
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    await new Promise<void>((resolve) => {
      const finish = () => {
        cleanup();
        if (currentSarahAudioDone === finish) currentSarahAudioDone = null;
        resolve();
      };
      currentSarahAudioDone = finish;
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
    });
  } catch {
    /* noop — voice is non-blocking */
  } finally {
    if (currentSarahRequest === controller) currentSarahRequest = null;
  }
}


export function LiveAdviseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LiveAdviseStatus>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [highlightSelector, setHighlightSelector] = useState<string | null>(null);
  const [highlightLabel, setHighlightLabel] = useState<string | null>(null);
  const [pushedComparison, setPushedComparison] = useState<PushedPlan[] | null>(null);
  const [comparisonHighlightRow, setComparisonHighlightRow] = useState<string | null>(null);
  const [guidanceToast, setGuidanceToast] = useState<string | null>(null);

  const navigate = useNavigate();
  const navRef = useRef(navigate);
  useEffect(() => { navRef.current = navigate; }, [navigate]);

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
    setGuidanceToast(null);
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
            if (step.speaker === "agent") {
              void playSarahVoice(step.text);
            }
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
          case "navigate":
            try { navRef.current({ to: step.to as "/" }); } catch { /* noop */ }
            break;
          case "scrollTo": {
            const el = document.querySelector(step.selector) as HTMLElement | null;
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            break;
          }
          case "guidance": {
            setGuidanceToast(step.text);
            const clearT = setTimeout(() => {
              setGuidanceToast((cur) => (cur === step.text ? null : cur));
            }, 2200);
            timersRef.current.push(clearT);
            break;
          }
        }
      }, step.at);
      timersRef.current.push(t);
    }
  }, []);

  const startCall = useCallback(() => {
    clearTimers();
    stopSarahVoice();
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
    stopSarahVoice();
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

  useEffect(() => () => {
    clearTimers();
    stopSarahVoice();
  }, [clearTimers]);

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
      guidanceToast,
      agent: AGENT,
      startCall,
      endCall,
      closeComparison,
      contextSummary,
    }),
    [status, speaking, transcript, highlightSelector, highlightLabel, pushedComparison, comparisonHighlightRow, guidanceToast, startCall, endCall, closeComparison, contextSummary],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLiveAdvise() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLiveAdvise must be used within LiveAdviseProvider");
  return ctx;
}
