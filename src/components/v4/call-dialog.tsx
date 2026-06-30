import { useEffect, useState } from "react";
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
  Maximize2,
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
  agent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agent?: PermanentAgent;
}) {
  const { state, update } = useSession();
  const ACTIVE_AGENT: PermanentAgent = agent ?? AGENT;
  const [status, setStatus] = useState<Status>("ringing");
  const [muted, setMuted] = useState(false);
  const [secs, setSecs] = useState(0);
  const [justPinned, setJustPinned] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const pinned = state.permanentAgent?.name === ACTIVE_ACTIVE_AGENT.name;


  const stopShare = () => {
    setSharing(false);
    setMinimized(false);
    update({ sharingActive: false });
  };

  const startShare = () => {
    setSharing(true);
    setMinimized(true);
    update({ sharingActive: true });
  };

  const endCall = () => {
    stopShare();
    setStatus("ended");
    setTimeout(() => onOpenChange(false), 300);
  };

  useEffect(() => {
    if (!open) {
      setStatus("ringing");
      setMuted(false);
      setSecs(0);
      setJustPinned(false);
      setMinimized(false);
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

  useEffect(() => stopShare, []);

  const mmss = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  const makePermanent = () => {
    update({ permanentAgent: AGENT });
    setJustPinned(true);
  };

  // ============ Minimized floating widget while sharing ============
  if (open && minimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[80] w-[280px] rounded-2xl border-2 border-gray-400 bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3 p-3">
          <img src={ACTIVE_AGENT.avatar} alt={ACTIVE_AGENT.name} className="h-10 w-10 rounded-full object-cover border border-line" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink truncate">{ACTIVE_AGENT.name}</div>
            <div className="text-xs text-emerald-700 font-medium">
              <Volume2 className="inline h-3 w-3 mr-0.5" /> {mmss}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-line p-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMinimized(false)}
            className="h-9 w-9"
            aria-label="Expand call"
            title="Expand call"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={stopShare}
            className="flex-1 h-9 gap-1 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-700 text-xs"
          >
            <MonitorOff className="h-3.5 w-3.5" /> Stop Sharing
          </Button>

          <Button
            variant="destructive"
            size="icon"
            onClick={endCall}
            className="h-9 w-9"
            aria-label="End call"
            title="End call"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-md ${sharing ? "border-2 border-gray-400" : ""}`}>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {status === "ringing" ? "Connecting you to a licensed agent…" : "On call"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center text-center pt-2">
          <div className="relative">
            <img
              src={ACTIVE_AGENT.avatar}
              alt={ACTIVE_AGENT.name}
              className="h-28 w-28 rounded-full object-cover border-2 border-line"
            />
            {status === "ringing" && (
              <span className="absolute -inset-1 rounded-full border-2 border-[#033592]/50 animate-ping" />
            )}
            {status === "connected" && (
              <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-paper" />
            )}
          </div>
          <div className="mt-3 text-lg font-medium text-ink">{ACTIVE_AGENT.name}</div>
          <div className="text-xs text-muted-2">Licensed Agent · {ACTIVE_AGENT.title} · {ACTIVE_AGENT.npn}</div>
          <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-2">
            <MapPin className="h-3 w-3" /> {ACTIVE_AGENT.location}
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
              ? "“Great — I can see your screen now. Go ahead and scroll around — I'll follow along and walk you through the plan comparison.”"
              : "“Hey! I'll be on the call in just a second. I'm already up to speed on everything you've been reviewing on our website, so we can jump right in.”"}
          </p>
          {!sharing && (
            <ul className="mt-3 space-y-1.5 text-xs text-ink/80">
              {ACTIVE_AGENT.facts.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Fish className="h-3.5 w-3.5 mt-0.5 text-[#033592] shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {sharing && (
          <div className="mt-3 flex flex-col items-end gap-2">
            <div className="w-[180px] rounded-lg border border-emerald-200 bg-[#033592] p-3 text-left text-white shadow-sm">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200">Demo share active</div>
              <div className="mt-2 h-2 w-20 rounded-full bg-white/80" />
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div className="h-8 rounded bg-white/80" />
                <div className="h-8 rounded bg-[#E5F5F8]" />
                <div className="h-6 rounded bg-white/50" />
                <div className="h-6 rounded bg-white/30" />
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMinimized(true)}
              className="gap-1.5 text-xs"
            >
              Minimize call so I can browse
            </Button>
          </div>
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
            onClick={endCall}
          >
            <PhoneOff className="h-4 w-4" /> End call
          </Button>
        </div>

        <div className="mt-4 border-t border-line pt-4 flex justify-center">
          {pinned || justPinned ? (
            <div className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
              <Check className="h-4 w-4" /> {ACTIVE_AGENT.name.split(" ")[0]} is now your permanent agent
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
