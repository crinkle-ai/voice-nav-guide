import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/v4/app-shell";
import { IntakeChat } from "@/components/v4/intake-chat";
import { StructuredWizard } from "@/components/v4/structured-wizard";
import { PathPicker } from "@/components/v4/path-picker";
import { LandingHero } from "@/components/v4/landing-hero";
import { PathCards } from "@/components/v4/path-cards";
import { PromptChips } from "@/components/v4/prompt-chips";
import { Composer } from "@/components/v4/composer";
import { CallDialog } from "@/components/v4/call-dialog";
import { useSession, type HybridPath } from "@/lib/v4/session-store";
import { extractIntake } from "@/lib/v4/intake.functions";
import { intakeCompleteness } from "@/lib/v3/intake-types";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, RotateCcw } from "lucide-react";


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
  const { state, update, reset, ready } = useSession();
  const navigate = useNavigate();
  const [extracting, setExtracting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [autoSend, setAutoSend] = useState<string | undefined>(undefined);
  const [landingInput, setLandingInput] = useState("");
  const [landingCallOpen, setLandingCallOpen] = useState(false);
  const extractTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUserCount = useRef(0);
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

  const resetConversation = () => {
    if (typeof window !== "undefined" && !window.confirm("Start over? This clears your conversation and captured info.")) return;
    if (extractTimer.current) clearTimeout(extractTimer.current);
    lastUserCount.current = 0;
    latestMessagesRef.current = [];
    setAutoSend(undefined);
    setLandingInput("");
    reset();
    update({ mode: "ramble" });
  };

  if (!ready || !state.mode) {
    return (
      <AppShell step="intake">
        <p className="text-white/70">Loading…</p>
      </AppShell>
    );
  }

  // STRUCTURED MODE — full wizard, no chat, no extraction
  if (state.mode === "structured") {
    return (
      <AppShell
        step="intake"
        rightSlot={<span className="text-xs px-2.5 py-1 rounded-full bg-[#033592]/10 text-[#033592] font-medium">Step-by-step wizard</span>}
      >
        <div className="mb-6">
          <h1 className="font-serif text-3xl text-white">Fill out a quick form</h1>
          <p className="text-sm text-white/80 mt-1">
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
        rightSlot={<span className="text-xs px-2.5 py-1 rounded-full bg-[#033592]/10 text-[#033592] font-medium">Shop your way</span>}
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

  // RAMBLE or HYBRID-with-path → landing or chat surface
  const pct = intakeCompleteness(state.intake);
  const enoughCaptured = pct >= 60;
  const showLanding = state.messages.length === 0 && !autoSend;

  if (showLanding) {
    const startWith = (text: string) => {
      setAutoSend(text);
    };
    const loadDiabeticDemo = async () => {
      const { diabeticMinneapolisIntake } = await import("@/lib/v4/demo-profile");
      update({ intake: diabeticMinneapolisIntake(), finished: true });
      navigate({ to: "/v4/matches" });
    };
    return (
      <AppShell step="intake">
        <div className="max-w-2xl mx-auto flex flex-col min-h-[calc(100vh-160px)]">
          <div className="pt-8">
            <LandingHero />
            <PathCards onPick={startWith} />
            <div className="mt-4 flex justify-center">
              <button
                onClick={loadDiabeticDemo}
                className="text-xs text-white/60 hover:text-white underline underline-offset-2"
              >
                Demo: load diabetic 55410 profile → matches
              </button>
            </div>
          </div>
          <div className="flex-1" />
          <div className="pb-8 sticky bottom-4">
            <PromptChips onPick={startWith} />
            <Composer
              value={landingInput}
              onChange={setLandingInput}
              onSubmit={() => {
                const v = landingInput.trim();
                if (v) startWith(v);
              }}
              onToggleVoice={() => startWith(landingInput.trim() || "Let's get started.")}
              voiceActive={false}
              busy={false}
              placeholder="Ask anything"
              onCall={() => setLandingCallOpen(true)}
            />
          </div>
        </div>
        <CallDialog open={landingCallOpen} onOpenChange={setLandingCallOpen} />
      </AppShell>
    );
  }



  return (
    <AppShell step="intake">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-white">Let's talk Medicare</h1>
            <p className="text-sm text-white/80 mt-1">
              Type, dictate, or have a live voice conversation.{" "}
              {state.mode === "hybrid" && (
                <button onClick={() => update({ path: undefined, messages: [] })} className="underline">
                  Switch path
                </button>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={resetConversation}
              variant="outline"
              className="bg-white text-[#033592] border-transparent hover:bg-white/90"
            >
              <RotateCcw className="mr-1 h-4 w-4" /> Reset
            </Button>
            <Button
              onClick={finishToSummary}
              disabled={finishing}
              variant={enoughCaptured ? "default" : "outline"}
              className={enoughCaptured ? "bg-white text-[#033592] hover:bg-white/90" : "bg-white text-[#033592] border-transparent hover:bg-white/90"}
            >
              {finishing ? (
                <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Finishing…</>
              ) : (
                <>Finish intake <ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>
        <IntakeChat
          mode={state.mode}
          path={state.path}
          initialMessages={state.messages}
          onMessagesChange={onMessagesChange}
          intake={state.intake}
          autoSend={autoSend}
          skipOpener={!!autoSend}
        />
        {extracting && (
          <p className="text-xs text-white/70 mt-3">Updating workspace…</p>
        )}
      </div>
    </AppShell>

  );
}
