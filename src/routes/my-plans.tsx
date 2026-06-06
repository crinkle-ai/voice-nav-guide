import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, ShieldCheck, Pill, Stethoscope, Eye, Lock } from "lucide-react";
import { isAuthed, currentUser } from "@/lib/mock-auth";
import { useTrackPage } from "@/context/AppContext";

export const Route = createFileRoute("/my-plans")({
  head: () => ({
    meta: [
      { title: "My Plans — Medicare Navigator" },
      { name: "description", content: "Your saved and personalized Medicare plans." },
    ],
  }),
  component: MyPlans,
});

const SAVED_PLANS = [
  {
    id: "p1",
    name: "BlueShield Advantage Plus",
    carrier: "BlueShield",
    type: "Medicare Advantage",
    premium: 0,
    deductible: 250,
    perks: ["Drug coverage", "Dental", "Vision"],
    icon: ShieldCheck,
    star: 4.5,
    note: "Best match based on your saved doctors",
  },
  {
    id: "p2",
    name: "Aetna Silver Plus PDP",
    carrier: "Aetna",
    type: "Part D",
    premium: 18,
    deductible: 100,
    perks: ["Wide formulary", "$0 generic tier"],
    icon: Pill,
    star: 4.0,
    note: "Covers all prescriptions you mentioned",
  },
  {
    id: "p3",
    name: "Humana Gold Choice PFFS",
    carrier: "Humana",
    type: "Medicare Advantage",
    premium: 32,
    deductible: 0,
    perks: ["Vision", "Hearing aids", "Fitness"],
    icon: Eye,
    star: 4.2,
    note: "Includes the cardiologist you saved",
  },
];

function MyPlans() {
  const navigate = useNavigate();
  useTrackPage("plan-comparison", "/my-plans");
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthed()) {
      navigate({
        to: "/login",
        search: { redirect: "/my-plans" },
        replace: true,
      });
      return;
    }
    setUser(currentUser());
    setReady(true);
  }, [navigate]);

  if (!ready) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16 text-center text-muted-foreground">
        <Lock className="mx-auto h-8 w-8" />
        <p className="mt-3 text-sm">Checking your sign-in…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Signed in
          </div>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">
            Welcome back{user ? `, ${user.split("@")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here are the plans you've saved and the ones we think fit your needs best.
          </p>
        </div>
        <Heart className="h-10 w-10 text-rose-500" />
      </header>

      <section id="saved-plans" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SAVED_PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <article
              key={plan.id}
              className="flex flex-col rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  ★ {plan.star}
                </span>
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {plan.carrier} · {plan.type}
              </div>
              <h3 className="mt-0.5 text-base font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  ${plan.premium}
                </span>
                <span className="text-xs text-muted-foreground">/mo premium</span>
              </div>
              <div className="text-xs text-muted-foreground">
                ${plan.deductible} deductible
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {plan.perks.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-foreground">
                    <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                    {p}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-md bg-muted/50 px-3 py-2 text-xs italic text-muted-foreground">
                {plan.note}
              </p>
            </article>
          );
        })}
      </section>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        This is a mock signed-in view for demo purposes. Plans are illustrative only.
      </p>
    </main>
  );
}
