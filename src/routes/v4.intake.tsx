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
import { mergeIntake } from "@/lib/v4/intake-merge";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { HeaderIndicators } from "@/components/v4/header-indicators";
import { VerifiedSignInDialog } from "@/components/v4/verified-signin-dialog";
import { ShieldCheck } from "lucide-react";


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
  const { state, update, ready, resetKey } = useSession();
  const navigate = useNavigate();
  const [extracting, setExtracting] = useState(false);
  const [autoSend, setAutoSend] = useState<string | undefined>(undefined);
  const [landingInput, setLandingInput] = useState("");
  const [landingCallOpen, setLandingCallOpen] = useState(false);
  const [verifiedOpen, setVerifiedOpen] = useState(false);
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
          const extracted = await extractIntake({ data: { messages: transcript } });
          update((prev) => ({ intake: mergeIntake(prev.intake, extracted) }));
        } catch (e) {
          console.error(e);
        } finally {
          setExtracting(false);
        }
      }, 1200);
    },
    [update],
  );



  if (!ready || !state.mode) {
    return (
      <AppShell step="intake">
        <p className="text-[#131F69]/70">Loading…</p>
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
          <h1 className="font-serif text-3xl text-[#131F69]">Fill out a quick form</h1>
          <p className="text-sm text-[#131F69]/70 mt-1">
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
  const showLanding = state.messages.length === 0 && !autoSend;

  if (showLanding) {
    const startWith = (text: string) => {
      setAutoSend(text);
    };
    return (
      <AppShell step="intake">
        <div className="max-w-2xl mx-auto flex flex-col min-h-[calc(100vh-160px)]">
          <div className="pt-8">
            <LandingHero />
            <PathCards onPick={startWith} />
            <div className="mt-2 mb-3">
              <PromptChips onPick={startWith} />
            </div>
            <div className="mb-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVerifiedOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-50 px-3.5 py-1.5 text-sm text-emerald-800 hover:bg-emerald-100 transition"
              >
                <ShieldCheck className="h-4 w-4" />
                Import my health history (ID.me / CLEAR)
              </button>
            </div>
          </div>
          <div className="flex-1" />
          <div className="pb-8 sticky bottom-4 bg-white/95 backdrop-blur">
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
      <div className="w-full flex flex-col min-h-[calc(100vh-120px)]">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-[#131F69] leading-none">Let's talk Medicare</h1>
            <p className="text-xs text-[#131F69]/70 mt-0.5 leading-tight">
              Type, dictate, or have a live voice conversation.{" "}
              {state.mode === "hybrid" && (
                <button onClick={() => update({ path: undefined, messages: [] })} className="underline">
                  Switch path
                </button>
              )}
            </p>
          </div>
          <HeaderIndicators compact />
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <IntakeChat
            key={`chat-${resetKey}`}
            mode={state.mode}
            path={state.path}
            initialMessages={state.messages}
            onMessagesChange={onMessagesChange}
            intake={state.intake}
            autoSend={autoSend}
            skipOpener={!!autoSend}
          />
        </div>
        {extracting && (
          <p className="text-xs text-[#131F69]/70 mt-3">Updating workspace…</p>
        )}
      </div>
    </AppShell>

  );
}
