import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Stepper } from "@/components/v3/app-shell";
import { useSession } from "@/lib/v3/session-store";
import { rankPlans } from "@/lib/v3/match-plans";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Phone, FileText, RotateCcw } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/v3/next-step")({
  head: () => ({ meta: [{ title: "Next step — Medicare Compass" }] }),
  component: NextStepPage,
});

function NextStepPage() {
  const { state, reset, ready } = useSession();
  const top = useMemo(() => (ready ? rankPlans(state.intake)[0] : null), [ready, state.intake]);

  return (
    <AppShell step="next">
      <Stepper current="next" />
      <div className="max-w-2xl">
        <div className="h-14 w-14 rounded-full bg-accent-soft text-accent flex items-center justify-center mb-6">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="font-serif text-4xl">You're ready.</h1>
        <p className="text-muted-2 mt-3 text-lg">
          You went from a blank page to a clear, ranked plan recommendation in a single conversation.
          Here's what to do next.
        </p>

        {top && (
          <div className="mt-8 rounded-2xl border border-accent/40 bg-accent-soft/30 p-6">
            <p className="text-xs uppercase tracking-wider text-accent font-medium mb-1">Your top match</p>
            <h2 className="font-serif text-2xl">{top.plan.name}</h2>
            <p className="text-sm text-muted-2 mt-1">{top.plan.highlight}</p>
          </div>
        )}

        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          <a
            href="tel:+18005551234"
            className="rounded-2xl border border-line bg-paper p-5 hover:border-accent transition group"
          >
            <Phone className="h-5 w-5 text-accent mb-3" />
            <h3 className="font-serif text-xl">Talk to a licensed agent</h3>
            <p className="text-sm text-muted-2 mt-1">A real person will confirm your eligibility and walk you through enrollment.</p>
            <span className="mt-3 inline-block text-sm text-accent font-medium">1-800-555-1234 →</span>
          </a>
          <button
            onClick={() => window.print()}
            className="text-left rounded-2xl border border-line bg-paper p-5 hover:border-accent transition"
          >
            <FileText className="h-5 w-5 text-accent mb-3" />
            <h3 className="font-serif text-xl">Print my one-pager</h3>
            <p className="text-sm text-muted-2 mt-1">Take this conversation and your matches with you to share with family.</p>
            <span className="mt-3 inline-block text-sm text-accent font-medium">Print summary →</span>
          </button>
        </div>

        <div className="mt-10 flex items-center gap-3">
          <Link to="/v3">
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-2" /> Try another intake style
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
