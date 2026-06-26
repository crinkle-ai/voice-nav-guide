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
          className="text-xs px-3 py-1.5 rounded-full border border-ink/10 bg-surface-soft/40 text-ink hover:bg-surface-soft hover:border-ink/20 transition disabled:opacity-50"
        >
          {c}
        </button>
      ))}
    </div>
  );
}
