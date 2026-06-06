import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, X, Send, Volume2, VolumeX, Loader2, Phone, CheckCircle2, UserRound } from "lucide-react";
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

  // Handle tool calls: navigate, highlight
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
          navigate({ to: args.page as "/" | "/learn" | "/find-doctors" | "/compare-plans" });
        } else if (name === "highlight_section" && typeof args.section === "string") {
          lastHandledToolIdsRef.current.add(id);
          dispatch({ type: "SET_HIGHLIGHT", section: args.section });
        }
      }
    }
  }, [messages, navigate, dispatch]);

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
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98;
    u.onstart = () => dispatch({ type: "SET_VOICE_STATE", voiceState: "speaking" });
    u.onend = () => {
      speakingInProgressRef.current = false;
      dispatch({ type: "SET_VOICE_STATE", voiceState: "idle" });
    };
    u.onerror = () => {
      speakingInProgressRef.current = false;
      dispatch({ type: "SET_VOICE_STATE", voiceState: "idle" });
    };
    window.speechSynthesis.speak(u);

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
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
                <p className="mt-2 text-xs">Try: "What's a deductible?" or "Find a cardiologist in Houston."</p>
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
