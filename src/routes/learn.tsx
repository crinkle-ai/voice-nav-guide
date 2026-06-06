import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp, useTrackPage, useHighlightConsumer } from "@/context/AppContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Volume2, Square } from "lucide-react";

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

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Medicare, explained simply</h1>
      <p className="mt-4 text-xl text-muted-foreground">
        Each part of Medicare does something different. Tap any section to expand it — or press "Read aloud" to hear it.
      </p>

      <Accordion type="single" collapsible value={openId} onValueChange={setOpenId} className="mt-8">
        {PARTS.map((p) => (
          <AccordionItem key={p.id} value={p.id} id={p.id} className="border-b">
            <AccordionTrigger className="text-xl font-semibold">{p.title}</AccordionTrigger>
            <AccordionContent>
              <p className="text-lg text-foreground">{p.body}</p>
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
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {GLOSSARY.map(([term, def]) => (
            <div key={term} id={`glossary-${term.toLowerCase().replace(/\s+/g, "-")}`} className="rounded-lg border bg-card p-4">
              <dt className="font-semibold text-foreground">{term}</dt>
              <dd className="mt-1 text-muted-foreground">{def}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
