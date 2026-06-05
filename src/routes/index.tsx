import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { useTrackPage } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { BookOpen, Stethoscope, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medicare Navigator — Find your path with confidence" },
      { name: "description", content: "A voice-guided journey to help you understand Medicare, find doctors, and compare plans." },
    ],
  }),
  component: Home,
});

function Home() {
  useTrackPage("home", "/");
  return (
    <PagePlaceholder
      title="Welcome to your Medicare journey"
      description="A guided, voice-friendly way to understand your options and choose the right plan."
      comingNext="A personalized welcome experience with quick-start CTAs and a voice-led introduction."
    >
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <StepCard to="/learn" icon={<BookOpen className="h-6 w-6" />} step="1" title="Learn the basics" />
        <StepCard to="/find-doctors" icon={<Stethoscope className="h-6 w-6" />} step="2" title="Find your doctors" />
        <StepCard to="/compare-plans" icon={<ClipboardList className="h-6 w-6" />} step="3" title="Compare your plans" />
      </div>
      <div className="mt-10">
        <Button asChild size="lg" className="text-lg h-14 px-8">
          <Link to="/learn">Start with Step 1 →</Link>
        </Button>
      </div>
    </PagePlaceholder>
  );
}

function StepCard({ to, icon, step, title }: { to: string; icon: React.ReactNode; step: string; title: string }) {
  return (
    <Link
      to={to}
      className="group rounded-xl border bg-card p-6 transition-all hover:border-primary hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Step {step}
        </span>
      </div>
      <h3 className="mt-4 text-xl font-semibold text-foreground group-hover:text-primary">
        {title}
      </h3>
    </Link>
  );
}
