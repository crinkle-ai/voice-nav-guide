import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Minus,
  Maximize2,
  MessageCircle,
  Play,
  Bookmark,
  Stethoscope,
  Pill,
  Calendar,
  FileCheck2,
  StickyNote,
  ChevronRight,
} from "lucide-react";
import assistantAsset from "@/assets/assistant.png.asset.json";
import logoAsset from "@/assets/unified-health-logo-v2-white.png.asset.json";
import heroIllustration from "@/assets/v2-hero-illustration.png.asset.json";
import partIcons from "@/assets/v2-part-icons.png.asset.json";
import workspaceScenes from "@/assets/v2-workspace-scenes.png.asset.json";

// Both sprites are 3 horizontal subjects in a 1536x1024 image.
// backgroundSize: 300% 100%; x = 0% / 50% / 100% selects subject 1/2/3.
function SpriteBadge({
  src, index, size = 64, bg,
}: { src: string; index: 0 | 1 | 2; size?: number; bg?: string }) {
  const x = index === 0 ? "0%" : index === 1 ? "50%" : "100%";
  return (
    <div
      aria-hidden
      className="shrink-0 rounded-full overflow-hidden"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${src})`,
        backgroundSize: "300% 100%",
        backgroundPosition: `${x} 50%`,
        backgroundRepeat: "no-repeat",
        backgroundColor: bg ?? "transparent",
      }}
    />
  );
}


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
type PanelState = "expanded" | "docked" | "minimized";
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

// ----- Workspace mock data -----
type WorkspaceItem = { id: string; label: string; meta?: string };
type WorkspaceSection = {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  items: WorkspaceItem[];
};

const WORKSPACE: WorkspaceSection[] = [
  {
    key: "plans",
    title: "Saved Plans",
    icon: Bookmark,
    items: [
      { id: "p1", label: "Unified Health Advantage Plus", meta: "$0/mo · PPO" },
      { id: "p2", label: "Unified Health Secure HMO", meta: "$24/mo · HMO" },
    ],
  },
  {
    key: "doctors",
    title: "My Doctors",
    icon: Stethoscope,
    items: [
      { id: "d1", label: "Dr. Patel — Primary Care", meta: "In network" },
      { id: "d2", label: "Dr. Nguyen — Cardiology", meta: "In network" },
    ],
  },
  {
    key: "meds",
    title: "My Medications",
    icon: Pill,
    items: [
      { id: "m1", label: "Atorvastatin 20mg", meta: "Tier 1" },
      { id: "m2", label: "Lisinopril 10mg", meta: "Tier 1" },
    ],
  },
  {
    key: "dates",
    title: "Important Dates",
    icon: Calendar,
    items: [
      { id: "k1", label: "Initial Enrollment opens", meta: "Mar 1" },
      { id: "k2", label: "Birthday — turning 65", meta: "Jun 12" },
    ],
  },
  {
    key: "progress",
    title: "Enrollment Progress",
    icon: FileCheck2,
    items: [
      { id: "e1", label: "Learn the basics", meta: "Complete" },
      { id: "e2", label: "Compare plans", meta: "In progress" },
      { id: "e3", label: "Enroll", meta: "Not started" },
    ],
  },
  {
    key: "notes",
    title: "Notes",
    icon: StickyNote,
    items: [
      { id: "n1", label: "Ask about dental coverage on Advantage Plus" },
    ],
  },
];

function V2Page() {
  const [assistant, setAssistant] = useState<PanelState>("expanded");
  const [workspace, setWorkspace] = useState<PanelState>("minimized");

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "My job is to help you along the way." },
  ]);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [view, setView] = useState<ContentView>({ kind: "home" });

  // Mutual-exclusion: expanding one panel minimizes the other entirely
  const expandAssistant = () => {
    setAssistant("expanded");
    setWorkspace("minimized");
  };
  const expandWorkspace = () => {
    setWorkspace("expanded");
    setAssistant("minimized");
  };

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
    if (assistant === "expanded") {
      setAssistant("docked");
      setWorkspace("docked");
    }
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");
    setTimeout(() => respondTo(text), 600);
  };

  const onSuggestion = (s: string) => send(s);
  const hasStarted = messages.some((m) => m.role === "user");

  // Right column reserves space when either panel is docked
  const rightReserved =
    assistant === "docked" || workspace === "docked" ? 400 : 0;

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ backgroundColor: UHC_BLUE }}>
      {/* Logo upper-left */}
      <div className="absolute top-5 left-6 z-50">
        <img
          src={logoAsset.url}
          alt="Unified Health"
          className="h-10 w-auto object-contain"
        />
      </div>

      {/* Top nav links */}
      <nav className="absolute top-6 right-6 z-50 flex items-center gap-10 text-sm">
        <a className="text-white/85 hover:text-white transition" href="#talk">Talk to an Agent</a>
        <a className="text-white/85 hover:text-white transition" href="#member">I'm Already a Member</a>
      </nav>

      {/* Demo nav: v1 link lower-left */}
      <Link
        to="/"
        className="fixed bottom-4 left-5 z-50 text-[11px] uppercase tracking-wider text-white/45 hover:text-white/90 transition"
      >
        ← Version 1
      </Link>

      {/* Content area (left) */}
      {assistant !== "expanded" && workspace !== "expanded" && (
        <main
          className="pt-24 pb-20 pl-8 pr-8 transition-[margin] duration-300"
          style={{ marginRight: rightReserved }}
        >
          <ContentArea view={view} name={name} onSuggestion={onSuggestion} />
        </main>
      )}

      {/* Assistant panel */}
      {assistant === "expanded" && (
        <ExpandedModal
          messages={messages}
          draft={draft}
          setDraft={setDraft}
          onSend={send}
          onMinimize={() => setAssistant("docked")}
          placeholder={hasStarted ? "Type your response here" : "First, let's start with your name"}
        />
      )}

      {assistant === "docked" && (
        <DockedAssistant
          messages={messages}
          draft={draft}
          setDraft={setDraft}
          onSend={send}
          onSuggestion={onSuggestion}
          onExpand={expandAssistant}
          onMinimize={() => setAssistant("minimized")}
          workspaceDocked={workspace === "docked"}
          workspaceMinimized={workspace === "minimized"}
        />
      )}

      {assistant === "minimized" && workspace !== "expanded" && (
        <button
          onClick={() => setAssistant("docked")}
          className="fixed top-20 right-6 z-40 flex h-12 w-52 items-center justify-between rounded-full bg-white px-4 shadow-2xl hover:scale-[1.02] transition"
        >
          <div className="flex items-center gap-3">
            <img src={assistantAsset.url} alt="Assistant" className="h-9 w-9 rounded-full object-cover" />
            <span style={{ ...SERIF, color: UHC_BLUE }} className="text-sm font-semibold">
              Your Guide
            </span>
          </div>
          <MessageCircle className="h-4 w-4 shrink-0" style={{ color: UHC_BLUE }} />
        </button>
      )}

      {/* Workspace panel — hidden when assistant is expanded */}
      {assistant !== "expanded" && (
        <>
          {workspace === "expanded" && (
            <WorkspaceExpanded
              name={name}
              onMinimize={() => setWorkspace("docked")}
            />
          )}

          {workspace === "docked" && (
            <DockedWorkspace
              name={name}
              assistantDocked={assistant === "docked"}
              onExpand={expandWorkspace}
              onMinimize={() => setWorkspace("minimized")}
            />
          )}

          {workspace === "minimized" && (
            <button
              onClick={() => setWorkspace("docked")}
              className="fixed right-6 z-40 flex h-12 w-52 items-center justify-between rounded-full bg-white px-4 shadow-2xl hover:scale-[1.02] transition"
              style={
                assistant === "docked"
                  ? { bottom: "1.5rem" }
                  : { top: "9rem" }
              }
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-full grid place-items-center"
                  style={{ backgroundColor: "rgba(0,38,120,0.08)" }}
                >
                  <Bookmark className="h-4 w-4 shrink-0" style={{ color: UHC_BLUE }} />
                </div>
                <span style={{ ...SERIF, color: UHC_BLUE }} className="text-sm font-semibold">
                  My Workspace
                </span>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0" style={{ color: UHC_BLUE }} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

function ExpandedModal({
  messages, draft, setDraft, onSend, onMinimize, placeholder,
}: {
  messages: Msg[];
  draft: string;
  setDraft: (s: string) => void;
  onSend: (s: string) => void;
  onMinimize: () => void;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const latest = messages[messages.length - 1];
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-16">
      <h1
        className="mb-8 text-center text-white text-4xl sm:text-5xl lg:text-6xl font-normal leading-tight"
        style={SERIF}
      >
        Welcome to Medicare by Unified Health.
      </h1>

      <div className="relative w-full max-w-[680px] rounded-3xl bg-white shadow-2xl px-8 sm:px-12 py-10">
        <button
          onClick={onMinimize}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition"
          aria-label="Minimize"
        >
          <Minus className="h-5 w-5" style={{ color: UHC_BLUE }} />
        </button>

        <div className="flex justify-center">
          <img
            src={assistantAsset.url}
            alt="Your Unified Health Medicare guide"
            className="h-28 w-28 rounded-full object-cover"
          />
        </div>

        <div
          className="mt-8 text-center whitespace-pre-line text-xl sm:text-2xl leading-relaxed font-normal"
          style={{ ...SERIF, color: UHC_BLUE }}
        >
          {latest.role === "assistant" ? latest.text : "Thank you. One moment…"}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); onSend(draft); }}
          className="mt-8 relative"
        >
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(draft); }
            }}
            rows={1}
            placeholder={placeholder}
            className="w-full resize-none rounded-2xl border border-black/10 bg-[#f6f7fa] px-6 py-4 pr-16 text-base outline-none focus:border-transparent focus:ring-2 transition"
            style={{ color: UHC_BLUE, ['--tw-ring-color' as never]: UHC_BLUE }}
          />
          <button
            type="submit"
            aria-label="Send"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex items-center justify-center transition hover:opacity-90"
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
  workspaceDocked, workspaceMinimized,
}: {
  messages: Msg[];
  draft: string;
  setDraft: (s: string) => void;
  onSend: (s: string) => void;
  onSuggestion: (s: string) => void;
  onExpand: () => void;
  onMinimize: () => void;
  workspaceDocked: boolean;
  workspaceMinimized: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // When workspace is docked, split the right column in half.
  // When workspace is minimized, raise the chat so the pill sits below it.
  const bottom = workspaceDocked
    ? "calc(50vh + 8px)"
    : workspaceMinimized
    ? "6rem"
    : "1.5rem";

  return (
    <aside
      className="fixed top-20 right-6 w-[360px] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden z-40"
      style={{ bottom }}
    >
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
        <button onClick={onMinimize} aria-label="Minimize" className="p-2 rounded-full hover:bg-black/5">
          <Minus className="h-4 w-4" style={{ color: UHC_BLUE }} />
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
          placeholder="Type your response here"
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

function WorkspaceHeader({
  onExpand, onMinimize, name, compact = false,
}: {
  onExpand?: () => void;
  onMinimize?: () => void;
  name: string | null;
  compact?: boolean;
}) {
  return (
    <header className="flex items-center gap-3 px-5 py-4 border-b border-black/5">
      <div
        className="h-10 w-10 rounded-full grid place-items-center"
        style={{ backgroundColor: "rgba(0,38,120,0.08)" }}
      >
        <Bookmark className="h-5 w-5" style={{ color: UHC_BLUE }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-black/50">
          {name ? `${name}'s` : "My"} Workspace
        </div>
        <div style={{ ...SERIF, color: UHC_BLUE }} className={`${compact ? "text-base" : "text-lg"} font-semibold truncate`}>
          Saved decisions & progress
        </div>
      </div>
      {onExpand && (
        <button onClick={onExpand} aria-label="Expand" className="p-2 rounded-full hover:bg-black/5">
          <Maximize2 className="h-4 w-4" style={{ color: UHC_BLUE }} />
        </button>
      )}
      {onMinimize && (
        <button onClick={onMinimize} aria-label="Minimize" className="p-2 rounded-full hover:bg-black/5">
          <Minus className="h-4 w-4" style={{ color: UHC_BLUE }} />
        </button>
      )}
    </header>
  );
}

// Color theme + scene illustration per workspace section.
const WS_THEME: Record<string, {
  tint: string;            // background tint of the section card
  accent: string;          // accent text/icon color
  sceneIndex?: 0 | 1 | 2;  // index into workspaceScenes sprite (if any)
}> = {
  plans:    { tint: "#EEF2FF", accent: "#3F3D8C", sceneIndex: 0 }, // indigo / clipboard
  doctors:  { tint: "#ECF7F4", accent: "#1F7A6B", sceneIndex: 1 }, // teal / doctor
  meds:     { tint: "#FFF1E8", accent: "#B5530E", sceneIndex: 2 }, // peach / pills
  dates:    { tint: "#E8F1FF", accent: "#1E3A8A" },
  progress: { tint: "#ECFDF5", accent: "#0E7C5A" },
  notes:    { tint: "#FBF1FF", accent: "#6B2E8E" },
};

function WorkspaceList({ dense = false }: { dense?: boolean }) {
  return (
    <div className={dense ? "space-y-4" : "space-y-5"}>
      {WORKSPACE.map((section, idx) => {
        const theme = WS_THEME[section.key] ?? WS_THEME.notes;
        const Icon = section.icon;
        const imageLeft = idx % 2 === 1; // alternate layout
        const hasScene = theme.sceneIndex !== undefined;

        return (
          <div
            key={section.key}
            className="rounded-2xl overflow-hidden border"
            style={{ backgroundColor: theme.tint, borderColor: "rgba(0,38,120,0.08)" }}
          >
            <div className={`flex ${imageLeft ? "flex-row-reverse" : "flex-row"} gap-3 p-3`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accent }} />
                  <div
                    className="text-[10px] uppercase tracking-[0.16em] font-semibold"
                    style={{ color: theme.accent }}
                  >
                    {section.title}
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {section.items.map((it) => (
                    <li
                      key={it.id}
                      className="rounded-lg bg-white/85 px-3 py-2 text-[13px] flex items-center justify-between gap-3"
                      style={{ color: UHC_BLUE }}
                    >
                      <span className="truncate" style={SERIF}>{it.label}</span>
                      {it.meta && (
                        <span className="shrink-0 text-[10px] text-black/55">{it.meta}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              {hasScene ? (
                <SpriteBadge
                  src={workspaceScenes.url}
                  index={theme.sceneIndex as 0 | 1 | 2}
                  size={dense ? 72 : 84}
                />
              ) : (
                <div
                  className="shrink-0 rounded-2xl grid place-items-center"
                  style={{
                    width: dense ? 72 : 84,
                    height: dense ? 72 : 84,
                    backgroundColor: "white",
                  }}
                >
                  <Icon className="h-7 w-7" style={{ color: theme.accent }} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function DockedWorkspace({
  name, assistantDocked, onExpand, onMinimize,
}: {
  name: string | null;
  assistantDocked: boolean;
  onExpand: () => void;
  onMinimize: () => void;
}) {
  // When assistant is docked above, sit below the midpoint; when assistant is minimized, sit below the pill; otherwise span the right column
  const top = assistantDocked ? "calc(50vh + 8px)" : "8.5rem";

  return (
    <aside
      className="fixed right-6 bottom-6 w-[360px] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden z-40"
      style={{ top }}
    >
      <WorkspaceHeader name={name} onExpand={onExpand} onMinimize={onMinimize} compact />
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <WorkspaceList dense />
      </div>
    </aside>
  );
}

function WorkspaceExpanded({
  name, onMinimize,
}: {
  name: string | null;
  onMinimize: () => void;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start px-6 sm:px-10 py-12">
      <div className="w-full max-w-[1400px]">
        <div className="flex items-end justify-between mb-6 gap-4">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">
              Unified Health · Personal Planning Center
            </div>
            <h1
              className="mt-2 text-white text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight truncate"
              style={SERIF}
            >
              {name ? `${name}'s ` : "Your "}Medicare Workspace
            </h1>
          </div>
          <button
            onClick={onMinimize}
            className="shrink-0 rounded-full bg-white/10 hover:bg-white/20 transition text-white px-4 py-2 text-sm flex items-center gap-2"
            aria-label="Minimize"
          >
            <Minus className="h-4 w-4" />
            Minimize
          </button>
        </div>

        <div className="rounded-3xl bg-white shadow-2xl overflow-hidden">
          <div className="px-6 sm:px-10 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {WORKSPACE.map((section, idx) => {
                const theme = WS_THEME[section.key] ?? WS_THEME.notes;
                const Icon = section.icon;
                const hasScene = theme.sceneIndex !== undefined;
                const imageLeft = idx % 2 === 1;
                return (
                  <div
                    key={section.key}
                    className="rounded-2xl overflow-hidden border min-w-0"
                    style={{ backgroundColor: theme.tint, borderColor: "rgba(0,38,120,0.08)" }}
                  >
                    <div className={`flex ${imageLeft ? "flex-row-reverse" : "flex-row"} gap-4 p-4`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2.5">
                          <Icon className="h-4 w-4 shrink-0" style={{ color: theme.accent }} />
                          <div
                            className="text-[11px] uppercase tracking-[0.16em] font-semibold"
                            style={{ color: theme.accent }}
                          >
                            {section.title}
                          </div>
                        </div>
                        <ul className="space-y-2">
                          {section.items.map((it) => (
                            <li
                              key={it.id}
                              className="rounded-lg bg-white/90 px-3 py-2 text-[13px] flex items-center justify-between gap-3"
                              style={{ color: UHC_BLUE }}
                            >
                              <span className="truncate" style={SERIF}>{it.label}</span>
                              {it.meta && (
                                <span className="shrink-0 text-[10px] text-black/55">{it.meta}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {hasScene ? (
                        <SpriteBadge
                          src={workspaceScenes.url}
                          index={theme.sceneIndex as 0 | 1 | 2}
                          size={96}
                        />
                      ) : (
                        <div
                          className="shrink-0 rounded-2xl grid place-items-center"
                          style={{ width: 96, height: 96, backgroundColor: "white" }}
                        >
                          <Icon className="h-8 w-8" style={{ color: theme.accent }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
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

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
        <div className="lg:col-span-3 rounded-3xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl aspect-video relative group">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-white/95 grid place-items-center shadow-xl group-hover:scale-105 transition">
              <Play className="h-8 w-8" style={{ color: UHC_BLUE }} fill={UHC_BLUE} />
            </div>
          </div>
          <div className="absolute bottom-4 left-5 text-white/80 text-sm">
            {view.kind === "education" ? view.topic : "Medicare in 3 minutes"} · 3:24
          </div>
        </div>
        <div className="lg:col-span-2 flex items-center justify-center">
          <img
            src={heroIllustration.url}
            alt="A Unified Health guide reviewing Medicare options with a senior couple"
            className="w-full h-auto max-h-[340px] object-contain drop-shadow-2xl"
            loading="lazy"
          />
        </div>
      </div>


      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {([
          {
            t: "Part A",
            d: "Hospital coverage — most people pay no premium.",
            idx: 0 as const,
            bg: "#EEF0FB", // lavender
            accent: "#3F3D8C",
          },
          {
            t: "Part B",
            d: "Doctor visits, preventive care, and outpatient services.",
            idx: 1 as const,
            bg: "#E6F4F2", // teal/aqua
            accent: "#1F7A6B",
          },
          {
            t: "Parts C & D",
            d: "Medicare Advantage and prescription drug coverage.",
            idx: 2 as const,
            bg: "#FDEEE3", // peach
            accent: "#B5530E",
          },
        ]).map((c) => (
          <button
            key={c.t}
            onClick={() => onSuggestion(c.t === "Parts C & D" ? "Prescription Drug Coverage" : `${c.t}`)}
            className="text-left rounded-2xl p-4 flex items-center gap-4 transition hover:-translate-y-0.5 hover:shadow-xl"
            style={{ backgroundColor: c.bg }}
          >
            <SpriteBadge src={partIcons.url} index={c.idx} size={72} />
            <div className="flex-1 min-w-0">
              <div style={SERIF} className="text-xl font-semibold" >
                <span style={{ color: c.accent }}>{c.t}</span>
              </div>
              <div className="mt-0.5 text-[13px] leading-snug" style={{ color: "rgba(0,0,0,0.65)" }}>
                {c.d}
              </div>
              <div
                className="mt-2 text-[12px] font-semibold inline-flex items-center gap-1"
                style={{ color: c.accent }}
              >
                Learn more <ChevronRight className="h-3 w-3" />
              </div>
            </div>
          </button>
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
