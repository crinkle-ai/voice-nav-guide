import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Stepper } from "@/components/v4/app-shell";
import { useSession } from "@/lib/v4/session-store";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { ArrowRight, GripVertical } from "lucide-react";

export const Route = createFileRoute("/v4/priorities")({
  head: () => ({ meta: [{ title: "What matters most — Medicare Compass v4" }] }),
  component: PrioritiesPage,
});

const PRIORITY_OPTIONS = [
  { key: "low cost", label: "Low monthly cost", desc: "Keep premiums and copays down." },
  { key: "keep my doctors", label: "Keep my doctors", desc: "Stay with the providers I trust." },
  { key: "drug coverage", label: "Drug coverage", desc: "Make sure my prescriptions are covered." },
  { key: "dental", label: "Dental benefits", desc: "Cleanings, fillings, and major work." },
  { key: "vision", label: "Vision benefits", desc: "Eye exams, glasses, contacts." },
  { key: "hearing", label: "Hearing benefits", desc: "Exams and hearing aids." },
  { key: "fitness", label: "Fitness benefit", desc: "Gym or SilverSneakers." },
  { key: "low out-of-pocket", label: "Low out-of-pocket max", desc: "Protection if I get really sick." },
];

function PrioritiesPage() {
  const { state, update, ready } = useSession();
  const navigate = useNavigate();
  const [ranked, setRanked] = useState<string[]>([]);

  useEffect(() => {
    if (ready && !state.finished) navigate({ to: "/v4" });
    if (ready && ranked.length === 0) {
      const fromIntake = state.intake.priorities.value
        .map((p) => PRIORITY_OPTIONS.find((o) => o.key.includes(p.toLowerCase()) || p.toLowerCase().includes(o.key))?.key)
        .filter(Boolean) as string[];
      setRanked(Array.from(new Set(fromIntake)).slice(0, 3));
    }
  }, [ready, state.finished, state.intake.priorities.value, ranked.length, navigate]);

  const toggle = (k: string) =>
    setRanked((cur) => {
      if (cur.includes(k)) return cur.filter((x) => x !== k);
      if (cur.length >= 3) return [...cur.slice(1), k];
      return [...cur, k];
    });
  const move = (idx: number, dir: -1 | 1) =>
    setRanked((cur) => {
      const next = [...cur];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return cur;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const cont = () => {
    update({
      finalPriorities: ranked,
      intake: { ...state.intake, priorities: { value: ranked, confidence: "captured" } },
    });
    navigate({ to: "/v4/matches" });
  };

  return (
    <AppShell step="priorities">
      <Stepper current="priorities" />
      <div className="max-w-2xl">
        <h1 className="font-serif text-3xl text-white">What matters most to you?</h1>
        <p className="text-white/80 mt-2">Pick up to three. #1 is most important.</p>

        {ranked.length > 0 && (
          <div className="mt-8 rounded-2xl border border-accent/40 bg-accent-soft/40 p-4">
            <p className="text-xs uppercase tracking-wider text-accent font-medium mb-3">Your ranking</p>
            <ol className="space-y-2">
              {ranked.map((k, i) => {
                const opt = PRIORITY_OPTIONS.find((o) => o.key === k)!;
                return (
                  <li key={k} className="flex items-center gap-3 bg-paper rounded-lg p-3 border border-line">
                    <span className="h-7 w-7 rounded-full bg-accent text-paper flex items-center justify-center text-sm font-medium">{i + 1}</span>
                    <span className="flex-1 font-medium">{opt.label}</span>
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="text-xs px-2 py-1 hover:bg-canvas rounded disabled:opacity-30">↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === ranked.length - 1} className="text-xs px-2 py-1 hover:bg-canvas rounded disabled:opacity-30">↓</button>
                    <button onClick={() => toggle(k)} className="text-xs text-muted-2 hover:text-ink px-2">remove</button>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div className="mt-8 grid sm:grid-cols-2 gap-3">
          {PRIORITY_OPTIONS.filter((o) => !ranked.includes(o.key)).map((opt) => (
            <button
              key={opt.key}
              onClick={() => toggle(opt.key)}
              disabled={ranked.length >= 3}
              className="text-left rounded-xl border border-line bg-paper p-4 hover:border-ink disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <div className="flex items-start gap-2">
                <GripVertical className="h-4 w-4 text-muted-2 mt-0.5" />
                <div>
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-2 mt-0.5">{opt.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-10 flex justify-end">
          <Button onClick={cont} disabled={ranked.length === 0} className="bg-accent hover:bg-accent-2 text-paper">
            See my matches <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
