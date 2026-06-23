import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Minus, Maximize2, X, MessageCircle } from "lucide-react";
import assistantAsset from "@/assets/assistant.png.asset.json";

export const Route = createFileRoute("/v2")({
  head: () => ({
    meta: [
      { title: "Medicare by UnitedHealthcare — Virtual Assistant" },
      { name: "description", content: "A concierge Medicare experience guided by your UnitedHealthcare Virtual Assistant." },
    ],
  }),
  component: V2Page,
});

const UHC_BLUE = "#002678";

type Msg = { role: "assistant" | "user"; text: string };

type DockState = "expanded" | "docked" | "minimized";

const SERIF: React.CSSProperties = { fontFamily: '"Source Serif Pro", Georgia, serif' };

function V2Page() {
  const [dock, setDock] = useState<DockState>("expanded");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text:
        "Welcome to Medicare by UnitedHealthcare.\n\nMy job is to help you along the way.\n\nFirst, let's start with your name.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState<string | null>(null);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");

    // Simple scripted concierge replies
    setTimeout(() => {
      setMessages((m) => {
        const userTurn = m.filter((x) => x.role === "user").length;
        let reply = "";
        if (!name && userTurn === 1) {
          const first = text.split(/\s+/)[0];
          setName(first);
          reply = `It's lovely to meet you, ${first}. I'll be your guide through Medicare — at your pace, no pressure.\n\nTo get started, what brings you here today? Are you turning 65 soon, exploring plans, or looking to switch?`;
        } else if (userTurn === 2) {
          reply = "Thank you for sharing that. I've opened a few things on the left that might help — Medicare basics, plan recommendations, and a quick cost estimate. Browse freely, and I'll stay right here.";
        } else {
          reply = "Got it. I've noted that. Anything you'd like me to look into next — providers, prescriptions, or comparing plans?";
        }
        return [...m, { role: "assistant", text: reply }];
      });
      if (dock === "expanded") setDock("docked");
    }, 650);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ backgroundColor: UHC_BLUE }}>
      {/* Back link */}
      <Link
        to="/"
        className="absolute top-5 left-6 z-50 text-xs font-medium text-white/70 hover:text-white underline underline-offset-4"
      >
        ← Back to main view
      </Link>

      {/* Main content area (visible when docked) */}
      {dock !== "expanded" && (
        <main className="px-8 pt-20 pb-16" style={{ marginRight: dock === "docked" ? 400 : 0 }}>
          <ContentArea name={name} />
        </main>
      )}

      {/* Expanded welcome modal */}
      {dock === "expanded" && (
        <ExpandedModal
          messages={messages}
          draft={draft}
          setDraft={setDraft}
          onSend={send}
          onMinimize={() => setDock("docked")}
        />
      )}

      {/* Docked assistant */}
      {dock === "docked" && (
        <DockedAssistant
          messages={messages}
          draft={draft}
          setDraft={setDraft}
          onSend={send}
          onExpand={() => setDock("expanded")}
          onMinimize={() => setDock("minimized")}
        />
      )}

      {/* Minimized FAB */}
      {dock === "minimized" && (
        <button
          onClick={() => setDock("docked")}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-white pl-2 pr-5 py-2 shadow-2xl hover:scale-[1.02] transition"
        >
          <img src={assistantAsset.url} alt="Assistant" className="h-10 w-10 rounded-full object-cover" />
          <span style={{ ...SERIF, color: UHC_BLUE }} className="text-sm font-semibold">
            Chat with your guide
          </span>
          <MessageCircle className="h-4 w-4" style={{ color: UHC_BLUE }} />
        </button>
      )}
    </div>
  );
}

function ExpandedModal({
  messages,
  draft,
  setDraft,
  onSend,
  onMinimize,
}: {
  messages: Msg[];
  draft: string;
  setDraft: (s: string) => void;
  onSend: (s: string) => void;
  onMinimize: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const latest = messages[messages.length - 1];
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-[880px] rounded-3xl bg-white shadow-2xl px-10 sm:px-16 py-14">
        <button
          onClick={onMinimize}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-black/5 transition"
          aria-label="Minimize"
        >
          <Minus className="h-5 w-5" style={{ color: UHC_BLUE }} />
        </button>

        <div className="flex justify-center">
          <img
            src={assistantAsset.url}
            alt="Your UnitedHealthcare Medicare guide"
            className="h-40 w-40 rounded-full object-cover"
          />
        </div>

        <div
          className="mt-10 text-center whitespace-pre-line text-[28px] sm:text-[32px] leading-[1.35] font-normal"
          style={{ ...SERIF, color: UHC_BLUE }}
        >
          {latest.role === "assistant"
            ? latest.text
            : "Thank you. One moment…"}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend(draft);
          }}
          className="mt-10 relative"
        >
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend(draft);
              }
            }}
            rows={1}
            placeholder="Type your response here..."
            className="w-full resize-none rounded-2xl border border-black/10 bg-[#f6f7fa] px-6 py-5 pr-16 text-lg outline-none focus:border-transparent focus:ring-2 transition"
            style={{ color: UHC_BLUE, ['--tw-ring-color' as never]: UHC_BLUE }}
          />
          <button
            type="submit"
            aria-label="Send"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full flex items-center justify-center transition hover:opacity-90"
            style={{ backgroundColor: UHC_BLUE }}
          >
            <ArrowUp className="h-5 w-5 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}

function DockedAssistant({
  messages,
  draft,
  setDraft,
  onSend,
  onExpand,
  onMinimize,
}: {
  messages: Msg[];
  draft: string;
  setDraft: (s: string) => void;
  onSend: (s: string) => void;
  onExpand: () => void;
  onMinimize: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <aside
      className="fixed top-6 right-6 bottom-6 w-[360px] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden z-40"
    >
      <header className="flex items-center gap-3 px-5 py-4 border-b border-black/5">
        <img src={assistantAsset.url} alt="Assistant" className="h-12 w-12 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-black/50">UnitedHealthcare</div>
          <div style={{ ...SERIF, color: UHC_BLUE }} className="text-base font-semibold truncate">
            Your Medicare Guide
          </div>
        </div>
        <button onClick={onExpand} aria-label="Expand" className="p-2 rounded-full hover:bg-black/5">
          <Maximize2 className="h-4 w-4" style={{ color: UHC_BLUE }} />
        </button>
        <button onClick={onMinimize} aria-label="Collapse" className="p-2 rounded-full hover:bg-black/5">
          <X className="h-4 w-4" style={{ color: UHC_BLUE }} />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "assistant"
                ? "max-w-[90%] whitespace-pre-line text-[15px] leading-relaxed"
                : "ml-auto max-w-[85%] rounded-2xl px-4 py-2 text-sm text-white"
            }
            style={
              m.role === "assistant"
                ? { ...SERIF, color: UHC_BLUE }
                : { backgroundColor: UHC_BLUE }
            }
          >
            {m.text}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend(draft);
        }}
        className="p-4 border-t border-black/5 relative"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(draft);
            }
          }}
          rows={1}
          placeholder="Type your response here..."
          className="w-full resize-none rounded-2xl border border-black/10 bg-[#f6f7fa] px-4 py-3 pr-12 text-sm outline-none focus:ring-2"
          style={{ color: UHC_BLUE, ['--tw-ring-color' as never]: UHC_BLUE }}
        />
        <button
          type="submit"
          aria-label="Send"
          className="absolute right-6 bottom-7 h-8 w-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: UHC_BLUE }}
        >
          <ArrowUp className="h-4 w-4 text-white" />
        </button>
      </form>
    </aside>
  );
}

function ContentArea({ name }: { name: string | null }) {
  const cards: { title: string; body: string }[] = [
    {
      title: "Medicare Basics",
      body: "A short, plain-language tour of Parts A, B, C, and D — and how they fit together.",
    },
    {
      title: "Plan Recommendations",
      body: "Personalized Medicare Advantage and Supplement options shaped by your conversation.",
    },
    {
      title: "Compare Plans",
      body: "Side-by-side premiums, out-of-pocket costs, networks, and extra benefits.",
    },
    {
      title: "Find Your Doctors",
      body: "Check whether your current providers are in-network for each plan.",
    },
    {
      title: "Prescription Lookup",
      body: "Add your medications and see exactly what they'll cost on each plan.",
    },
    {
      title: "Estimate Your Costs",
      body: "A clear monthly and yearly view based on your real care patterns.",
    },
  ];
  return (
    <div className="max-w-5xl">
      <div className="text-xs uppercase tracking-[0.18em] text-white/60">
        UnitedHealthcare · Medicare
      </div>
      <h1
        className="mt-3 text-white text-4xl sm:text-5xl leading-tight font-normal"
        style={SERIF}
      >
        {name ? `Welcome, ${name}.` : "Welcome."}
        <span className="block text-white/70 text-2xl sm:text-3xl mt-2">
          Explore at your pace — your guide is right beside you.
        </span>
      </h1>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c) => (
          <button
            key={c.title}
            className="text-left rounded-2xl bg-white p-6 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
          >
            <div style={{ ...SERIF, color: UHC_BLUE }} className="text-xl font-semibold">
              {c.title}
            </div>
            <div className="mt-2 text-sm text-black/70 leading-relaxed">{c.body}</div>
            <div
              className="mt-5 inline-flex items-center gap-1 text-sm font-medium"
              style={{ color: UHC_BLUE }}
            >
              Open →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
