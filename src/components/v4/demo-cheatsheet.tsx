import { useEffect, useState, createContext, useContext } from "react";
import { ChevronRight, X, Pin, PinOff, FlaskConical, Check, AlertTriangle, XCircle, RotateCcw } from "lucide-react";
import { useSession } from "@/lib/v4/session-store";
import {
  SCRIPT_LINES,
  READ_ALOUD,
  EXPECTED_RANKING,
  SIGNAL_MATRIX,
  VARIATIONS,
} from "@/lib/v4/demo-cheatsheet-data";

// Flip to false to hide the cheat sheet entirely for real demos.
const SHOW_DEMO_CHEATSHEET = true;

const OPEN_KEY = "v4-demo-cheatsheet-open";
const PIN_KEY = "v4-demo-cheatsheet-pinned";

const CHEATSHEET_WIDTH = 260; // px

interface DemoCheatsheetContextType {
  open: boolean;
  pinned: boolean;
  width: number;
}

const DemoCheatsheetContext = createContext<DemoCheatsheetContextType>({
  open: false,
  pinned: false,
  width: CHEATSHEET_WIDTH,
});

export function DemoCheatsheetProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setPinned(localStorage.getItem(PIN_KEY) === "1");
      const o = localStorage.getItem(OPEN_KEY);
      setOpen(o === "1" || localStorage.getItem(PIN_KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {}
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(PIN_KEY, pinned ? "1" : "0");
    } catch {}
  }, [pinned, mounted]);

  return (
    <DemoCheatsheetContext.Provider value={{ open, pinned, width: CHEATSHEET_WIDTH }}>
      {children}
      {mounted && SHOW_DEMO_CHEATSHEET && (
        <DemoCheatsheet open={open} pinned={pinned} setOpen={setOpen} setPinned={setPinned} />
      )}
    </DemoCheatsheetContext.Provider>
  );
}

export function useDemoCheatsheet() {
  return useContext(DemoCheatsheetContext);
}

interface DemoCheatsheetProps {
  open: boolean;
  pinned: boolean;
  setOpen: (open: boolean) => void;
  setPinned: (pinned: boolean) => void;
}

function DemoCheatsheet({ open, pinned, setOpen, setPinned }: DemoCheatsheetProps) {
  const { update, reset } = useSession();

  async function loadDemo() {
    const { diabeticMinneapolisIntake } = await import("@/lib/v4/demo-profile");
    update({ intake: diabeticMinneapolisIntake(), finished: true });
  }

  return (
    <>
      {!open && (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open demo cheat sheet"
            className="fixed left-0 top-1/3 z-[60] flex items-center gap-1 rounded-r-md border border-l-0 border-amber-300 bg-amber-100/95 backdrop-blur px-1.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-900 shadow-md hover:bg-amber-200 transition"
          >
            <FlaskConical className="h-3 w-3" />
            <span className="[writing-mode:vertical-rl]">Demo</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Reset the conversation?")) reset();
            }}
            aria-label="Reset conversation"
            title="Reset conversation"
            className="fixed left-0 z-[60] flex items-center justify-center rounded-r-md border border-l-0 border-amber-300 bg-amber-100/95 backdrop-blur px-2 py-2 text-amber-900 shadow-md hover:bg-amber-200 transition"
            style={{ top: "calc(33.33% + 72px)" }}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </>
      )}

      {open && (
        <aside
          className="fixed left-0 top-0 z-[60] h-screen w-[260px] border-r border-amber-300 bg-amber-50/98 backdrop-blur shadow-2xl flex flex-col text-[12px] text-amber-950"
          role="complementary"
          aria-label="Demo cheat sheet"
        >
          <header className="sticky top-0 flex items-center justify-between gap-2 border-b border-amber-300 bg-amber-100 px-3 py-2">
            <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[11px]">
              <FlaskConical className="h-3.5 w-3.5" /> Demo cheat sheet
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPinned(!pinned)}
                title={pinned ? "Unpin" : "Pin open"}
                className="rounded p-1 hover:bg-amber-200"
              >
                {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                title="Close"
                className="rounded p-1 hover:bg-amber-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {/* Quick load */}
            <section className="space-y-1.5">
              <button
                onClick={loadDemo}
                className="w-full rounded-md bg-amber-900 px-2.5 py-1.5 text-[11px] font-medium text-amber-50 hover:bg-amber-800 inline-flex items-center justify-center gap-1.5"
              >
                Load 55410 profile → matches <ChevronRight className="h-3 w-3" />
              </button>
              <button
                onClick={() => {
                  if (confirm("Reset the conversation?")) reset();
                }}
                className="w-full rounded-md border border-amber-400 px-2.5 py-1.5 text-[11px] font-medium hover:bg-amber-100"
              >
                Reset conversation
              </button>
            </section>

            <Section title="Profile to give the AI">
              <dl className="space-y-1">
                {SCRIPT_LINES.map((l) => (
                  <div key={l.label} className="flex gap-2 leading-snug">
                    <dt className="w-[88px] shrink-0 text-amber-700 uppercase text-[10px] tracking-wider pt-0.5">
                      {l.label}
                    </dt>
                    <dd className="flex-1 font-medium">{l.value}</dd>
                  </div>
                ))}
              </dl>
              <CopyButton text={READ_ALOUD} label="Copy read-aloud script" />
            </Section>

            <Section title="Expected ranking">
              <ol className="space-y-1.5">
                {EXPECTED_RANKING.map((r) => (
                  <li key={r.rank} className="leading-snug">
                    <span className="font-semibold">
                      {r.rank}. {r.plan}
                    </span>
                    <div className="text-amber-800 text-[11px]">{r.why}</div>
                  </li>
                ))}
              </ol>
            </Section>

            <Section title="Signal matrix">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-amber-700 uppercase tracking-wider text-[9px]">
                    <th className="text-left font-medium pb-1">Plan</th>
                    <th className="font-medium pb-1">Net</th>
                    <th className="font-medium pb-1">Rx</th>
                    <th className="font-medium pb-1">$</th>
                    <th className="font-medium pb-1">Elig</th>
                  </tr>
                </thead>
                <tbody>
                  {SIGNAL_MATRIX.map((row) => (
                    <tr key={row.plan} className="border-t border-amber-200">
                      <td className="py-1 pr-1">{row.plan}</td>
                      <td className="py-1 text-center"><Sig v={row.network} /></td>
                      <td className="py-1 text-center"><Sig v={row.formulary} /></td>
                      <td className="py-1 text-center"><Sig v={row.budget} /></td>
                      <td className="py-1 text-center"><Sig v={row.eligible} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title="Variations to try">
              <ul className="space-y-1.5">
                {VARIATIONS.map((v) => (
                  <li key={v.say} className="leading-snug">
                    <div className="font-medium">{v.say}</div>
                    <div className="text-amber-800 text-[11px]">→ {v.expect}</div>
                  </li>
                ))}
              </ul>
            </Section>

            <p className="text-[10px] text-amber-700 italic pt-2 border-t border-amber-200">
              Internal demo aid. Toggle SHOW_DEMO_CHEATSHEET in
              demo-cheatsheet.tsx to hide.
            </p>
          </div>
        </aside>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 border-b border-amber-200 pb-0.5">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Sig({ v }: { v: "ok" | "warn" | "bad" }) {
  if (v === "ok") return <Check className="h-3.5 w-3.5 text-emerald-700 inline" />;
  if (v === "warn") return <AlertTriangle className="h-3.5 w-3.5 text-amber-700 inline" />;
  return <XCircle className="h-3.5 w-3.5 text-rose-700 inline" />;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className="mt-1.5 w-full rounded border border-amber-300 px-2 py-1 text-[10px] uppercase tracking-wider text-amber-800 hover:bg-amber-100"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
