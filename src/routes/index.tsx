import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, Mic, Compass, BookOpen, Headphones } from "lucide-react";
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
  const total = 5;

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= total - 1) return i;
      return i + 1;
    });
  }, []);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const launch = useCallback(() => navigate({ to: "/home" }), [navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Enter" && index === total - 1) launch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, launch, index]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground group">
      {/* Slides */}
      <div className="relative flex-1 overflow-hidden">
        {SLIDES.map((Slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-all duration-500 ease-out ${
              i === index ? "opacity-100 translate-x-0" : i < index ? "opacity-0 -translate-x-8 pointer-events-none" : "opacity-0 translate-x-8 pointer-events-none"
            }`}
          >
            <Slide onLaunch={launch} />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <button
          onClick={prev}
          disabled={index === 0}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-card/90 border shadow-lg backdrop-blur transition hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
        <button
          onClick={next}
          disabled={index === total - 1}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-card/90 border shadow-lg backdrop-blur transition hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next slide"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      </div>

      {/* Counter + progress */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <div className="flex gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-10 bg-primary" : "w-6 bg-muted hover:bg-muted-foreground/40"}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-muted-foreground tabular-nums">
          {index + 1} of {total}
        </span>
      </div>
    </div>
  );
}

type SlideProps = { onLaunch: () => void };

const SLIDES: Array<(p: SlideProps) => React.ReactElement> = [Slide1, Slide2, Slide3, Slide4, Slide5];

function SlideShell({ children, eyebrow }: { children: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="h-full w-full flex flex-col justify-center px-12 md:px-24 max-w-7xl mx-auto">
      {eyebrow && (
        <div className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
      )}
      {children}
    </div>
  );
}

function Slide1(_: SlideProps) {
  return (
    <SlideShell eyebrow="Crinkle Health">
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] max-w-5xl">
        Medicare decisions are complex.{" "}
        <span className="text-primary">The experience should make them simpler.</span>
      </h1>
      <p className="mt-10 text-xl md:text-2xl text-muted-foreground">
        Voice-Guided Medicare Journey Navigator
      </p>
      <div className="mt-12 h-1 w-24 bg-primary rounded-full" />
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
      <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight max-w-4xl">
        Today's Medicare shopping experience is <span className="text-primary">overwhelming.</span>
      </h2>
      <p className="mt-8 text-lg md:text-xl text-muted-foreground">Consumers often…</p>
      <ul className="mt-6 grid gap-3 md:grid-cols-2 max-w-4xl">
        {pains.map((p) => (
          <li key={p} className="flex items-start gap-3 text-lg md:text-xl text-foreground">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <p className="mt-10 max-w-3xl text-base md:text-lg italic text-muted-foreground border-l-4 border-primary pl-4">
        Current guided journeys rely on static screens that don't adapt when users have questions or need help.
      </p>
    </SlideShell>
  );
}

function Slide3(_: SlideProps) {
  const caps = [
    { icon: <Mic className="h-7 w-7" />, label: "Natural Voice Conversations" },
    { icon: <Compass className="h-7 w-7" />, label: "Intelligent Website Navigation" },
    { icon: <BookOpen className="h-7 w-7" />, label: "Medicare Education" },
    { icon: <Headphones className="h-7 w-7" />, label: "Human Support Handoff" },
  ];
  return (
    <SlideShell eyebrow="The Solution">
      <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight max-w-5xl">
        Introducing the <span className="text-primary">Voice-Guided Medicare Journey Navigator.</span>
      </h2>
      <p className="mt-8 text-xl md:text-2xl text-muted-foreground">
        Users speak. The website responds.
      </p>
      <div className="mt-12 grid gap-5 md:grid-cols-2 max-w-4xl">
        {caps.map((c) => (
          <div key={c.label} className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {c.icon}
            </div>
            <div className="text-lg md:text-xl font-semibold">{c.label}</div>
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
      <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
        Why this <span className="text-primary">matters.</span>
      </h2>
      <div className="mt-12 grid gap-8 md:grid-cols-2 max-w-5xl">
        <ImpactCol title="User Outcomes" items={user} />
        <ImpactCol title="Business Outcomes" items={biz} />
      </div>
    </SlideShell>
  );
}

function ImpactCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border bg-card p-8 shadow-sm">
      <div className="text-sm font-semibold uppercase tracking-wider text-primary">{title}</div>
      <ul className="mt-5 space-y-3">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-3 text-lg">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Slide5({ onLaunch }: SlideProps) {
  return (
    <SlideShell eyebrow="Live Demo">
      <h2 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight max-w-5xl">
        See it <span className="text-primary">in action.</span>
      </h2>
      <p className="mt-8 max-w-3xl text-lg md:text-2xl text-muted-foreground">
        This prototype demonstrates how the Voice-Guided Medicare Navigator guides users through education, doctor lookup, and plan comparison — using only natural conversation.
      </p>
      <div className="mt-12">
        <Button
          onClick={onLaunch}
          size="lg"
          className="h-16 px-10 text-xl gap-3 shadow-lg shadow-primary/30"
        >
          Launch the Demo <ArrowRight className="h-6 w-6" />
        </Button>
      </div>
    </SlideShell>
  );
}
