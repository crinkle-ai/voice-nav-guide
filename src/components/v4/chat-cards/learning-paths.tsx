import { Bot, MessageCircleQuestion, PlayCircle, BookOpen, ArrowRight } from "lucide-react";

type CardKey = "ai-guide" | "guided" | "videos" | "learning";

type CardDef = {
  key: CardKey;
  title: string;
  desc: string;
  icon: typeof Bot;
  bg: string;
  fg: string;
  iconBg: string;
  prompt: string;
};

const CARDS: CardDef[] = [
  {
    key: "ai-guide",
    title: "AI Guide",
    desc: "Chat with me to learn about Medicare in a simple, step-by-step way.",
    icon: Bot,
    bg: "#EAF1FB",
    fg: "#1D4ED8",
    iconBg: "#1D4ED8",
    prompt: "Let's keep chatting — walk me through Medicare step by step.",
  },
  {
    key: "guided",
    title: "Guided Questions",
    desc: "Answer a few questions and I'll personalize information for you.",
    icon: MessageCircleQuestion,
    bg: "#E0F4F4",
    fg: "#0F8F8F",
    iconBg: "#0F8F8F",
    prompt: "Ask me a few guided questions so you can personalize this for me.",
  },
  {
    key: "videos",
    title: "Short Videos",
    desc: "Watch brief videos that explain Medicare topics clearly.",
    icon: PlayCircle,
    bg: "#EEE5F8",
    fg: "#7C3AED",
    iconBg: "#7C3AED",
    prompt: "Show me short videos that explain Medicare.",
  },
  {
    key: "learning",
    title: "Medicare Learning Center",
    desc: "Explore articles, guides and resources at your own pace.",
    icon: BookOpen,
    bg: "#FBEFD9",
    fg: "#C2701C",
    iconBg: "#E08A2B",
    prompt: "Take me to the Medicare Learning Center.",
  },
];

type Props = {
  onPick: (text: string) => void;
  disabled?: boolean;
};

export function LearningPathsCard({ onPick, disabled }: Props) {
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
      {CARDS.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.key}
            type="button"
            disabled={disabled}
            onClick={() => onPick(c.prompt)}
            className="relative text-left rounded-xl p-3.5 pr-10 transition hover:shadow-md disabled:opacity-60"
            style={{ backgroundColor: c.bg }}
          >
            <div className="flex items-start gap-3">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: c.iconBg }}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold leading-tight" style={{ color: c.fg }}>
                  {c.title}
                </div>
                <div className="text-[12.5px] mt-1 leading-snug text-[#131F69]/75">{c.desc}</div>
              </div>
            </div>
            <span
              className="absolute bottom-2.5 right-2.5 h-6 w-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: c.iconBg }}
            >
              <ArrowRight className="h-3.5 w-3.5 text-white" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
