import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/v4/app-shell";
import { IntakeChat } from "@/components/v4/intake-chat";
import { VoiceIntake, type VoiceIntakeHandle } from "@/components/v4/voice-intake";
import { CaptureSidebar } from "@/components/v4/capture-sidebar";
import { StructuredWizard } from "@/components/v4/structured-wizard";
import { PathPicker } from "@/components/v4/path-picker";
import { useSession, type HybridPath } from "@/lib/v4/session-store";
import { extractIntake } from "@/lib/v4/intake.functions";
import { intakeCompleteness } from "@/lib/v3/intake-types";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { ArrowRight, Keyboard, Mic, Loader2 } from "lucide-react";

export const Route = createFileRoute("/v4/intake")({
  head: () => ({ meta: [{ title: "Intake — Medicare Compass v4" }] }),
  component: IntakePage,
});

const PATH_LABELS: Record<HybridPath, string> = {
  "doctor-first": "Keep my doctors",
  "drug-first": "Afford my meds",
  "budget-first": "Lowest cost",
  "new-to-medicare": "New to Medicare",
};

function IntakePage() {
  const { state, update, ready } = useSession();
  const navigate = useNavigate();
  const [extracting, setExtracting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [channel, setChannel] = useState<"text" | "voice">("text");
  const extractTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUserCount = useRef(0);
  const voiceRef = useRef<VoiceIntakeHandle>(null);
  const latestMessagesRef = useRef<UIMessage[]>(state.messages);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [ready]);

  useEffect(() => {
    if (ready && !state.mode) update({ mode: "ramble" });
  }, [ready, state.mode, update]);

  useEffect(() => {
    latestMessagesRef.current = state.messages;
  }, [state.messages]);

  const onMessagesChange = useCallback(
    (messages: UIMessage[]) => {
      latestMessagesRef.current = messages;
      update({ messages });
      const userCount = messages.filter((m) => m.role === "user").length;
      if (userCount === lastUserCount.current) return;
      lastUserCount.current = userCount;
      if (extractTimer.current) clearTimeout(extractTimer.current);
      extractTimer.current = setTimeout(async () => {
        setExtracting(true);
        try {
          const transcript = messages.map((m) => ({
            role: m.role === "user" ? ("user" as const) : ("assistant" as const),
            content: m.parts.map((p) => (p.type === "text" ? p.text : "")).join(""),
          }));
          const intake = await extractIntake({ data: { messages: transcript } });
          update({ intake });
        } catch (e) {
          console.error(e);
        } finally {
          setExtracting(false);
        }
      }, 1200);
    },
    [update],
  );

  const finishToSummary = async () => {
    setFinishing(true);
    try {
      if (voiceRef.current) await voiceRef.current.flush();
      if (extractTimer.current) clearTimeout(extractTimer.current);
      const messages = latestMessagesRef.current;
      const transcript = messages.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.parts.map((p) => (p.type === "text" ? p.text : "")).join(""),
      }));
      if (transcript.some((t) => t.role === "user" && t.content.trim())) {
        try {
          const intake = await extractIntake({ data: { messages: transcript } });
          update({ intake, finished: true });
        } catch {
          update({ finished: true });
        }
      } else {
        update({ finished: true });
      }
      navigate({ to: "/v4/summary" });
    } finally {
      setFinishing(false);
    }
  };

  if (!ready || !state.mode) {
    return (
      <AppShell step="intake">
        <p className="text-muted-2">Loading…</p>
      </AppShell>
    );
  }

  // STRUCTURED MODE — full wizard, no chat, no extraction
  if (state.mode === "structured") {
    return (
      <AppShell
        step="intake"
        rightSlot={<span className="text-xs px-2.5 py-1 rounded-full bg-accent-soft text-accent font-medium">Step-by-step wizard</span>}
      >
        <div className="mb-6">
          <h1 className="font-serif text-3xl">Fill out a quick form</h1>
          <p className="text-sm text-muted-2 mt-1">
            Predictable and fast. <Link to="/v4" className="underline">Switch experience</Link>
          </p>
        </div>
        <div>
          <StructuredWizard
            intake={state.intake}
            onChange={(intake) => update({ intake })}
            onFinish={() => {
              update({ finished: true });
              navigate({ to: "/v4/summary" });
            }}
          />
        </div>

      </AppShell>
    );
  }

  // HYBRID MODE — show path picker first, then chat with path
  if (state.mode === "hybrid" && !state.path) {
    return (
      <AppShell
        step="intake"
        rightSlot={<span className="text-xs px-2.5 py-1 rounded-full bg-accent-soft text-accent font-medium">Shop your way</span>}
      >
        <PathPicker
          onPick={(path) => {
            update({ path, messages: [] });
            lastUserCount.current = 0;
          }}
        />
      </AppShell>
    );
  }

  // RAMBLE or HYBRID-with-path → chat surface
  const pct = intakeCompleteness(state.intake);
  const enoughCaptured = pct >= 60;

  return (
    <AppShell
      step="intake"
      rightSlot={
        <div className="flex items-center gap-2">
          {state.mode === "hybrid" && state.path && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-paper text-accent border border-accent/40 font-medium">
              Path: {PATH_LABELS[state.path]}
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full bg-accent-soft text-accent font-medium capitalize">
            {state.mode === "hybrid" ? "Shop your way" : "Open conversation"}
          </span>
        </div>
      }
    >
      <div className="grid lg:grid-cols-[1fr_340px] gap-8">
        <div>
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl">Let's talk Medicare</h1>
              <p className="text-sm text-muted-2 mt-1">
                The more you share, the better your matches.{" "}
                {state.mode === "hybrid" && (
                  <button onClick={() => update({ path: undefined, messages: [] })} className="underline">
                    Switch path
                  </button>
                )}
              </p>
            </div>
            <Button
              onClick={finishToSummary}
              disabled={finishing}
              variant={enoughCaptured ? "default" : "outline"}
              className={enoughCaptured ? "bg-accent hover:bg-accent-2 text-paper" : ""}
            >
              {finishing ? (
                <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Finishing…</>
              ) : (
                <>Finish intake <ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </div>
          <div className="mb-3 inline-flex rounded-full border border-line bg-paper p-1 text-sm">
            <button
              onClick={() => setChannel("text")}
              className={`px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 transition ${
                channel === "text" ? "bg-ink text-paper" : "text-muted-2 hover:text-ink"
              }`}
            >
              <Keyboard className="h-3.5 w-3.5" /> Type
            </button>
            <button
              onClick={() => setChannel("voice")}
              className={`px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 transition ${
                channel === "voice" ? "bg-ink text-paper" : "text-muted-2 hover:text-ink"
              }`}
            >
              <Mic className="h-3.5 w-3.5" /> Talk
            </button>
          </div>
          {channel === "text" ? (
            <IntakeChat
              mode={state.mode}
              path={state.path}
              initialMessages={state.messages}
              onMessagesChange={onMessagesChange}
            />
          ) : (
            <VoiceIntake
              ref={voiceRef}
              mode={state.mode}
              messages={state.messages}
              onMessagesChange={onMessagesChange}
            />
          )}

          {!enoughCaptured && (
            <p className="text-xs text-muted-2 mt-3">
              Tip: share your reason for calling, doctors, medications, and budget to unlock matches.
            </p>
          )}
        </div>
        <CaptureSidebar intake={state.intake} loading={extracting} />
      </div>
    </AppShell>
  );
}
