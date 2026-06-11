import React from "react";
import {
  ScreenShare, ShieldCheck, Video, Users, Phone, ExternalLink, ArrowRight,
  TrendingUp, Clock, Sparkles, Headphones, MousePointerClick, BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlideShell, type SlideProps, type SlideComp } from "./DeckShell";
import liveAgentVideo from "@/assets/live-agent-cobrowse.mp4.asset.json";

/* ============ LIVE AGENT MAIN SLIDES ============ */

function LiveOpportunitySlide(_: SlideProps) {
  const cards = [
    {
      stat: "76%",
      claim: "of Medicare shoppers say they want to talk to a real person before enrolling.",
      source: "Deft Research · Senior Market Insights",
      href: "https://www.deftresearch.com/",
    },
    {
      stat: "$200B+",
      claim: "in annual Medicare Advantage premiums — and a category where agent-assisted sales still dominate.",
      source: "CMS · 2025 Medicare enrollment data",
      href: "https://www.cms.gov/research-statistics-data-and-systems/statistics-trends-and-reports",
    },
    {
      stat: "1 in 3",
      claim: "online sessions abandon at plan-selection. The drop happens precisely where confidence is lowest.",
      source: "Industry funnel benchmarks",
      href: "https://www.mckinsey.com/industries/healthcare/our-insights",
    },
  ];
  return (
    <SlideShell kicker="The opportunity">
      <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] max-w-5xl">
        AI gets people 80% of the way.{" "}
        <span className="text-primary">The last mile is human.</span>
      </h1>
      <p className="mt-3 md:mt-6 text-sm md:text-xl text-muted-foreground max-w-4xl">
        Medicare is high-stakes, regulated, and emotional. Most shoppers want a licensed person to confirm before they enroll — and today that handoff is broken.
      </p>
      <div className="mt-5 md:mt-10 grid gap-3 md:gap-5 md:grid-cols-3 max-w-6xl">
        {cards.map((c) => (
          <a key={c.source} href={c.href} target="_blank" rel="noopener noreferrer" className="group flex flex-col rounded-2xl border bg-card p-4 md:p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md">
            <div className="text-2xl md:text-4xl font-bold text-primary tracking-tight">{c.stat}</div>
            <p className="mt-2 md:mt-3 text-sm md:text-lg leading-snug text-foreground flex-1">{c.claim}</p>
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

function LiveNavigatorSlide(_: SlideProps) {
  const caps = [
    {
      icon: <ScreenShare className="h-5 w-5 md:h-7 md:w-7" />,
      label: "One-click co-browse, no install",
      desc: "Sarah joins the same browser session the consumer is already in. She can highlight a plan card, scroll them to the right row, or push a side-by-side comparison — no Zoom link, no screen-share installer, no 'can you see my screen?'",
    },
    {
      icon: <Sparkles className="h-5 w-5 md:h-7 md:w-7" />,
      label: "AI hands off the full context",
      desc: "The agent arrives knowing the ZIP, the doctors saved, the plans already in the comparison drawer, and the question that triggered the handoff. They never start from zero.",
    },
    {
      icon: <BadgeCheck className="h-5 w-5 md:h-7 md:w-7" />,
      label: "Licensed identity on screen",
      desc: "Name, NPN, and state license are surfaced live — building trust in a category where 'is this person real?' is a real question. Every session is recorded and attributable.",
    },
  ];
  return (
    <SlideShell kicker="The navigator">
      <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-5xl">
        A licensed agent <span className="text-primary">in the same session, in seconds.</span>
      </h2>
      <p className="mt-3 md:mt-6 text-sm md:text-xl text-muted-foreground max-w-3xl">
        Not a call back tomorrow. Not a Zoom link in your inbox. The person who can answer your Medicare question is on your screen, right now.
      </p>
      <div className="mt-5 md:mt-10 grid gap-3 md:gap-4 max-w-5xl">
        {caps.map((c) => (
          <div key={c.label} className="flex items-start gap-3 md:gap-5 rounded-xl border bg-card p-4 md:p-5 shadow-sm">
            <div className="flex h-10 w-10 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{c.icon}</div>
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

function LiveBusinessCaseSlide(_: SlideProps) {
  const impacts = [
    {
      icon: <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />,
      headline: "Conversion lift on assisted sessions",
      desc: "Co-browsed sessions close at materially higher rates than self-serve — particularly on the high-intent moments (plan select, eligibility, doctor check) where consumers stall.",
    },
    {
      icon: <Clock className="h-5 w-5 md:h-6 md:w-6" />,
      headline: "Lower AHT vs. cold callback",
      desc: "The agent skips the 5-minute 'what brought you here today?' because the AI already passed the context. Handle time drops, throughput rises.",
    },
    {
      icon: <Headphones className="h-5 w-5 md:h-6 md:w-6" />,
      headline: "Higher licensed-agent utilization",
      desc: "Agents only get pulled in on qualified, high-intent moments — not generic 'I have a question' calls. The bench works on revenue conversations.",
    },
    {
      icon: <MousePointerClick className="h-5 w-5 md:h-6 md:w-6" />,
      headline: "CSAT & NPS deltas in a category that needs them",
      desc: "Healthcare's digital experience ranks last. A real person, on screen, in the moment, moves the score that brands actually report to the board.",
    },
  ];
  return (
    <SlideShell kicker="The business case">
      <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-5xl">
        Complement to AI deflection.{" "}
        <span className="text-primary">Not competition with it.</span>
      </h2>
      <p className="mt-3 md:mt-6 text-sm md:text-xl text-muted-foreground max-w-4xl">
        The AI navigator contains the routine. Co-browse converts the high-stakes moments AI shouldn't try to close alone.
      </p>
      <div className="mt-5 md:mt-10 grid gap-3 md:gap-5 md:grid-cols-2 max-w-6xl">
        {impacts.map((i) => (
          <div key={i.headline} className="flex items-start gap-3 md:gap-4 rounded-xl border bg-card p-4 md:p-6 shadow-sm">
            <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{i.icon}</div>
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

function LiveDemoSlide({ onLaunch }: SlideProps) {
  return (
    <SlideShell kicker="The demo">
      <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-5xl">
        Sarah joins the session. <span className="text-primary">Watch the handoff.</span>
      </h2>
      <p className="mt-3 md:mt-5 max-w-3xl text-sm md:text-xl text-muted-foreground">
        Aetna PPO vs. Humana HMO, walked through in real time by a licensed agent who can see exactly what the consumer is seeing.
      </p>

      <div className="mt-4 md:mt-6 grid gap-4 md:gap-6 lg:grid-cols-[1.4fr_1fr] max-w-6xl items-start">
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          <div className="bg-black">
            <video
              src={liveAgentVideo.url}
              controls
              preload="metadata"
              playsInline
              className="w-full h-auto block"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 md:gap-4">
          <div className="rounded-xl border bg-card p-4 md:p-5">
            <div className="flex items-center gap-2 text-primary">
              <Video className="h-4 w-4" />
              <div className="text-[10px] md:text-xs font-semibold uppercase tracking-wider">What to watch for</div>
            </div>
            <ul className="mt-2 space-y-1.5 text-xs md:text-sm">
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" /><span>Agent's face, name, and license number appear inline — not in a popup.</span></li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" /><span>The plans the consumer was already comparing are pre-loaded.</span></li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" /><span>Agent pushes a side-by-side comparison drawer onto the consumer's screen.</span></li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" /><span>No installer, no Zoom link, no 'can you see my screen?'</span></li>
            </ul>
          </div>

          <Button
            onClick={onLaunch}
            size="lg"
            className="h-12 md:h-14 px-5 md:px-7 text-sm md:text-base gap-2 shadow-lg shadow-primary/30"
          >
            Launch the live experience <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <p className="text-[11px] md:text-xs text-muted-foreground">
            Click <span className="font-semibold">"Talk to an agent"</span> in the top nav to trigger the handoff.
          </p>
        </div>
      </div>
    </SlideShell>
  );
}

/* ============ EXPORT ============ */

// Reuse the shared appendix from the AI deck
import { AI_SLIDES } from "./ai-slides";
const APPENDIX = AI_SLIDES.slice(4);

export const LIVE_MAIN_COUNT = 4;
export const LIVE_SLIDES: SlideComp[] = [
  LiveOpportunitySlide,
  LiveNavigatorSlide,
  LiveBusinessCaseSlide,
  LiveDemoSlide,
  ...APPENDIX,
];
