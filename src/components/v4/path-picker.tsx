import { Stethoscope, Pill, DollarSign, BookOpen, ArrowRight } from "lucide-react";
import type { HybridPath } from "@/lib/v4/session-store";

const PATHS: { key: HybridPath; title: string; blurb: string; icon: typeof Stethoscope }[] = [
  {
    key: "doctor-first",
    title: "I want to keep my doctors",
    blurb: "Tell us your providers first — we'll build around keeping them in-network.",
    icon: Stethoscope,
  },
  {
    key: "drug-first",
    title: "I need to afford my medications",
    blurb: "Start with your prescriptions — we'll focus on drug coverage and cost.",
    icon: Pill,
  },
  {
    key: "budget-first",
    title: "I want the lowest cost",
    blurb: "Start with ZIP and budget — we'll surface the cheapest options that still cover the basics.",
    icon: DollarSign,
  },
  {
    key: "new-to-medicare",
    title: "I'm new to Medicare",
    blurb: "Plain-language guidance through the basics, no jargon, no pressure.",
    icon: BookOpen,
  },
];

export function PathPicker({ onPick }: { onPick: (path: HybridPath) => void }) {
  return (
    <div>
      <h1 className="font-serif text-3xl text-white">Shop your way</h1>
      <p className="text-white/80 mt-2 max-w-xl">
        Tell us what's driving your search. We'll tailor the conversation around what matters most to you.
      </p>
      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        {PATHS.map(({ key, title, blurb, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onPick(key)}
            className="group text-left rounded-2xl border border-line bg-paper p-6 hover:border-[#00B0FF] hover:shadow-md transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-[#01579B] text-white flex items-center justify-center mb-4 group-hover:bg-[#00B0FF] transition">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-xl text-[#0D1B4C] mb-1.5">{title}</h3>
            <p className="text-sm text-[#0D1B4C]/70 leading-relaxed">{blurb}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#00B0FF] group-hover:gap-2.5 transition-all">
              Start this path <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

