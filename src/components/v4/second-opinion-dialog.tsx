import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import agentAvatar from "@/assets/agent-sarah.jpg";

type CallStatus = "idle" | "ringing" | "connected" | "ended";

export function SecondOpinionDialog({
  open,
  onOpenChange,
  planContext,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planContext?: string;
}) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setMuted(false);
      setSecs(0);
      return;
    }
    setStatus("ringing");
    const t = setTimeout(() => setStatus("connected"), 2400);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (status !== "connected") return;
    const i = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [status]);

  const mmss = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Get a 2nd opinion</DialogTitle>
          <DialogDescription>
            Connecting you to a licensed Medicare advisor for a quick second look at your matches.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center text-center py-4">
          <div className="relative">
            <img
              src={agentAvatar}
              alt="Sarah Chen, Licensed Medicare Advisor"
              className="h-24 w-24 rounded-full object-cover border-2 border-line"
            />
            {status === "ringing" && (
              <span className="absolute -inset-1 rounded-full border-2 border-accent/60 animate-ping" />
            )}
            {status === "connected" && (
              <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-paper" />
            )}
          </div>
          <div className="mt-3 font-medium">Sarah Chen</div>
          <div className="text-xs text-muted-2">Licensed Medicare Advisor · NPN #19284756</div>

          <div className="mt-4 text-sm">
            {status === "ringing" && <span className="text-muted-2">Ringing Sarah…</span>}
            {status === "connected" && (
              <span className="text-emerald-700 font-medium">Connected · {mmss}</span>
            )}
            {status === "ended" && <span className="text-muted-2">Call ended</span>}
          </div>

          {planContext && status !== "ended" && (
            <div className="mt-4 text-xs text-muted-2 bg-muted/40 rounded-lg px-3 py-2 max-w-xs">
              Sarah will see: <span className="text-ink">{planContext}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pb-2">
          {status !== "ended" ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMuted((m) => !m)}
                disabled={status !== "connected"}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setStatus("ended");
                  setTimeout(() => onOpenChange(false), 600);
                }}
                className="gap-2"
              >
                <PhoneOff className="h-4 w-4" /> End call
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)} variant="outline" className="gap-2">
              <Phone className="h-4 w-4" /> Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
