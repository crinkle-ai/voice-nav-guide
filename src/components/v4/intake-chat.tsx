import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IntakeMode, Intake } from "@/lib/v3/intake-types";
import type { HybridPath } from "@/lib/v4/session-store";
import { Composer } from "./composer";
import { VoiceIntake, type VoiceIntakeHandle } from "./voice-intake";
import { QuestionnaireCard, type QuestionnaireInput } from "./chat-cards/questionnaire";
import { PlanComparisonCard, type RecommendPlansInput } from "./chat-cards/plan-comparison";
import { SuggestNextCard } from "./chat-cards/suggest-next";
import emblemAsset from "@/assets/uhc-emblem.png.asset.json";
import { buildInlinePlanRecommendations } from "@/lib/v4/plan-catalog";
import { CallDialog } from "./call-dialog";

type Props = {
  mode: IntakeMode;
  path?: HybridPath;
  initialMessages: UIMessage[];
  onMessagesChange: (msgs: UIMessage[]) => void;
  intake: Intake;
  autoSend?: string;
  skipOpener?: boolean;
};

type ChatItem = {
  message: UIMessage;
  live: boolean;
};

const PLAN_REQUEST_RE = /\b(show|see|view|compare|recommend|suggest|pick|choose|find|give|display)\b[\s\S]{0,80}\b(plan|plans|option|options|recommendation|recommendations|match|matches|them|those)\b|\b(plan|plans|options|recommendations|matches)\b[\s\S]{0,80}\b(show|see|view|compare|recommend|suggest|pick|choose|find|give|display)\b/i;
const DEFERRED_PLAN_RE = /finish intake|click\s+["“”']?finish|see (them|plans|matches) now|show you matches/i;
// Detect when the model emitted a tool invocation as plain text instead of calling the tool.
const LEAKED_TOOL_RE = /\brecommendPlans\b/;
const INLINE_PLAN_MESSAGE = "I can show those options right here — here are the strongest matches based on what you've shared so far.";

function stripLeakedToolText(text: string): string {
  // Cut off everything from the leaked "recommendPlans" token onward; keep
  // the prose lead-in so the bubble still reads naturally.
  const idx = text.search(LEAKED_TOOL_RE);
  if (idx === -1) return text;
  return text.slice(0, idx).replace(/[\s.\-—:]+$/, "").trim();
}

const RAMBLE_OPENER =
  "Hi — I'm here to help you find the right Medicare plan. In your own words, tell me what's going on with your health coverage and what you're hoping a plan will do for you. Take your time.";

const PATH_OPENERS: Record<HybridPath, string> = {
  "doctor-first":
    "Got it — keeping your doctors is the priority. Let's start with the providers you want to keep. Who's the first one, and what do you see them for?",
  "drug-first":
    "Got it — let's make sure your medications stay affordable. What's the first one you take? If you know the strength and how often, share that too.",
  "budget-first": "Got it — let's find the lowest total cost. First, what ZIP code do you live in?",
  "new-to-medicare":
    "Welcome — Medicare can feel like a lot, but I'll keep this simple. To start: are you turning 65 soon, already 65, or helping someone else figure it out?",
};

function openerFor(mode: IntakeMode, path?: HybridPath): string {
  if (mode === "hybrid" && path) return PATH_OPENERS[path];
  return RAMBLE_OPENER;
}

export function IntakeChat({ mode, path, initialMessages, onMessagesChange, intake, autoSend, skipOpener }: Props) {
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
        : skipOpener
          ? []
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

  const { messages, sendMessage, status, setMessages } = useChat({
    id: `v4-intake-${mode}-${path ?? "none"}`,
    messages: seeded,
    transport: transport.current,
  });

  const [input, setInput] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceLive, setVoiceLive] = useState<{ id: string; role: "user" | "assistant"; text: string }[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<VoiceIntakeHandle>(null);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (autoSend && !autoSentRef.current) {
      autoSentRef.current = true;
      sendMessage({ text: autoSend });
    }
  }, [autoSend, sendMessage]);

  useEffect(() => {
    onMessagesChange(messages);
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, onMessagesChange]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [voiceLive]);

  const busy = status === "submitted" || status === "streaming";

  const submit = (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    sendMessage({ text });
    if (!override) setInput("");
  };

  const onLiveTranscript = useCallback((role: "user" | "assistant", text: string) => {
    const displayText = role === "assistant" && DEFERRED_PLAN_RE.test(text) ? INLINE_PLAN_MESSAGE : text;
    setVoiceLive((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        return [...prev.slice(0, -1), { ...last, text: displayText }];
      }
      return [...prev, { id: `live-${role}-${Date.now()}`, role, text: displayText }];
    });
  }, []);

  const onLiveReset = useCallback(() => setVoiceLive([]), []);

  const onVoiceAppend = useCallback(
    (role: "user" | "assistant", text: string) => {
      const isDeferredAssistant = role === "assistant" && DEFERRED_PLAN_RE.test(text);
      const planData = isDeferredAssistant ? buildInlinePlanRecommendations(intakeRef.current) : null;
      setMessages((prev) => [
        ...prev,
        {
          id: `voice-${role}-${Date.now()}`,
          role,
          parts: [
            { type: "text", text: isDeferredAssistant ? INLINE_PLAN_MESSAGE : text },
            ...(planData
              ? [
                  {
                    type: "tool-recommendPlans",
                    toolCallId: `inline-voice-${Date.now()}`,
                    state: "output-available",
                    input: planData,
                    output: planData,
                  } as UIMessage["parts"][number],
                ]
              : []),
          ],
        },
      ]);
    },
    [setMessages],
  );

  // Persist inline plan fallback: once we decide to show plans, attach them to
  // the assistant message so they stick around even after the user keeps talking.
  const fallbackInjectedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (busy) return;
    // Find the most recent user message that asked for plans, or an assistant
    // deferral that says matches are ready. In either case, persist inline plan cards.
    let askIdx = -1;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role !== "user") continue;
      const t = messageText(m);
      if (t && PLAN_REQUEST_RE.test(t)) {
        askIdx = i;
        break;
      }
    }
    let assistant = askIdx >= 0 ? messages.slice(askIdx + 1).find((m) => m.role === "assistant") : undefined;
    if (!assistant) {
      assistant = [...messages].reverse().find((m) => {
        if (m.role !== "assistant") return false;
        const text = messageText(m);
        return !!text && (DEFERRED_PLAN_RE.test(text) || LEAKED_TOOL_RE.test(text));
      });
    }
    if (!assistant) return;
    if (fallbackInjectedRef.current.has(assistant.id)) return;
    const hasPlanTool = assistant.parts.some((p) => (p as AnyPart).type === "tool-recommendPlans");
    if (hasPlanTool) {
      fallbackInjectedRef.current.add(assistant.id);
      return;
    }
    const aText = messageText(assistant);
    if (!aText) return;
    const isDeferred = DEFERRED_PLAN_RE.test(aText);
    const isLeaked = LEAKED_TOOL_RE.test(aText);
    if (askIdx >= 0 && !isDeferred && !isLeaked && !PLAN_REQUEST_RE.test(aText)) return;
    const data = buildInlinePlanRecommendations(intake);
    fallbackInjectedRef.current.add(assistant.id);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistant!.id
          ? {
              ...m,
              parts: [
                ...m.parts.map((part) => {
                  if (part.type !== "text") return part;
                  if (isDeferred) return { ...part, text: INLINE_PLAN_MESSAGE };
                  if (isLeaked) {
                    const cleaned = stripLeakedToolText(part.text);
                    return { ...part, text: cleaned || INLINE_PLAN_MESSAGE };
                  }
                  return part;
                }),
                {
                  type: "tool-recommendPlans",
                  toolCallId: `inline-${assistant!.id}`,
                  state: "output-available",
                  input: data,
                  output: data,
                } as UIMessage["parts"][number],
              ],
            }
          : m,
      ),
    );
  }, [busy, intake, messages, setMessages]);

  const chatItems: ChatItem[] = useMemo(
    () => [
      ...messages.map((m) => ({ message: m, live: false })),
      ...voiceLive.map(
        (e) =>
          ({
            message: {
              id: e.id,
              role: e.role,
              parts: [{ type: "text", text: e.text }],
            } as UIMessage,
            live: true,
          }) as ChatItem,
      ),
    ],
    [messages, voiceLive],
  );

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[600px]">
      <div className="flex-1 rounded-2xl border border-line bg-paper shadow-xl overflow-hidden flex flex-col min-h-0">

        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          {chatItems.map(({ message, live }) => (
            <MessageRow
              key={message.id}
              message={message}
              onPickChip={(c) => submit(c)}
              onQuestionnaireSubmit={(text) => submit(text)}
              disabled={busy}
              live={live}
            />
          ))}
          {/* inline plan fallback now injected into messages directly */}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-ink/60 px-1">
              <span className="h-2 w-2 rounded-full bg-ink animate-pulse" />
              <span>Thinking…</span>
            </div>
          )}
        </div>

        {voiceActive && (
          <div className="border-t border-line bg-canvas/5 px-5 py-3">
            <VoiceIntake
              ref={voiceRef}
              mode={mode}
              path={path}
              promptVersion="v4"
              messages={messages}
              onMessagesChange={onMessagesChange}
              compact
              onLiveTranscript={onLiveTranscript}
              onLiveReset={onLiveReset}
              onAppend={onVoiceAppend}
            />
          </div>
        )}

        <div className="border-t border-line p-4 bg-paper">
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={() => submit()}
            onToggleVoice={async () => {
              if (voiceActive) {
                await voiceRef.current?.flush();
                setVoiceActive(false);
              } else {
                setVoiceActive(true);
                setTimeout(() => voiceRef.current?.start(), 50);
              }
            }}
            voiceActive={voiceActive}
            busy={busy}
          />
        </div>
      </div>
    </div>
  );
}

function messageText(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
}

type AnyPart = UIMessage["parts"][number] & { type: string; state?: string; input?: unknown };

function MessageRow({
  message,
  onPickChip,
  onQuestionnaireSubmit,
  disabled,
  live,
}: {
  message: UIMessage;
  onPickChip: (chip: string) => void;
  onQuestionnaireSubmit: (text: string) => void;
  disabled: boolean;
  live?: boolean;
}) {
  const rawText = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
  const text = message.role === "assistant" ? stripLeakedToolText(rawText) : rawText;

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className={`max-w-[80%] rounded-2xl rounded-br-md bg-paper text-ink border border-ink/10 px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm ${
            live ? "opacity-70 italic" : ""
          }`}
        >
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 shrink-0 rounded-full bg-paper flex items-center justify-center p-1">
        <img src={emblemAsset.url} alt="UnitedHealthcare" className="h-5 w-5 object-contain" />
      </div>
      <div className="flex-1 min-w-0 max-w-[85%]">
        {text && (
          <div className={`text-[15px] leading-relaxed text-ink whitespace-pre-wrap ${live ? "opacity-70 italic" : ""}`}>{text}</div>
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
