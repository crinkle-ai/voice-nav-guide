import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Loader2, PhoneOff, Phone, CheckCircle2, X } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useApp } from "@/context/AppContext";
import { searchDoctors, listPlans } from "@/lib/catalog.functions";

const AGENT_TRIGGERS = [
  /\btalk(ing)?\s+(to|with)\s+(a|an|some)?\s*(real\s+)?(person|human|agent|representative|rep|someone|advisor|broker)\b/i,
  /\bspeak(ing)?\s+(to|with)\s+(a|an|some)?\s*(real\s+)?(person|human|agent|representative|rep|someone|advisor|broker)\b/i,
  /\b(connect|put)\s+me\s+(with|to)\s+(a|an|some)?\s*(person|human|agent|representative|rep|someone|advisor|broker)\b/i,
  /\bcall\s+me(\s+back)?\b/i,
  /\bhave\s+(someone|an?\s+agent|a\s+person)\s+call\s+me\b/i,
  /\bi\s+(want|need|would like)\s+(to\s+)?(talk|speak)\s+(to|with)\s+(a|an|some)?\s*(person|human|agent|representative|rep|someone)\b/i,
  /\bget\s+me\s+(a|an)\s+(person|human|agent|representative|rep)\b/i,
];

function matchesAgentIntent(text: string): boolean {
  return AGENT_TRIGGERS.some((re) => re.test(text));
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
  const startingRef = useRef(false);
  const greetedRef = useRef(false);

  const setLiveCaption = useCallback((text: string) => {
    setCaption(text);
    if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    captionTimerRef.current = setTimeout(() => setCaption(""), 6000);
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
          const page = (raw === "/" ? "/home" : raw) as "/home" | "/learn" | "/find-doctors" | "/compare-plans";
          lastSentPathRef.current = page;
          respond({ ok: true, navigated: page });
          navigate({ to: page });
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
    clearIdleTimers();
    stopAllAudio();
    try { wsRef.current?.close(); } catch { /* noop */ }
    wsRef.current = null;
    try { processorRef.current?.disconnect(); } catch { /* noop */ }
    try { sourceNodeRef.current?.disconnect(); } catch { /* noop */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    micCtxRef.current?.close().catch(() => {});
    playCtxRef.current?.close().catch(() => {});
    micCtxRef.current = null;
    playCtxRef.current = null;
    playHeadRef.current = 0;
    startingRef.current = false;
    greetedRef.current = false;
    setStatus("idle");
    setCaption("");
    dispatch({ type: "SET_VOICE_STATE", voiceState: "idle" });
  }, [dispatch, clearIdleTimers, stopAllAudio]);

  const start = useCallback(async () => {
    if (startingRef.current || status === "connecting" || status === "live") return;
    startingRef.current = true;
    greetedRef.current = false;
    clearIdleTimers();
    setErrorMsg(null);
    setStatus("connecting");
    dispatch({ type: "SET_VOICE_STATE", voiceState: "thinking" });

    try {
      const res = await fetch("/api/voice-session", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Session request failed (${res.status})`);
      }
      const { websocketUrl } = (await res.json()) as { websocketUrl: string };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const ws = new WebSocket(websocketUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Token already embeds the connect constraints; send empty setup.
        ws.send(JSON.stringify({ setup: {} }));

        const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const micCtx = new AudioCtor({ sampleRate: 16000 });
        micCtxRef.current = micCtx;
        const source = micCtx.createMediaStreamSource(stream);
        sourceNodeRef.current = source;
        const processor = micCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => {
          if (mutedRef.current) return;
          if (ws.readyState !== WebSocket.OPEN) return;
          const input = e.inputBuffer.getChannelData(0);
          const pcm = floatTo16BitPCM(input);
          ws.send(
            JSON.stringify({
              realtimeInput: {
                audio: { mimeType: "audio/pcm;rate=16000", data: arrayBufferToBase64(pcm) },
              },
            }),
          );
        };
        source.connect(processor);
        processor.connect(micCtx.destination);

        const playCtx = new AudioCtor({ sampleRate: 24000 });
        playCtxRef.current = playCtx;
        playHeadRef.current = 0;

        // Reset so the route-tracker effect sends the current path immediately.
        lastSentPathRef.current = null;

        setStatus("live");
        startingRef.current = false;
        dispatch({ type: "SET_VOICE_STATE", voiceState: "listening" });
      };

      ws.onmessage = async (ev) => {
        const raw = typeof ev.data === "string" ? ev.data : await (ev.data as Blob).text();
        let msg: LiveServerMessage;
        try { msg = JSON.parse(raw); } catch { return; }

        if (msg.setupComplete && !greetedRef.current) {
          greetedRef.current = true;
          const hasIntroduced = typeof sessionStorage !== "undefined" && sessionStorage.getItem("voiceIntroPlayed") === "1";
          if (hasIntroduced) {
            ws.send(
              JSON.stringify({
                clientContent: {
                  turns: [{
                    role: "user",
                    parts: [{ text: "[SESSION_START] Welcome the user back with one short sentence like 'I'm here — how can I help?' or 'Welcome back. What would you like to do?' Keep it brief and friendly." }],
                  }],
                  turnComplete: true,
                },
              }),
            );
          } else {
            if (typeof sessionStorage !== "undefined") sessionStorage.setItem("voiceIntroPlayed", "1");
            ws.send(
              JSON.stringify({
                clientContent: {
                  turns: [{
                    role: "user",
                    parts: [{ text: "[SESSION_START] Greet the user warmly, introduce yourself as the Medicare Navigator, and describe what you can help with in ONE short sentence. Then ask how you can help." }],
                  }],
                  turnComplete: true,
                },
              }),
            );
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
          clearIdleTimers();
          turnTranscriptRef.current += " " + msg.serverContent.inputTranscription.text;
          if (matchesAgentIntent(turnTranscriptRef.current)) {
            openAgentCallback();
          }
        }
        if (msg.serverContent?.outputTranscription?.text) {
          setLiveCaption(msg.serverContent.outputTranscription.text);
        }
        if (msg.serverContent?.turnComplete) {
          dispatch({ type: "SET_VOICE_STATE", voiceState: "listening" });
          turnTranscriptRef.current = "";
          clearIdleTimers();
          idleWarningRef.current = setTimeout(() => {
            setCaption("Session ending in 5 seconds — say something to keep going");
          }, 15000);
          idleTimerRef.current = setTimeout(() => {
            stop();
            setCaption("Session ended to save tokens. Tap Start anytime.");
          }, 20000);
        }
        if (msg.serverContent?.interrupted) {
          // Barge-in: stop any already-scheduled audio so the user only hears
          // the new turn, not the tail of the previous one.
          stopAllAudio();
          clearIdleTimers();
        }
        if (msg.toolCall?.functionCalls) {
          clearIdleTimers();
          for (const fc of msg.toolCall.functionCalls) handleToolCall(fc);
        }
      };

      ws.onerror = () => {
        setErrorMsg("Connection error");
        setStatus("error");
      };

      ws.onclose = () => {
        if (status !== "idle") stop();
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to start";
      setErrorMsg(message);
      setStatus("error");
      startingRef.current = false;
      dispatch({ type: "SET_VOICE_STATE", voiceState: "idle" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, dispatch, playPcm, handleToolCall, setLiveCaption, stopAllAudio]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Push current route to the model so it knows where the user is.
  useEffect(() => {
    if (status !== "live") return;
    if (lastSentPathRef.current === pathname) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    lastSentPathRef.current = pathname;
    ws.send(
      JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text: `[CURRENT PAGE: ${pathname}]` }] }],
          turnComplete: false,
        },
      }),
    );
  }, [pathname, status]);

  useEffect(() => {
    return () => { stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLive = status === "live";
  const isConnecting = status === "connecting";

  return (
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
  );
}
