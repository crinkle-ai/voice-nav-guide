import { motion } from "framer-motion";
import { Check } from "lucide-react";

type Props = {
  /** 0-100 percent complete */
  pct: number;
  size?: number;
  /** Short label shown below the ring center (e.g. "Ready"). */
  label?: string;
};

export function ReadinessRing({ pct, size = 120, label }: Props) {
  const stroke = size * 0.09;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct / 100));
  const dash = c * clamped;
  const complete = clamped >= 1;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={complete ? "var(--color-success, var(--color-primary))" : "var(--color-primary)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - dash }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {complete ? (
          <Check className="h-6 w-6 text-ink" strokeWidth={2.5} />
        ) : (
          <span className="font-display text-2xl font-semibold tabular-nums text-ink">{Math.round(pct)}<span className="text-base text-muted-foreground">%</span></span>
        )}
        {label && <span className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}

// Backwards-compatible alias while other code is being updated.
export const ConfidenceRing = ReadinessRing;