import { useState } from "react";
import { PlayCircle, X } from "lucide-react";

type Video = {
  id: string; // YouTube video id
  title: string;
  duration: string;
  blurb: string;
};

const VIDEOS: Video[] = [
  {
    id: "YSfMfg20iQs",
    title: "What are Medicare Parts A and B?",
    duration: "2:15",
    blurb: "The basics of Original Medicare coverage.",
  },
  {
    id: "Ba0groz1eYM",
    title: "Medicare Advantage (Part C) simply explained",
    duration: "1:50",
    blurb: "How Advantage plans bundle your coverage.",
  },
  {
    id: "Cz7BrmU1Guk",
    title: "Supplement vs. Advantage: which is right for you?",
    duration: "2:30",
    blurb: "Side-by-side comparison to help you choose.",
  },
];

const FOLLOW_UPS = [
  "Let's look at plans",
  "I have more questions",
  "Help me choose a path",
];

type Props = {
  onPick: (text: string) => void;
  disabled?: boolean;
};

export function ShortVideosCard({ onPick, disabled }: Props) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="mt-3 space-y-3 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {VIDEOS.map((v) => {
          const isPlaying = playingId === v.id;
          return (
            <div
              key={v.id}
              className="rounded-xl overflow-hidden bg-[#F4F1FB] border border-[#7C3AED]/15 flex flex-col"
            >
              <div className="relative aspect-video bg-black/80">
                {isPlaying ? (
                  <>
                    <iframe
                      title={v.title}
                      src={`https://www.youtube.com/embed/${v.id}?autoplay=1&rel=0`}
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    <button
                      type="button"
                      onClick={() => setPlayingId(null)}
                      aria-label="Close video"
                      className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPlayingId(v.id)}
                    aria-label={`Play ${v.title}`}
                    className="absolute inset-0 group"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`}
                      alt=""
                      className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <PlayCircle className="h-12 w-12 text-white drop-shadow-md" strokeWidth={1.5} />
                    </span>
                    <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/75 text-white text-[11px] px-1.5 py-0.5">
                      {v.duration}
                    </span>
                  </button>
                )}
              </div>
              <div className="p-2.5">
                <div className="text-[13px] font-semibold leading-tight text-[#131F69]">{v.title}</div>
                <div className="text-[12px] mt-1 leading-snug text-[#131F69]/70">{v.blurb}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {FOLLOW_UPS.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={disabled}
            onClick={() => onPick(chip)}
            className="rounded-full border border-[#131F69]/20 bg-white px-3 py-1.5 text-[13px] text-[#131F69] hover:bg-[#131F69]/5 disabled:opacity-60"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
