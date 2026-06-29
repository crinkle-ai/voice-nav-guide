import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Pin,
  Check,
  Fish,
  MapPin,
  MonitorUp,
  MonitorOff,
} from "lucide-react";
import agentAvatar from "@/assets/agent-sarah.jpg";
import { useSession, type PermanentAgent } from "@/lib/v4/session-store";

const AGENT: PermanentAgent = {
  name: "Sarah Chen",
  title: "Licensed Medicare Advisor",
  npn: "NPN #19284756",
  location: "Edina, Minnesota",
  facts: [
    "Lives in Minnesota with her golden retriever, Cooper",
    "Spends summer weekends fly-fishing on Lake Mille Lacs",
  ],
  avatar: agentAvatar,
};

type Status = "ringing" | "connected" | "ended";

export function CallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { state, update } = useSession();
  const [status, setStatus] = useState<Status>("ringing");
  const [muted, setMuted] = useState(false);
  const [secs, setSecs] = useState(0);
  const [justPinned, setJustPinned] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  const pinned = state.permanentAgent?.name === AGENT.name;

  const stopShare = () => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (previewRef.current) previewRef.current.srcObject = null;
    setSharing(false);
  };

  useEffect(() => {
    if (!open) {
      setStatus("ringing");
      setMuted(false);
      setSecs(0);
      setJustPinned(false);
      setShareError(null);
      stopShare();
      return;
    }
    const t = setTimeout(() => setStatus("connected"), 2200);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (status !== "connected") return;
    const i = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [status]);

  // Cleanup on unmount
  useEffect(() => stopShare, []);

  const mmss = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  const makePermanent = () => {
    update({ permanentAgent: AGENT });
    setJustPinned(true);
  };

  const startShare = async () => {
    setShareError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;
      setSharing(true);
      // Attach to preview after render
      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.srcObject = stream;
          previewRef.current.play().catch(() => {});
        }
      }, 0);
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        stopShare();
      });
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        // User cancelled — silent
        return;
      }
      setShareError("Screen sharing unavailable in this browser.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {status === "ringing" ? "Connecting you to a licensed agent…" : "On call"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center text-center pt-2">
          <div className="relative">
            <img
              src={AGENT.avatar}
              alt={AGENT.name}
              className="h-28 w-28 rounded-full object-cover border-2 border-line"
            />
            {status === "ringing" && (
              <span className="absolute -inset-1 rounded-full border-2 border-[#033592]/50 animate-ping" />
            )}
            {status === "connected" && (
              <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-paper" />
            )}
          </div>
          <div className="mt-3 text-lg font-medium text-ink">{AGENT.name}</div>
          <div className="text-xs text-muted-2">Licensed Agent · {AGENT.title} · {AGENT.npn}</div>
          <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-2">
            <MapPin className="h-3 w-3" /> {AGENT.location}
          </div>

          {status === "connected" && (
            <div className="mt-2 text-xs font-medium text-emerald-700">
              <Volume2 className="inline h-3 w-3 mr-1" /> Connected · {mmss}
            </div>
          )}

          {sharing && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Sharing your screen with Sarah
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl bg-[#E5F5F8] border border-[#033592]/10 px-4 py-3 text-sm text-ink">
          <p className="font-medium">
            {sharing
              ? "“Great — I can see your screen now. Scroll down to the plan comparison and I'll walk you through it.”"
              : "“Hey! I'll be on the call in just a second. I'm already up to speed on everything you've been reviewing on our website, so we can jump right in.”"}
          </p>
          {!sharing && (
            <ul className="mt-3 space-y-1.5 text-xs text-ink/80">
              {AGENT.facts.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Fish className="h-3.5 w-3.5 mt-0.5 text-[#033592] shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {sharing && (
          <div className="mt-3 flex justify-end">
            <div className="rounded-lg border border-line overflow-hidden shadow-sm bg-black">
              <video
                ref={previewRef}
                muted
                playsInline
                className="block w-[180px] h-auto"
              />
            </div>
          </div>
        )}

        {shareError && (
          <p className="mt-2 text-center text-xs text-muted-2">{shareError}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMuted((m) => !m)}
            disabled={status !== "connected"}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          {status === "connected" && (
            sharing ? (
              <Button
                variant="outline"
                onClick={stopShare}
                className="gap-2 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-700"
              >
                <MonitorOff className="h-4 w-4" /> Stop sharing
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={startShare}
                className="gap-2"
              >
                <MonitorUp className="h-4 w-4" /> Share my screen
              </Button>
            )
          )}

          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => {
              stopShare();
              setStatus("ended");
              setTimeout(() => onOpenChange(false), 500);
            }}
          >
            <PhoneOff className="h-4 w-4" /> End call
          </Button>
        </div>

        <div className="mt-4 border-t border-line pt-4 flex justify-center">
          {pinned || justPinned ? (
            <div className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
              <Check className="h-4 w-4" /> {AGENT.name.split(" ")[0]} is now your permanent agent
            </div>
          ) : (
            <Button onClick={makePermanent} variant="outline" className="gap-2">
              <Pin className="h-4 w-4" /> Make this my permanent agent
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { AGENT as DEMO_AGENT };
