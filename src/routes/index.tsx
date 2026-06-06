import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, Mic, Compass, BookOpen, Headphones, FlaskConical, Users, LineChart, Target, ClipboardList, Stethoscope, Heart, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voice-Guided Medicare Journey Navigator" },
      { name: "description", content: "An executive preview of the Voice-Guided Medicare Journey Navigator." },
    ],
  }),
  component: SlideDeck,
});

function SlideDeck() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const total = 6;
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const next = useCallback(() => {
    setIndex((i) => (i >= total - 1 ? i : i + 1));
  }, []);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const launch = useCallback(() => navigate({ to: "/home" }), [navigate]);

  useEffect(() => {
    const resetScroll = () => {
      try {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch {}
      const slide = document.querySelector(`[data-slide-index="${index}"]`);
      if (slide) {
        slide.querySelectorAll<HTMLElement>("[data-slide-shell], [data-scrollable]").forEach((el) => {
          el.scrollTop = 0;
        });
      }
    };
    resetScroll();
    const r1 = requestAnimationFrame(resetScroll);
    const r2 = requestAnimationFrame(() => requestAnimationFrame(resetScroll));
    const t = setTimeout(resetScroll, 120);
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      clearTimeout(t);
    };
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Enter" && index === total - 1) launch();
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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground group"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides */}
      <div className="relative flex-1 overflow-hidden pb-24">
        {SLIDES.map((Slide, i) => (
          <div
            key={i}
            data-slide-index={i}
            className={`absolute inset-0 transition-all duration-500 ease-out ${
              i === index ? "opacity-100 translate-x-0" : i < index ? "opacity-0 -translate-x-8 pointer-events-none" : "opacity-0 translate-x-8 pointer-events-none"
            }`}
          >
            <Slide onLaunch={launch} />
          </div>
        ))}
      </div>

      {/* Controls — always visible on mobile, hover-reveal on desktop */}
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

      {/* Counter + progress */}
      <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-4 z-10">
        <div className="flex gap-1.5 md:gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 md:w-10 bg-primary" : "w-3 md:w-6 bg-muted hover:bg-muted-foreground/40"}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
        <span className="text-xs md:text-sm font-medium text-muted-foreground tabular-nums">
          {index + 1} of {total}
        </span>
      </div>
    </div>
  );
}

type SlideProps = { onLaunch: () => void };

const SLIDES: Array<(p: SlideProps) => React.ReactElement> = [Slide1, Slide2, Slide3, Slide4, Slide5, Slide6];

function SlideShell({ children, eyebrow }: { children: React.ReactNode; eyebrow?: string }) {
  return (
    <div data-slide-shell className="h-full w-full flex flex-col justify-center px-6 md:px-24 max-w-7xl mx-auto overflow-y-auto">
      {eyebrow && (
        <div className="mb-3 md:mb-6 text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
      )}
      {children}
    </div>
  );
}

function Slide1(_: SlideProps) {
  return (
    <SlideShell eyebrow="Crinkle Health">
      <h1 className="text-2xl sm:text-4xl md:text-7xl font-bold tracking-tight leading-[1.1] max-w-5xl">
        Medicare decisions are complex.{" "}
        <span className="text-primary">The experience should make them simpler.</span>
      </h1>
      <p className="mt-4 md:mt-10 text-base sm:text-lg md:text-2xl text-muted-foreground">
        Voice-Guided Medicare Journey Navigator
      </p>
      <div className="mt-6 md:mt-12 h-1 w-16 md:w-24 bg-primary rounded-full" />
    </SlideShell>
  );
}

function Slide2(_: SlideProps) {
  const pains = [
    "Don't know where to start",
    "Struggle to understand Medicare terminology",
    "Become lost navigating multiple pages and tools",
    "Abandon the process before comparing plans or enrolling",
    "Call support agents for basic navigation and educational questions",
  ];
  return (
    <SlideShell eyebrow="The Problem">
      <h2 className="text-xl sm:text-3xl md:text-6xl font-bold tracking-tight leading-tight max-w-4xl">
        Today's Medicare shopping experience is <span className="text-primary">overwhelming.</span>
      </h2>
      <p className="mt-3 md:mt-8 text-sm md:text-xl text-muted-foreground">Consumers often…</p>
      <ul className="mt-3 md:mt-6 grid gap-2 md:gap-3 md:grid-cols-2 max-w-4xl">
        {pains.map((p) => (
          <li key={p} className="flex items-start gap-2 md:gap-3 text-sm md:text-xl text-foreground">
            <span className="mt-1.5 md:mt-2 h-1.5 w-1.5 md:h-2 md:w-2 shrink-0 rounded-full bg-primary" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 md:mt-10 max-w-3xl text-xs md:text-lg italic text-muted-foreground border-l-4 border-primary pl-3 md:pl-4">
        Current guided journeys rely on static screens that don't adapt when users have questions or need help.
      </p>
    </SlideShell>
  );
}

function Slide3(_: SlideProps) {
  const caps = [
    { icon: <Mic className="h-5 w-5 md:h-7 md:w-7" />, label: "Natural Voice Conversations" },
    { icon: <Compass className="h-5 w-5 md:h-7 md:w-7" />, label: "Intelligent Website Navigation" },
    { icon: <BookOpen className="h-5 w-5 md:h-7 md:w-7" />, label: "Medicare Education" },
    { icon: <Headphones className="h-5 w-5 md:h-7 md:w-7" />, label: "Human Support Handoff" },
  ];
  return (
    <SlideShell eyebrow="The Solution">
      <h2 className="text-xl sm:text-3xl md:text-6xl font-bold tracking-tight leading-tight max-w-5xl">
        Introducing the <span className="text-primary">Voice-Guided Medicare Journey Navigator.</span>
      </h2>
      <p className="mt-3 md:mt-8 text-sm md:text-2xl text-muted-foreground">
        Users speak. The website responds.
      </p>
      <div className="mt-4 md:mt-12 grid gap-2 md:gap-5 md:grid-cols-2 max-w-4xl">
        {caps.map((c) => (
          <div key={c.label} className="flex items-center gap-3 md:gap-4 rounded-xl border bg-card p-3 md:p-5 shadow-sm">
            <div className="flex h-10 w-10 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {c.icon}
            </div>
            <div className="text-sm md:text-xl font-semibold">{c.label}</div>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}

function Slide4(_: SlideProps) {
  const user = [
    "Higher journey completion rates",
    "Improved satisfaction scores",
    "Faster time to complete key tasks",
    "More accessible for less technical users",
  ];
  const biz = [
    "Increased enrollment conversion",
    "Reduced shopping abandonment",
    "Lower support call volume",
    "Greater self-service completion",
  ];
  return (
    <SlideShell eyebrow="Business Impact">
      <h2 className="text-xl sm:text-3xl md:text-6xl font-bold tracking-tight leading-tight">
        Why this <span className="text-primary">matters.</span>
      </h2>
      <div className="mt-4 md:mt-12 grid gap-3 md:gap-8 md:grid-cols-2 max-w-5xl">
        <ImpactCol title="User Outcomes" items={user} />
        <ImpactCol title="Business Outcomes" items={biz} />
      </div>
    </SlideShell>
  );
}

function ImpactCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border bg-card p-4 md:p-8 shadow-sm">
      <div className="text-[10px] md:text-sm font-semibold uppercase tracking-wider text-primary">{title}</div>
      <ul className="mt-3 md:mt-5 space-y-2 md:space-y-3">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2 md:gap-3 text-sm md:text-lg">
            <span className="mt-1.5 md:mt-2 h-1.5 w-1.5 md:h-2 md:w-2 shrink-0 rounded-full bg-primary" />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Slide5(_: SlideProps) {
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
    <SlideShell eyebrow="Validation Plan">
      <h2 className="text-xl sm:text-3xl md:text-6xl font-bold tracking-tight leading-tight max-w-5xl">
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

function Slide6({ onLaunch }: SlideProps) {
  return (
    <SlideShell eyebrow="Live Demo">
      <h2 className="text-2xl sm:text-4xl md:text-7xl font-bold tracking-tight leading-tight max-w-5xl">
        See it <span className="text-primary">in action.</span>
      </h2>
      <p className="mt-3 md:mt-8 max-w-3xl text-sm md:text-2xl text-muted-foreground">
        This prototype demonstrates how the Voice-Guided Medicare Navigator guides users through education, doctor lookup, and plan comparison — using only natural conversation.
      </p>

      <div className="mt-4 md:mt-8">
        <Button
          onClick={onLaunch}
          size="lg"
          className="h-12 md:h-16 px-6 md:px-10 text-base md:text-xl gap-2 md:gap-3 shadow-lg shadow-primary/30"
        >
          Launch the Demo <ArrowRight className="h-5 w-5 md:h-6 md:w-6" />
        </Button>
      </div>

      <div className="mt-4 md:mt-8 grid gap-2 md:gap-3 md:grid-cols-2 lg:grid-cols-3 max-w-6xl">
        <DemoCard icon={<BookOpen className="h-5 w-5 md:h-6 md:w-6" />} title="Learn about Medicare" phrase="What is Medicare Advantage?">
          Ask about Part A, Part B, Part C, Part D, or Medicare Advantage and watch the AI navigate and highlight the right section.
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
