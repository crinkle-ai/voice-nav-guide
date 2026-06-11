import { useEffect, useRef, useState } from "react";
import { useLiveAdvise } from "@/context/LiveAdviseContext";
import { Mic, MicOff, PhoneOff, Minus, Maximize2, ShieldCheck, ScreenShare } from "lucide-react";
import { cn } from "@/lib/utils";

export function LiveAdvisePanel() {
  const { status, agent, transcript, speaking, contextSummary, endCall } = useLiveAdvise();
  const [minimized, setMinimized] = useState(false);
  const [muted, setMuted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript.length]);

  if (status === "idle") return null;

  const connecting = status === "connecting";

  if (minimized) {
    return (
      <div className="fixed bottom-44 right-4 z-[50] flex items-center gap-2">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-white shadow-2xl transition hover:bg-emerald-700"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="text-sm font-semibold">On call with {agent.name.split(" ")[0]}</span>
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          onClick={endCall}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-2xl transition hover:bg-red-700"
          aria-label="End call"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-20 bottom-44 right-4 z-[50] flex w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-card shadow-2xl shadow-emerald-500/20 animate-in slide-in-from-bottom-4 duration-300">
      {/* Header: agent video tile */}
      <div className="relative h-80 overflow-hidden bg-gradient-to-br from-emerald-900 to-emerald-700">
        <img
          src={agent.avatar}
          alt={agent.name}
          className={cn(
            "h-full w-full object-cover object-center transition-all duration-500",
            connecting && "blur-sm opacity-50",
          )}
        />
        {/* Speaking waveform overlay */}
        {speaking && !connecting && (
          <div className="absolute bottom-2 left-2 flex items-end gap-0.5 rounded-md bg-black/40 px-2 py-1.5 backdrop-blur">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-emerald-300"
                style={{
                  height: `${8 + (i % 2) * 6}px`,
                  animation: `liveAdviseBar 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                }}
              />
            ))}
          </div>
        )}
        {connecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <div className="text-xs font-semibold uppercase tracking-wider">Connecting to a licensed agent…</div>
          </div>
        )}
        {/* Top controls */}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="rounded-md bg-black/40 p-1.5 text-white backdrop-blur hover:bg-black/60"
            aria-label="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        </div>
        {/* Agent identity */}
        {!connecting && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
            <div className="flex items-center gap-1.5 text-sm font-bold">
              {agent.name}
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            </div>
            <div className="text-[11px] text-white/80">{agent.title} · {agent.license} · Licensed in {agent.state}</div>
          </div>
        )}
      </div>

      {/* Context strip */}
      <div className="flex items-center gap-2 border-b bg-emerald-50/60 dark:bg-emerald-950/30 px-3 py-2 text-[11px]">
        <ScreenShare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        <span className="text-emerald-800 dark:text-emerald-300 truncate">
          <span className="font-semibold">Sharing context:</span> {contextSummary}
        </span>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="h-48 overflow-y-auto px-3 py-2 space-y-2">
        {transcript.length === 0 && !connecting && (
          <p className="text-xs text-muted-foreground italic">Sarah is on the line…</p>
        )}
        {transcript.map((line) => (
          <div
            key={line.id}
            className={cn(
              "text-xs leading-relaxed",
              line.speaker === "agent" ? "text-foreground" : "text-muted-foreground italic",
            )}
          >
            <span className="font-semibold">
              {line.speaker === "agent" ? agent.name.split(" ")[0] : "You"}:
            </span>{" "}
            {line.text}
          </div>
        ))}
      </div>

      {/* Call controls */}
      <div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-3 py-2.5">
        <button
          onClick={() => setMuted((m) => !m)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition",
            muted ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-background hover:bg-muted",
          )}
          disabled={connecting}
        >
          {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {muted ? "Muted" : "Mic on"}
        </button>
        <span className="text-[10px] text-muted-foreground">{connecting ? "Connecting…" : "Co-browsing"}</span>
        <button
          onClick={endCall}
          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
        >
          <PhoneOff className="h-3.5 w-3.5" />
          End call
        </button>
      </div>

      <style>{`
        @keyframes liveAdviseBar {
          0% { height: 4px; }
          100% { height: 18px; }
        }
      `}</style>
    </div>
  );
}
