import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Minus, Maximize2, X, MessageCircle, Play } from "lucide-react";
import assistantAsset from "@/assets/assistant.png.asset.json";
import logoAsset from "@/assets/unified-health-logo.png.asset.json";

export const Route = createFileRoute("/v2")({
  head: () => ({
    meta: [
      { title: "Medicare by Unified Health — Virtual Assistant" },
      { name: "description", content: "A concierge Medicare experience guided by your Unified Health Virtual Assistant." },
    ],
  }),
  component: V2Page,
});

const UHC_BLUE = "#002678";

type Msg = { role: "assistant" | "user"; text: string };
type DockState = "expanded" | "docked" | "minimized";
type ContentView =
  | { kind: "home" }
  | { kind: "education"; topic: string };

const SERIF: React.CSSProperties = { fontFamily: '"Source Serif Pro", Georgia, serif' };

const SUGGESTIONS = [
  "Compare Plans",
  "I'm Turning 65 Soon",
  "Show Me Key Dates",
  "What Do I Do First?",
  "Medicare Basics",
  "Estimate My Costs",
  "Find a Doctor",
  "Prescription Drug Coverage",
  "Enrollment Checklist",
];

const EDUCATION_INTENT = [
  "don't know", "dont know", "where to start", "need help", "explain medicare",
  "don't understand", "dont understand", "what is medicare", "just learning",
  "turning 65", "new to medicare", "first time", "confused", "help me understand",
  "medicare basics", "what do i do first",
];

function detectEducationIntent(s: string) {
  const t = s.toLowerCase();
  return EDUCATION_INTENT.some((k) => t.includes(k));
}

function V2Page() {
  const [dock, setDock] = useState<DockState>("expanded");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "My job is to help you along the way.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [view, setView] = useState<ContentView>({ kind: "home" });

  const respondTo = (text: string) => {
    setMessages((m) => {
      const userTurn = m.filter((x) => x.role === "user").length;
      let reply = "";

      if (!name && userTurn === 1) {
        const first = text.split(/\s+/)[0].replace(/[^a-zA-Z'-]/g, "");
        if (first) setName(first);
        reply = `It's lovely to meet you, ${first || "there"}. I'll be your guide through Medicare — at your pace, no pressure.\n\nTo get started, what brings you here today? Are you turning 65 soon, exploring plans, or looking to switch?`;
      } else if (detectEducationIntent(text)) {
        setView({ kind: "education", topic: "Understanding Medicare" });
        reply = "That's a wonderful place to begin. I've opened a short overview of Medicare on the left — it walks through Parts A, B, C, and D in plain language. Watch when you're ready, and ask me anything along the way.";
      } else if (/compare/i.test(text)) {
        setView({ kind: "education", topic: "Comparing Your Options" });
        reply = "Great — I've pulled up a side-by-side comparison view on the left. We can narrow this down as we learn more about your doctors and prescriptions.";
      } else if (/doctor/i.test(text)) {
        setView({ kind: "education", topic: "Finding Your Doctors" });
        reply = "Let's make sure your doctors stay in-network. I've opened the provider lookup on the left.";
      } else if (/cost|estimate|price/i.test(text)) {
        setView({ kind: "education", topic: "Estimating Your Costs" });
        reply = "Here's a clear monthly and yearly cost view. Numbers update as we refine your situation.";
      } else if (/prescription|drug/i.test(text)) {
        setView({ kind: "education", topic: "Prescription Drug Coverage" });
        reply = "I've opened drug coverage on the left. Add your medications anytime and I'll show what each plan would cost.";
      } else if (/date|enroll|checklist|first/i.test(text)) {
        setView({ kind: "education", topic: "Key Dates & Enrollment" });
        reply = "Here are the dates that matter — Initial Enrollment, Annual Enrollment, and special periods. I'll keep this visible while we talk.";
      } else {
        reply = "Got it. I've noted that. Would you like me to open Medicare basics, compare plans, or estimate your costs next?";
      }
      return [...m, { role: "assistant", text: reply }];
    });
    if (dock === "expanded") setDock("docked");
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");
    setTimeout(() => respondTo(text), 600);
  };

  const onSuggestion = (s: string) => send(s);

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ backgroundColor: UHC_BLUE }}>
      {/* Top nav links */}
      <nav className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-10 text-sm">
        <a className="text-white/85 hover:text-white transition" href="#talk">Talk to an Agent</a>
        <a className="text-white/85 hover:text-white transition" href="#member">I'm Already a Member</a>
      </nav>

      {/* Logo upper-right */}
      <div className="absolute top-5 right-6 z-50">
        <img
          src={logoAsset.url}
          alt="Unified Health"
          className="h-10 w-auto object-contain"
        />
      </div>

      {/* Demo nav: v1 link lower-left */}
      <Link
        to="/"
        className="fixed bottom-4 left-5 z-50 text-[11px] uppercase tracking-wider text-white/45 hover:text-white/90 transition"
      >
        ← Version 1
      </Link>

      {/* Main content (when not full expanded modal) */}
      {dock !== "expanded" && (
        <main className="pt-24 pb-20 pl-8 pr-8" style={{ marginRight: dock === "docked" ? 400 : 0 }}>
          <ContentArea view={view} name={name} onSuggestion={onSuggestion} />
        </main>
      )}

      {dock === "expanded" && (
        <ExpandedModal
          messages={messages}
          draft={draft}
          setDraft={setDraft}
          onSend={send}
          onMinimize={() => setDock("docked")}
        />
      )}

      {dock === "docked" && (
        <DockedAssistant
          messages={messages}
          draft={draft}
          setDraft={setDraft}
          onSend={send}
          onSuggestion={onSuggestion}
          onExpand={() => setDock("expanded")}
          onMinimize={() => setDock("minimized")}
        />
      )}

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
  messages, draft, setDraft, onSend, onMinimize,
}: {
  messages: Msg[];
  draft: string;
  setDraft: (s: string) => void;
  onSend: (s: string) => void;
  onMinimize: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const latest = messages[messages.length - 1];
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-24">
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
            alt="Your Unified Health Medicare guide"
            className="h-40 w-40 rounded-full object-cover"
          />
        </div>

        <div
          className="mt-10 text-center whitespace-pre-line text-[28px] sm:text-[32px] leading-[1.35] font-normal"
          style={{ ...SERIF, color: UHC_BLUE }}
        >
          {latest.role === "assistant" ? latest.text : "Thank you. One moment…"}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); onSend(draft); }}
          className="mt-10 relative"
        >
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(draft); }
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
  messages, draft, setDraft, onSend, onSuggestion, onExpand, onMinimize,
}: {
  messages: Msg[];
  draft: string;
  setDraft: (s: string) => void;
  onSend: (s: string) => void;
  onSuggestion: (s: string) => void;
  onExpand: () => void;
  onMinimize: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <aside className="fixed top-20 right-6 bottom-6 w-[360px] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden z-40">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-black/5">
        <img src={assistantAsset.url} alt="Assistant" className="h-12 w-12 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-black/50">Unified Health</div>
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
                ? "max-w-[92%] whitespace-pre-line text-[15px] leading-relaxed"
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

        {/* Suggested next steps */}
        <div className="pt-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-black/40 mb-2">
            Suggested next steps
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestion(s)}
                className="text-xs px-3 py-1.5 rounded-full border transition hover:bg-[#002678] hover:text-white"
                style={{ borderColor: "rgba(0,38,120,0.2)", color: UHC_BLUE }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); onSend(draft); }}
        className="p-4 border-t border-black/5 relative"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(draft); }
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

function ContentArea({
  view, name, onSuggestion,
}: {
  view: ContentView;
  name: string | null;
  onSuggestion: (s: string) => void;
}) {
  const heading = useMemo(() => {
    if (view.kind === "education") return view.topic;
    return name ? `Welcome, ${name}.` : "Welcome.";
  }, [view, name]);

  return (
    <div className="max-w-4xl">
      <div className="text-xs uppercase tracking-[0.18em] text-white/60">
        Unified Health · Medicare
      </div>
      <h1
        className="mt-3 text-white text-4xl sm:text-5xl leading-tight font-normal"
        style={SERIF}
      >
        {heading}
        <span className="block text-white/70 text-2xl sm:text-3xl mt-2">
          {view.kind === "education"
            ? "A short, plain-language walkthrough — your guide stays with you."
            : "Explore at your pace — your guide is right beside you."}
        </span>
      </h1>

      {/* Video placeholder */}
      <div className="mt-10 rounded-3xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl aspect-video relative group">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-white/95 grid place-items-center shadow-xl group-hover:scale-105 transition">
            <Play className="h-8 w-8" style={{ color: UHC_BLUE }} fill={UHC_BLUE} />
          </div>
        </div>
        <div className="absolute bottom-4 left-5 text-white/80 text-sm">
          {view.kind === "education" ? view.topic : "Medicare in 3 minutes"} · 3:24
        </div>
      </div>

      {/* Supporting content */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { t: "Part A", d: "Hospital coverage — most people pay no premium." },
          { t: "Part B", d: "Doctor visits, preventive care, and outpatient services." },
          { t: "Parts C & D", d: "Medicare Advantage and prescription drug coverage." },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur">
            <div style={{ ...SERIF }} className="text-white text-lg font-semibold">{c.t}</div>
            <div className="mt-1 text-white/70 text-sm leading-relaxed">{c.d}</div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/50 mb-3">
          Where would you like to go next?
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestion(s)}
              className="text-sm px-4 py-2 rounded-full bg-white/10 text-white border border-white/15 hover:bg-white hover:text-[#002678] transition"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
