type Props = {
  onPick: (prompt: string) => void;
};

const CHIPS = [
  "I'm most concerned about money",
  "I don't know where to start",
  "When am I eligible?",
  "I have specific doctors I want to keep",
];

export function PromptChips({ onPick }: Props) {
  return (
    <div className="flex flex-wrap gap-2 justify-center mb-3">
      {CHIPS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className="text-sm px-3.5 py-1.5 rounded-full border border-[#E2E2E2] bg-[#F1F1F1] text-[#131F69] hover:bg-[#E8E8E8] hover:border-[#131F69]/40 transition"
        >
          {c}
        </button>
      ))}
    </div>
  );
}

