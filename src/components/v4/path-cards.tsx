import { Sparkles, ListChecks } from "lucide-react";

type Props = {
  onPick: (prompt: string) => void;
};

const CARDS = [
  {
    key: "starting",
    title: "I'm just starting Medicare",
    desc: "Walk me through the basics — eligibility, parts, and what to do first.",
    icon: Sparkles,
    prompt: "I'm just starting Medicare and want to understand the basics.",
  },
  {
    key: "plans",
    title: "I want to see plans",
    desc: "Help me compare plans that fit my doctors, meds, and budget.",
    icon: ListChecks,
    prompt: "I want to see Medicare plans that fit my situation.",
  },
];

export function PathCards({ onPick }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {CARDS.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onPick(c.prompt)}
            className="text-left rounded-2xl border border-line bg-paper p-5 hover:border-accent hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-paper transition">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div
                  className="text-lg text-ink"
                  style={{ fontFamily: '"Source Serif Pro", Georgia, serif' }}
                >
                  {c.title}
                </div>
                <div className="text-sm text-muted-2 mt-1">{c.desc}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
