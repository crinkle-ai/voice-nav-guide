import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import type { IntakeMode } from "@/lib/v3/intake-types";

type Props = {
  mode: IntakeMode;
  initialMessages: UIMessage[];
  onMessagesChange: (msgs: UIMessage[]) => void;
};

const OPENERS: Record<IntakeMode, string> = {
  ramble:
    "Hi — I'm here to help you find the right Medicare plan. In your own words, tell me what's going on with your health coverage and what you're hoping a plan will do for you. Take your time.",
  structured:
    "Hi — I'll ask a few short questions so we can find the right Medicare plan for you. First: what brought you here today? Are you new to Medicare, switching plans, or just looking around?",
  hybrid:
    "Hi — I'll start broad, then narrow in. In your own words, what's going on with your Medicare situation, and what matters most to you in a plan?",
};

export function IntakeChat({ mode, initialMessages, onMessagesChange }: Props) {
  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/v3/chat",
      body: { mode },
    }),
  );

  const seeded: UIMessage[] =
    initialMessages.length > 0
      ? initialMessages
      : [
          {
            id: "opener",
            role: "assistant",
            parts: [{ type: "text", text: OPENERS[mode] }],
          },
        ];

  const { messages, sendMessage, status } = useChat({
    id: `v3-intake-${mode}`,
    messages: seeded,
    transport: transport.current,
  });

  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  useEffect(() => {
    onMessagesChange(messages);
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, onMessagesChange]);

  const busy = status === "submitted" || status === "streaming";

  const submit = () => {
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
    setTimeout(() => taRef.current?.focus(), 0);
  };

  return (
    <div className="flex flex-col h-[70vh] rounded-2xl border border-line bg-paper overflow-hidden">
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-2">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span>Thinking…</span>
          </div>
        )}
      </div>
      <div className="border-t border-line p-3 bg-canvas/40">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Type your response… (Enter to send, Shift+Enter for new line)"
            className="min-h-[52px] max-h-40 resize-none bg-paper border-line"
            disabled={busy}
          />
          <Button onClick={submit} disabled={busy || !input.trim()} size="icon" className="h-[52px] w-[52px] bg-accent hover:bg-accent-2 text-paper">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: UIMessage }) {
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-ink text-paper px-4 py-2.5 text-sm leading-relaxed">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center font-serif text-sm">M</div>
      <div className="text-[15px] leading-relaxed text-ink max-w-[85%] whitespace-pre-wrap">{text}</div>
    </div>
  );
}
