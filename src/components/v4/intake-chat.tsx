import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IntakeMode, Intake } from "@/lib/v3/intake-types";
import type { HybridPath } from "@/lib/v4/session-store";
import { Composer } from "./composer";
import { VoiceIntake, type VoiceIntakeHandle } from "./voice-intake";
import { QuestionnaireCard, type QuestionnaireInput } from "./chat-cards/questionnaire";
import { PlanComparisonCard, type RecommendPlansInput } from "./chat-cards/plan-comparison";
import { SuggestNextCard } from "./chat-cards/suggest-next";

type Props = {
  mode: IntakeMode;
  path?: HybridPath;
  initialMessages: UIMessage[];
  onMessagesChange: (msgs: UIMessage[]) => void;
  intake: Intake;
  autoSend?: string;
  skipOpener?: boolean;
};

const RAMBLE_OPENER =
  "Hi — I'm here to help you find the right Medicare plan. In your own words, tell me what's going on with your health coverage and what you're hoping a plan will do for you. Take your time.";

const PATH_OPENERS: Record<HybridPath, string> = {
  "doctor-first":
    "Got it — keeping your doctors is the priority. Let's start with the providers you want to keep. Who's the first one, and what do you see them for?",
  "drug-first":
    "Got it — let's make sure your medications stay affordable. What's the first one you take? If you know the strength and how often, share that too.",
  "budget-first":
    "Got it — let's find the lowest total cost. First, what ZIP code do you live in?",
  "new-to-medicare":
    "Welcome — Medicare can feel like a lot, but I'll keep this simple. To start: are you turning 65 soon, already 65, or helping someone else figure it out?",
};

function openerFor(mode: IntakeMode, path?: HybridPath): string {
  if (mode === "hybrid" && path) return PATH_OPENERS[path];
  return RAMBLE_OPENER;
}

export function IntakeChat({ mode, path, initialMessages, onMessagesChange, intake }: Props) {
  const intakeRef = useRef(intake);
  useEffect(() => {
    intakeRef.current = intake;
  }, [intake]);

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/v4/chat",
      body: () => ({ mode, path, intakeSnapshot: intakeRef.current }),
    }),
  );

  const seeded: UIMessage[] = useMemo(
    () =>
      initialMessages.length > 0
        ? initialMessages
        : [
            {
              id: "opener",
              role: "assistant",
              parts: [{ type: "text", text: openerFor(mode, path) }],
            },
          ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { messages, sendMessage, status } = useChat({
    id: `v4-intake-${mode}-${path ?? "none"}`,
    messages: seeded,
    transport: transport.current,
  });

  const [input, setInput] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<VoiceIntakeHandle>(null);

  useEffect(() => {
    onMessagesChange(messages);
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, onMessagesChange]);

  const busy = status === "submitted" || status === "streaming";

  const submit = (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    sendMessage({ text });
    if (!override) setInput("");
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-220px)]">
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-1 py-6 space-y-6">
        {messages.map((m) => (
          <MessageRow
            key={m.id}
            message={m}
            onPickChip={(c) => submit(c)}
            onQuestionnaireSubmit={(text) => submit(text)}
            disabled={busy}
          />
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-2 px-1">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span>Thinking…</span>
          </div>
        )}
      </div>

      {voiceActive && (
        <div className="my-3">
          <VoiceIntake
            ref={voiceRef}
            mode={mode}
            messages={messages}
            onMessagesChange={onMessagesChange}
          />
          <div className="text-right mt-2">
            <button
              type="button"
              onClick={async () => {
                if (voiceRef.current) await voiceRef.current.flush();
                setVoiceActive(false);
              }}
              className="text-xs underline text-muted-2 hover:text-ink"
            >
              Close voice conversation
            </button>
          </div>
        </div>
      )}

      <div className="sticky bottom-4 mt-4">
        <Composer
          value={input}
          onChange={setInput}
          onSubmit={() => submit()}
          onToggleVoice={() => setVoiceActive((v) => !v)}
          voiceActive={voiceActive}
          busy={busy}
        />
      </div>
    </div>
  );
}

type AnyPart = UIMessage["parts"][number] & { type: string; state?: string; input?: unknown };

function MessageRow({
  message,
  onPickChip,
  onQuestionnaireSubmit,
  disabled,
}: {
  message: UIMessage;
  onPickChip: (chip: string) => void;
  onQuestionnaireSubmit: (text: string) => void;
  disabled: boolean;
}) {
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-ink text-paper px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center font-serif text-sm">
        M
      </div>
      <div className="flex-1 min-w-0 max-w-[85%]">
        {text && (
          <div className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">{text}</div>
        )}
        {message.parts.map((p, i) => {
          const part = p as AnyPart;
          if (!part.type?.startsWith("tool-")) return null;
          if (part.state !== "input-available" && part.state !== "output-available") return null;
          const input = part.input as unknown;
          if (part.type === "tool-askQuestionnaire" && input) {
            return (
              <QuestionnaireCard
                key={i}
                data={input as QuestionnaireInput}
                onSubmit={onQuestionnaireSubmit}
                disabled={disabled}
              />
            );
          }
          if (part.type === "tool-recommendPlans" && input) {
            return <PlanComparisonCard key={i} data={input as RecommendPlansInput} />;
          }
          if (part.type === "tool-suggestNext" && input) {
            const { chips } = input as { chips: string[] };
            return <SuggestNextCard key={i} chips={chips} onPick={onPickChip} disabled={disabled} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}
