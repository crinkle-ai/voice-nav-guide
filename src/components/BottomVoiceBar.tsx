import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Loader2, PhoneOff, Phone, CheckCircle2, X } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useApp } from "@/context/AppContext";
import { searchDoctors, listPlans } from "@/lib/catalog.functions";
import { isAuthed, POST_LOGIN_VOICE_KEY } from "@/lib/mock-auth";

// ---------------------------------------------------------------------------
// VoiceAudit: lightweight diagnostic trail for the voice pipeline. Logs are
// throttled/state-deduped so they don't flood the console, but give a clear
// picture of where speech stops: mic gate → upload → transcription → tool.
// ---------------------------------------------------------------------------
let lastMicAuditAt = 0;
let lastMicAuditState = "";
function micAudit(state: string) {
  const now = Date.now();
  if (state !== lastMicAuditState || now - lastMicAuditAt > 3000) {
    lastMicAuditAt = now;
    lastMicAuditState = state;
    console.log(`[VoiceAudit] mic: ${state}`);
  }
}



// Allow any adjective(s) between the article and the noun: "telesales agent",
// "licensed agent", "Medicare agent", "real human", "live person", etc.
const AGENT_NOUN = "(?:person|human|agent|representative|rep|someone|advisor|broker)";
const AGENT_MOD = "(?:\\w+\\s+){0,3}";
const AGENT_TRIGGERS = [
  new RegExp(`\\btalk(?:ing)?\\s+(?:to|with)\\s+(?:a|an|some)?\\s*${AGENT_MOD}${AGENT_NOUN}\\b`, "i"),
  new RegExp(`\\bspeak(?:ing)?\\s+(?:to|with)\\s+(?:a|an|some)?\\s*${AGENT_MOD}${AGENT_NOUN}\\b`, "i"),
  new RegExp(`\\b(?:connect|put|get)\\s+me\\s+(?:with|to)?\\s*(?:a|an|some)?\\s*${AGENT_MOD}${AGENT_NOUN}\\b`, "i"),
  new RegExp(`\\bcan\\s+i\\s+connect\\s+with\\s+(?:a|an|some)?\\s*${AGENT_MOD}${AGENT_NOUN}\\b`, "i"),
  new RegExp(`\\bi\\s+(?:want|need)\\s+to\\s+connect\\s+with\\s+(?:a|an|some)?\\s*${AGENT_MOD}${AGENT_NOUN}\\b`, "i"),
  new RegExp(`\\bi(?:['’]d|\\s+would)\\s+like\\s+to\\s+connect\\s+with\\s+(?:a|an|some)?\\s*${AGENT_MOD}${AGENT_NOUN}\\b`, "i"),
  new RegExp(`\\bconnect\\s+with\\s+(?:a|an|some)?\\s*${AGENT_MOD}${AGENT_NOUN}\\b`, "i"),
  new RegExp(`\\bi\\s+(?:want|need)\\s+to\\s+reach\\s+(?:a|an|some)?\\s*${AGENT_MOD}${AGENT_NOUN}\\b`, "i"),
  new RegExp(`\\b(?:get|transfer)\\s+me\\s+to\\s+(?:a|an|some)?\\s*${AGENT_MOD}${AGENT_NOUN}\\b`, "i"),
  /\bcall\s+me(\s+back)?\b/i,
  new RegExp(`\\bhave\\s+(?:someone|an?\\s+\\w+\\s+)?(?:${AGENT_NOUN})?\\s*call\\s+me\\b`, "i"),
  new RegExp(`\\bi\\s+(?:want|need|would\\s+like)\\s+(?:to\\s+)?(?:talk|speak)\\s+(?:to|with)\\s+(?:a|an|some)?\\s*${AGENT_MOD}${AGENT_NOUN}\\b`, "i"),
];

function matchesAgentIntent(text: string): boolean {
  return AGENT_TRIGGERS.some((re) => re.test(text));
}

const MY_PLANS_TRIGGERS = [
  /\bmy\s+(saved\s+)?plans?\b/i,
  /\b(view|show|see|open|pull\s+up)\s+(me\s+)?(my\s+)?(saved\s+)?plans?\b/i,
  /\bmy\s+account\b/i,
  /\bmy\s+(saved\s+)?coverage\b/i,
  /\bpersonalized\s+plans?\b/i,
  /\bsaved\s+for\s+me\b/i,
];

function matchesMyPlansIntent(text: string): boolean {
  return MY_PLANS_TRIGGERS.some((re) => re.test(text));
}

// User explicitly names a destination. Order matters — check "learn" first
// because "learn more about plans" should still mean Learn, not Plans.
type NavTarget = "/" | "/learn" | "/find-doctors" | "/compare-plans";
const NAV_USER_TRIGGERS: Array<{ re: RegExp; to: NavTarget }> = [
  { re: /\b(take|bring|send|get)\s+me\s+(to|back\s+to)\s+(the\s+)?learn(\s+page|\s+section)?\b/i, to: "/learn" },
  { re: /\b(go|head|navigate|jump)\s+(to|back\s+to)\s+(the\s+)?learn(\s+page|\s+section)?\b/i, to: "/learn" },
  { re: /\b(open|show|pull\s+up)\s+(the\s+)?learn(\s+page|\s+section)?\b/i, to: "/learn" },
  { re: /\bi(?:'d| would)?\s+like\s+to\s+learn\s+(more\s+)?about\s+medicare\b/i, to: "/learn" },
  { re: /\b(take|bring|send|get)\s+me\s+(to|back\s+to)\s+(the\s+)?(find\s+a\s+)?doctors?(\s+page)?\b/i, to: "/find-doctors" },
  { re: /\b(go|head|navigate|jump)\s+(to|back\s+to)\s+(the\s+)?(find\s+a\s+)?doctors?(\s+page)?\b/i, to: "/find-doctors" },
  { re: /\b(find|search\s+for)\s+(a\s+)?doctors?\s+(page|finder|tool)\b/i, to: "/find-doctors" },
  { re: /\b(take|bring|send|get)\s+me\s+(to|back\s+to)\s+(the\s+)?(compare\s+)?plans?(\s+page)?\b/i, to: "/compare-plans" },
  { re: /\b(go|head|navigate|jump)\s+(to|back\s+to)\s+(the\s+)?(compare\s+)?plans?(\s+page)?\b/i, to: "/compare-plans" },
  { re: /\b(open|show|pull\s+up)\s+(the\s+)?(compare\s+)?plans?(\s+page)?\b/i, to: "/compare-plans" },
  { re: /\bcompare\s+(the\s+)?plans?\b/i, to: "/compare-plans" },
  { re: /\b(take|bring|send|get)\s+me\s+(to|back\s+to)\s+(the\s+)?home(\s*page)?\b/i, to: "/" },
  { re: /\b(go|head|navigate)\s+(to|back\s+to)\s+(the\s+)?home(\s*page)?\b/i, to: "/" },
];

function matchesNavIntent(text: string): NavTarget | null {
  for (const { re, to } of NAV_USER_TRIGGERS) if (re.test(text)) return to;
  return null;
}

// Model said it would navigate but never fired the tool. Same idea, but
// matches the model's own narration phrasing ("taking you to…", "I'll open…").
function modelAnnouncedNav(text: string): NavTarget | null {
  const t = text.toLowerCase();
  if (t.trim().endsWith("?")) return null;
  const intent = /(taking you|take you|i'?ll open|i'?ve opened|opening (up )?(the )?|let'?s (go|head)|head(ing)? (over )?to|bring(ing)? you (to|over)|pulling up|i'?ll pull up|i'?ll go ahead|let me (take|pull) you)/i.test(t);
  if (!intent) return null;
  if (/learn/.test(t)) return "/learn";
  if (/doctor/.test(t)) return "/find-doctors";
  if (/(compare|plans page|plan page)/.test(t)) return "/compare-plans";
  if (/(home ?page|back home)/.test(t)) return "/";
  return null;
}

function navTargetLabel(target: NavTarget | "/my-plans" | "/login") {
  if (target === "/learn") return "the Learn page";
  if (target === "/find-doctors") return "the doctor finder";
  if (target === "/compare-plans") return "the plan comparison page";
  if (target === "/my-plans") return "your saved plans";
  if (target === "/login") return "sign in";
  return "home";
}

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: { length: number; [index: number]: { isFinal: boolean; 0?: { transcript?: string } } };
};

type BrowserSpeechRecognition = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  const w = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const GLOSSARY: Record<string, string> = {
  premium: "The fixed monthly amount you pay for a plan, whether or not you use care.",
  deductible: "The amount you pay out of pocket each year before insurance starts covering costs.",
  copay: "A flat dollar amount you pay for a specific service, like $20 for a doctor visit.",
  coinsurance: "Your share of a cost as a percentage — for example, you pay 20% and the plan pays 80%.",
  "out-of-pocket-max": "The most you'll pay in a year. Once you hit it, the plan covers 100% of covered care.",
  network: "The doctors and hospitals your plan has contracts with. In-network care costs less.",
  formulary: "The list of prescription drugs your plan covers and what tier each one is on.",
};


type Status = "idle" | "connecting" | "live" | "error";

const LIVE_KEEPALIVE_MS = 20_000;
const PREWARM_KEEPALIVE_MS = 30_000;
const MAX_LIVE_RECONNECT_ATTEMPTS = 5;
const KEEPALIVE_SILENCE_SAMPLES = 1600;

function liveReconnectDelayMs(attempt: number) {
  return Math.min(1000 * 2 ** Math.max(0, attempt - 1), 4000);
}

function isInternalControlText(text: string) {
  return /^<ctrl\d+>$/i.test(text.trim());
}

type LiveServerMessage = {
  setupComplete?: unknown;
  serverContent?: {
    modelTurn?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }> };
    outputTranscription?: { text?: string };
    inputTranscription?: { text?: string };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
  toolCall?: {
    functionCalls?: Array<{ id: string; name: string; args?: Record<string, unknown> }>;
  };
};

// Downsample Float32 audio to 16 kHz when the AudioContext is running at a
// different hardware rate (Safari and some devices ignore the requested
// sampleRate). Without this, 48 kHz audio gets labeled "rate=16000" and the
// model hears unintelligible slowed-down audio — it never detects speech.
function resampleTo16k(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === 16000) return input;
  const ratio = fromRate / 16000;
  const outLength = Math.floor(input.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), input.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = end > start ? sum / (end - start) : input[start] ?? 0;
  }
  return out;
}

// Track mic signal level so the audit trail can tell "uploading silence"
// apart from "uploading real speech the model is ignoring".
let lastLevelAuditAt = 0;
function auditMicLevel(input: Float32Array) {
  const now = Date.now();
  if (now - lastLevelAuditAt < 3000) return;
  lastLevelAuditAt = now;
  let sum = 0;
  for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
  const rms = Math.sqrt(sum / input.length);
  console.log(`[VoiceAudit] mic level rms=${rms.toFixed(4)}${rms < 0.001 ? " — SILENT (check OS mic/input device)" : ""}`);
}

// 16-bit PCM encode from Float32 [-1, 1]
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(i * 2, s, true);
  }
  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToInt16(b64: string): Int16Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
}

export function BottomVoiceBar() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const fetchDoctors = useServerFn(searchDoctors);
  const fetchPlans = useServerFn(listPlans);

  const [status, setStatus] = useState<Status>("idle");
  const [caption, setCaption] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pathnameRef = useRef(pathname);
  const lastSentPathRef = useRef<string | null>(null);

  // Agent callback flow (deterministic, bypasses LLM for collection)
  type CallbackSnapshot = {
    name: string;
    phone: string;
    visitedPages: string[];
    topics: string[];
    submittedAt: string;
  };
  const [callbackPhase, setCallbackPhase] = useState<"hidden" | "form" | "confirmed">("hidden");
  const [cbName, setCbName] = useState("");
  const [cbPhone, setCbPhone] = useState("");
  const [cbSnapshot, setCbSnapshot] = useState<CallbackSnapshot | null>(null);
  const turnTranscriptRef = useRef<string>("");
  const turnOutputTranscriptRef = useRef<string>("");
  const turnNavFiredRef = useRef<boolean>(false);
  const turnFallbackFiredRef = useRef<Set<string>>(new Set());
  // If a [CURRENT PAGE] push arrives while the model is mid-turn, queue it
  // and send after turnComplete so we don't cut her off.
  const pendingPageContextRef = useRef<string | null>(null);
  const modelTurnActiveRef = useRef<boolean>(false);
  // True while the model is actively producing audio for a turn. We use this
  // to mute the mic upload so the model's own voice (echoed back through the
  // device speaker into the mic) can't trip Gemini's VAD and trigger a
  // self-interruption that cuts the reply off mid-sentence. Cleared on
  // turnComplete. Especially important for the opening welcome.
  const modelSpeakingRef = useRef<boolean>(false);
  // Welcome guard: extra-strict — until the first turnComplete after the
  // greeting, we suppress mic uploads entirely AND ignore `interrupted`
  // events. This guarantees the welcome plays to completion.
  const welcomeInProgressRef = useRef<boolean>(false);
  // Watchdog: if turnComplete never arrives after the greeting (lost packet,
  // network hiccup), force-clear the welcome guard so the mic can't stay
  // muted forever on a session that looks "live" but is deaf.
  const welcomeWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const openAgentCallback = useCallback(() => {
    setCallbackPhase((prev) => (prev === "hidden" ? "form" : prev));
  }, []);

  const journeyTopics = useMemo(() => {
    const visited = state.journey.visitedPages;
    const topics: string[] = [];
    if (visited.includes("/learn")) topics.push("Reviewed Medicare parts & glossary");
    if (state.savedDoctorIds.length > 0) {
      topics.push(`Saved ${state.savedDoctorIds.length} doctor${state.savedDoctorIds.length === 1 ? "" : "s"}`);
    } else if (visited.includes("/find-doctors")) {
      topics.push("Searched for doctors");
    }
    if (state.comparePlanIds.length > 0) {
      topics.push(`Compared ${state.comparePlanIds.length} plan${state.comparePlanIds.length === 1 ? "" : "s"}`);
    } else if (visited.includes("/compare-plans")) {
      topics.push("Browsed Medicare plans");
    }
    if (topics.length === 0) topics.push("Started exploring Medicare options");
    return topics;
  }, [state.journey.visitedPages, state.savedDoctorIds, state.comparePlanIds]);

  const submitCallback = useCallback(() => {
    const phone = cbPhone.trim();
    if (!phone) return;
    setCbSnapshot({
      name: cbName.trim(),
      phone,
      visitedPages: state.journey.visitedPages,
      topics: journeyTopics,
      submittedAt: new Date().toLocaleString(),
    });
    setCallbackPhase("confirmed");
    // Nudge the model so it doesn't keep asking — short ack only.
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          clientContent: {
            turns: [{
              role: "user",
              parts: [{ text: "[SYSTEM] The user just submitted the on-screen callback form with their phone number. Respond with ONE short, warm confirmation sentence like 'Got it — a licensed agent will give you a call shortly.' Then stop." }],
            }],
            turnComplete: true,
          },
        }),
      );
    }
  }, [cbPhone, cbName, state.journey.visitedPages, journeyTopics]);


  const wsRef = useRef<WebSocket | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);
  const playHeadRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveKeepaliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prewarmKeepaliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);
  const greetedRef = useRef(false);
  const userSpeechSeenRef = useRef(false);
  // Pre-warmed WebSocket: opened on mount, setup sent, setupComplete received,
  // but mic + audio contexts not yet created (mic requires user gesture).
  const prewarmReadyRef = useRef(false);
  const prewarmInFlightRef = useRef(false);
  const pendingActivateRef = useRef(false);
  const prewarmReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prewarmReconnectAttemptsRef = useRef(0);
  const userStoppedRef = useRef(false);
  const lastAudioProcessAtRef = useRef<number>(0);
  const lastAudioChunkRef = useRef<number>(0);
  const watchdogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectLiveRef = useRef<(() => void) | null>(null);
  const rebuildMicPipelineRef = useRef<(() => void) | null>(null);
  const micTeardownInProgressRef = useRef(false);
  const micRebuildInFlightRef = useRef(false);
  const statusRef = useRef<Status>("idle");
  const keepaliveSilenceRef = useRef<string | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speechRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localTranscriptRef = useRef("");
  const lastLocalCommandAtRef = useRef(0);




  const setLiveCaption = useCallback((text: string) => {
    setCaption(text);
    if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    captionTimerRef.current = setTimeout(() => setCaption(""), 6000);
  }, []);

  const clearIdleTimers = useCallback(() => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    if (idleWarningRef.current) { clearTimeout(idleWarningRef.current); idleWarningRef.current = null; }
  }, []);

  const performDeterministicNav = useCallback((target: NavTarget | "/my-plans" | "/login", source: string) => {
    const now = Date.now();
    if (now - lastLocalCommandAtRef.current < 1500) return;
    lastLocalCommandAtRef.current = now;

    let page = target;
    let search: { redirect?: string } | undefined;
    if (page === "/my-plans" && !isAuthed()) {
      page = "/login";
      search = { redirect: "/my-plans" };
      try { sessionStorage.setItem(POST_LOGIN_VOICE_KEY, "/my-plans"); } catch { /* noop */ }
    }
    if (page === pathnameRef.current) return;

    console.warn(`[VoiceAudit] local command fallback (${source}) → ${page}`);
    turnNavFiredRef.current = true;
    lastSentPathRef.current = page;
    dispatch({ type: "SET_HIGHLIGHT", section: null });
    setLiveCaption(`Taking you to ${navTargetLabel(page)}.`);
    if (page === "/login") {
      navigate({ to: "/login", search: search ?? { redirect: "/my-plans" } });
    } else {
      navigate({ to: page });
    }
  }, [dispatch, navigate, setLiveCaption]);

  const handleLocalTranscript = useCallback((text: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean || isInternalControlText(clean)) return;

    console.log(`[VoiceAudit] local speech heard: "${clean}"`);
    userSpeechSeenRef.current = true;
    clearIdleTimers();
    localTranscriptRef.current = `${localTranscriptRef.current} ${clean}`.replace(/\s+/g, " ").trim().slice(-600);
    turnTranscriptRef.current = `${turnTranscriptRef.current} ${clean}`;

    if (matchesAgentIntent(localTranscriptRef.current)) {
      const now = Date.now();
      if (now - lastLocalCommandAtRef.current < 1500) return;
      lastLocalCommandAtRef.current = now;
      console.warn("[VoiceAudit] local command fallback → agent callback");
      openAgentCallback();
      setLiveCaption("I pulled up the callback form.");
      return;
    }
    if (matchesMyPlansIntent(localTranscriptRef.current)) {
      performDeterministicNav("/my-plans", "my-plans intent");
      return;
    }
    const navTarget = matchesNavIntent(localTranscriptRef.current);
    if (navTarget) performDeterministicNav(navTarget, clean);
  }, [clearIdleTimers, openAgentCallback, performDeterministicNav, setLiveCaption]);

  const stopLocalRecognition = useCallback(() => {
    if (speechRestartTimerRef.current) {
      clearTimeout(speechRestartTimerRef.current);
      speechRestartTimerRef.current = null;
    }
    const recognition = speechRecognitionRef.current;
    speechRecognitionRef.current = null;
    if (recognition) {
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try { recognition.abort(); } catch { /* noop */ }
    }
  }, []);

  const startLocalRecognition = useCallback(() => {
    if (speechRecognitionRef.current || !streamRef.current) return;
    const Recognition = getSpeechRecognitionCtor();
    if (!Recognition) {
      console.warn("[VoiceAudit] local speech fallback unavailable in this browser");
      return;
    }
    try {
      const recognition = new Recognition();
      speechRecognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        let text = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          text += ` ${event.results[i]?.[0]?.transcript ?? ""}`;
        }
        handleLocalTranscript(text);
      };
      recognition.onerror = (event) => {
        if (event.error && !["no-speech", "aborted"].includes(event.error)) {
          console.warn(`[VoiceAudit] local speech fallback error: ${event.error}`);
        }
      };
      recognition.onend = () => {
        speechRecognitionRef.current = null;
        if (statusRef.current !== "live" || userStoppedRef.current) return;
        speechRestartTimerRef.current = setTimeout(() => {
          speechRestartTimerRef.current = null;
          startLocalRecognition();
        }, 250);
      };
      recognition.start();
      console.log("[VoiceAudit] local speech fallback listening");
    } catch (e) {
      speechRecognitionRef.current = null;
      console.warn("[VoiceAudit] local speech fallback failed to start", e);
    }
  }, [handleLocalTranscript]);

  const sendNoopTurn = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      if (!keepaliveSilenceRef.current) {
        keepaliveSilenceRef.current = arrayBufferToBase64(new Int16Array(KEEPALIVE_SILENCE_SAMPLES).buffer);
      }
      ws.send(
        JSON.stringify({
          realtimeInput: {
            audio: { mimeType: "audio/pcm;rate=16000", data: keepaliveSilenceRef.current },
          },
        }),
      );
      return true;
    } catch {
      return false;
    }
  }, []);

  const stopKeepalives = useCallback(() => {
    if (liveKeepaliveTimerRef.current) {
      clearInterval(liveKeepaliveTimerRef.current);
      liveKeepaliveTimerRef.current = null;
    }
    if (prewarmKeepaliveTimerRef.current) {
      clearInterval(prewarmKeepaliveTimerRef.current);
      prewarmKeepaliveTimerRef.current = null;
    }
  }, []);

  const scheduleLiveReconnect = useCallback((delayMs?: number) => {
    if (liveReconnectTimerRef.current) clearTimeout(liveReconnectTimerRef.current);
    if (streamRef.current && !userStoppedRef.current) {
      statusRef.current = "connecting";
      setStatus("connecting");
      setCaption("Reconnecting…");
      dispatch({ type: "SET_VOICE_STATE", voiceState: "thinking" });
    }
    const attempt = reconnectAttemptsRef.current + 1;
    liveReconnectTimerRef.current = setTimeout(() => {
      liveReconnectTimerRef.current = null;
      reconnectLiveRef.current?.();
    }, delayMs ?? liveReconnectDelayMs(attempt));
  }, [dispatch]);

  const attachMicEndedHandlers = useCallback((stream: MediaStream) => {
    stream.getAudioTracks().forEach((track) => {
      track.onended = () => {
        if (micTeardownInProgressRef.current || statusRef.current !== "live" || userStoppedRef.current) return;
        rebuildMicPipelineRef.current?.();
      };
    });
  }, []);

  const stopAllAudio = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try { src.stop(); } catch { /* noop */ }
      try { src.disconnect(); } catch { /* noop */ }
    }
    activeSourcesRef.current.clear();
    playHeadRef.current = playCtxRef.current?.currentTime ?? 0;
  }, []);

  // Highlight a section, polling for the element since navigation may not have
  // rendered the target route yet.
  const highlightSection = useCallback((sectionId: string) => {
    let attempts = 0;
    const tryIt = () => {
      const el = document.getElementById(sectionId);
      if (!el) {
        if (attempts++ < 30) setTimeout(tryIt, 100);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-4", "ring-primary", "ring-offset-2", "rounded-lg", "transition-shadow");
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-primary", "ring-offset-2", "rounded-lg");
      }, 3000);
    };
    tryIt();
  }, []);

  const handleToolCall = useCallback(
    async (fc: { id: string; name: string; args?: Record<string, unknown> }) => {
      const ws = wsRef.current;
      const respond = (response: Record<string, unknown>) => {
        const sock = wsRef.current;
        if (sock && sock.readyState === WebSocket.OPEN) {
          sock.send(
            JSON.stringify({
              toolResponse: {
                functionResponses: [{ id: fc.id, name: fc.name, response }],
              },
            }),
          );
        }
      };

      if (!ws) {
        return;
      }

      try {
        if (fc.name === "navigate_to" && typeof fc.args?.page === "string") {
          turnNavFiredRef.current = true;
          const raw = fc.args.page as string;
          let page = (raw === "/home" ? "/" : raw) as
            | "/" | "/learn" | "/find-doctors" | "/compare-plans" | "/my-plans" | "/login";
          if (page === "/login" && !userSpeechSeenRef.current) {
            respond({ ok: true, ignored: true, reason: "No user request yet" });
            return;
          }
          // Enforce auth gate client-side too: if AI tries to send the user
          // to a protected page while signed-out, route them through login.
          if (page === "/my-plans" && !isAuthed()) {
            page = "/login";
            try { sessionStorage.setItem(POST_LOGIN_VOICE_KEY, "/my-plans"); } catch { /* noop */ }
          }
          // Pre-seed highlighted section so the destination page can auto-expand it on mount.
          // Always dispatch (with null when absent) to clear stale highlight state from a prior nav.
          const sectionArg = typeof fc.args?.section === "string" && fc.args.section.trim()
            ? (fc.args.section as string)
            : null;
          dispatch({ type: "SET_HIGHLIGHT", section: sectionArg });
          lastSentPathRef.current = page;
          respond({ ok: true, navigated: page, section: sectionArg ?? undefined });
          if (page === "/login") {
            navigate({ to: "/login", search: { redirect: "/my-plans" } });
          } else {
            navigate({ to: page });
          }
          if (sectionArg) {
            // Also attempt to scroll/outline once the destination renders.
            setTimeout(() => highlightSection(sectionArg), 600);
          }
        } else if (fc.name === "highlight_section" && typeof fc.args?.section === "string") {
          const section = fc.args.section;
          respond({ ok: true, highlighted: section });
          setTimeout(() => {
            highlightSection(section);
            dispatch({ type: "SET_HIGHLIGHT", section });
          }, 400);
        } else if (fc.name === "search_doctors") {
          turnNavFiredRef.current = true;
          const raw = (fc.args ?? {}) as { specialty?: unknown; city?: unknown; name?: unknown };
          const args = {
            specialty: typeof raw.specialty === "string" ? raw.specialty : undefined,
            city: typeof raw.city === "string" ? raw.city : undefined,
            name: typeof raw.name === "string" && raw.name.trim() ? raw.name : undefined,
          };
          lastSentPathRef.current = "/find-doctors";
          navigate({ to: "/find-doctors" });
          dispatch({
            type: "SET_DOCTOR_VOICE_FILTERS",
            filters: { specialty: args.specialty, city: args.city, name: args.name },
          });
          setTimeout(() => highlightSection("doctor-results"), 400);
          try {
            const res = await fetchDoctors({ data: args });
            const top = res.doctors.slice(0, 5).map((d) => ({
              name: d.name,
              specialty: d.specialty,
              city: d.city,
              state: d.state,
              accepting_new_patients: d.accepting_new_patients,
            }));
            respond({ ok: true, count: res.doctors.length, doctors: top });
          } catch (e) {
            respond({ ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        } else if (fc.name === "filter_plans") {
          turnNavFiredRef.current = true;
          const raw = (fc.args ?? {}) as {
            type?: unknown;
            maxPremium?: unknown;
            needsDrug?: unknown;
            needsDental?: unknown;
            needsVision?: unknown;
          };
          const args = {
            type: typeof raw.type === "string" ? raw.type : undefined,
            maxPremium: typeof raw.maxPremium === "number" ? raw.maxPremium : undefined,
            needsDrug: typeof raw.needsDrug === "boolean" ? raw.needsDrug : undefined,
            needsDental: typeof raw.needsDental === "boolean" ? raw.needsDental : undefined,
            needsVision: typeof raw.needsVision === "boolean" ? raw.needsVision : undefined,
          };
          lastSentPathRef.current = "/compare-plans";
          navigate({ to: "/compare-plans" });
          dispatch({ type: "SET_PLAN_VOICE_FILTERS", filters: args });
          setTimeout(() => highlightSection("plan-results"), 400);
          try {
            const res = await fetchPlans({ data: args });
            const top = res.plans.slice(0, 5).map((p) => ({
              name: p.name,
              carrier: p.carrier,
              type: p.type,
              monthly_premium: Number(p.monthly_premium),
              drug_coverage: p.drug_coverage,
              star_rating: p.star_rating,
            }));
            respond({ ok: true, count: res.plans.length, plans: top });
          } catch (e) {
            respond({ ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        } else if (fc.name === "explain_term" && typeof fc.args?.term === "string") {
          turnNavFiredRef.current = true;
          const term = fc.args.term as string;
          const section = `glossary-${term}`;
          lastSentPathRef.current = "/learn";
          respond({ ok: true, term, definition: GLOSSARY[term] ?? "See the highlighted glossary card." });
          navigate({ to: "/learn" });
          dispatch({ type: "SET_HIGHLIGHT", section });
          setTimeout(() => highlightSection(section), 400);
        } else if (fc.name === "request_agent_callback") {
          respond({ ok: true, opened: true });
          openAgentCallback();
        } else {
          respond({ ok: false, reason: "unknown tool or args" });
        }
      } catch (e) {
        respond({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    },
    [navigate, highlightSection, dispatch, fetchDoctors, fetchPlans, openAgentCallback],
  );


  const playPcm = useCallback((b64: string) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;
    // Browsers (especially iOS) can silently suspend the context mid-session;
    // currentTime freezes and chunks pile up, then blast all at once. Resume
    // and realign the play cursor so scheduling stays sane.
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
      playHeadRef.current = Math.max(playHeadRef.current, ctx.currentTime);
    }
    const int16 = base64ToInt16(b64);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x8000;
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    const now = ctx.currentTime;
    const startAt = Math.max(now, playHeadRef.current);
    src.start(startAt);
    playHeadRef.current = startAt + buffer.duration;
    activeSourcesRef.current.add(src);
    src.onended = () => {
      activeSourcesRef.current.delete(src);
      try { src.disconnect(); } catch { /* noop */ }
    };
  }, []);

  const stop = useCallback(() => {
    userStoppedRef.current = true;
    stopLocalRecognition();
    clearIdleTimers();
    stopKeepalives();
    stopAllAudio();
    if (prewarmReconnectTimerRef.current) {
      clearTimeout(prewarmReconnectTimerRef.current);
      prewarmReconnectTimerRef.current = null;
    }
    if (liveReconnectTimerRef.current) {
      clearTimeout(liveReconnectTimerRef.current);
      liveReconnectTimerRef.current = null;
    }
    if (watchdogTimerRef.current) {
      clearInterval(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
    reconnectingRef.current = false;
    reconnectAttemptsRef.current = 0;

    try { wsRef.current?.close(); } catch { /* noop */ }
    wsRef.current = null;
    prewarmReadyRef.current = false;
    pendingActivateRef.current = false;
    try { processorRef.current?.disconnect(); } catch { /* noop */ }
    try { sourceNodeRef.current?.disconnect(); } catch { /* noop */ }
    streamRef.current?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    streamRef.current = null;
    micCtxRef.current?.close().catch(() => {});
    playCtxRef.current?.close().catch(() => {});
    micCtxRef.current = null;
    playCtxRef.current = null;
    playHeadRef.current = 0;
    startingRef.current = false;
    greetedRef.current = false;
    userSpeechSeenRef.current = false;
    localTranscriptRef.current = "";
    if (welcomeWatchdogRef.current) {
      clearTimeout(welcomeWatchdogRef.current);
      welcomeWatchdogRef.current = null;
    }
    welcomeInProgressRef.current = false;
    modelSpeakingRef.current = false;
    modelTurnActiveRef.current = false;
    statusRef.current = "idle";
    setStatus("idle");
    setCaption("");
    dispatch({ type: "SET_VOICE_STATE", voiceState: "idle" });
  }, [dispatch, clearIdleTimers, stopAllAudio, stopKeepalives, stopLocalRecognition]);

  const failLiveConnection = useCallback(() => {
    stop();
    statusRef.current = "idle";
    setErrorMsg(null);
    setStatus("idle");
    setCaption("Connection lost — tap Start to reconnect");
  }, [stop]);

  // Shared WS message handler — wired during prewarm so setupComplete and any
  // server messages are processed even before the user presses Start.
  const attachWsHandlers = useCallback((ws: WebSocket) => {
    ws.onmessage = async (ev) => {
      const raw = typeof ev.data === "string" ? ev.data : await (ev.data as Blob).text();
      let msg: LiveServerMessage;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.setupComplete) {
        prewarmReadyRef.current = true;
        if (pendingActivateRef.current) {
          pendingActivateRef.current = false;
          if (prewarmKeepaliveTimerRef.current) {
            clearInterval(prewarmKeepaliveTimerRef.current);
            prewarmKeepaliveTimerRef.current = null;
          }
          void activate();
        } else if (streamRef.current && reconnectingRef.current) {
          // Live-session reconnect just completed.
          reconnectingRef.current = false;
          reconnectAttemptsRef.current = 0;
          // Force the next pathname effect to re-push [CURRENT PAGE] so the
          // freshly-reconnected model knows where the user actually is.
          lastSentPathRef.current = null;
          sendNoopTurn();
          statusRef.current = "live";
          setStatus("live");
          setCaption("");
          dispatch({ type: "SET_VOICE_STATE", voiceState: "listening" });
        } else if (!streamRef.current && !prewarmKeepaliveTimerRef.current) {
          prewarmKeepaliveTimerRef.current = setInterval(() => {
            if (statusRef.current === "live" || !prewarmReadyRef.current) return;
            sendNoopTurn();
          }, PREWARM_KEEPALIVE_MS);
        }

      }

      if (msg.serverContent?.modelTurn?.parts) {
        modelTurnActiveRef.current = true;
        for (const part of msg.serverContent.modelTurn.parts) {
          if (part.inlineData?.data && part.inlineData.mimeType?.includes("audio/pcm")) {
            modelSpeakingRef.current = true;
            playPcm(part.inlineData.data);
            dispatch({ type: "SET_VOICE_STATE", voiceState: "speaking" });
          }
        }
      }
      if (msg.serverContent?.inputTranscription?.text) {
        const inputText = msg.serverContent.inputTranscription.text;
        if (inputText.trim() && !isInternalControlText(inputText)) {
          console.log(`[VoiceAudit] heard user: "${inputText}"`);
          userSpeechSeenRef.current = true;
          clearIdleTimers();
          turnTranscriptRef.current += " " + inputText;
        }

        const transcript = turnTranscriptRef.current;
        const fired = turnFallbackFiredRef.current;
        const fireOnce = (key: string, fn: () => void) => {
          if (fired.has(key)) return;
          fired.add(key);
          fn();
        };

        if (matchesAgentIntent(transcript)) {
          fireOnce("agent", () => openAgentCallback());
        }
        const curPath = pathnameRef.current;
        if (
          matchesMyPlansIntent(transcript) &&
          curPath !== "/my-plans" &&
          curPath !== "/login"
        ) {
          fireOnce("my-plans", () => {
            if (isAuthed()) {
              navigate({ to: "/my-plans" });
            } else {
              try { sessionStorage.setItem(POST_LOGIN_VOICE_KEY, "/my-plans"); } catch { /* noop */ }
              navigate({ to: "/login", search: { redirect: "/my-plans" } });
            }
          });
        }
        // Deterministic page navigation when the user names a destination.
        const navTarget = matchesNavIntent(transcript);
        if (navTarget && navTarget !== curPath) {
          fireOnce(`nav:${navTarget}`, () => {
            turnNavFiredRef.current = true;
            lastSentPathRef.current = navTarget;
            dispatch({ type: "SET_HIGHLIGHT", section: null });
            navigate({ to: navTarget });
          });
        }
      }
      if (msg.serverContent?.outputTranscription?.text) {
        const outputText = msg.serverContent.outputTranscription.text;
        if (!isInternalControlText(outputText)) {
          turnOutputTranscriptRef.current += " " + outputText;
          setLiveCaption(outputText);
        }
      }
      if (msg.serverContent?.turnComplete) {
        console.log("[VoiceAudit] turnComplete — mic gate opening");
        // Safety net: model narrated a navigation but never called the tool.
        if (!turnNavFiredRef.current) {
          const target = modelAnnouncedNav(turnOutputTranscriptRef.current);
          if (target && target !== pathnameRef.current) {
            console.warn(`[BottomVoiceBar] Fallback nav from model narration → ${target}`);
            lastSentPathRef.current = target;
            dispatch({ type: "SET_HIGHLIGHT", section: null });
            navigate({ to: target });
          }
        }
        modelTurnActiveRef.current = false;
        welcomeInProgressRef.current = false;
        if (welcomeWatchdogRef.current) {
          clearTimeout(welcomeWatchdogRef.current);
          welcomeWatchdogRef.current = null;
        }
        turnNavFiredRef.current = false;
        turnTranscriptRef.current = "";
        turnOutputTranscriptRef.current = "";
        turnFallbackFiredRef.current = new Set();
        clearIdleTimers();
        dispatch({ type: "SET_VOICE_STATE", voiceState: "listening" });
        // Keep the speaker flag on for a beat so the tail of the last audio
        // buffer can play out without the mic immediately echoing it back.
        const ctx = playCtxRef.current;
        const tailMs = ctx
          ? Math.max(150, Math.min(1500, (playHeadRef.current - ctx.currentTime) * 1000 + 250))
          : 400;
        setTimeout(() => { modelSpeakingRef.current = false; }, tailMs);
        // Flush any page context we held back while she was speaking.
        const queued = pendingPageContextRef.current;
        if (queued) {
          pendingPageContextRef.current = null;
          const sock = wsRef.current;
          if (sock && sock.readyState === WebSocket.OPEN) {
            sock.send(JSON.stringify({
              clientContent: { turns: [{ role: "user", parts: [{ text: queued }] }], turnComplete: false },
            }));
          }
        }
      }

      if (msg.serverContent?.interrupted) {
        // Suppress self-interruptions: during the welcome, OR when no real
        // user transcription has arrived this turn (echo/feedback only).
        const hasRealUserSpeech = turnTranscriptRef.current.trim().length > 0;
        if (welcomeInProgressRef.current || !hasRealUserSpeech) {
          console.log("[VoiceAudit] interrupted event IGNORED (welcome guard or no real user speech)");
          // Ignore — keep playing.
        } else {
          console.log("[VoiceAudit] interrupted event HONORED — stopping audio");
          stopAllAudio();
          modelSpeakingRef.current = false;
          clearIdleTimers();
        }
      }
      if (msg.toolCall?.functionCalls) {
        console.log(`[VoiceAudit] tool call(s): ${msg.toolCall.functionCalls.map((fc: { name?: string }) => fc.name).join(", ")}`);
        clearIdleTimers();
        for (const fc of msg.toolCall.functionCalls) handleToolCall(fc);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playPcm, dispatch, clearIdleTimers, openAgentCallback, navigate, highlightSection, setLiveCaption, stopAllAudio, handleToolCall, sendNoopTurn]);

  // Pre-warm the WebSocket so it's ready the instant the user presses Start.
  // Does NOT request mic (that needs a user gesture) — only opens the socket
  // and waits for setupComplete from Gemini.
  const prewarm = useCallback(async () => {
    if (wsRef.current || userStoppedRef.current || prewarmInFlightRef.current) return;
    prewarmInFlightRef.current = true;
    try {
      const res = await fetch("/api/voice-session", { method: "POST" });
      if (!res.ok) return;
      const { websocketUrl } = (await res.json()) as { websocketUrl: string };
      if (userStoppedRef.current || wsRef.current) return;
      const ws = new WebSocket(websocketUrl);
      wsRef.current = ws;
      attachWsHandlers(ws);
      ws.onopen = () => {
        prewarmReconnectAttemptsRef.current = 0;
        try { ws.send(JSON.stringify({ setup: {} })); } catch { /* noop */ }
      };
      ws.onerror = () => { /* handled by onclose */ };
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        prewarmReadyRef.current = false;
        if (prewarmKeepaliveTimerRef.current) {
          clearInterval(prewarmKeepaliveTimerRef.current);
          prewarmKeepaliveTimerRef.current = null;
        }
        const wasActive = !!streamRef.current;
        if (wasActive && !userStoppedRef.current) {
          scheduleLiveReconnect();
          return;
        }
        if (!userStoppedRef.current) {
          // Cap the prewarm-only reconnect so we don't hammer a down server.
          const attempt = prewarmReconnectAttemptsRef.current + 1;
          prewarmReconnectAttemptsRef.current = attempt;
          if (attempt > 8) return;
          const delay = Math.min(2000 * 2 ** Math.max(0, attempt - 1), 30_000);
          if (prewarmReconnectTimerRef.current) clearTimeout(prewarmReconnectTimerRef.current);
          prewarmReconnectTimerRef.current = setTimeout(() => { void prewarm(); }, delay);
        }
      };
    } catch { /* swallow — user will retry via Start */ }
    finally { prewarmInFlightRef.current = false; }
  }, [attachWsHandlers, scheduleLiveReconnect]);


  // Activate the pre-warmed session: get mic, wire audio contexts, send greeting.
  // Requires the WS to be open and setupComplete received.
  const activate = useCallback(async () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !prewarmReadyRef.current) {
      pendingActivateRef.current = true;
      return;
    }
    try {
      if (prewarmKeepaliveTimerRef.current) {
        clearInterval(prewarmKeepaliveTimerRef.current);
        prewarmKeepaliveTimerRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      attachMicEndedHandlers(stream);

      // Raise the welcome guard BEFORE wiring the mic pipeline so there is no
      // window where mic audio uploads ahead of the greeting (a loud noise in
      // that gap could trip VAD before the welcome even reaches the server).
      if (!greetedRef.current) {
        modelTurnActiveRef.current = true;
        modelSpeakingRef.current = true;
        welcomeInProgressRef.current = true;
      }

      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      // Reuse the context created synchronously in start() (iOS gesture requirement).
      let micCtx = micCtxRef.current;
      if (!micCtx || micCtx.state === "closed") {
        micCtx = new AudioCtor({ sampleRate: 16000 });
        micCtxRef.current = micCtx;
      }
      void micCtx.resume().catch(() => {});
      console.log(`[VoiceAudit] mic context sampleRate=${micCtx.sampleRate}${micCtx.sampleRate !== 16000 ? " — resampling to 16k before upload" : ""}`);
      const source = micCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      const processor = micCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        const now = Date.now();
        lastAudioProcessAtRef.current = now;
        lastAudioChunkRef.current = now;
        if (micCtx!.state === "suspended") { void micCtx!.resume().catch(() => {}); }
        if (mutedRef.current) { micAudit("blocked: user muted"); return; }
        // Anti-feedback: only suppress mic during the initial welcome.
        // After that, rely on browser echo cancellation + smart interrupted handling.
        if (welcomeInProgressRef.current) { micAudit("blocked: welcome guard"); return; }
        const sock = wsRef.current;
        if (!sock || sock.readyState !== WebSocket.OPEN) { micAudit("blocked: socket not open"); return; }
        micAudit("uploading audio");
        const input = e.inputBuffer.getChannelData(0);
        auditMicLevel(input);
        const pcm = floatTo16BitPCM(resampleTo16k(input, micCtx!.sampleRate));
        sock.send(
          JSON.stringify({
            realtimeInput: {
              audio: { mimeType: "audio/pcm;rate=16000", data: arrayBufferToBase64(pcm) },
            },
          }),
        );
      };
      source.connect(processor);
      processor.connect(micCtx.destination);
      lastAudioProcessAtRef.current = Date.now();
      lastAudioChunkRef.current = lastAudioProcessAtRef.current;

      let playCtx = playCtxRef.current;
      if (!playCtx || playCtx.state === "closed") {
        playCtx = new AudioCtor({ sampleRate: 24000 });
        playCtxRef.current = playCtx;
      }
      void playCtx.resume().catch(() => {});
      playHeadRef.current = 0;
      // Mark the current pathname as already pushed — we include it in the
      // greeting prompt below, so the page-context effect must NOT fire a
      // separate [CURRENT PAGE] message that would interrupt the welcome.
      lastSentPathRef.current = pathnameRef.current;

      // Send the greeting now — Gemini will respond with audio over the
      // already-open socket, so the user hears a real voice with no delay.
      if (!greetedRef.current) {
        greetedRef.current = true;
        const hasIntroduced =
          typeof sessionStorage !== "undefined" && sessionStorage.getItem("voiceIntroPlayed") === "1";
        if (typeof sessionStorage !== "undefined") sessionStorage.setItem("voiceIntroPlayed", "1");
        const authTag = isAuthed() ? "[AUTH: signed-in]" : "[AUTH: signed-out]";
        const pageTag = `[CURRENT PAGE: ${pathnameRef.current}] ${authTag}`;
        const greetingPrompt = hasIntroduced
          ? `${pageTag} [SESSION_START] The user just returned. Greet them back in ONE short sentence (e.g. "I'm here — how can I help?"), then wait silently for them to speak. Do NOT mention the current page.`
          : `${pageTag} [SESSION_START] Greet the user in ONE short, complete sentence as their Medicare Navigator and invite their question. Then wait silently. Do NOT mention the current page. Do NOT call any tools. Do NOT end the session.`;
        ws.send(
          JSON.stringify({
            clientContent: {
              turns: [{ role: "user", parts: [{ text: greetingPrompt }] }],
              turnComplete: true,
            },
          }),
        );
        // Watchdog: if turnComplete is lost (network hiccup mid-welcome), the
        // guard would otherwise stay up forever and silence the mic on a
        // session that still shows "Live". Force-clear after 12s.
        if (welcomeWatchdogRef.current) clearTimeout(welcomeWatchdogRef.current);
        welcomeWatchdogRef.current = setTimeout(() => {
          if (welcomeInProgressRef.current) {
            console.warn("[BottomVoiceBar] Welcome watchdog fired — force-clearing welcome guard");
            welcomeInProgressRef.current = false;
            modelSpeakingRef.current = false;
            modelTurnActiveRef.current = false;
          }
          welcomeWatchdogRef.current = null;
        }, 12_000);
      }


      statusRef.current = "live";
      setStatus("live");
      startingRef.current = false;
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
      void micCtxRef.current?.resume().catch(() => {});
      void playCtxRef.current?.resume().catch(() => {});
      reconnectAttemptsRef.current = 0;
      dispatch({ type: "SET_VOICE_STATE", voiceState: "listening" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to start";
      setErrorMsg(message);
      statusRef.current = "error";
      setStatus("error");
      startingRef.current = false;
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
      dispatch({ type: "SET_VOICE_STATE", voiceState: "idle" });
    }
  }, [dispatch, attachMicEndedHandlers]);

  // Reconnect the WebSocket while a live session is active. Keeps the mic
  // pipeline running; the open socket is replaced and setup is resent.
  const reconnectLive = useCallback(async () => {
    if (userStoppedRef.current) return;
    if (reconnectingRef.current) return;
    reconnectingRef.current = true;
    reconnectAttemptsRef.current += 1;
    const attempt = reconnectAttemptsRef.current;
    if (attempt > MAX_LIVE_RECONNECT_ATTEMPTS) {
      reconnectingRef.current = false;
      failLiveConnection();
      return;
    }
    statusRef.current = "connecting";
    setStatus("connecting");
    setCaption("Reconnecting…");
    dispatch({ type: "SET_VOICE_STATE", voiceState: "thinking" });
    try {
      const res = await fetch("/api/voice-session", { method: "POST" });
      if (!res.ok) throw new Error("session failed");
      const { websocketUrl } = (await res.json()) as { websocketUrl: string };
      if (userStoppedRef.current) return;
      const ws = new WebSocket(websocketUrl);
      wsRef.current = ws;
      attachWsHandlers(ws);
      ws.onopen = () => {
        try { ws.send(JSON.stringify({ setup: {} })); } catch { /* noop */ }
      };
      ws.onerror = () => { /* handled by onclose */ };
      ws.onclose = () => {
        wsRef.current = null;
        prewarmReadyRef.current = false;
        reconnectingRef.current = false;
        if (userStoppedRef.current) return;
        if (streamRef.current && reconnectAttemptsRef.current < MAX_LIVE_RECONNECT_ATTEMPTS) {
          scheduleLiveReconnect();
        } else if (streamRef.current) {
          failLiveConnection();
        }
      };
    } catch {
      reconnectingRef.current = false;
      if (!userStoppedRef.current && streamRef.current && attempt < MAX_LIVE_RECONNECT_ATTEMPTS) {
        scheduleLiveReconnect();
      } else if (streamRef.current) {
        failLiveConnection();
      }
    }
  }, [attachWsHandlers, dispatch, failLiveConnection, scheduleLiveReconnect]);

  useEffect(() => {
    reconnectLiveRef.current = () => { void reconnectLive(); };
    return () => { reconnectLiveRef.current = null; };
  }, [reconnectLive]);

  // Tear down and rebuild just the mic/audio-input pipeline without touching
  // the WebSocket. Used by the watchdog when the ScriptProcessorNode stalls.
  const rebuildMicPipeline = useCallback(async () => {
    if (!streamRef.current && !micCtxRef.current) return;
    // Hard re-entry guard: mic onended, watchdog, and visibilitychange can all
    // call this simultaneously. Without this, a second rebuild starts while
    // the first is awaiting getUserMedia and leaks the prior stream/processor.
    if (micRebuildInFlightRef.current) return;
    micRebuildInFlightRef.current = true;
    micTeardownInProgressRef.current = true;
    try {
      try { processorRef.current?.disconnect(); } catch { /* noop */ }
      try { sourceNodeRef.current?.disconnect(); } catch { /* noop */ }
      streamRef.current?.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      streamRef.current = null;
      await micCtxRef.current?.close().catch(() => {});
      micTeardownInProgressRef.current = false;
      micCtxRef.current = null;
      processorRef.current = null;
      sourceNodeRef.current = null;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
        });
        streamRef.current = stream;
        attachMicEndedHandlers(stream);
        const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const micCtx = new AudioCtor({ sampleRate: 16000 });
        micCtxRef.current = micCtx;
        const source = micCtx.createMediaStreamSource(stream);
        sourceNodeRef.current = source;
        const processor = micCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => {
          const now = Date.now();
          lastAudioProcessAtRef.current = now;
          lastAudioChunkRef.current = now;
          if (micCtx.state === "suspended") { void micCtx.resume().catch(() => {}); }
          if (mutedRef.current) { micAudit("blocked: user muted (rebuilt mic)"); return; }
          if (welcomeInProgressRef.current) { micAudit("blocked: welcome guard (rebuilt mic)"); return; }
          const sock = wsRef.current;
          if (!sock || sock.readyState !== WebSocket.OPEN) { micAudit("blocked: socket not open (rebuilt mic)"); return; }
          micAudit("uploading audio (rebuilt mic)");
          const input = e.inputBuffer.getChannelData(0);
          auditMicLevel(input);
          const pcm = floatTo16BitPCM(resampleTo16k(input, micCtx.sampleRate));
          sock.send(
            JSON.stringify({
              realtimeInput: {
                audio: { mimeType: "audio/pcm;rate=16000", data: arrayBufferToBase64(pcm) },
              },
            }),
          );
        };
        source.connect(processor);
        processor.connect(micCtx.destination);
        lastAudioProcessAtRef.current = Date.now();
        lastAudioChunkRef.current = lastAudioProcessAtRef.current;
      } catch {
        // Mic rebuild failed — surface so the user knows the session is dead
        // rather than sitting silently with a "Live" pill and no working mic.
        micTeardownInProgressRef.current = false;
        if (!userStoppedRef.current) {
          setCaption("Microphone disconnected — tap End and Start to reconnect.");
        }
      }
    } finally {
      micRebuildInFlightRef.current = false;
    }
  }, [attachMicEndedHandlers]);


  useEffect(() => {
    rebuildMicPipelineRef.current = () => { void rebuildMicPipeline(); };
    return () => { rebuildMicPipelineRef.current = null; };
  }, [rebuildMicPipeline]);

  const start = useCallback(async () => {
    if (startingRef.current || statusRef.current === "connecting" || statusRef.current === "live") return;
    startingRef.current = true;
    userStoppedRef.current = false;
    greetedRef.current = false;
    userSpeechSeenRef.current = false;
    // Clear any leftover state from a prior aborted attempt so we can't
    // auto-fire activate on a stale setupComplete or trip the reconnect cap.
    pendingActivateRef.current = false;
    reconnectingRef.current = false;
    reconnectAttemptsRef.current = 0;
    clearIdleTimers();
    setErrorMsg(null);
    setCaption("");


    // iOS Safari requires AudioContext to be created synchronously inside the
    // user gesture handler — create both contexts NOW, before any await.
    try {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!micCtxRef.current || micCtxRef.current.state === "closed") {
        micCtxRef.current = new AudioCtor({ sampleRate: 16000 });
      }
      if (!playCtxRef.current || playCtxRef.current.state === "closed") {
        playCtxRef.current = new AudioCtor({ sampleRate: 24000 });
      }
      void micCtxRef.current?.resume().catch(() => {});
      void playCtxRef.current?.resume().catch(() => {});
    } catch { /* noop — activate() will surface any failure */ }

    // Safety timeout: if we never reach "live", reset so the button is tappable.
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    startTimeoutRef.current = setTimeout(() => {
      startTimeoutRef.current = null;
      if (statusRef.current !== "live") {
        startingRef.current = false;
        pendingActivateRef.current = false;
        statusRef.current = "idle";
        setStatus("idle");
        setCaption("Connection timed out — tap Start to try again.");
        dispatch({ type: "SET_VOICE_STATE", voiceState: "idle" });
      }
    }, 15000);

    if (prewarmReadyRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      statusRef.current = "connecting";
      setStatus("connecting");
      dispatch({ type: "SET_VOICE_STATE", voiceState: "thinking" });
      await activate();
      return;
    }

    // Pre-warm hasn't completed (or socket dropped). Show connecting and
    // activate as soon as setupComplete arrives.
    statusRef.current = "connecting";
    setStatus("connecting");
    dispatch({ type: "SET_VOICE_STATE", voiceState: "thinking" });
    pendingActivateRef.current = true;
    if (!wsRef.current) void prewarm();
  }, [dispatch, clearIdleTimers, activate, prewarm]);



  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  // Resume audio contexts whenever the tab regains focus — browsers suspend
  // them on backgrounded tabs and the mic pipeline goes silent otherwise.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      micCtxRef.current?.resume().catch(() => {});
      playCtxRef.current?.resume().catch(() => {});
      if (statusRef.current === "live" && Date.now() - lastAudioChunkRef.current > 3000) {
        void rebuildMicPipeline();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [rebuildMicPipeline]);

  useEffect(() => {
    if (status !== "live") {
      if (liveKeepaliveTimerRef.current) {
        clearInterval(liveKeepaliveTimerRef.current);
        liveKeepaliveTimerRef.current = null;
      }
      return;
    }
    if (liveKeepaliveTimerRef.current) return;
    liveKeepaliveTimerRef.current = setInterval(() => {
      sendNoopTurn();
    }, LIVE_KEEPALIVE_MS);
    return () => {
      if (liveKeepaliveTimerRef.current) {
        clearInterval(liveKeepaliveTimerRef.current);
        liveKeepaliveTimerRef.current = null;
      }
    };
  }, [status, sendNoopTurn]);

  // Watchdog: if the ScriptProcessor stops firing for >5s during a live
  // session, rebuild the mic pipeline (WebSocket stays open).
  useEffect(() => {
    if (status !== "live") return;
    lastAudioProcessAtRef.current = Date.now();
    const interval = setInterval(() => {
      if (!streamRef.current) return;
      const since = Date.now() - lastAudioProcessAtRef.current;
      if (since > 5000) {
        lastAudioProcessAtRef.current = Date.now();
        void rebuildMicPipeline();
      }
    }, 2000);
    watchdogTimerRef.current = interval;
    return () => {
      clearInterval(interval);
      if (watchdogTimerRef.current === interval) watchdogTimerRef.current = null;
    };
  }, [status, rebuildMicPipeline]);



  // Push current route + auth state to the model so it knows where the user
  // is and whether they're signed in.
  useEffect(() => {
    if (status !== "live") return;
    if (lastSentPathRef.current === pathname) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    lastSentPathRef.current = pathname;

    const authTag = isAuthed() ? "[AUTH: signed-in]" : "[AUTH: signed-out]";
    let postLogin: string | null = null;
    try {
      const pending = sessionStorage.getItem(POST_LOGIN_VOICE_KEY);
      if (pending && pending === pathname && isAuthed()) {
        postLogin = pending;
        sessionStorage.removeItem(POST_LOGIN_VOICE_KEY);
      }
    } catch { /* noop */ }

    const text = postLogin
      ? `[CURRENT PAGE: ${pathname}] ${authTag} [SYSTEM] The user just signed in and landed on ${postLogin}. Welcome them back in ONE short sentence and tell them their saved plans are now on screen. Then stop.`
      : `[CURRENT PAGE: ${pathname}] ${authTag}`;

    // If the model is currently mid-turn, queue the push so we don't cut her
    // off. The turnComplete handler flushes it. postLogin pushes are the
    // exception — they need turnComplete to actually trigger her reply.
    if (modelTurnActiveRef.current && !postLogin) {
      pendingPageContextRef.current = text;
      return;
    }

    ws.send(
      JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text }] }],
          turnComplete: !!postLogin,
        },
      }),
    );

  }, [pathname, status]);

  // Pre-warm the WebSocket on mount so it's ready when the user presses Start.
  useEffect(() => {
    userStoppedRef.current = false;
    void prewarm();
    return () => {
      userStoppedRef.current = true;
      if (prewarmReconnectTimerRef.current) {
        clearTimeout(prewarmReconnectTimerRef.current);
        prewarmReconnectTimerRef.current = null;
      }
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLive = status === "live";
  const isConnecting = status === "connecting";

  return (
    <>
      {callbackPhase !== "hidden" && (
        <div className="fixed inset-x-0 bottom-[76px] z-[70] flex justify-center px-4 sm:bottom-[84px]">
          <div className="max-h-[calc(100dvh-104px)] w-full max-w-md overflow-y-auto rounded-2xl border-2 border-primary/30 bg-card shadow-2xl animate-in slide-in-from-bottom-4">
            {callbackPhase === "form" && (
              <>
                <div className="flex items-center justify-between border-b bg-primary/5 px-4 py-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Phone className="h-5 w-5" />
                    <h3 className="text-base font-semibold">Request a callback</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCallbackPhase("hidden")}
                    aria-label="Close"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); submitCallback(); }}
                  className="space-y-3 px-4 py-4"
                >
                  <p className="text-xs text-muted-foreground">
                    Drop in your phone number — a licensed Medicare agent will call you back with everything you've covered today.
                  </p>
                  <div className="space-y-1.5">
                    <label htmlFor="cb-phone" className="text-xs font-semibold">
                      Phone number <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="cb-phone"
                      type="tel"
                      autoFocus
                      autoComplete="tel"
                      value={cbPhone}
                      onChange={(e) => setCbPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="h-11 w-full rounded-md border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="cb-name" className="text-xs font-semibold text-muted-foreground">
                      Name <span className="font-normal">(optional)</span>
                    </label>
                    <input
                      id="cb-name"
                      autoComplete="name"
                      value={cbName}
                      onChange={(e) => setCbName(e.target.value)}
                      placeholder="Jane Smith"
                      className="h-11 w-full rounded-md border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!cbPhone.trim()}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Phone className="h-4 w-4" /> Request Callback
                  </button>
                </form>
              </>
            )}
            {callbackPhase === "confirmed" && cbSnapshot && (
              <>
                <div className="flex items-center justify-between border-b bg-emerald-50 px-4 py-3 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <h3 className="text-base font-semibold">Callback Confirmed</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCallbackPhase("hidden")}
                    aria-label="Close"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3 px-4 py-4 text-sm">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your info</div>
                    <dl className="mt-1.5 space-y-1">
                      {cbSnapshot.name && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">Name</dt>
                          <dd className="font-medium">{cbSnapshot.name}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Phone</dt>
                        <dd className="font-medium">{cbSnapshot.phone}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="border-t pt-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Shared context</div>
                    <ul className="mt-1.5 space-y-1">
                      {cbSnapshot.topics.map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                    {cbSnapshot.visitedPages.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Pages visited: {cbSnapshot.visitedPages.join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                    <div className="font-semibold text-foreground">✓ Sent to Salesforce</div>
                    <div className="mt-0.5 text-muted-foreground">
                      Priority callback — an agent will be with you shortly · {cbSnapshot.submittedAt}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">

      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:pr-40">
        <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
          M
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="truncate">Medicare Navigator</span>
            <span className="hidden sm:inline rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              AI
            </span>
            {isLive && (
              <span className="flex shrink-0 items-center gap-1 text-xs font-normal text-emerald-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            )}
          </div>
          <div className="truncate text-xs sm:text-sm text-muted-foreground">
            {errorMsg
              ? <span className="text-destructive">{errorMsg}</span>
              : caption
                ? caption
                : isLive
                  ? (muted ? "Mic muted — tap to unmute" : "")
                  : isConnecting
                    ? "Connecting…"
                    : "Tap Start to talk to your AI guide — or use \"Talk to an agent\" up top for a licensed human."}
          </div>
        </div>

        {!isLive && !isConnecting && (
          <button
            type="button"
            onClick={start}
            aria-label="Start voice session"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 h-12 w-12 sm:h-auto sm:w-auto sm:px-5 sm:py-2.5 text-sm font-semibold"
          >
            <Mic className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Start</span>
          </button>
        )}

        {isConnecting && (
          <button
            type="button"
            disabled
            aria-label="Connecting"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-muted text-muted-foreground h-12 w-12 sm:h-auto sm:w-auto sm:px-5 sm:py-2.5 text-sm font-semibold"
          >
            <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
            <span className="hidden sm:inline">Connecting</span>
          </button>
        )}


        {isLive && (
          <>
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute mic" : "Mute mic"}
              className={`flex shrink-0 h-12 w-12 sm:h-11 sm:w-11 items-center justify-center rounded-full border transition ${
                muted ? "bg-muted text-muted-foreground" : "bg-background text-foreground hover:bg-accent"
              }`}
            >
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={stop}
              aria-label="End session"
              className="flex shrink-0 h-12 w-12 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition hover:bg-destructive/90"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
    </>
  );
}
