type Props = {
  chips: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
};

export function SuggestNextCard({ chips, onPick, disabled }: Props) {
  if (!chips?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => onPick(c)}
          className="text-xs px-3 py-1.5 rounded-full border border-[#E5F5F8]/30 bg-[#E5F5F8]/15 text-[#E5F5F8] hover:bg-[#E5F5F8]/25 hover:border-[#E5F5F8]/50 transition disabled:opacity-50"
        >
          {c}
        </button>
      ))}
    </div>
  );
}

