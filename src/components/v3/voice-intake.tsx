import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import type { IntakeMode } from "@/lib/v3/intake-types";
import type { UIMessage } from "ai";

type Props = {
  mode: IntakeMode;
  messages: UIMessage[];
  onMessagesChange: (msgs: UIMessage[]) => void;
};

export type VoiceIntakeHandle = {
  flush: () => Promise<void>;
};

type Status = "idle" | "connecting" | "live" | "error";

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export const VoiceIntake = forwardRef<VoiceIntakeHandle, Props>(function VoiceIntake(
  { mode, messages, onMessagesChange },
  ref,
) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [userLive, setUserLive] = useState("");
  const [botLive, setBotLive] = useState("");

  const sessionRef = useRef<Session | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const procNodeRef = useRef<ScriptProcessorNode | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const playheadRef = useRef(0);
  const userTurnRef = useRef("");
  const botTurnRef = useRef("");
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      void stopInternal();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, []);

  const stopInternal = async () => {
    try {
      sessionRef.current?.close();
    } catch {
      /* noop */
    }
    sessionRef.current = null;
    procNodeRef.current?.disconnect();
    procNodeRef.current = null;
    if (inputCtxRef.current && inputCtxRef.current.state !== "closed") {
      await inputCtxRef.current.close().catch(() => {});
    }
    inputCtxRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    if (outputCtxRef.current && outputCtxRef.current.state !== "closed") {
      await outputCtxRef.current.close().catch(() => {});
    }
    outputCtxRef.current = null;
    playheadRef.current = 0;
  };

  const stop = async () => {
    await stopInternal();
    flushTurns(true);
    setStatus("idle");
    setUserLive("");
    setBotLive("");
  };

  useImperativeHandle(ref, () => ({
    flush: async () => {
      if (sessionRef.current) await stop();
      else flushTurns(true);
    },
  }));

  const appendMessage = (role: "user" | "assistant", text: string) => {
    const next: UIMessage[] = [
      ...messagesRef.current,
      {
        id: `voice-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role,
        parts: [{ type: "text", text }],
      },
    ];
    messagesRef.current = next;
    onMessagesChange(next);
  };

  const flushTurns = (finalize: boolean) => {
    const u = userTurnRef.current.trim();
    const b = botTurnRef.current.trim();
    if (u) {
      appendMessage("user", u);
      userTurnRef.current = "";
    }
    if (b) {
      appendMessage("assistant", b);
      botTurnRef.current = "";
    }
    if (finalize) {
      setUserLive("");
      setBotLive("");
    }
  };

  const start = async () => {
    setError(null);
    setStatus("connecting");
    try {
      const tokRes = await fetch("/api/v3/gemini-live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!tokRes.ok) {
        throw new Error(`Token request failed: ${tokRes.status} ${await tokRes.text()}`);
      }
      const { token, systemInstruction, model } = (await tokRes.json()) as {
        token: string;
        systemInstruction: string;
        model: string;
      };

      const OutputCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const outCtx = new OutputCtx({ sampleRate: OUTPUT_SAMPLE_RATE });
      if (outCtx.state === "suspended") await outCtx.resume().catch(() => {});
      outputCtxRef.current = outCtx;

      const ai = new GoogleGenAI({ apiKey: token, apiVersion: "v1alpha" });
      const session = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setStatus("live");
          },
          onmessage: (msg: LiveServerMessage) => handleMessage(msg),
          onerror: (e) => {
            console.error("Gemini Live error", e);
            setError(e?.message ?? "Connection error");
            setStatus("error");
            void stopInternal();
          },
          onclose: (e) => {
            if ((e as CloseEvent)?.reason) {
              setError(`Closed: ${(e as CloseEvent).reason}`);
              setStatus("error");
            } else if (sessionRef.current) {
              setStatus("idle");
              flushTurns(true);
            }
          },
        },
      });
      sessionRef.current = session;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;
      const InCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const inCtx = new InCtx({ sampleRate: INPUT_SAMPLE_RATE });
      if (inCtx.state === "suspended") await inCtx.resume().catch(() => {});
      inputCtxRef.current = inCtx;
      const source = inCtx.createMediaStreamSource(stream);
      const proc = inCtx.createScriptProcessor(4096, 1, 1);
      procNodeRef.current = proc;
      proc.onaudioprocess = (e) => {
        if (!sessionRef.current) return;
        const f32 = e.inputBuffer.getChannelData(0);
        const i16 = new Int16Array(f32.length);
        for (let i = 0; i < f32.length; i++) {
          const s = Math.max(-1, Math.min(1, f32[i]));
          i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        const b64 = bufferToBase64(i16.buffer);
        try {
          sessionRef.current.sendRealtimeInput({
            audio: { data: b64, mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
          });
        } catch (err) {
          console.error("sendRealtimeInput failed", err);
        }
      };
      source.connect(proc);
      proc.connect(inCtx.destination);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
      await stopInternal();
    }
  };

  const handleMessage = (msg: LiveServerMessage) => {
    const sc = msg.serverContent;
    if (!sc) return;

    const parts = sc.modelTurn?.parts ?? [];
    for (const part of parts) {
      const inline = part.inlineData;
      if (inline?.data && inline.mimeType?.startsWith("audio/")) {
        playPcmChunk(inline.data);
      }
    }

    const inputTx = sc.inputTranscription?.text;
    if (inputTx) {
      userTurnRef.current += inputTx;
      setUserLive(userTurnRef.current);
    }
    const outputTx = sc.outputTranscription?.text;
    if (outputTx) {
      botTurnRef.current += outputTx;
      setBotLive(botTurnRef.current);
    }

    if (sc.turnComplete || sc.generationComplete) {
      flushTurns(true);
    }
    if (sc.interrupted) {
      playheadRef.current = outputCtxRef.current?.currentTime ?? 0;
    }
  };

  const playPcmChunk = (b64: string) => {
    const ctx = outputCtxRef.current;
    if (!ctx) return;
    const bytes = base64ToBytes(b64);
    const usable = bytes.length - (bytes.length % 2);
    if (usable === 0) return;
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, usable / 2);
    const floats = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) floats[i] = samples[i] / 32768;
    const buffer = ctx.createBuffer(1, floats.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(floats, 0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    const startAt = playheadRef.current === 0 ? ctx.currentTime + 0.05 : Math.max(playheadRef.current, ctx.currentTime);
    src.start(startAt);
    playheadRef.current = startAt + buffer.duration;
  };

  const isLive = status === "live";
  const isConnecting = status === "connecting";

  return (
    <div className="flex flex-col h-[70vh] rounded-2xl border border-line bg-paper overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.length === 0 && (
          <p className="text-sm text-muted-2">
            Press <strong>Start talking</strong> below — you'll have a real spoken conversation
            with the assistant. Transcripts appear here as you go.
          </p>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} text={messageText(m)} />
        ))}
        {userLive && <Bubble role="user" text={userLive} live />}
        {botLive && <Bubble role="assistant" text={botLive} live />}
      </div>
      <div className="border-t border-line p-4 bg-canvas/40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isLive ? "bg-accent animate-pulse" : isConnecting ? "bg-amber-500 animate-pulse" : "bg-muted-2/40"
            }`}
          />
          <span className="text-muted-2">
            {isLive ? "Live — mic is open" : isConnecting ? "Connecting…" : error ? `Error: ${error}` : "Voice off"}
          </span>
        </div>
        {isLive || isConnecting ? (
          <Button onClick={stop} variant="outline" className="gap-2">
            <MicOff className="h-4 w-4" /> Stop
          </Button>
        ) : (
          <Button onClick={start} className="bg-accent hover:bg-accent-2 text-paper gap-2">
            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            Start talking
          </Button>
        )}
      </div>
    </div>
  );
});

function Bubble({ role, text, live }: { role: "user" | "assistant" | "system"; text: string; live?: boolean }) {
  if (!text) return null;
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className={`max-w-[80%] rounded-2xl rounded-br-md bg-ink text-paper px-4 py-2.5 text-sm leading-relaxed ${
            live ? "opacity-70 italic" : ""
          }`}
        >
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center font-serif text-sm">M</div>
      <div className={`text-[15px] leading-relaxed text-ink max-w-[85%] whitespace-pre-wrap ${live ? "opacity-70 italic" : ""}`}>{text}</div>
    </div>
  );
}

function messageText(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
