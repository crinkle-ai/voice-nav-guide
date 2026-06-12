import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, X, Send, Volume2, VolumeX, Loader2, Phone, CheckCircle2 } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PROMPT_CHIPS = [
  "What's a deductible?",
  "Find a cardiologist in Houston",
  "Compare Medicare Advantage plans under $50",
  "Take me to the plans page",
  "Connect me with an agent",
];

type SR = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: { isFinal: boolean; [k: number]: { transcript: string } }[] }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function extractText(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

const NAV_TOOL_PREFIX = "tool-";

export function VoiceNavigator() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recogRef = useRef<SR | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const spokenIdsRef = useRef<Set<string>>(new Set());
  const speakingInProgressRef = useRef<boolean>(false);
  const lastHandledToolIdsRef = useRef<Set<string>>(new Set());

  type CallbackSnapshot = {
    name: string;
    phone: string;
    page: string;
    visitedPages: string[];
    transcriptSnippet: string;
    submittedAt: string;
  };
  const [callbackPhase, setCallbackPhase] = useState<"hidden" | "form" | "confirmed">("hidden");
  const [callbackName, setCallbackName] = useState("");
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackSnapshot, setCallbackSnapshot] = useState<CallbackSnapshot | null>(null);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error } = useChat({ transport });

  // Inject pending prompt (from Home chips / "Talk to your guide")
  useEffect(() => {
    if (state.pendingPrompt && state.navigatorOpen) {
      const p = state.pendingPrompt;
      dispatch({ type: "SET_PENDING_PROMPT", prompt: null });
      void sendMessage({ text: p });
    }
  }, [state.pendingPrompt, state.navigatorOpen, sendMessage, dispatch]);

  // Reflect status into global voiceState
  useEffect(() => {
    const v = listening
      ? "listening"
      : status === "submitted" || status === "streaming"
        ? "thinking"
        : "idle";
    dispatch({ type: "SET_VOICE_STATE", voiceState: v });
  }, [listening, status, dispatch]);

  // Autoscroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Handle tool calls: navigate, highlight, callback flow
  useEffect(() => {
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const p of m.parts as Array<{ type: string; toolCallId?: string; input?: unknown; output?: unknown; state?: string }>) {
        if (!p.type.startsWith(NAV_TOOL_PREFIX)) continue;
        const id = p.toolCallId;
        if (!id || lastHandledToolIdsRef.current.has(id)) continue;
        const name = p.type.slice(NAV_TOOL_PREFIX.length);
        const args = (p.input ?? {}) as Record<string, unknown>;
        if (name === "navigate_to" && typeof args.page === "string") {
          lastHandledToolIdsRef.current.add(id);
          const raw = args.page as string;
          const page = (raw === "/home" ? "/" : raw) as "/" | "/learn" | "/find-doctors" | "/compare-plans";
          navigate({ to: page });
        } else if (name === "highlight_section" && typeof args.section === "string") {
          lastHandledToolIdsRef.current.add(id);
          const section = args.section;
          // Defer the existence check so React has time to mount any newly-navigated page.
          setTimeout(() => {
            if (!document.getElementById(section)) {
              console.warn(`[VoiceNavigator] highlight_section: no element with id="${section}" on ${window.location.pathname}`);
            }
          }, 400);
          dispatch({ type: "SET_HIGHLIGHT", section });
        } else if (name === "request_agent_callback") {
          lastHandledToolIdsRef.current.add(id);
          setCallbackPhase("form");
        } else if (name === "confirm_agent_callback") {
          lastHandledToolIdsRef.current.add(id);
          setCallbackPhase("confirmed");
        }
      }
    }
  }, [messages, navigate, dispatch]);

  // Hold references to active utterances so Chrome doesn't GC them mid-speech
  const utterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read latest assistant message aloud
  useEffect(() => {
    if (!voiceOn || typeof window === "undefined" || !window.speechSynthesis) return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last || status === "streaming" || status === "submitted") return;
    if (lastSpokenIdRef.current === last.id) return;
    if (spokenIdsRef.current.has(last.id)) return;
    if (speakingInProgressRef.current) return;
    const text = extractText(last).trim();
    if (!text) return;
    lastSpokenIdRef.current = last.id;
    spokenIdsRef.current.add(last.id);
    speakingInProgressRef.current = true;
    const synth = window.speechSynthesis;
    synth.cancel();
    utterancesRef.current = [];

    // Chrome cuts off utterances longer than ~200 chars / 15s. Split into
    // sentence-sized chunks and queue them sequentially.
    const chunks = text
      .match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)
      ?.map((s) => s.trim())
      .filter(Boolean) ?? [text];
    // Further split any chunk over ~180 chars on commas / spaces
    const sized: string[] = [];
    for (const c of chunks) {
      if (c.length <= 180) { sized.push(c); continue; }
      const parts = c.split(/,\s+/);
      let buf = "";
      for (const p of parts) {
        if ((buf + ", " + p).length > 180 && buf) { sized.push(buf); buf = p; }
        else buf = buf ? `${buf}, ${p}` : p;
      }
      if (buf) sized.push(buf);
    }

    dispatch({ type: "SET_VOICE_STATE", voiceState: "speaking" });

    // Chrome bug workaround: speechSynthesis pauses itself after ~15s.
    // Periodically resume to keep the queue alive.
    if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    keepAliveRef.current = setInterval(() => {
      if (synth.speaking) {
        synth.pause();
        synth.resume();
      }
    }, 10000);

    const finish = () => {
      speakingInProgressRef.current = false;
      utterancesRef.current = [];
      if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
      dispatch({ type: "SET_VOICE_STATE", voiceState: "idle" });
    };

    sized.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.rate = 0.98;
      if (i === sized.length - 1) {
        u.onend = finish;
        u.onerror = finish;
      }
      utterancesRef.current.push(u);
      synth.speak(u);
    });

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
      utterancesRef.current = [];
      speakingInProgressRef.current = false;
    };
  }, [messages, status, voiceOn, dispatch]);


  const startListening = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    const r = new Ctor();
    r.continuous = false;
    r.interimResults = true;
    r.lang = "en-US";
    let finalText = "";
    r.onresult = (e) => {
      let interimTxt = "";
      for (let i = 0; i < (e.results as unknown as { length: number }).length; i++) {
        const res = e.results[i];
        const t = res[0].transcript;
        if (res.isFinal) finalText += t;
        else interimTxt += t;
      }
      setInterim(interimTxt);
      if (finalText) setInput((v) => (v ? v + " " : "") + finalText);
    };
    r.onerror = () => setListening(false);
    r.onend = () => {
      setListening(false);
      setInterim("");
      if (finalText.trim()) {
        const text = finalText.trim();
        finalText = "";
        void sendMessage({ text });
        setInput("");
      }
    };
    recogRef.current = r;
    setListening(true);
    r.start();
  };

  const stopListening = () => {
    recogRef.current?.stop();
    setListening(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    void sendMessage({ text });
  };

  const speechSupported = !!getSpeechRecognition();
  const ttsSupported = typeof window !== "undefined" && !!window.speechSynthesis;

  return (
    <>
      <button
        onClick={() => dispatch({ type: "TOGGLE_NAVIGATOR" })}
        aria-label="Open voice navigator"
        className={`fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
          state.voiceState === "listening" ? "animate-pulse ring-4 ring-primary/40" : ""
        }`}
      >
        <Mic className="h-7 w-7" />
      </button>

      {state.navigatorOpen && (
        <div className="fixed bottom-28 right-6 z-50 flex h-[min(620px,calc(100vh-9rem))] w-[min(420px,calc(100vw-3rem))] flex-col rounded-xl border bg-card text-card-foreground shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold">Your Medicare Navigator</h2>
              <p className="text-xs capitalize text-muted-foreground">
                {state.voiceState === "idle" ? "Ready to help" : state.voiceState + "…"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {ttsSupported && (
                <Button size="icon" variant="ghost" onClick={() => { setVoiceOn((v) => !v); if (voiceOn) window.speechSynthesis.cancel(); }} aria-label={voiceOn ? "Mute" : "Unmute"}>
                  {voiceOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={() => dispatch({ type: "TOGGLE_NAVIGATOR", open: false })} aria-label="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground">
                <p>Ask me anything about Medicare. I can also take you to the right page.</p>
                <p className="mt-2 text-xs">Try one of these:</p>
              </div>
            )}
            {messages.length === 0 && (
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {PROMPT_CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => void sendMessage({ text: c })}
                    className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m) => {
              const text = extractText(m);
              if (!text && m.role === "assistant" && (status === "streaming" || status === "submitted")) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                );
              }
              if (!text) return null;
              return (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}>{text}</div>
                </div>
              );
            })}
            {interim && (
              <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl bg-primary/40 px-3 py-2 text-sm italic text-primary-foreground">{interim}</div></div>
            )}

            {callbackPhase === "form" && (
              <div className="animate-in slide-in-from-bottom-2 rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-primary">
                  <Phone className="h-5 w-5" />
                  <h3 className="text-base font-semibold">Request a callback</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Just your phone number — name is optional. A licensed agent will call you back with full context of our chat.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = callbackName.trim();
                    const phone = callbackPhone.trim();
                    if (!phone) return;
                    const recent = messages
                      .slice(-6)
                      .map((m) => `${m.role === "user" ? "You" : "Navigator"}: ${extractText(m)}`)
                      .filter((s) => s.length > 5)
                      .join("\n");
                    setCallbackSnapshot({
                      name,
                      phone,
                      page: typeof window !== "undefined" ? window.location.pathname : "/",
                      visitedPages: state.journey.visitedPages,
                      transcriptSnippet: recent,
                      submittedAt: new Date().toLocaleString(),
                    });
                    void sendMessage({
                      text: `Callback request submitted — Phone: ${phone}${name ? `, Name: ${name}` : ""}. Please send my info to a licensed agent.`,
                    });
                  }}
                  className="mt-4 space-y-3"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="cb-phone" className="text-xs font-semibold">
                      Phone number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cb-phone"
                      type="tel"
                      value={callbackPhone}
                      onChange={(e) => setCallbackPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      autoComplete="tel"
                      className="h-11 text-base"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cb-name" className="text-xs font-semibold text-muted-foreground">
                      Name <span className="font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="cb-name"
                      value={callbackName}
                      onChange={(e) => setCallbackName(e.target.value)}
                      placeholder="Jane Smith"
                      autoComplete="name"
                      className="h-11 text-base"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-12 w-full text-base font-semibold"
                    disabled={!callbackPhone.trim()}
                  >
                    <Phone className="h-4 w-4" /> Request Callback
                  </Button>
                </form>
              </div>
            )}

            {callbackPhase === "confirmed" && callbackSnapshot && (() => {
              const visited = callbackSnapshot.visitedPages;
              const topics: string[] = [];
              const partsCovered = visited.includes("/learn");
              if (partsCovered) topics.push("Reviewed Medicare parts & glossary");
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

              return (
                <div className="animate-in slide-in-from-bottom-2 overflow-hidden rounded-2xl border bg-card shadow-md">
                  {/* Header */}
                  <div className="border-b bg-primary/5 px-4 py-3">
                    <div className="flex items-center gap-2 text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                      <h3 className="text-base font-semibold">Callback Confirmed</h3>
                    </div>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {callbackSnapshot.submittedAt}
                    </p>
                  </div>

                  {/* Your Info */}
                  <div className="border-b px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Your info
                    </div>
                    <dl className="mt-2 space-y-1.5 text-sm">
                      {callbackSnapshot.name && (
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-muted-foreground">Name</dt>
                          <dd className="font-medium text-foreground">{callbackSnapshot.name}</dd>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">Phone</dt>
                        <dd className="font-semibold text-foreground">{callbackSnapshot.phone}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Shared with agent */}
                  <div className="border-b px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      What we're sharing with the agent
                    </div>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {topics.map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span className="text-foreground">{t}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] italic text-muted-foreground">
                      Your agent will already know your context — no need to start over.
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    A licensed agent will call you back in just a moment
                  </div>
                </div>
              );
            })()}

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                Something went wrong. Please try again.
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t bg-background/50 p-3">
            {speechSupported && (
              <Button
                type="button"
                size="icon"
                variant={listening ? "default" : "outline"}
                onClick={listening ? stopListening : startListening}
                aria-label={listening ? "Stop listening" : "Start listening"}
                className="shrink-0"
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? "Listening…" : "Type or tap the mic"}
              className="h-11 text-base"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || status === "streaming" || status === "submitted"} className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
