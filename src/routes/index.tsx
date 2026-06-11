import { createFileRoute, Link } from "@tanstack/react-router";
import demoVideo from "@/assets/medicare-parts-a-b.mp4.asset.json";
import { useTrackPage } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medicare Coverage & Plans | Crinkle Health" },
      {
        name: "description",
        content:
          "Explore Medicare Advantage, Supplement, and Part D plans from Crinkle Health. Coverage built for the way you live — with doctors, prescriptions, and extras you can count on.",
      },
      { property: "og:title", content: "Medicare Coverage & Plans | Crinkle Health" },
      {
        property: "og:description",
        content:
          "Medicare Advantage, Medigap, and Part D plans designed around real life. Compare benefits, check your doctors, and enroll with confidence.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  useTrackPage("home", "/");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-12 overflow-x-hidden">
      {/* Hero */}
      <section id="hero" className="grid gap-8 md:gap-10 md:grid-cols-[1.3fr_1fr] md:items-center">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs sm:text-sm font-medium text-accent-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0" /> Medicare Open Enrollment is here
          </div>
          <h1 className="mt-4 sm:mt-5 text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
            Medicare coverage built around your life.
          </h1>
          <p className="mt-4 sm:mt-5 text-base sm:text-xl text-muted-foreground">
            Crinkle Health offers Medicare Advantage, Medigap, and Part D plans with the doctors you trust, the prescriptions you take, and the extras that make every day a little easier.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 sm:h-14 px-5 sm:px-7 text-base sm:text-lg">
              <Link to="/compare-plans">
                <ClipboardList className="h-5 w-5" /> Shop Medicare plans
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 sm:h-14 px-5 sm:px-7 text-base sm:text-lg">
              <Link to="/learn">Medicare basics →</Link>
            </Button>
          </div>
          <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" /> 1-800-555-0143 (TTY 711)
            </span>
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" /> Mon–Fri, 8am–8pm local time
            </span>
          </div>
        </div>


        {/* Quick eligibility card */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Find your plan
          </div>
          <p className="mt-2 text-base text-muted-foreground">
            Most people qualify around age 65. See what's available in your area.
          </p>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-foreground">ZIP code</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 78701"
                className="mt-1 w-full rounded-lg border bg-background px-4 py-3 text-base text-foreground focus:border-primary focus:outline-none"
              />
            </label>
            <Button asChild size="lg" className="w-full h-12 text-base">
              <Link to="/compare-plans">See plans in my area</Link>
            </Button>
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>No obligation. We'll never sell your information.</span>
          </div>
        </div>
      </section>

      {/* Demo video */}
      <section id="demo" className="mt-16">
        <h2 className="text-2xl font-bold text-foreground">See how it works</h2>
        <p className="mt-2 text-muted-foreground">
          A quick walkthrough of finding and comparing Medicare plans with Crinkle.
        </p>
        <div className="mt-6 overflow-hidden rounded-2xl border shadow-sm bg-black">
          <video
            src={demoVideo.url}
            controls
            preload="metadata"
            playsInline
            className="w-full h-auto block"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </section>

      {/* Plan types */}
      <section id="plans" className="mt-12 sm:mt-20">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Coverage for every kind of Medicare</h2>
            <p className="mt-2 text-base sm:text-lg text-muted-foreground">
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
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">What you can get with a Crinkle Medicare plan</h2>
        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">

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
      <section id="resources" className="mt-20">
        <h2 className="text-3xl font-bold text-foreground">New to Medicare? Start here.</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
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
      </section>

      {/* Trust strip */}
      <section id="trust" className="mt-20 grid gap-4 rounded-xl border bg-muted/40 p-6 md:grid-cols-3">
        <TrustItem icon={<ShieldCheck className="h-5 w-5" />} title="A Medicare-approved carrier" desc="Contracted with the federal Medicare program." />
        <TrustItem icon={<Heart className="h-5 w-5" />} title="4.5 ★ average plan rating" desc="Across our Medicare Advantage plans (CMS, 2025)." />
        <TrustItem icon={<Phone className="h-5 w-5" />} title="Licensed agents, no pressure" desc="Talk to a real person who only recommends what fits." />
      </section>
    </main>
  );
}

function PlanCard({ badge, title, desc, bullets }: { badge?: string; title: string; desc: string; bullets: string[] }) {
  return (
    <div className="relative flex flex-col rounded-xl border bg-card p-6 shadow-sm">
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
    <Link to={to} className="group rounded-xl border bg-card p-6 transition-all hover:border-primary hover:shadow-md">
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
