import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, Square, AudioLines, Loader2, Phone } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onToggleVoice: () => void;
  voiceActive: boolean;
  busy: boolean;
  placeholder?: string;
  onCall?: () => void;
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
  onCall,
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
    <div className="relative">
      <div className="flex items-center gap-2 rounded-full border border-ink/10 bg-paper shadow-sm pl-5 pr-2 py-2">
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
          rows={1}
          className="flex-1 min-h-[44px] max-h-40 resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent p-0 text-[15px] leading-6 text-ink placeholder:text-ink/50"
          disabled={busy}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleDictation}
          disabled={busy || rec === "transcribing" || voiceActive}
          title={rec === "recording" ? "Stop dictation" : "Dictate"}
          className="h-10 w-10 rounded-full text-ink hover:bg-surface-soft shrink-0"
        >
          {rec === "recording" ? <Square className="h-4 w-4 text-red-500" /> : <Mic className="h-5 w-5" />}
        </Button>
        {onCall && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCall}
            disabled={busy || rec === "transcribing"}
            title="Call a licensed agent"
            className="h-10 w-10 rounded-full text-ink hover:bg-surface-soft shrink-0"
          >
            <Phone className="h-5 w-5" />
          </Button>
        )}
        <Button
          type="button"
          onClick={canSend ? onSubmit : onToggleVoice}
          disabled={busy || rec === "transcribing"}
          size="icon"
          className={`h-10 w-10 rounded-full shrink-0 ${voiceActive ? "bg-ink text-paper hover:bg-ink/90" : "bg-ink text-paper hover:bg-ink/90"}`}
          title={canSend ? "Send" : "Voice conversation"}
        >
          {canSend ? <Send className="h-4 w-4" /> : <AudioLines className="h-5 w-5" />}
        </Button>
      </div>

      {(rec === "recording" || rec === "transcribing" || voiceActive) && (
        <div className="text-xs text-ink/70 mt-2 pl-5">
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
            <span className="inline-flex items-center gap-1.5 text-ink">
              <AudioLines className="h-3 w-3" /> Voice conversation active
            </span>
          )}
        </div>
      )}
    </div>

  );
}
