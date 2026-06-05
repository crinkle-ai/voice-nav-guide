import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, PhoneOff } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useApp } from "@/context/AppContext";
import { searchDoctors, listPlans } from "@/lib/catalog.functions";

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
  const { dispatch } = useApp();
  const fetchDoctors = useServerFn(searchDoctors);
  const fetchPlans = useServerFn(listPlans);

  const [status, setStatus] = useState<Status>("idle");
  const [caption, setCaption] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastSentPathRef = useRef<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);
  const playHeadRef = useRef<number>(0);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setLiveCaption = useCallback((text: string) => {
    setCaption(text);
    if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    captionTimerRef.current = setTimeout(() => setCaption(""), 6000);
  }, []);

  const highlightSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-4", "ring-primary", "ring-offset-2", "rounded-lg", "transition-shadow");
    setTimeout(() => {
      el.classList.remove("ring-4", "ring-primary", "ring-offset-2", "rounded-lg");
    }, 3000);
  }, []);

  const handleToolCall = useCallback(
    async (fc: { id: string; name: string; args?: Record<string, unknown> }) => {
      let result: Record<string, unknown> = { ok: true };
      try {
        if (fc.name === "navigate_to" && typeof fc.args?.page === "string") {
          const page = fc.args.page as "/" | "/learn" | "/find-doctors" | "/compare-plans";
          navigate({ to: page });
          result = { navigated: page };
        } else if (fc.name === "highlight_section" && typeof fc.args?.section === "string") {
          highlightSection(fc.args.section);
          dispatch({ type: "SET_HIGHLIGHT", section: fc.args.section });
          result = { highlighted: fc.args.section };
        } else if (fc.name === "search_doctors") {
          const args = (fc.args ?? {}) as { specialty?: string; city?: string; name?: string };
          navigate({ to: "/find-doctors" });
          dispatch({
            type: "SET_DOCTOR_VOICE_FILTERS",
            filters: { specialty: args.specialty, city: args.city, name: args.name },
          });
          const res = await fetchDoctors({
            data: {
              specialty: args.specialty,
              city: args.city,
              name: args.name,
            },
          });
          const top = res.doctors.slice(0, 5).map((d) => ({
            name: d.name,
            specialty: d.specialty,
            city: d.city,
            state: d.state,
            accepting_new_patients: d.accepting_new_patients,
          }));
          result = { count: res.doctors.length, doctors: top };
        } else if (fc.name === "filter_plans") {
          const args = (fc.args ?? {}) as {
            type?: string;
            maxPremium?: number;
            needsDrug?: boolean;
            needsDental?: boolean;
            needsVision?: boolean;
          };
          navigate({ to: "/compare-plans" });
          dispatch({ type: "SET_PLAN_VOICE_FILTERS", filters: args });
          const res = await fetchPlans({ data: args });
          const top = res.plans.slice(0, 5).map((p) => ({
            name: p.name,
            carrier: p.carrier,
            type: p.type,
            monthly_premium: Number(p.monthly_premium),
            drug_coverage: p.drug_coverage,
            star_rating: p.star_rating,
          }));
          result = { count: res.plans.length, plans: top };
        } else if (fc.name === "explain_term" && typeof fc.args?.term === "string") {
          const term = fc.args.term as string;
          navigate({ to: "/learn" });
          setTimeout(() => {
            highlightSection(`glossary-${term}`);
            dispatch({ type: "SET_HIGHLIGHT", section: `glossary-${term}` });
          }, 400);
          result = { term, definition: GLOSSARY[term] ?? "See the highlighted glossary card." };
        } else {
          result = { ok: false, reason: "unknown tool or args" };
        }
      } catch (e) {
        result = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            toolResponse: {
              functionResponses: [{ id: fc.id, name: fc.name, response: result }],
            },
          }),
        );
      }
    },
    [navigate, highlightSection, dispatch, fetchDoctors, fetchPlans],
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
  }, []);

  const stop = useCallback(() => {
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
    setStatus("idle");
    setCaption("");
    dispatch({ type: "SET_VOICE_STATE", voiceState: "idle" });
  }, [dispatch]);

  const start = useCallback(async () => {
    if (status === "connecting" || status === "live") return;
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
        dispatch({ type: "SET_VOICE_STATE", voiceState: "listening" });
      };

      ws.onmessage = async (ev) => {
        const raw = typeof ev.data === "string" ? ev.data : await (ev.data as Blob).text();
        let msg: LiveServerMessage;
        try { msg = JSON.parse(raw); } catch { return; }

        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            if (part.inlineData?.data && part.inlineData.mimeType?.includes("audio/pcm")) {
              playPcm(part.inlineData.data);
              dispatch({ type: "SET_VOICE_STATE", voiceState: "speaking" });
            }
          }
        }
        if (msg.serverContent?.outputTranscription?.text) {
          setLiveCaption(msg.serverContent.outputTranscription.text);
        }
        if (msg.serverContent?.turnComplete) {
          dispatch({ type: "SET_VOICE_STATE", voiceState: "listening" });
        }
        if (msg.serverContent?.interrupted) {
          playHeadRef.current = playCtxRef.current?.currentTime ?? 0;
        }
        if (msg.toolCall?.functionCalls) {
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
      dispatch({ type: "SET_VOICE_STATE", voiceState: "idle" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, dispatch, playPcm, handleToolCall, setLiveCaption]);

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
                  ? (muted ? "Mic muted — tap to unmute" : "Listening… just start talking")
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
