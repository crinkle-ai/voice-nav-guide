import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, Square, AudioLines, Loader2 } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onToggleVoice: () => void;
  voiceActive: boolean;
  busy: boolean;
  placeholder?: string;
};

type RecState = "idle" | "recording" | "transcribing";

export function Composer({
  value,
  onChange,
  onSubmit,
  onToggleVoice,
  voiceActive,
  busy,
  placeholder,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [rec, setRec] = useState<RecState>("idle");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const stopMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRef.current = null;
  };

  const startDictation = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        stopMic();
        if (blob.size < 1024) {
          setRec("idle");
          return;
        }
        setRec("transcribing");
        try {
          const form = new FormData();
          form.append("file", blob, "recording");
          const res = await fetch("/api/v4/transcribe", { method: "POST", body: form });
          if (!res.ok) throw new Error(await res.text());
          const { text } = (await res.json()) as { text: string };
          if (text) onChange(value ? `${value} ${text}` : text);
        } catch (err) {
          console.error("Dictation failed", err);
        } finally {
          setRec("idle");
          setTimeout(() => taRef.current?.focus(), 0);
        }
      };
      mr.start();
      setRec("recording");
    } catch (err) {
      console.error("Mic permission failed", err);
      setRec("idle");
    }
  };

  const stopDictation = () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
  };

  const toggleDictation = () => {
    if (rec === "recording") stopDictation();
    else if (rec === "idle") void startDictation();
  };

  const canSend = !busy && value.trim().length > 0 && rec !== "transcribing";

  return (
    <div className="border border-line rounded-2xl bg-paper shadow-sm p-2">
      <Textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        placeholder={placeholder ?? "Ask anything about Medicare…"}
        className="min-h-[52px] max-h-40 resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent px-3 py-2 text-[15px]"
        disabled={busy}
      />
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="text-xs text-muted-2 pl-2">
          {rec === "recording" && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Recording — tap mic to stop
            </span>
          )}
          {rec === "transcribing" && (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Transcribing…
            </span>
          )}
          {voiceActive && rec === "idle" && (
            <span className="inline-flex items-center gap-1.5 text-accent">
              <AudioLines className="h-3 w-3" /> Voice conversation active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleDictation}
            disabled={busy || rec === "transcribing" || voiceActive}
            title={rec === "recording" ? "Stop dictation" : "Dictate"}
            className="h-9 w-9"
          >
            {rec === "recording" ? <Square className="h-4 w-4 text-red-500" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant={voiceActive ? "default" : "ghost"}
            size="icon"
            onClick={onToggleVoice}
            disabled={busy || rec !== "idle"}
            title="Voice-to-voice conversation"
            className={`h-9 w-9 ${voiceActive ? "bg-accent text-paper hover:bg-accent-2" : ""}`}
          >
            <AudioLines className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canSend}
            size="icon"
            className="h-9 w-9 bg-accent hover:bg-accent-2 text-paper"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
