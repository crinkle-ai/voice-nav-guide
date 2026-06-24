import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
  Activity,
  Check,
  Sparkles,
} from "lucide-react";
import assistantAsset from "@/assets/assistant.png.asset.json";
import logoAsset from "@/assets/unified-health-logo-v2-white.png.asset.json";
import heroIllustration from "@/assets/v2-hero-illustration.png.asset.json";
import partIcons from "@/assets/v2-part-icons.png.asset.json";
import workspaceScenes from "@/assets/v2-workspace-scenes.png.asset.json";
import diabetesIllustration from "@/assets/v2-diabetes-illustration.png.asset.json";

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
  | { kind: "education"; topic: string }
  | { kind: "diabetes" };

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

const MEMBER_SUGGESTIONS = [
  "Review my diabetes information",
  "Show my medications",
  "Find a diabetes specialist",
  "Review my coverage",
  "Lower my prescription costs",
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

const DIABETES_INTENT = [
  "diabetes", "diabetic", "type 1", "type 2", "prediabetes", "pre-diabetes",
  "blood sugar", "a1c", "glucose", "insulin", "metformin", "diabetes medication",
];

function detectDiabetesIntent(s: string) {
  const t = s.toLowerCase();
  return DIABETES_INTENT.some((k) => t.includes(k));
}

// ----- Diabetes journey -----
type DiabetesProfile = {
  step: number; // index into DIABETES_QUESTIONS, -1 = not started, >=length = complete
  diagnosed?: string;
  type?: string;
  duration?: string;
  takesMeds?: string;
  meds?: string;
  lastA1C?: string;
  focus?: string;
};

type DiabetesQuestion = {
  key: keyof DiabetesProfile;
  prompt: string;
  helper?: string;
  options?: string[];
  freeText?: boolean;
  skipIf?: (p: DiabetesProfile) => boolean;
};

const DIABETES_QUESTIONS: DiabetesQuestion[] = [
  { key: "diagnosed", prompt: "Have you been diagnosed with diabetes?", options: ["Yes", "No", "I'm not sure"] },
  { key: "type", prompt: "What type of diabetes do you have?", options: ["Type 1", "Type 2", "Gestational", "Prediabetes", "Not sure"] },
  { key: "duration", prompt: "How long have you been managing diabetes?", options: ["Less than 1 year", "1–5 years", "5–10 years", "More than 10 years"] },
  { key: "takesMeds", prompt: "Are you currently taking any medications for diabetes?", options: ["Yes", "No"] },
  { key: "meds", prompt: "Which medications are you taking?", helper: "Type the names — for example, Metformin, Ozempic, Insulin.", freeText: true, skipIf: (p) => p.takesMeds === "No" },
  { key: "lastA1C", prompt: "Have you had an A1C test recently?", options: ["Within 3 months", "Within 6 months", "More than 6 months", "Not sure"] },
  { key: "focus", prompt: "What would you like help with today?", options: ["Understanding diabetes", "Managing medications", "Lowering costs", "Finding providers", "Nutrition and diet", "Monitoring blood sugar", "Insurance coverage", "Something else"] },
];

// Diabetes uses the Teal topic color (per topic color system).
const DIABETES_TINT = "#DCF3F7";
const DIABETES_ACCENT = "#00A5BE";
const DIABETES_DEEP = "#006A7A";


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
  const [diabetes, setDiabetes] = useState<DiabetesProfile>({ step: -1 });
  const [member, setMember] = useState(false);

  // Mutual-exclusion: expanding one panel minimizes the other entirely
  const expandAssistant = () => {
    setAssistant("expanded");
    setWorkspace("minimized");
  };
  const expandWorkspace = () => {
    setWorkspace("expanded");
    setAssistant("minimized");
  };

  const activateMember = () => {
    setMember(true);
    setName("Margaret");
    setView({ kind: "home" });
    setAssistant("docked");
    setWorkspace("docked");
    setDiabetes({
      step: DIABETES_QUESTIONS.length,
      diagnosed: "Yes",
      type: "Type 2",
      duration: "1–5 years",
      takesMeds: "Yes",
      meds: "Metformin",
      lastA1C: "Within 3 months",
      focus: "Lowering costs",
    });
    setMessages([
      { role: "assistant", text: "Let's continue our conversation." },
      {
        role: "assistant",
        text:
          "I remember we've been discussing your diabetes care, medications, and coverage options.\n\nWhat would you like to explore next?",
      },
    ]);
  };

  const advanceDiabetes = (key: keyof DiabetesProfile, value: string) => {
    setDiabetes((prev) => {
      const next: DiabetesProfile = { ...prev, [key]: value };
      // advance to next non-skipped step
      let s = (prev.step < 0 ? 0 : prev.step) + 1;
      while (s < DIABETES_QUESTIONS.length && DIABETES_QUESTIONS[s].skipIf?.(next)) {
        s += 1;
      }
      next.step = s;
      return next;
    });
    // Friendly assistant acknowledgement
    const q = DIABETES_QUESTIONS.find((x) => x.key === key);
    if (q) {
      setMessages((m) => [
        ...m,
        { role: "user", text: value },
        { role: "assistant", text: ackForDiabetes(key, value) },
      ]);
    }
  };

  const respondTo = (text: string) => {
    setMessages((m) => {
      const userTurn = m.filter((x) => x.role === "user").length;
      let reply = "";

      if (!name && userTurn === 1) {
        const first = text.split(/\s+/)[0].replace(/[^a-zA-Z'-]/g, "");
        if (first) setName(first);
        reply = `It's lovely to meet you, ${first || "there"}. I'll be your guide through Medicare — at your pace, no pressure.\n\nTo get started, what brings you here today? Are you turning 65 soon, exploring plans, or looking to switch?`;
      } else if (detectDiabetesIntent(text)) {
        setView({ kind: "diabetes" });
        setDiabetes((p) => (p.step < 0 ? { ...p, step: 0 } : p));
        reply = "Thank you for sharing that. Managing diabetes alongside Medicare is something I help people with often.\n\nI've opened your Diabetes Journey on the left. If it's alright, I'd like to ask a few short questions so I can personalize what I show you — and save the important details to your Workspace.";
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
        <button
          type="button"
          onClick={activateMember}
          className="text-white/85 hover:text-white transition"
        >
          I'm Already a Member
        </button>
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
          <ContentArea
            view={view}
            name={name}
            onSuggestion={onSuggestion}
            diabetes={diabetes}
            onAnswerDiabetes={advanceDiabetes}
            member={member}
          />

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
              diabetes={diabetes}
            />
          )}

          {workspace === "docked" && (
            <DockedWorkspace
              name={name}
              assistantDocked={assistant === "docked"}
              onExpand={expandWorkspace}
              onMinimize={() => setWorkspace("minimized")}
              diabetes={diabetes}
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
  // Topic color system: stronger, saturated accents on lighter tints.
  plans:    { tint: "#E6F0FA", accent: "#002678", sceneIndex: 0 }, // Blue — Saved Plans
  doctors:  { tint: "#DCF3F7", accent: "#00A5BE", sceneIndex: 1 }, // Teal — Doctors
  meds:     { tint: "#FDE4D2", accent: "#E85C1C", sceneIndex: 2 }, // Orange — Medications
  dates:    { tint: "#FBF1D2", accent: "#B5841A" },                // Yellow — Calendar
  progress: { tint: "#E0DCEF", accent: "#5B43B8" },                // Purple — Health Journeys
  notes:    { tint: "#DCEFD6", accent: "#2D9C2D" },                // Green — Wellness
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
  name, assistantDocked, onExpand, onMinimize, diabetes,
}: {
  name: string | null;
  assistantDocked: boolean;
  onExpand: () => void;
  onMinimize: () => void;
  diabetes: DiabetesProfile;
}) {
  // When assistant is docked above, sit below the midpoint; when assistant is minimized, sit below the pill; otherwise span the right column
  const top = assistantDocked ? "calc(50vh + 8px)" : "8.5rem";

  return (
    <aside
      className="fixed right-6 bottom-6 w-[360px] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden z-40"
      style={{ top }}
    >
      <WorkspaceHeader name={name} onExpand={onExpand} onMinimize={onMinimize} compact />
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {diabetes.step >= 0 && <DiabetesWorkspaceCard diabetes={diabetes} dense />}
        <WorkspaceList dense />
      </div>
    </aside>
  );
}

function WorkspaceExpanded({
  name, onMinimize, diabetes,
}: {
  name: string | null;
  onMinimize: () => void;
  diabetes: DiabetesProfile;
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
          <div className="px-6 sm:px-10 py-8 space-y-6">
            {diabetes.step >= 0 && <DiabetesWorkspaceCard diabetes={diabetes} />}
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
  view, name, onSuggestion, diabetes, onAnswerDiabetes,
}: {
  view: ContentView;
  name: string | null;
  onSuggestion: (s: string) => void;
  diabetes: DiabetesProfile;
  onAnswerDiabetes: (key: keyof DiabetesProfile, value: string) => void;
}) {
  if (view.kind === "home") {
    return <EmptyContentArea name={name} />;
  }

  if (view.kind === "diabetes") {
    return (
      <DiabetesJourney
        name={name}
        diabetes={diabetes}
        onAnswer={onAnswerDiabetes}
        onSuggestion={onSuggestion}
      />
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="text-xs uppercase tracking-[0.18em] text-white/60">
        Unified Health · Medicare
      </div>
      <h1
        className="mt-3 text-white text-4xl sm:text-5xl leading-tight font-normal"
        style={SERIF}
      >
        {view.topic}
        <span className="block text-white/70 text-2xl sm:text-3xl mt-2">
          A short, plain-language walkthrough — your guide stays with you.
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
            {view.topic} · 3:24
          </div>
        </div>
        <div className="lg:col-span-2 flex items-center justify-center">
          <img
            src={heroIllustration.url}
            alt="A Unified Health guide reviewing Medicare options"
            className="w-full h-auto max-h-[340px] object-contain drop-shadow-2xl"
            loading="lazy"
          />
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {([
          { t: "Part A", d: "Hospital coverage — most people pay no premium.", idx: 0 as const, bg: "#E6F0FA", accent: "#002678" },
          { t: "Part B", d: "Doctor visits, preventive care, and outpatient services.", idx: 1 as const, bg: "#DCF3F7", accent: "#00A5BE" },
          { t: "Parts C & D", d: "Medicare Advantage and prescription drug coverage.", idx: 2 as const, bg: "#FDE4D2", accent: "#E85C1C" },
        ]).map((c) => (
          <button
            key={c.t}
            onClick={() => onSuggestion(c.t === "Parts C & D" ? "Prescription Drug Coverage" : `${c.t}`)}
            className="text-left rounded-2xl p-4 flex items-center gap-4 transition hover:-translate-y-0.5 hover:shadow-xl"
            style={{ backgroundColor: c.bg }}
          >
            <SpriteBadge src={partIcons.url} index={c.idx} size={72} />
            <div className="flex-1 min-w-0">
              <div style={SERIF} className="text-xl font-semibold">
                <span style={{ color: c.accent }}>{c.t}</span>
              </div>
              <div className="mt-0.5 text-[13px] leading-snug" style={{ color: "rgba(0,0,0,0.65)" }}>
                {c.d}
              </div>
              <div className="mt-2 text-[12px] font-semibold inline-flex items-center gap-1" style={{ color: c.accent }}>
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

function EmptyContentArea({ name }: { name: string | null }) {
  return (
    <div className="relative">
      <div className="text-xs uppercase tracking-[0.18em] text-white/60">
        Unified Health · Medicare
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

      {/* Empty-state focal message with subtle guide curve toward the assistant */}
      <div className="relative mt-24 sm:mt-28">
        <div className="max-w-[560px]">
          <p
            className="text-white/95 font-normal leading-[1.15] text-4xl sm:text-5xl lg:text-[56px]"
            style={SERIF}
          >
            What would you like me to tell you about Medicare?
          </p>
          <p className="mt-5 text-white/55 text-base sm:text-lg max-w-md" style={SERIF}>
            Ask your guide a question on the right, and the answer will appear here.
          </p>
        </div>

        {/* Curved guide line pointing from the message toward the assistant */}
        <svg
          aria-hidden
          className="hidden md:block pointer-events-none absolute -top-6 right-[-40px] w-[460px] h-[260px] opacity-70"
          viewBox="0 0 460 260"
          fill="none"
        >
          <defs>
            <marker
              id="v2-guide-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.75)" />
            </marker>
          </defs>
          <path
            d="M 20 200 C 140 220, 240 120, 300 70 S 420 30, 440 30"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="2 7"
            fill="none"
            markerEnd="url(#v2-guide-arrow)"
          />
        </svg>
      </div>
    </div>
  );
}


// ============================================================
// Diabetes Journey
// ============================================================

function ackForDiabetes(key: keyof DiabetesProfile, value: string): string {
  switch (key) {
    case "diagnosed":
      if (value === "Yes") return "Thank you for sharing that. Knowing this helps me bring the right information forward for you.";
      if (value === "No") return "Got it — I'll keep things focused on prevention and general wellness as we go.";
      return "That's okay. We'll explore this gently together — no pressure to know everything.";
    case "type":
      return `Noted — ${value}. I'll personalize what I show you with that in mind.`;
    case "duration":
      return `Thanks. ${value} of experience tells me a lot about what's most useful to surface for you.`;
    case "takesMeds":
      return value === "Yes"
        ? "Great. Medications affect coverage and costs, so this will help me show plans that fit."
        : "Understood. I'll keep an eye on non-medication options and wellness coverage for you.";
    case "meds":
      return `Saved — ${value}. I'll check how each plan covers these and flag any savings.`;
    case "lastA1C":
      return `Noted — last A1C ${value.toLowerCase()}. I'll surface lab and preventive coverage that fits.`;
    case "focus":
      return `Wonderful. I'll prioritize information about ${value.toLowerCase()} as we continue.`;
    default:
      return "Thanks for sharing.";
  }
}

function diabetesMemoryChips(d: DiabetesProfile): string[] {
  const items: string[] = [];
  if (d.type && d.type !== "Not sure") items.push(`${d.type} Diabetes`);
  else if (d.diagnosed === "Yes") items.push("Diagnosed with diabetes");
  if (d.duration) items.push(`Managing for ${d.duration.toLowerCase()}`);
  if (d.takesMeds === "Yes" && d.meds) items.push(`Uses ${d.meds}`);
  else if (d.takesMeds === "No") items.push("No diabetes medications");
  if (d.lastA1C) items.push(`A1C ${d.lastA1C.toLowerCase()}`);
  if (d.focus) items.push(`Focus: ${d.focus}`);
  return items;
}

function DiabetesWorkspaceCard({
  diabetes, dense = false,
}: { diabetes: DiabetesProfile; dense?: boolean }) {
  const rows: { label: string; value?: string }[] = [
    { label: "Type", value: diabetes.type },
    { label: "Duration", value: diabetes.duration },
    { label: "Medication", value: diabetes.takesMeds === "No" ? "None" : diabetes.meds },
    { label: "Last A1C", value: diabetes.lastA1C },
    { label: "Current Focus", value: diabetes.focus },
  ];
  const memory = diabetesMemoryChips(diabetes);

  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ backgroundColor: DIABETES_TINT, borderColor: "rgba(14,124,90,0.18)" }}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className="shrink-0 rounded-2xl grid place-items-center"
          style={{ width: dense ? 56 : 72, height: dense ? 56 : 72, backgroundColor: "white" }}
        >
          <img
            src={diabetesIllustration.url}
            alt=""
            className="object-contain"
            style={{ width: dense ? 44 : 60, height: dense ? 44 : 60 }}
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 shrink-0" style={{ color: DIABETES_ACCENT }} />
            <div
              className="text-[10px] uppercase tracking-[0.18em] font-semibold"
              style={{ color: DIABETES_ACCENT }}
            >
              Diabetes
            </div>
          </div>
          <div
            className="mt-1 text-[13px] font-semibold"
            style={{ ...SERIF, color: DIABETES_DEEP }}
          >
            Your living health summary
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <dl className="rounded-xl bg-white/85 divide-y divide-black/5 overflow-hidden">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 px-3 py-2 text-[12px]">
              <dt className="w-24 shrink-0 text-black/55 uppercase tracking-wider text-[10px]">
                {r.label}
              </dt>
              <dd
                className="flex-1 truncate"
                style={{ ...SERIF, color: r.value ? UHC_BLUE : "rgba(0,0,0,0.35)" }}
              >
                {r.value ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {memory.length > 0 && (
        <div className="px-4 pb-4">
          <div
            className="text-[10px] uppercase tracking-[0.18em] mb-2"
            style={{ color: DIABETES_ACCENT }}
          >
            Workspace memory
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {memory.map((m) => (
              <li
                key={m}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] border"
                style={{ color: DIABETES_DEEP, borderColor: "rgba(14,124,90,0.25)" }}
              >
                <Check className="h-3 w-3" style={{ color: DIABETES_ACCENT }} />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DiabetesJourney({
  name, diabetes, onAnswer, onSuggestion,
}: {
  name: string | null;
  diabetes: DiabetesProfile;
  onAnswer: (key: keyof DiabetesProfile, value: string) => void;
  onSuggestion: (s: string) => void;
}) {
  const answered = DIABETES_QUESTIONS.filter((q) => {
    if (q.skipIf?.(diabetes)) return false;
    return diabetes[q.key] !== undefined;
  }).length;
  const total = DIABETES_QUESTIONS.filter((q) => !q.skipIf?.(diabetes)).length;
  const progress = total === 0 ? 0 : Math.round((answered / total) * 100);

  const idx = Math.max(0, diabetes.step);
  const current = idx < DIABETES_QUESTIONS.length ? DIABETES_QUESTIONS[idx] : null;

  return (
    <div className="max-w-4xl">
      <div className="text-xs uppercase tracking-[0.18em] text-white/60">
        Unified Health · Diabetes Journey
      </div>
      <h1
        className="mt-3 text-white text-4xl sm:text-5xl leading-tight font-normal"
        style={SERIF}
      >
        {name ? `${name}, let's talk about your diabetes journey.` : "Let's talk about your diabetes journey."}
        <span className="block text-white/70 text-xl sm:text-2xl mt-3 max-w-2xl">
          The more I understand your experience, the better I can personalize information, resources, and recommendations.
        </span>
      </h1>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        <div
          className="lg:col-span-2 rounded-3xl p-6 flex flex-col"
          style={{ backgroundColor: DIABETES_TINT }}
        >
          <div className="flex-1 grid place-items-center">
            <img
              src={diabetesIllustration.url}
              alt="A friendly illustration of diabetes care tools"
              className="w-full max-h-[260px] object-contain"
              loading="lazy"
            />
          </div>
          <div className="mt-4">
            <div
              className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em]"
              style={{ color: DIABETES_ACCENT }}
            >
              <span className="font-semibold">Your Journey</span>
              <span>{answered} of {total}</span>
            </div>
            <div
              className="mt-2 h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "rgba(14,124,90,0.15)" }}
            >
              <div
                className="h-full transition-[width] duration-500"
                style={{ width: `${progress}%`, backgroundColor: DIABETES_ACCENT }}
              />
            </div>
            <p className="mt-3 text-[12px] leading-relaxed" style={{ color: DIABETES_DEEP }}>
              Each answer is saved to your Workspace as a living summary you can update anytime.
            </p>
          </div>
        </div>

        <div className="lg:col-span-3 rounded-3xl bg-white shadow-xl p-7 flex flex-col">
          {current ? (
            <DiabetesQuestionCard
              question={current}
              onAnswer={(v) => onAnswer(current.key, v)}
            />
          ) : (
            <DiabetesCompleteCard diabetes={diabetes} onSuggestion={onSuggestion} />
          )}
        </div>
      </div>

      {answered >= 2 && (
        <div className="mt-10">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/60 mb-3">
            Personalized for you
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {personalizedDiabetesCards(diabetes).map((c) => (
              <button
                key={c.title}
                onClick={() => onSuggestion(c.cta)}
                className="text-left rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-xl"
                style={{ backgroundColor: c.bg }}
              >
                <div
                  className="text-[10px] uppercase tracking-[0.16em] font-semibold"
                  style={{ color: c.accent }}
                >
                  {c.tag}
                </div>
                <div style={SERIF} className="mt-1 text-lg font-semibold">
                  <span style={{ color: c.accent }}>{c.title}</span>
                </div>
                <p className="mt-1 text-[13px] leading-snug" style={{ color: "rgba(0,0,0,0.65)" }}>
                  {c.body}
                </p>
                <div
                  className="mt-2 text-[12px] font-semibold inline-flex items-center gap-1"
                  style={{ color: c.accent }}
                >
                  {c.cta} <ChevronRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DiabetesQuestionCard({
  question, onAnswer,
}: {
  question: DiabetesQuestion;
  onAnswer: (value: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <>
      <div
        className="text-[11px] uppercase tracking-[0.16em] font-semibold"
        style={{ color: DIABETES_ACCENT }}
      >
        A quick question
      </div>
      <h2
        className="mt-2 text-2xl sm:text-3xl leading-snug font-normal"
        style={{ ...SERIF, color: DIABETES_DEEP }}
      >
        {question.prompt}
      </h2>
      {question.helper && (
        <p className="mt-2 text-sm text-black/60">{question.helper}</p>
      )}

      <div className="mt-5 flex-1">
        {question.options && (
          <div className="flex flex-wrap gap-2">
            {question.options.map((opt) => (
              <button
                key={opt}
                onClick={() => onAnswer(opt)}
                className="rounded-full px-4 py-2 text-sm border transition hover:-translate-y-0.5"
                style={{
                  color: DIABETES_DEEP,
                  borderColor: "rgba(14,124,90,0.3)",
                  backgroundColor: "white",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = DIABETES_ACCENT;
                  (e.currentTarget as HTMLButtonElement).style.color = "white";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "white";
                  (e.currentTarget as HTMLButtonElement).style.color = DIABETES_DEEP;
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {question.freeText && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = text.trim();
              if (t) onAnswer(t);
            }}
            className="mt-1"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Metformin 500mg, Ozempic"
              className="w-full rounded-xl border bg-[#f6faf8] px-4 py-3 text-sm outline-none focus:ring-2"
              style={{
                color: DIABETES_DEEP,
                borderColor: "rgba(14,124,90,0.25)",
                ['--tw-ring-color' as never]: DIABETES_ACCENT,
              }}
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                type="submit"
                className="rounded-full px-5 py-2 text-sm text-white font-semibold"
                style={{ backgroundColor: DIABETES_ACCENT }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => onAnswer("Prefer not to say")}
                className="text-sm text-black/55 hover:text-black"
              >
                Skip for now
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

function DiabetesCompleteCard({
  diabetes, onSuggestion,
}: { diabetes: DiabetesProfile; onSuggestion: (s: string) => void }) {
  return (
    <>
      <div
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] font-semibold"
        style={{ color: DIABETES_ACCENT }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Profile saved
      </div>
      <h2
        className="mt-2 text-2xl sm:text-3xl leading-snug font-normal"
        style={{ ...SERIF, color: DIABETES_DEEP }}
      >
        Thank you. I'll remember this as we go.
      </h2>
      <p className="mt-2 text-sm text-black/65 max-w-md">
        Your Diabetes summary now lives in your Workspace and updates whenever you share something new.
        I'll prioritize information based on what you told me{diabetes.focus ? `, starting with ${diabetes.focus.toLowerCase()}.` : "."}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {["Show me plans that cover my medications", "Help me lower diabetes costs", "Find an endocrinologist", "What does Medicare cover for diabetes?"].map((q) => (
          <button
            key={q}
            onClick={() => onSuggestion(q)}
            className="rounded-full px-4 py-2 text-sm border transition"
            style={{
              color: DIABETES_DEEP,
              borderColor: "rgba(14,124,90,0.3)",
              backgroundColor: "white",
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </>
  );
}

function personalizedDiabetesCards(d: DiabetesProfile) {
  type Card = { tag: string; title: string; body: string; cta: string; bg: string; accent: string };
  const cards: Card[] = [];

  if (d.type === "Type 2" || d.type === "Type 1" || d.diagnosed === "Yes") {
    cards.push({
      tag: "Education",
      title: d.type ? `Living well with ${d.type}` : "Understanding your diabetes",
      body: "Plain-language guide tailored to your situation — daily care, warning signs, and when to call your doctor.",
      cta: "Open guide",
      bg: "#DCF3F7",   // Teal — Diabetes
      accent: "#00A5BE",
    });
  }
  if (d.takesMeds === "Yes" || d.meds) {
    cards.push({
      tag: "Medication coverage",
      title: d.meds ? `How plans cover ${d.meds.split(",")[0]}` : "Your medication coverage",
      body: "Compare what each Medicare plan pays for your prescriptions, including tier and pharmacy options.",
      cta: "Compare coverage",
      bg: "#FDE4D2",   // Orange — Prescriptions
      accent: "#E85C1C",
    });
  }
  if (d.focus === "Lowering costs" || d.focus === "Insurance coverage") {
    cards.push({
      tag: "Savings",
      title: "Lowering your diabetes costs",
      body: "Extra Help, manufacturer programs, and plan benefits that reduce out-of-pocket spend.",
      cta: "Show savings options",
      bg: "#FBF1D2",   // Yellow — Financial
      accent: "#B5841A",
    });
  }
  if (d.focus === "Finding providers") {
    cards.push({
      tag: "Care team",
      title: "Diabetes specialists near you",
      body: "Endocrinologists, certified diabetes educators, and primary care doctors that accept your plan.",
      cta: "Find providers",
      bg: "#E6F0FA",   // Blue — Doctors
      accent: "#002678",
    });
  }
  if (d.focus === "Nutrition and diet") {
    cards.push({
      tag: "Wellness",
      title: "Nutrition support",
      body: "Covered nutrition counseling, meal benefits, and trusted resources for diabetes-friendly eating.",
      cta: "Explore nutrition",
      bg: "#DCEFD6",   // Green — Wellness
      accent: "#2D9C2D",
    });
  }
  if (d.lastA1C) {
    cards.push({
      tag: "Preventive care",
      title: "Your A1C and labs",
      body: "How Medicare covers A1C tests, eye exams, and foot care — and when to schedule each.",
      cta: "See preventive coverage",
      bg: "#E0DCEF",   // Purple — Enrollment / health journey
      accent: "#5B43B8",
    });
  }
  return cards.slice(0, 3);
}
