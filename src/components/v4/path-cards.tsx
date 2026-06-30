import { Sparkles, ListChecks } from "lucide-react";

const CARDS = [
  {
    key: "starting",
    title: "I'm just starting Medicare",
    desc: "Walk me through the basics — eligibility, parts, and what to do first.",
    icon: Sparkles,
    prompt: "I'm just starting Medicare and want to understand the basics.",
    bg: "#DADADA",
  },
  {
    key: "plans",
    title: "I want to see plans",
    desc: "Help me compare plans that fit my doctors, meds, and budget.",
    icon: ListChecks,
    prompt: "I want to see Medicare plans that fit my situation.",
    bg: "#DADADA",
  },
];

const V4_INK = "#131F69";

export function PathCards({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {CARDS.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onPick(c.prompt)}
            className="text-left rounded-2xl border border-white/30 p-5 hover:shadow-md transition-all group"
            style={{ backgroundColor: c.bg }}
          >
            <div className="flex items-start gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition"
                style={{ backgroundColor: "#ffffff" }}
              >
                <Icon className="h-5 w-5" style={{ color: V4_INK }} />
              </div>
              <div className="min-w-0">
                <div
                  className="text-lg"
                  style={{ fontFamily: '"Source Serif Pro", Georgia, serif', color: V4_INK }}
                >
                  {c.title}
                </div>
                <div className="text-sm mt-1" style={{ color: `${V4_INK}cc` }}>
                  {c.desc}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
