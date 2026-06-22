import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import demoVideo from "@/assets/medicare-parts-a-b.mp4.asset.json";

import { useTrackPage } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { persona } from "@/mock/personas";
import {
  BookOpen,
  Stethoscope,
  ClipboardList,
  ShieldCheck,
  Heart,
  Phone,
  Calendar,
  PiggyBank,
  Pill,
  Eye,
  Smile,
  CheckCircle2,
  Mic,
  Sparkles,
  RotateCcw,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medicare Coverage & Plans | Crinkle Health" },
      {
        name: "description",
        content:
          "Shop Medicare your way. Talk or type what's on your mind — we'll build a personalized plan to find the right coverage.",
      },
      { property: "og:title", content: "Medicare Coverage & Plans | Crinkle Health" },
      {
        property: "og:description",
        content:
          "Shop Medicare your way. Talk or type what's on your mind — we'll build a personalized plan to find the right coverage.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  useTrackPage("home", "/");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-12 overflow-x-hidden">
      {/* Ramble Hero */}
      <RambleHero />

      {/* Demo videos */}
      <section id="demo" className="mt-16 sm:mt-24">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">See how it works</h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Talk to your AI Medicare guide — it drives the site for you, from learning the basics to comparing plans.
        </p>
        <div className="mt-4 sm:mt-6 grid gap-5 sm:gap-6">
          <DemoVideoCard
            kicker="AI Guide"
            title="Find & compare Medicare plans with AI"
            desc="A quick walkthrough of using your AI guide to shop plans."
            src={demoVideo.url}
          />
        </div>
      </section>

      {/* Plan types */}
      <section id="plans" className="mt-12 sm:mt-20">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-3xl font-bold text-foreground">Coverage for every kind of Medicare</h2>
            <p className="mt-2 text-sm sm:text-lg text-muted-foreground">
              Whether you want all-in-one simplicity or the freedom to see any provider, we have a plan that fits.
            </p>
          </div>
          <Link to="/compare-plans" className="hidden text-base font-semibold text-primary hover:underline md:inline shrink-0">
            Compare all plans →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:gap-6 md:grid-cols-3">
          <PlanCard
            badge="Most popular"
            title="Medicare Advantage (Part C)"
            desc="Hospital, medical, and usually drug coverage in one plan — often with dental, vision, and hearing included."
            bullets={["$0 premium options", "Built-in Part D", "Extras like fitness & meal benefits"]}
          />
          <PlanCard
            title="Medicare Supplement (Medigap)"
            desc="Pairs with Original Medicare to help cover copays, coinsurance, and deductibles. See any provider that accepts Medicare."
            bullets={["Predictable out-of-pocket costs", "Nationwide doctor freedom", "No referrals needed"]}
          />
          <PlanCard
            title="Prescription Drug Plans (Part D)"
            desc="Stand-alone drug coverage to add to Original Medicare or a Medigap plan. Choose from broad pharmacy networks."
            bullets={["Low-copay formularies", "$0 select generics", "Mail-order options"]}
          />
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="mt-12 sm:mt-20">
        <h2 className="text-xl sm:text-3xl font-bold text-foreground">What you can get with a Crinkle Medicare plan</h2>
        <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <BenefitItem icon={<Stethoscope className="h-5 w-5" />} title="Primary & specialist visits" desc="$0 copays on many in-network visits." />
          <BenefitItem icon={<Pill className="h-5 w-5" />} title="Prescription drugs" desc="Hundreds of generics at $0 with Part D." />
          <BenefitItem icon={<Smile className="h-5 w-5" />} title="Dental & hearing" desc="Cleanings, exams, and hearing aid allowances." />
          <BenefitItem icon={<Eye className="h-5 w-5" />} title="Vision" desc="Annual eye exams plus an eyewear allowance." />
          <BenefitItem icon={<Heart className="h-5 w-5" />} title="Fitness benefits" desc="Gym memberships and at-home wellness kits." />
          <BenefitItem icon={<PiggyBank className="h-5 w-5" />} title="Over-the-counter allowance" desc="Quarterly credit for everyday health items." />
          <BenefitItem icon={<Phone className="h-5 w-5" />} title="24/7 nurse line" desc="Talk to a registered nurse anytime, day or night." />
          <BenefitItem icon={<ShieldCheck className="h-5 w-5" />} title="Worldwide emergency" desc="Emergency coverage when you travel abroad." />
        </div>
      </section>

      {/* Resources / next steps */}
      <section id="resources" className="mt-12 sm:mt-20">
        <h2 className="text-xl sm:text-3xl font-bold text-foreground">New to Medicare? Start here.</h2>
        <div className="mt-6 grid gap-4 sm:gap-6 md:grid-cols-3">
          <ResourceCard
            to="/learn"
            icon={<BookOpen className="h-6 w-6" />}
            kicker="Medicare 101"
            title="Understand Parts A, B, C & D"
            desc="A plain-language guide to how Medicare works and when to enroll."
          />
          <ResourceCard
            to="/find-doctors"
            icon={<Stethoscope className="h-6 w-6" />}
            kicker="Provider search"
            title="Find a doctor in our network"
            desc="Check whether your current providers are in-network before you enroll."
          />
          <ResourceCard
            to="/compare-plans"
            icon={<ClipboardList className="h-6 w-6" />}
            kicker="Plan finder"
            title="Compare Medicare plans"
            desc="Side-by-side premiums, deductibles, and benefits in your area."
          />
        </div>
        <div className="mt-6 md:hidden">
          <Link to="/compare-plans" className="block text-center text-base font-semibold text-primary hover:underline">
            Compare all plans →
          </Link>
        </div>
      </section>

      {/* Trust strip */}
      <section id="trust" className="mt-12 sm:mt-20 grid gap-4 rounded-xl border bg-muted/40 p-4 sm:p-6 md:grid-cols-3">
        <TrustItem icon={<ShieldCheck className="h-5 w-5" />} title="A Medicare-approved carrier" desc="Contracted with the federal Medicare program." />
        <TrustItem icon={<Heart className="h-5 w-5" />} title="4.5 ★ average plan rating" desc="Across our Medicare Advantage plans (CMS, 2025)." />
        <TrustItem icon={<Phone className="h-5 w-5" />} title="Licensed agents, no pressure" desc="Talk to a real person who only recommends what fits." />
      </section>
    </main>
  );
}

function RambleHero() {
  const navigate = useNavigate();
  const [text, setText] = useState(persona.ramble);
  const [generating, setGenerating] = useState(false);

  const onGenerate = () => {
    setGenerating(true);
    navigate({ to: "/workspace" });
  };

  const onReset = () => {
    setText("");
    setTimeout(() => setText(persona.ramble), 0);
  };


  return (
    <section id="hero" className="mx-auto max-w-3xl">
      <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs sm:text-sm font-medium text-accent-foreground">
        <Sparkles className="h-4 w-4 shrink-0" /> Shop My Way
      </div>
      <h1 className="mt-4 text-[2rem] leading-[1.1] sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
        Tell us what's on your mind.
      </h1>
      <p className="mt-3 sm:mt-5 text-base sm:text-xl text-muted-foreground max-w-2xl">
        No forms. Talk or type the way you'd explain it to a friend — worries, what you know, what you're hoping for.
        We'll build a plan from there.
      </p>

      <div className="mt-6 sm:mt-8 rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Listening
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="mt-3 w-full resize-none border-0 bg-transparent p-0 text-[15px] sm:text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
          placeholder="Tell us what's on your mind…"
        />

        <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
          <button
            type="button"
            aria-label="Voice input (demo)"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
          >
            <Mic className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-end gap-0.5">
              {Array.from({ length: 24 }).map((_, i) => (
                <motion.span key={i}
                  className="w-1 rounded-full bg-primary/50"
                  animate={{ height: [6, 14 + (i % 5) * 3, 8] }}
                  transition={{ duration: 0.6 + (i % 4) * 0.1, repeat: Infinity, delay: i * 0.04 }}
                />
              ))}
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground hidden sm:block">or type</div>
        </div>
      </div>

      <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <Button
          size="lg"
          onClick={onGenerate}
          disabled={generating || text.trim().length === 0}
          className="h-12 sm:h-14 px-5 sm:px-7 text-base sm:text-lg w-full sm:w-auto"
        >
          <Sparkles className="h-4 w-4" />
          {generating ? "Listening…" : "Show my path →"}
        </Button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto"
        >
          <RotateCcw className="h-3 w-3" />
          Reset demo
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0" /> Concept demo · no information collected
        </span>
        <span className="inline-flex items-center gap-2">
          <Phone className="h-4 w-4 shrink-0" /> 1-800-555-0143 (TTY 711)
        </span>
        <span className="inline-flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0" /> Mon–Fri, 8am–8pm
        </span>
      </div>
    </section>
  );
}

function DemoVideoCard({ kicker, title, desc, src }: { kicker: string; title: string; desc: string; src: string }) {
  return (
    <div className="flex flex-col rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="bg-black">
        <video
          src={src}
          controls
          preload="metadata"
          playsInline
          className="w-full h-auto block"
        >
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="p-4 sm:p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-primary">{kicker}</div>
        <h3 className="mt-1 text-base sm:text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function PlanCard({ badge, title, desc, bullets }: { badge?: string; title: string; desc: string; bullets: string[] }) {
  return (
    <div className="relative flex flex-col rounded-xl border bg-card p-5 sm:p-6 shadow-sm">
      {badge && (
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-muted-foreground">{desc}</p>
      <ul className="mt-4 space-y-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-base text-foreground">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <Button asChild variant="outline" className="mt-6 w-full">
        <Link to="/compare-plans">View plans</Link>
      </Button>
    </div>
  );
}

function BenefitItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="mt-3 font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}

function ResourceCard({ to, icon, kicker, title, desc }: { to: string; icon: React.ReactNode; kicker: string; title: string; desc: string }) {
  return (
    <Link to={to} className="group block rounded-xl border bg-card p-5 sm:p-6 transition-all hover:border-primary hover:shadow-md active:bg-accent/30 min-h-[44px]">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{kicker}</span>
      </div>
      <h3 className="mt-4 text-xl font-semibold text-foreground group-hover:text-primary">{title}</h3>
      <p className="mt-2 text-muted-foreground">{desc}</p>
    </Link>
  );
}

function TrustItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div>
        <div className="font-semibold text-foreground">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}
