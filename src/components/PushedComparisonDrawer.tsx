import { useLiveAdvise } from "@/context/LiveAdviseContext";
import { X, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const ROWS: { key: string; label: string; render: (p: any) => React.ReactNode }[] = [
  { key: "premium", label: "Monthly Premium", render: (p) => <span className="tabular-nums">${p.premium}/mo</span> },
  { key: "deductible", label: "Annual Deductible", render: (p) => <span className="tabular-nums">${p.deductible}</span> },
  { key: "moop", label: "Out-of-Pocket Max", render: (p) => <span className="tabular-nums">${p.moop.toLocaleString()}</span> },
  { key: "drug", label: "Prescription Drugs", render: (p) => p.drug ? <Check className="h-4 w-4 text-emerald-600" /> : <Minus className="h-4 w-4 text-muted-foreground" /> },
  { key: "dental", label: "Dental", render: (p) => p.dental ? <Check className="h-4 w-4 text-emerald-600" /> : <Minus className="h-4 w-4 text-muted-foreground" /> },
  { key: "vision", label: "Vision", render: (p) => p.vision ? <Check className="h-4 w-4 text-emerald-600" /> : <Minus className="h-4 w-4 text-muted-foreground" /> },
];

export function PushedComparisonDrawer() {
  const { pushedComparison, comparisonHighlightRow, closeComparison, status } = useLiveAdvise();

  if (!pushedComparison || status !== "connected") return null;

  return (
    <div className="fixed inset-x-4 bottom-44 z-[45] mx-auto max-w-3xl rounded-2xl border-2 border-emerald-500/50 bg-card shadow-2xl shadow-emerald-500/20 animate-in slide-in-from-bottom-8 duration-500">
      <div className="flex items-center justify-between border-b bg-emerald-50/60 dark:bg-emerald-950/30 px-4 py-2.5 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Sarah pushed this comparison to your screen
          </span>
        </div>
        <button
          onClick={closeComparison}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label="Close comparison"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground"></th>
              {pushedComparison.map((p) => (
                <th key={p.id} className="px-4 py-3 text-left">
                  <div className="font-bold text-foreground">{p.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">{p.carrier} · {p.type}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const active = comparisonHighlightRow === row.key;
              return (
                <tr
                  key={row.key}
                  className={cn(
                    "border-b last:border-0 transition-colors",
                    active && "bg-emerald-100/60 dark:bg-emerald-900/30",
                  )}
                >
                  <td className="px-4 py-2.5 font-medium text-muted-foreground">{row.label}</td>
                  {pushedComparison.map((p) => (
                    <td key={p.id} className="px-4 py-2.5 font-semibold text-foreground">
                      {row.render(p)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
