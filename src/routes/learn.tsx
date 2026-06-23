import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp, useTrackPage, useHighlightConsumer } from "@/context/AppContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Volume2, Square, Sparkles, ArrowRight, Stethoscope, Pill, Plane } from "lucide-react";
import { persona } from "@/mock/personas";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn Medicare — Plain-language Parts A, B, C, D" },
      { name: "description", content: "Understand Medicare Parts A, B, C, D and Medigap in everyday language." },
    ],
  }),
  component: Learn,
});

const PARTS = [
  {
    id: "part-a",
    title: "Part A — Hospital",
    body: "Covers inpatient hospital stays, skilled nursing facility care, hospice, and some home health. Most people pay $0 premium because they (or a spouse) paid Medicare taxes while working.",
  },
  {
    id: "part-b",
    title: "Part B — Medical",
    body: "Covers doctor visits, outpatient care, preventive services, and durable medical equipment. There's a monthly premium (around $174.70 in most cases) and a small annual deductible.",
  },
  {
    id: "part-c",
    title: "Part C — Medicare Advantage",
    body: "An 'all-in-one' alternative to Original Medicare offered by private insurers. Usually bundles Parts A, B, often D, and extras like dental, vision, hearing. Uses a network of providers.",
  },
  {
    id: "part-d",
    title: "Part D — Prescription Drugs",
    body: "Standalone drug coverage from private insurers. You add it to Original Medicare. Each plan has its own list of covered drugs (called a formulary) and its own premium.",
  },
  {
    id: "medigap",
    title: "Medigap (Supplement)",
    body: "Supplement insurance for people on Original Medicare. Helps pay copays, coinsurance, and deductibles. Sold by private insurers and standardized by letter (Plan G, Plan N, etc.).",
  },
];

const GLOSSARY = [
  ["Premium", "What you pay every month to have the plan, whether or not you use it."],
  ["Deductible", "What you pay out-of-pocket before insurance starts paying."],
  ["Copay", "A fixed dollar amount you pay for a service (e.g. $20 for a visit)."],
  ["Coinsurance", "A percentage of the cost you pay after meeting the deductible."],
  ["Out-of-pocket max", "The yearly cap on what you pay. After this, the plan pays 100%."],
  ["Network", "Doctors and hospitals contracted with your plan. Going outside usually costs more."],
  ["Formulary", "The list of prescription drugs a plan covers, sorted into tiers."],
] as const;

const PRIORITY_TERMS = ["Network", "Formulary", "Out-of-pocket max"];

// Map each persona priority to one or more accordion parts + a tailored "why" sentence.
type ReadingPick = { id: string; title: string; why: string; icon: typeof Stethoscope };
const READING_PICKS: ReadingPick[] = [
  {
    id: "part-c",
    title: "Part C — Medicare Advantage",
    why: "Networks decide whether Dr. Patel and Dr. Chen stay your doctors. Start here to see how that works.",
    icon: Stethoscope,
  },
  {
    id: "part-d",
    title: "Part D — Prescription Drugs",
    why: "Your three prescriptions are priced from a formulary. This is where the monthly drug math lives.",
    icon: Pill,
  },
  {
    id: "medigap",
    title: "Medigap (Supplement)",
    why: "If you split time between Minnesota and Arizona, supplement plans travel with you better than most networks.",
    icon: Plane,
  },
];

// Per-part callouts when the part matches one of her priorities.
const PART_CALLOUTS: Record<string, string> = {
  "part-c": "Matters to you because: this is the plan type where networks can quietly drop Dr. Patel or Dr. Chen.",
  "part-d": "Matters to you because: your Atorvastatin, Lisinopril, and Metformin are priced from a Part D formulary.",
  medigap: "Matters to you because: supplement plans tend to work nationwide — useful when you're in Arizona Nov–Mar.",
};

function Learn() {
  useTrackPage("education", "/learn");
  useHighlightConsumer();
  const { state, dispatch } = useApp();
  const [openId, setOpenId] = useState<string>("");
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    if (openId) dispatch({ type: "COMPLETE_STEP", step: "education" });
  }, [openId, dispatch]);

  // Auto-expand the accordion item when the AI highlights a Medicare part
  useEffect(() => {
    const section = state.highlightedSection;
    if (section && PARTS.some((p) => p.id === section)) {
      setOpenId(section);
    }
  }, [state.highlightedSection]);

  const readAloud = (id: string, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (speakingId === id) {
      setSpeakingId(null);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onend = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(u);
  };

  const jumpTo = (id: string) => {
    setOpenId(id);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const priorityGlossary = GLOSSARY.filter(([t]) => PRIORITY_TERMS.includes(t));
  const restGlossary = GLOSSARY.filter(([t]) => !PRIORITY_TERMS.includes(t));

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Medicare, explained simply</h1>
      <p className="mt-4 text-xl text-muted-foreground">
        Each part of Medicare does something different. Tap any section to expand it — or press "Read aloud" to hear it.
      </p>

      <section id="your-priorities" className="mt-8 rounded-2xl border border-border bg-primary-soft/30 p-6 scroll-mt-24">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-accent-foreground">
          <Sparkles className="h-3 w-3" /> Here's what you told us
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground">
          Since keeping Dr. Patel and Dr. Chen and traveling between Minnesota and Arizona are what matter, here's what to focus on first.
        </p>

        {(persona.understanding.priorities.length > 0 || persona.understanding.concerns.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {persona.understanding.priorities.map((p) => (
              <span key={p} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                {p}
              </span>
            ))}
            {persona.understanding.concerns.map((c) => (
              <span key={c} className="rounded-full border border-warm/40 bg-warm-soft px-3 py-1 text-xs text-warm-foreground">
                {c}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Start here for you</div>
          <ol className="space-y-2">
            {READING_PICKS.map((pick, idx) => {
              const Icon = pick.icon;
              return (
                <li key={pick.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <div className="text-sm font-semibold text-foreground">{pick.title}</div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{pick.why}</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => jumpTo(pick.id)}>
                    Read <ArrowRight className="h-3 w-3" />
                  </Button>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <Accordion type="single" collapsible value={openId} onValueChange={setOpenId} className="mt-10">
        {PARTS.map((p) => (
          <AccordionItem key={p.id} value={p.id} id={p.id} className="border-b">
            <AccordionTrigger className="text-xl font-semibold">{p.title}</AccordionTrigger>
            <AccordionContent>
              <p className="text-lg text-foreground">{p.body}</p>
              {PART_CALLOUTS[p.id] && (
                <div className="mt-3 rounded-lg border border-primary/30 bg-primary-soft/40 px-3 py-2 text-sm text-foreground">
                  <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
                  {PART_CALLOUTS[p.id]}
                </div>
              )}
              <Button variant="outline" size="sm" className="mt-3" onClick={() => readAloud(p.id, `${p.title}. ${p.body}`)}>
                {speakingId === p.id ? <><Square className="h-4 w-4" /> Stop</> : <><Volume2 className="h-4 w-4" /> Read aloud</>}
              </Button>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <section id="glossary" className="mt-14">
        <h2 className="text-3xl font-bold text-foreground">Glossary</h2>
        <p className="mt-2 text-muted-foreground">The words that come up over and over.</p>

        <div className="mt-6">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Words you'll hit first</div>
          <dl className="grid gap-4 sm:grid-cols-2">
            {priorityGlossary.map(([term, def]) => (
              <div key={term} id={`glossary-${term.toLowerCase().replace(/\s+/g, "-")}`} className="rounded-lg border border-primary/30 bg-primary-soft/20 p-4">
                <dt className="font-semibold text-foreground">{term}</dt>
                <dd className="mt-1 text-muted-foreground">{def}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-6">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">The rest</div>
          <dl className="grid gap-4 sm:grid-cols-2">
            {restGlossary.map(([term, def]) => (
              <div key={term} id={`glossary-${term.toLowerCase().replace(/\s+/g, "-")}`} className="rounded-lg border bg-card p-4">
                <dt className="font-semibold text-foreground">{term}</dt>
                <dd className="mt-1 text-muted-foreground">{def}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}
