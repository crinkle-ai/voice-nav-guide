import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, Mic, Compass, BookOpen, Headphones, FlaskConical, Users, LineChart, Target, ClipboardList, Stethoscope, Heart, Phone, Database, Map, TrendingUp, Video, ScreenShare, ShieldCheck, ExternalLink, TrendingDown, PhoneOff, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/deck")({
  head: () => ({
    meta: [
      { title: "Voice-Guided Medicare Journey Navigator" },
      { name: "description", content: "An executive preview of the Voice-Guided Medicare Journey Navigator." },
    ],
  }),
  component: SlideDeck,
});

const MAIN_COUNT = 4;

function SlideDeck() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const total = SLIDES.length;
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const next = useCallback(() => {
    setIndex((i) => (i >= total - 1 ? i : i + 1));
  }, [total]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const launch = useCallback(() => navigate({ to: "/" }), [navigate]);

  useEffect(() => {
    slideRefs.current[index]?.scrollTo({ top: 0 });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Enter" && index === MAIN_COUNT - 1) launch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, launch, index]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const inAppendix = index >= MAIN_COUNT;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground group"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative flex-1 overflow-hidden pb-24">
        {SLIDES.map((Slide, i) => (
          <div
            key={i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            data-slide-index={i}
            className={`absolute inset-0 overflow-y-auto transition-all duration-500 ease-out ${
              i === index ? "opacity-100 translate-x-0" : i < index ? "opacity-0 -translate-x-8 pointer-events-none" : "opacity-0 translate-x-8 pointer-events-none"
            }`}
          >
            <Slide onLaunch={launch} />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-3 md:px-6 md:opacity-0 md:transition-opacity md:duration-300 md:group-hover:opacity-100">
        <button
          onClick={prev}
          disabled={index === 0}
          className="pointer-events-auto flex h-11 w-11 md:h-14 md:w-14 items-center justify-center rounded-full bg-card/90 border shadow-lg backdrop-blur transition hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5 md:h-7 md:w-7" />
        </button>
        <button
          onClick={next}
          disabled={index === total - 1}
          className="pointer-events-auto flex h-11 w-11 md:h-14 md:w-14 items-center justify-center rounded-full bg-card/90 border shadow-lg backdrop-blur transition hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5 md:h-7 md:w-7" />
        </button>
      </div>

      <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-4 z-10">
        <div className="flex items-center gap-1.5 md:gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <React.Fragment key={i}>
              {i === MAIN_COUNT && (
                <span className="mx-1 h-3 w-px bg-border" aria-hidden />
              )}
              <button
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? `w-6 md:w-10 ${i >= MAIN_COUNT ? "bg-muted-foreground" : "bg-primary"}`
                    : "w-3 md:w-6 bg-muted hover:bg-muted-foreground/40"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            </React.Fragment>
          ))}
        </div>
        <span className="text-xs md:text-sm font-medium text-muted-foreground tabular-nums">
          {inAppendix
            ? `Appendix ${index - MAIN_COUNT + 1}`
            : `${index + 1} of ${MAIN_COUNT}`}
        </span>
      </div>
    </div>
  );
}

type SlideProps = { onLaunch: () => void };

// Order: 4 main slides, then appendix slides
const SLIDES: Array<(p: SlideProps) => React.ReactElement> = [
  OpportunitySlide,
  NavigatorSlide,
  BusinessCaseSlide,
  DemoSlide,
  // Appendix
  MvpSlide,
  ValidationSlide,
  LiveAdviseSlide,
];

function SlideShell({
  children,
  kicker,
  appendix,
}: {
  children: React.ReactNode;
  kicker?: string;
  appendix?: boolean;
}) {
  return (
    <div className="min-h-full w-full flex flex-col justify-center px-6 md:px-24 py-10 md:py-16 max-w-7xl mx-auto">
      {kicker && (
        <div className="mb-3 md:mb-6 flex items-center gap-2">
          {appendix && (
            <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70 rounded-full border px-2 py-0.5">
              Appendix
            </span>
          )}
          <div className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {kicker}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

/* ============ MAIN SLIDES ============ */

function OpportunitySlide(_: SlideProps) {
  const cards = [
    {
      stat: "7 in 10",
      claim: "Medicare beneficiaries don't compare coverage options during open enrollment.",
      source: "KFF · Sept 2024",
      href: "https://www.kff.org/medicare/nearly-7-in-10-medicare-beneficiaries-do-not-compare-coverage-options-during-open-enrollment/",
    },
    {
      stat: "Last place",
      claim: "Healthcare's digital experience lags far behind every other industry tracked.",
      source: "J.D. Power · April 2025",
      href: "https://www.jdpower.com/business/press-releases/2025-us-healthcare-digital-experience-study",
    },
    {
      stat: "55%",
      claim: "of adults 50+ are already using AI tools — and finding them beneficial.",
      source: "U. Michigan / IHPI National Poll on Healthy Aging",
      href: "https://ihpi.umich.edu/national-poll-healthy-aging/national-findings/how-older-adults-use-and-think-about-ai",
    },
  ];
  return (
    <SlideShell kicker="The opportunity">
      <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] max-w-5xl">
        Medicare decisions are complex.{" "}
        <span className="text-primary">The experience should make them simpler.</span>
      </h1>
      <div className="mt-6 md:mt-12 grid gap-3 md:gap-5 md:grid-cols-3 max-w-6xl">
        {cards.map((c) => (
          <a
            key={c.source}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col rounded-2xl border bg-card p-4 md:p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md"
          >
            <div className="text-2xl md:text-4xl font-bold text-primary tracking-tight">{c.stat}</div>
            <p className="mt-2 md:mt-3 text-sm md:text-lg leading-snug text-foreground flex-1">
              {c.claim}
            </p>
            <div className="mt-3 md:mt-4 pt-3 border-t flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground group-hover:text-primary transition">
              <span className="font-medium">{c.source}</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          </a>
        ))}
      </div>
    </SlideShell>
  );
}

function NavigatorSlide(_: SlideProps) {
  const caps = [
    {
      icon: <Mic className="h-5 w-5 md:h-7 md:w-7" />,
      label: "Natural Voice Conversations",
      desc: "Users speak naturally — the way they'd talk to a knowledgeable friend. The AI understands intent without forms, menus, or jargon.",
    },
    {
      icon: <Compass className="h-5 w-5 md:h-7 md:w-7" />,
      label: "Intelligent Website Navigation",
      desc: "The AI drives the browser: opening the right page, scrolling to the relevant section, and highlighting the content that answers the question.",
    },
    {
      icon: <Headphones className="h-5 w-5 md:h-7 md:w-7" />,
      label: "Human Support Handoff",
      desc: "When the AI reaches its limit, it passes the user's full context to a licensed agent — so they never have to repeat themselves or start over.",
    },
  ];
  return (
    <SlideShell kicker="The navigator">
      <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-5xl">
        A voice layer that{" "}
        <span className="text-primary">turns the site itself into the answer.</span>
      </h2>
      <p className="mt-3 md:mt-6 text-sm md:text-xl text-muted-foreground max-w-3xl">
        Users speak. The website responds.
      </p>
      <div className="mt-5 md:mt-10 grid gap-3 md:gap-4 max-w-5xl">
        {caps.map((c) => (
          <div key={c.label} className="flex items-start gap-3 md:gap-5 rounded-xl border bg-card p-4 md:p-5 shadow-sm">
            <div className="flex h-10 w-10 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {c.icon}
            </div>
            <div>
              <div className="text-sm md:text-xl font-semibold">{c.label}</div>
              <p className="mt-1 text-xs md:text-base text-muted-foreground leading-snug">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}

function BusinessCaseSlide(_: SlideProps) {
  const impacts = [
    {
      icon: <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />,
      headline: "Lift in online enrollment",
      desc: "Guided journeys convert higher than self-serve. Voice removes the friction that kills the funnel today.",
    },
    {
      icon: <PhoneOff className="h-5 w-5 md:h-6 md:w-6" />,
      headline: "Agent deflection & call containment",
      desc: "Routine education and navigation questions resolve in-session — without ever ringing the call center.",
    },
    {
      icon: <MousePointerClick className="h-5 w-5 md:h-6 md:w-6" />,
      headline: "Self-service shift away from phone",
      desc: "Users who'd normally call get to confidence on the site, freeing agents for the high-value moments.",
    },
    {
      icon: <TrendingDown className="h-5 w-5 md:h-6 md:w-6" />,
      headline: "Lower cost-per-enrollment",
      desc: "Higher containment plus better conversion compounds — the unit economics move the right direction.",
    },
  ];
  return (
    <SlideShell kicker="The business case">
      <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-5xl">
        Better experience.{" "}
        <span className="text-primary">Better unit economics.</span>
      </h2>
      <div className="mt-5 md:mt-10 grid gap-3 md:gap-5 md:grid-cols-2 max-w-6xl">
        {impacts.map((i) => (
          <div key={i.headline} className="flex items-start gap-3 md:gap-4 rounded-xl border bg-card p-4 md:p-6 shadow-sm">
            <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {i.icon}
            </div>
            <div>
              <div className="text-sm md:text-lg font-semibold">{i.headline}</div>
              <p className="mt-1 text-xs md:text-base text-muted-foreground leading-snug">{i.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}

function DemoSlide({ onLaunch }: SlideProps) {
  return (
    <SlideShell kicker="The demo">
      <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-5xl">
        See it <span className="text-primary">in action.</span>
      </h2>
      <p className="mt-3 md:mt-6 max-w-3xl text-sm md:text-xl text-muted-foreground">
        Five scenarios. Each one launches the live prototype.
      </p>

      <div className="mt-4 md:mt-6">
        <Button
          onClick={onLaunch}
          size="lg"
          className="h-12 md:h-16 px-6 md:px-10 text-base md:text-xl gap-2 md:gap-3 shadow-lg shadow-primary/30"
        >
          Launch the Demo <ArrowRight className="h-5 w-5 md:h-6 md:w-6" />
        </Button>
      </div>

      <div className="mt-5 md:mt-8 grid gap-2 md:gap-3 md:grid-cols-2 lg:grid-cols-3 max-w-6xl">
        <DemoCard icon={<BookOpen className="h-5 w-5 md:h-6 md:w-6" />} title="Learn about Medicare" phrase="What is Medicare Advantage?">
          Ask about Part A, B, C, D, or Medicare Advantage and watch the AI navigate and highlight the right section.
        </DemoCard>
        <DemoCard icon={<ClipboardList className="h-5 w-5 md:h-6 md:w-6" />} title="Compare Plans" phrase="Show me plans under $50 with drug coverage">
          Ask to compare plans and the AI will walk you through the options side by side.
        </DemoCard>
        <DemoCard icon={<Stethoscope className="h-5 w-5 md:h-6 md:w-6" />} title="Find a Doctor" phrase="Find a cardiologist in Austin">
          Ask if your doctor is covered and the AI will take you to the provider lookup.
        </DemoCard>
        <DemoCard icon={<Heart className="h-5 w-5 md:h-6 md:w-6" />} title="View My Saved Plans" phrase="Show me my saved plans">
          Ask to see your saved plans and the AI will take you through a mock login, then land you on your personalized plans.
        </DemoCard>
        <DemoCard icon={<Phone className="h-5 w-5 md:h-6 md:w-6" />} title="Request a Callback" phrase="Can someone call me back?">
          Ask to talk to an agent and the AI will collect your phone number and send a mock summary to Salesforce.
        </DemoCard>
      </div>
    </SlideShell>
  );
}

function DemoCard({ icon, title, phrase, children }: { icon: React.ReactNode; title: string; phrase: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-3 md:p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="text-xs md:text-base font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-1.5 md:mt-2 text-[11px] md:text-sm text-muted-foreground leading-relaxed">{children}</p>
      <div className="mt-2 md:mt-3 rounded-lg bg-muted/60 px-2.5 py-1.5">
        <p className="text-[10px] md:text-xs font-medium uppercase tracking-wide text-muted-foreground">Try saying</p>
        <p className="mt-0.5 text-[11px] md:text-sm italic text-foreground">&quot;{phrase}&quot;</p>
      </div>
    </div>
  );
}

/* ============ APPENDIX SLIDES ============ */

function MvpSlide(_: SlideProps) {
  const steps = [
    {
      num: "01",
      icon: <Database className="h-5 w-5 md:h-7 md:w-7" />,
      title: "Mine the Data",
      desc: "Analyze site search, top exit pages, and call/chat transcripts to surface the highest-confusion journeys — and the exact moments users abandon or escalate.",
    },
    {
      num: "02",
      icon: <Users className="h-5 w-5 md:h-7 md:w-7" />,
      title: "Pick Your Pilot Segment",
      desc: "Choose one user type with a clear, bounded journey (e.g. turning-65 first-timers). Set the guardrails: what the AI handles, scopes, and hands off.",
    },
    {
      num: "03",
      icon: <Map className="h-5 w-5 md:h-7 md:w-7" />,
      title: "Map 5 Intent Scenarios",
      desc: "Define what the segment says, the path the AI takes, and the fallback chain: confidence threshold → search or page → scope signal → human handoff.",
    },
    {
      num: "04",
      icon: <TrendingUp className="h-5 w-5 md:h-7 md:w-7" />,
      title: "Measure & Expand",
      desc: "Track containment, enrollment lift, agent deflection, and handoff quality. Use results to tighten scenarios and justify the next segment.",
    },
  ];
  return (
    <SlideShell kicker="Defining the MVP" appendix>
      <h2 className="text-xl sm:text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-5xl">
        How we scope the <span className="text-primary">minimum viable navigator.</span>
      </h2>
      <p className="mt-3 md:mt-6 text-sm md:text-xl text-muted-foreground">
        Data-driven, with graceful degradation built into every scenario from day one.
      </p>
      <div className="mt-4 md:mt-8 grid gap-2 md:gap-5 md:grid-cols-2 max-w-5xl">
        {steps.map((s) => (
          <div key={s.num} className="flex items-start gap-3 md:gap-4 rounded-xl border bg-card p-3 md:p-5 shadow-sm">
            <div className="flex h-10 w-10 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {s.icon}
            </div>
            <div>
              <div className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-primary mb-1">{s.num}</div>
              <div className="text-sm md:text-xl font-semibold">{s.title}</div>
              <p className="mt-1 text-xs md:text-base text-muted-foreground leading-snug">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}

function ValidationSlide(_: SlideProps) {
  const assumptions = [
    "Users prefer voice-guided navigation over traditional menus",
    "AI guidance increases time-on-site and plan engagement",
    "Users feel more confident making Medicare decisions with the AI guide",
  ];
  const audience = [
    "Adults turning 65 in the next 6 months",
    "Recent Medicare enrollees (past 12 months)",
    "Adult caregivers shopping on behalf of a parent",
  ];
  const methods = [
    { label: "Moderated usability", detail: "12–15 sessions, observe friction & comprehension" },
    { label: "Unmoderated prototype", detail: "n=150 via UserTesting.com, task-based" },
    { label: "A/B test", detail: "AI-guided vs. standard nav, live traffic split" },
  ];
  const metrics = [
    "Task completion rate",
    "Time on site & pages visited",
    "Plan comparison engagement",
    "Enrollment intent score",
    "NPS / satisfaction",
  ];
  const thresholds = [
    "≥ 70% prefer AI-guided navigation",
    "≥ 25% lift in plan comparison engagement vs. control",
    "≥ 15-point NPS lift over standard experience",
    "≥ 80% task completion in unmoderated study",
  ];
  return (
    <SlideShell kicker="Validation plan" appendix>
      <h2 className="text-xl sm:text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-5xl">
        How we'd <span className="text-primary">test this</span> with real users.
      </h2>
      <p className="mt-2 md:mt-4 text-xs md:text-lg text-muted-foreground max-w-3xl">
        A staged go/no-go framework — qualitative signal first, quantitative proof second, then a live A/B before scaling.
      </p>

      <div className="mt-4 md:mt-8 grid gap-3 md:gap-5 md:grid-cols-3 max-w-6xl">
        <ValidationCard icon={<FlaskConical className="h-4 w-4 md:h-5 md:w-5" />} title="Core Assumptions" items={assumptions} />
        <ValidationCard icon={<Users className="h-4 w-4 md:h-5 md:w-5" />} title="Who We'd Test With" items={audience} footer="Recruited via panel + existing customer base" />
        <ValidationCard
          icon={<LineChart className="h-4 w-4 md:h-5 md:w-5" />}
          title="Methods"
          items={methods.map((m) => `${m.label} — ${m.detail}`)}
        />
      </div>

      <div className="mt-3 md:mt-5 grid gap-3 md:gap-5 md:grid-cols-2 max-w-6xl">
        <ValidationCard icon={<LineChart className="h-4 w-4 md:h-5 md:w-5" />} title="Key Metrics" items={metrics} />
        <ValidationCard
          icon={<Target className="h-4 w-4 md:h-5 md:w-5" />}
          title="Go / No-Go Thresholds"
          items={thresholds}
          accent
        />
      </div>
    </SlideShell>
  );
}

function ValidationCard({
  icon,
  title,
  items,
  footer,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  footer?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 md:p-5 shadow-sm ${
        accent ? "bg-primary/5 border-primary/40" : "bg-card"
      }`}
    >
      <div className="flex items-center gap-2 text-primary">
        <span className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-primary/10">{icon}</span>
        <div className="text-[10px] md:text-sm font-semibold uppercase tracking-wider">{title}</div>
      </div>
      <ul className="mt-2 md:mt-3 space-y-1.5 md:space-y-2">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2 text-xs md:text-base leading-snug">
            <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{i}</span>
          </li>
        ))}
      </ul>
      {footer && (
        <p className="mt-2 md:mt-3 text-[10px] md:text-xs italic text-muted-foreground">{footer}</p>
      )}
    </div>
  );
}

function LiveAdviseSlide(_: SlideProps) {
  const pillars = [
    {
      icon: <ScreenShare className="h-5 w-5 md:h-7 md:w-7" />,
      label: "Seamless context handoff",
      desc: "When the user wants a human, the AI passes everything it knows — current page, intent, saved doctors, plans being compared — so the agent never asks 'what's your ZIP?' again.",
    },
    {
      icon: <Video className="h-5 w-5 md:h-7 md:w-7" />,
      label: "Co-browse, not screen share",
      desc: "The agent joins the same browser session: highlights plan cards, scrolls to the right row, and pushes side-by-side comparisons live. No Zoom link, no installer.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5 md:h-7 md:w-7" />,
      label: "Trust + compliance built in",
      desc: "Licensed agent identity is surfaced on screen — name, NPN, state. Every session is recorded and attributable, which matters in a regulated category like Medicare.",
    },
  ];
  return (
    <SlideShell kicker="The human safety net" appendix>
      <h2 className="text-xl sm:text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-5xl">
        AI handles the routine. <span className="text-primary">Live Advise handles the moments that matter.</span>
      </h2>
      <p className="mt-3 md:mt-6 text-sm md:text-xl text-muted-foreground max-w-4xl">
        A licensed agent can drop into the consumer's session — see their screen, push comparisons, answer in real time.
      </p>
      <div className="mt-4 md:mt-8 grid gap-2 md:gap-4 max-w-5xl">
        {pillars.map((p) => (
          <div key={p.label} className="flex items-start gap-3 md:gap-5 rounded-xl border bg-card p-3 md:p-5 shadow-sm">
            <div className="flex h-10 w-10 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {p.icon}
            </div>
            <div>
              <div className="text-sm md:text-xl font-semibold">{p.label}</div>
              <p className="mt-1 text-xs md:text-base text-muted-foreground leading-snug">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 md:mt-6 max-w-5xl rounded-xl border-2 border-primary/30 bg-primary/5 p-3 md:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ShieldCheck className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <div className="text-xs md:text-base leading-snug text-foreground">
            <span className="font-bold">Feasibility: a buyable, mature category.</span>{" "}
            <span className="text-muted-foreground">
              Co-browse has shipped in production for 15+ years (Glance, Upscope, Surfly; built-in to Genesys, Cisco Webex, Salesforce Service Cloud). HIPAA-compliant deployments exist today. <span className="font-semibold text-foreground">Our build is the AI→human context handoff — the co-browse pipe itself is commodity.</span>
            </span>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}
