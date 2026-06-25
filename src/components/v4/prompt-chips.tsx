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
          className="text-sm px-3.5 py-1.5 rounded-full border border-line bg-paper text-ink hover:border-accent hover:text-accent transition"
        >
          {c}
        </button>
      ))}
    </div>
  );
}
