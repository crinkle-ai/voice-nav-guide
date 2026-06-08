import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Loader2, PhoneOff, Phone, CheckCircle2, X } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useApp } from "@/context/AppContext";
import { searchDoctors, listPlans } from "@/lib/catalog.functions";
import { isAuthed, POST_LOGIN_VOICE_KEY } from "@/lib/mock-auth";

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

type LearnTopic = "part-a" | "part-b" | "part-c" | "part-d" | "medigap";

const LEARN_TOPIC_TRIGGERS: Array<{ topic: LearnTopic; re: RegExp }> = [
  { topic: "part-a", re: /\bpart\s*a\b/i },
  { topic: "part-b", re: /\bpart\s*b\b/i },
  { topic: "part-c", re: /\b(part\s*c|medicare\s+advantage)\b/i },
  { topic: "part-d", re: /\b(part\s*d|prescription\s+drug(\s+coverage)?)\b/i },
  { topic: "medigap", re: /\b(medigap|(medicare\s+)?supplement(\s+plan)?)\b/i },
];

function matchesLearnTopic(text: string): LearnTopic | null {
  for (const { topic, re } of LEARN_TOPIC_TRIGGERS) {
    if (re.test(text)) return topic;
  }
  return null;
}

type GlossaryTerm =
  | "premium"
  | "deductible"
  | "copay"
  | "coinsurance"
  | "out-of-pocket-max"
  | "network"
  | "formulary";

const GLOSSARY_TRIGGERS: Array<{ term: GlossaryTerm; re: RegExp }> = [
  { term: "deductible", re: /\bdeductibles?\b/i },
  { term: "premium", re: /\b(monthly\s+)?premiums?\b/i },
  { term: "copay", re: /\bco-?pays?(ment)?\b/i },
  { term: "coinsurance", re: /\bco-?insurance\b/i },
  { term: "out-of-pocket-max", re: /\bout[\s-]of[\s-]pocket(\s+(max(imum)?|limit))?\b/i },
  { term: "formulary", re: /\bformular(y|ies)\b/i },
  { term: "network", re: /\b(in-?network|out-?of-?network|provider\s+network)\b/i },
];

function matchesGlossaryTerm(text: string): GlossaryTerm | null {
  // Bias toward "what is/does X mean" framing but also fire on any mention.
  for (const { term, re } of GLOSSARY_TRIGGERS) {
    if (re.test(text)) return term;
  }
  return null;
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
  const turnFallbackFiredRef = useRef<Set<string>>(new Set());


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
  const pendingActivateRef = useRef(false);
  const prewarmReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userStoppedRef = useRef(false);
  const lastAudioProcessAtRef = useRef<number>(0);
  const lastAudioChunkRef = useRef<number>(0);
  const watchdogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectLiveRef = useRef<(() => void) | null>(null);
  const rebuildMicPipelineRef = useRef<(() => void) | null>(null);
  const micTeardownInProgressRef = useRef(false);
  const statusRef = useRef<Status>("idle");
  const keepaliveSilenceRef = useRef<string | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  const setLiveCaption = useCallback((text: string) => {
    setCaption(text);
    if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    captionTimerRef.current = setTimeout(() => setCaption(""), 6000);
  }, []);

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

  const clearIdleTimers = useCallback(() => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    if (idleWarningRef.current) { clearTimeout(idleWarningRef.current); idleWarningRef.current = null; }
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
          const raw = fc.args.page as string;
          let page = (raw === "/" ? "/home" : raw) as
            | "/home" | "/learn" | "/find-doctors" | "/compare-plans" | "/my-plans" | "/login";
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
          lastSentPathRef.current = page;
          respond({ ok: true, navigated: page });
          if (page === "/login") {
            navigate({ to: "/login", search: { redirect: "/my-plans" } });
          } else {
            navigate({ to: page });
          }
        } else if (fc.name === "highlight_section" && typeof fc.args?.section === "string") {
          const section = fc.args.section;
          respond({ ok: true, highlighted: section });
          setTimeout(() => {
            highlightSection(section);
            dispatch({ type: "SET_HIGHLIGHT", section });
          }, 400);
        } else if (fc.name === "search_doctors") {
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
    statusRef.current = "idle";
    setStatus("idle");
    setCaption("");
    dispatch({ type: "SET_VOICE_STATE", voiceState: "idle" });
  }, [dispatch, clearIdleTimers, stopAllAudio, stopKeepalives]);

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
        for (const part of msg.serverContent.modelTurn.parts) {
          if (part.inlineData?.data && part.inlineData.mimeType?.includes("audio/pcm")) {
            playPcm(part.inlineData.data);
            dispatch({ type: "SET_VOICE_STATE", voiceState: "speaking" });
          }
        }
      }
      if (msg.serverContent?.inputTranscription?.text) {
        const inputText = msg.serverContent.inputTranscription.text;
        if (!isInternalControlText(inputText)) {
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
        const learnTopic = matchesLearnTopic(transcript);
        if (learnTopic) {
          fireOnce(`learn:${learnTopic}`, () => {
            lastSentPathRef.current = "/learn";
            if (curPath !== "/learn") navigate({ to: "/learn" });
            dispatch({ type: "SET_HIGHLIGHT", section: learnTopic });
            setTimeout(() => highlightSection(learnTopic), 400);
          });
        }
        const term = matchesGlossaryTerm(transcript);
        if (term) {
          const section = `glossary-${term}`;
          fireOnce(`glossary:${term}`, () => {
            lastSentPathRef.current = "/learn";
            if (curPath !== "/learn") navigate({ to: "/learn" });
            dispatch({ type: "SET_HIGHLIGHT", section });
            setTimeout(() => highlightSection(section), 400);
          });
        }
      }
      if (msg.serverContent?.outputTranscription?.text) {
        const outputText = msg.serverContent.outputTranscription.text;
        if (!isInternalControlText(outputText)) setLiveCaption(outputText);
      }
      if (msg.serverContent?.turnComplete) {
        dispatch({ type: "SET_VOICE_STATE", voiceState: "listening" });
        turnTranscriptRef.current = "";
        turnFallbackFiredRef.current = new Set();
        clearIdleTimers();
      }

      if (msg.serverContent?.interrupted) {
        stopAllAudio();
        clearIdleTimers();
      }
      if (msg.toolCall?.functionCalls) {
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
    if (wsRef.current || userStoppedRef.current) return;
    try {
      const res = await fetch("/api/voice-session", { method: "POST" });
      if (!res.ok) return;
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
          if (prewarmReconnectTimerRef.current) clearTimeout(prewarmReconnectTimerRef.current);
          prewarmReconnectTimerRef.current = setTimeout(() => { void prewarm(); }, 2000);
        }
      };
    } catch { /* swallow — user will retry via Start */ }
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
        if (mutedRef.current) return;
        const sock = wsRef.current;
        if (!sock || sock.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm = floatTo16BitPCM(input);
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

      const playCtx = new AudioCtor({ sampleRate: 24000 });
      playCtxRef.current = playCtx;
      playHeadRef.current = 0;
      lastSentPathRef.current = null;

      // Send the greeting now — Gemini will respond with audio over the
      // already-open socket, so the user hears a real voice with no delay.
      if (!greetedRef.current) {
        greetedRef.current = true;
        const hasIntroduced =
          typeof sessionStorage !== "undefined" && sessionStorage.getItem("voiceIntroPlayed") === "1";
        if (typeof sessionStorage !== "undefined") sessionStorage.setItem("voiceIntroPlayed", "1");
        const greetingPrompt = hasIntroduced
          ? "[SESSION_START] The user just returned. Greet them back in ONE short sentence (e.g. 'I'm here — how can I help?'). Then stop."
          : "[SESSION_START] Greet the user in ONE short sentence as their Medicare Navigator and invite their question. Then stop.";
        ws.send(
          JSON.stringify({
            clientContent: {
              turns: [{ role: "user", parts: [{ text: greetingPrompt }] }],
              turnComplete: true,
            },
          }),
        );
      }

      statusRef.current = "live";
      setStatus("live");
      startingRef.current = false;
      reconnectAttemptsRef.current = 0;
      dispatch({ type: "SET_VOICE_STATE", voiceState: "listening" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to start";
      setErrorMsg(message);
      statusRef.current = "error";
      setStatus("error");
      startingRef.current = false;
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
    micTeardownInProgressRef.current = true;
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
        if (mutedRef.current) return;
        const sock = wsRef.current;
        if (!sock || sock.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm = floatTo16BitPCM(input);
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
      micTeardownInProgressRef.current = false;
      /* mic rebuild failed — leave session; user can press Stop */
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

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
          M
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span>Medicare Navigator</span>
            {isLive && (
              <span className="flex items-center gap-1 text-xs font-normal text-emerald-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            )}
          </div>
          <div className="truncate text-sm text-muted-foreground">
            {errorMsg
              ? <span className="text-destructive">{errorMsg}</span>
              : caption
                ? caption
                : isLive
                  ? (muted ? "Mic muted — tap to unmute" : "")
                  : isConnecting
                    ? "Connecting…"
                    : "Tap Start to talk to your guide"}
          </div>
        </div>

        {!isLive && !isConnecting && (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <Mic className="h-4 w-4" />
            Start
          </button>
        )}

        {isConnecting && (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-2.5 text-sm font-semibold text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting
          </button>
        )}

        {isLive && (
          <>
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute mic" : "Mute mic"}
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${
                muted ? "bg-muted text-muted-foreground" : "bg-background text-foreground hover:bg-accent"
              }`}
            >
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={stop}
              aria-label="End session"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition hover:bg-destructive/90"
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
