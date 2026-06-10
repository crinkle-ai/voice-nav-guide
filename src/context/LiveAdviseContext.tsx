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
    { delay: 100, kind: "guidance", text: "You allowed Sarah to view your screen" },
    { delay: 200, kind: "agentSay", text: followUp },
  ];

  if (!onCompare) {
    steps.push(
      { delay: 150, kind: "guidance", text: "Sarah is taking you to plan comparison" },
      { delay: 100, kind: "navigate", to: "/compare-plans" },
      { delay: 400, kind: "agentSay", text: "Okay, I've got us on the comparison screen. Let me scroll down to the results." },
    );
  }

  steps.push(
    { delay: 150, kind: "guidance", text: "Sarah is scrolling to the plan results" },
    { delay: 100, kind: "scrollTo", selector: "#plan-results" },
    { delay: 250, kind: "highlight", selector: "#plan-results", label: "Here's what I see" },
    { delay: 150, kind: "agentSay", text: "I'll pull the two strongest options side-by-side so we can compare premium, out-of-pocket max, and dental together." },
    { delay: 150, kind: "guidance", text: "Sarah pulled up a side-by-side comparison" },
    { delay: 150, kind: "pushComparison" },
    { delay: 400, kind: "comparisonHighlight", row: "premium" },
    { delay: 150, kind: "agentSay", text: "The Aetna PPO is $0/month with a higher out-of-pocket max. The Humana HMO is $19/month but caps your annual costs lower." },
    { delay: 300, kind: "comparisonHighlight", row: "moop" },
    { delay: 900, kind: "comparisonHighlight", row: "dental" },
    { delay: 200, kind: "agentSay", text: "Both include dental and vision — that's usually the deciding factor for first-timers. Any specific dental work coming up?" },
    { delay: 300, kind: "highlight", selector: null, label: null },
    { delay: 0, kind: "comparisonHighlight", row: null },
  );

  return steps;
}

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
  sarahBlobCache.clear();
}

async function playSarahVoice(text: string) {
  if (typeof window === "undefined") return;

  const runId = sarahVoiceRunId;

  sarahVoiceQueue = sarahVoiceQueue
    .catch(() => {})
    .then(() => playSarahVoiceNow(text, runId));
}

// Cache of in-flight / completed TTS fetches keyed by text so we can prefetch
// the next line while the current one is still playing.
const sarahBlobCache = new Map<string, Promise<Blob | null>>();

function prefetchSarahVoice(text: string) {
  if (typeof window === "undefined") return;
  if (sarahBlobCache.has(text)) return;
  const p = fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice: "Kore" }),
  })
    .then(async (res) => (res.ok ? await res.blob() : null))
    .catch(() => null);
  sarahBlobCache.set(text, p);
}

async function playSarahVoiceNow(text: string, runId: number) {
  if (runId !== sarahVoiceRunId) return;

  const controller = new AbortController();
  currentSarahRequest = controller;

  try {
    let blobPromise = sarahBlobCache.get(text);
    if (!blobPromise) {
      prefetchSarahVoice(text);
      blobPromise = sarahBlobCache.get(text)!;
    }
    const blob = await blobPromise;
    sarahBlobCache.delete(text);
    if (!blob || controller.signal.aborted || runId !== sarahVoiceRunId) return;
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

  const runScript = useCallback(async (script: ScriptStep[]) => {
    const runId = sarahVoiceRunId;
    const isCancelled = () => runId !== sarahVoiceRunId;
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, ms);
        timersRef.current.push(t);
      });

    for (const step of script) {
      if (step.delay && step.delay > 0) await sleep(step.delay);
      if (isCancelled()) return;

      switch (step.kind) {
        case "agentSay": {
          // Wait for any in-flight voice to finish before starting the next line
          try { await sarahVoiceQueue; } catch { /* noop */ }
          if (isCancelled()) return;
          setTranscript((prev) => [
            ...prev,
            { id: `t-${idCounter.current++}`, speaker: "agent", text: step.text, at: Date.now() },
          ]);
          setSpeaking(true);
          void playSarahVoice(step.text);
          // Anchor subsequent steps to the END of this voice line
          try { await sarahVoiceQueue; } catch { /* noop */ }
          if (isCancelled()) return;
          setSpeaking(false);
          break;
        }
        case "highlight":
          setHighlightSelector(step.selector);
          setHighlightLabel(step.label ?? null);
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
