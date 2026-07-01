import { useState, type ReactNode } from "react";
import { DoctorVerificationPanel } from "@/components/v4/doctor-verification-panel";
import { MedicationVerificationPanel } from "@/components/v4/medication-verification-panel";
import { useSession, type PermanentAgent } from "@/lib/v4/session-store";
import { useAutoVerifyIntake } from "@/components/v4/use-auto-verify-intake";
import { AutoVerifyProvider } from "@/components/v4/auto-verify-context";
import { formatMedication } from "@/lib/v3/intake-types";
import { AGENT_DIRECTORY, type DirectoryAgent } from "@/lib/v4/agent-directory";
import { CallDialog } from "@/components/v4/call-dialog";
import { Phone, Pin, MapPin, Check, BadgeCheck, Sparkles } from "lucide-react";

import {
  Bookmark,
  Minus,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Pill,
  User2,
  Wallet,
  Headset,
  PlusCircle,
  Heart,
  X as XIcon,
} from "lucide-react";

type Size = "min" | "half" | "full";
type CardKey = "personal" | "doctors" | "meds" | "budget" | "agent" | "favorites";

const PALETTE: Record<
  CardKey,
  { bg: string; ring: string; text: string; chip: string; icon: typeof User2; label: string }
> = {
  personal: {
    bg: "bg-[#033592]",
    ring: "ring-[#033592]/30",
    text: "text-white",
    chip: "bg-white/20 text-white",
    icon: User2,
    label: "About you",
  },
  doctors: {
    bg: "bg-[#0E8C7A]",
    ring: "ring-[#0E8C7A]/30",
    text: "text-white",
    chip: "bg-white/20 text-white",
    icon: Stethoscope,
    label: "Doctors & care",
  },
  meds: {
    bg: "bg-[#E89A3C]",
    ring: "ring-[#E89A3C]/30",
    text: "text-white",
    chip: "bg-white/25 text-white",
    icon: Pill,
    label: "Medications",
  },
  budget: {
    bg: "bg-[#7C3AED]",
    ring: "ring-[#7C3AED]/30",
    text: "text-white",
    chip: "bg-white/20 text-white",
    icon: Wallet,
    label: "Budget & coverage",
  },
  agent: {
    bg: "bg-[#E5F5F8]",
    ring: "ring-[#033592]/20",
    text: "text-[#033592]",
    chip: "bg-[#033592]/10 text-[#033592]",
    icon: Headset,
    label: "Your agent",
  },
  favorites: {
    bg: "bg-[#BE185D]",
    ring: "ring-[#BE185D]/30",
    text: "text-white",
    chip: "bg-white/20 text-white",
    icon: Heart,
    label: "Favorite plans",
  },
};

function WorkspaceCard({
  cardKey,
  status,
  primary,
  secondary,
  onClick,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dragging,
}: {
  cardKey: CardKey;
  status: string;
  primary: string;
  secondary?: string;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  dragging?: boolean;
}) {
  const p = PALETTE[cardKey];
  const Icon = p.icon;
  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative w-full cursor-grab overflow-hidden rounded-2xl ${p.bg} ${p.text} p-4 shadow-[0_8px_24px_-12px_rgb(3_53_146/0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgb(3_53_146/0.45)] active:cursor-grabbing ${dragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`inline-flex items-center gap-1.5 rounded-full ${p.chip} px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider`}>
          <Icon className="h-3 w-3" />
          {p.label}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] uppercase tracking-wider opacity-70">{status}</span>
          <div className="flex flex-col items-center gap-1" aria-label="Drag to reorder">
            <div className="h-0.5 w-5 rounded-full bg-current opacity-40" />
            <div className="h-0.5 w-5 rounded-full bg-current opacity-40" />
          </div>
        </div>
      </div>
      <div className="mt-3 font-serif text-xl leading-tight">{primary}</div>
      {secondary && <div className="mt-1 text-xs opacity-85">{secondary}</div>}
      <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium opacity-90 transition group-hover:opacity-100">
        Open <ChevronRight className="h-3 w-3" />
      </div>
    </div>
  );
}

function DetailWrap({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs font-medium text-[#033592] hover:underline"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to workspace
      </button>
      <h3 className="font-serif text-2xl text-ink">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-2">{label}</div>
      <div className="mt-1 text-sm text-ink">{value || <span className="text-muted-2">—</span>}</div>
    </div>
  );
}

const DEFAULT_ORDER: CardKey[] = ["personal", "doctors", "meds", "budget", "agent", "favorites"];

function WorksheetDrawerInner() {
  const { state, update, ready } = useSession();
  const [size, setSize] = useState<Size>("min");
  const [card, setCard] = useState<CardKey | null>(null);
  const [callAgent, setCallAgent] = useState<DirectoryAgent | null>(null);
  const [draggingKey, setDraggingKey] = useState<CardKey | null>(null);
  const [order, setOrder] = useState<CardKey[]>(() => {
    const saved = state.cardOrder as CardKey[] | undefined;
    return saved && saved.length === DEFAULT_ORDER.length && new Set(saved).size === DEFAULT_ORDER.length
      ? saved
      : [...DEFAULT_ORDER];
  });
  useAutoVerifyIntake();

  if (!ready) return null;


  const intake = state.intake;
  const doctorsCount = intake.doctors.value.length;
  const medsCount = intake.medications.value.length;
  const docVerified = intake.doctors.value.filter((d) => d.verification === "high").length;
  const medsVerified = intake.medications.value.filter((m) => m.rxVerification?.status === "verified").length;

  if (size === "min") {
    return (
      <button
        type="button"
        onClick={() => setSize("half")}
        aria-label="Open workspace"
        className="fixed right-0 top-1/2 z-40 -translate-y-1/2 flex items-center gap-1.5 rounded-l-2xl border border-r-0 border-[#033592]/20 bg-white px-2.5 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#033592] shadow-[0_8px_24px_-12px_rgb(3_53_146/0.35)] hover:bg-[#E5F5F8] transition"
      >
        <Bookmark className="h-4 w-4 fill-[#033592] text-[#033592]" />
        <span className="[writing-mode:vertical-rl] rotate-180">Your Workspace</span>
      </button>
    );
  }

  const widthClass =
    size === "full"
      ? "w-full"
      : "w-full sm:w-[440px] md:w-[520px]";

  const renderDetail = () => {
    if (!card) return null;
    if (card === "personal") {
      return (
        <DetailWrap title="About you" onBack={() => setCard(null)}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Reason for call" value={intake.reasonForCall.value} />
            <Field label="ZIP code" value={intake.zip.value} />
            <Field label="Current plan" value={intake.currentPlan.value} />
            <Field label="Medicaid" value={intake.medicaid.value} />
            <div className="col-span-2">
              <Field
                label="Top priorities"
                value={intake.priorities.value.length ? intake.priorities.value.join(", ") : ""}
              />
            </div>
            <div className="col-span-2">
              <Field
                label="Health conditions"
                value={intake.conditions.value.length ? intake.conditions.value.join(", ") : ""}
              />
            </div>
          </div>
        </DetailWrap>
      );
    }
    if (card === "doctors") {
      return (
        <DetailWrap title="Doctors & care" onBack={() => setCard(null)}>
          <p className="text-xs text-muted-2">
            Mention a doctor in the chat to add them — we verify each against the NPPES NPI Registry automatically.
          </p>
          <DoctorVerificationPanel />
        </DetailWrap>
      );
    }
    if (card === "meds") {
      return (
        <DetailWrap title="Medications" onBack={() => setCard(null)}>
          <p className="text-xs text-muted-2">
            Mention a prescription in the chat to add it — we verify each against RxNorm automatically.
          </p>
          <MedicationVerificationPanel />
        </DetailWrap>
      );
    }
    if (card === "budget") {
      return (
        <DetailWrap title="Budget & coverage" onBack={() => setCard(null)}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Budget sensitivity" value={intake.budgetSensitivity.value} />
            <Field
              label="Monthly premium cap"
              value={intake.budgetCaps.monthlyPremiumMax ? `$${intake.budgetCaps.monthlyPremiumMax}/mo` : ""}
            />
            <Field
              label="Annual deductible cap"
              value={intake.budgetCaps.annualDeductibleMax ? `$${intake.budgetCaps.annualDeductibleMax}` : ""}
            />
            <Field
              label="Extra benefits"
              value={intake.extras.value.length ? intake.extras.value.join(", ") : ""}
            />
          </div>
        </DetailWrap>
      );
    }
    if (card === "agent") {
      return (
        <DetailWrap title="Your agent" onBack={() => setCard(null)}>
          <AgentDirectoryView
            pinned={state.permanentAgent}
            onPin={(a) => update({ permanentAgent: a })}
            onCall={(a) => setCallAgent(a)}
          />
        </DetailWrap>
      );
    }

    if (card === "favorites") {
      const favs = state.favoritePlans ?? [];
      return (
        <DetailWrap title="Favorite plans" onBack={() => setCard(null)}>
          {favs.length === 0 ? (
            <p className="text-sm text-muted-2">
              Tap the <Heart className="inline h-3.5 w-3.5 text-rose-500" /> on any plan in the chat
              to save it here for easy comparison.
            </p>
          ) : (
            <ul className="space-y-2">
              {favs.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-line bg-paper p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-2">
                      {p.carrier} · {p.type}
                    </div>
                    <div className="font-serif text-base text-ink leading-tight">{p.name}</div>
                    <div className="text-xs text-muted-2 mt-1">
                      ${p.monthlyPremium}/mo · MOOP ${p.maxOOP.toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      update({
                        favoritePlans: (state.favoritePlans ?? []).filter((f) => f.id !== p.id),
                      })
                    }
                    aria-label={`Remove ${p.name} from favorites`}
                    className="rounded-md p-1 text-muted-2 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DetailWrap>
      );
    }
    return null;
  };

  return (
    <aside
      className={`fixed right-0 top-0 z-50 h-screen ${widthClass} flex flex-col border-l border-[#033592]/15 bg-white shadow-[-12px_0_40px_-20px_rgb(3_53_146/0.35)]`}
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-[#033592]/10 px-4 py-3 bg-gradient-to-r from-white to-[#E5F5F8]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-[#033592]/20">
            <Bookmark className="h-4 w-4 fill-[#033592] text-[#033592]" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#033592]/70">Saved decisions</div>
            <div className="font-serif text-lg leading-tight text-[#033592] truncate">Your Workspace</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSize(size === "full" ? "half" : "full")}
            aria-label={size === "full" ? "Collapse to half" : "Expand to full"}
            className="rounded-md p-1.5 text-[#033592] hover:bg-[#033592]/10"
          >
            {size === "full" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setCard(null);
              setSize("min");
            }}
            aria-label="Minimize workspace"
            className="rounded-md p-1.5 text-[#033592] hover:bg-[#033592]/10"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#F7FAFC]">
        {card ? (
          renderDetail()
        ) : (
          <div className={size === "full" ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}>
            <WorkspaceCard
              cardKey="personal"
              status={intake.zip.value ? "Captured" : "Add info"}
              primary="Your Information"
              secondary={
                [intake.zip.value && `ZIP ${intake.zip.value}`, intake.currentPlan.value]
                  .filter(Boolean)
                  .join(" · ") || "Name, ZIP, current plan"
              }
              onClick={() => setCard("personal")}
            />
            <WorkspaceCard
              cardKey="doctors"
              status={
                doctorsCount === 0
                  ? "Add doctors"
                  : `${docVerified}/${doctorsCount} verified`
              }
              primary={
                doctorsCount === 0
                  ? "Your doctors"
                  : intake.doctors.value
                      .slice(0, 2)
                      .map((d) => d.name)
                      .join(", ") + (doctorsCount > 2 ? ` +${doctorsCount - 2}` : "")
              }
              secondary={
                doctorsCount === 0
                  ? "We verify each one against the NPI Registry"
                  : "Tap to view NPPES matches"
              }
              onClick={() => setCard("doctors")}
            />
            <WorkspaceCard
              cardKey="meds"
              status={
                medsCount === 0
                  ? "Add medications"
                  : `${medsVerified}/${medsCount} verified`
              }
              primary={
                medsCount === 0
                  ? "Your medications"
                  : intake.medications.value
                      .slice(0, 2)
                      .map((m) => formatMedication(m) || m.name)
                      .join(", ") + (medsCount > 2 ? ` +${medsCount - 2}` : "")
              }
              secondary={
                medsCount === 0
                  ? "We verify each one against RxNorm"
                  : "Tap to view RxNorm matches"
              }
              onClick={() => setCard("meds")}
            />
            <WorkspaceCard
              cardKey="budget"
              status={intake.budgetSensitivity.value ? "Captured" : "Add budget"}
              primary={
                intake.budgetCaps.monthlyPremiumMax
                  ? `Up to $${intake.budgetCaps.monthlyPremiumMax}/mo`
                  : intake.budgetSensitivity.value
                  ? `${intake.budgetSensitivity.value[0].toUpperCase()}${intake.budgetSensitivity.value.slice(1)} sensitivity`
                  : "Your budget"
              }
              secondary={
                intake.extras.value.length
                  ? `Extras: ${intake.extras.value.join(", ")}`
                  : "Premium, deductible, extra benefits"
              }
              onClick={() => setCard("budget")}
            />
            <WorkspaceCard
              cardKey="agent"
              status={state.permanentAgent ? "Pinned" : "Optional"}
              primary={state.permanentAgent ? state.permanentAgent.name : "Pick your agent"}
              secondary={
                state.permanentAgent
                  ? `${state.permanentAgent.title} · ${state.permanentAgent.location}`
                  : "Start a call to make one your permanent agent"
              }
              onClick={() => setCard("agent")}
            />
            <WorkspaceCard
              cardKey="favorites"
              status={(state.favoritePlans ?? []).length ? `${(state.favoritePlans ?? []).length} saved` : "Heart to save"}
              primary={
                (state.favoritePlans ?? []).length === 0
                  ? "Your favorite plans"
                  : (state.favoritePlans ?? [])
                      .slice(0, 2)
                      .map((p) => p.name)
                      .join(", ") +
                    ((state.favoritePlans ?? []).length > 2
                      ? ` +${(state.favoritePlans ?? []).length - 2}`
                      : "")
              }
              secondary={
                (state.favoritePlans ?? []).length === 0
                  ? "Tap the heart on any plan to save it"
                  : "Tap to compare your saved plans"
              }
              onClick={() => setCard("favorites")}
            />


            <button
              type="button"
              onClick={() => setCard("personal")}
              className="group flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#033592]/30 bg-white/60 p-4 text-sm text-[#033592] hover:bg-[#E5F5F8] transition"
            >
              <PlusCircle className="h-4 w-4" />
              Add more details
            </button>
          </div>
        )}
      </div>
      <CallDialog
        open={!!callAgent}
        onOpenChange={(v) => { if (!v) setCallAgent(null); }}
        agent={callAgent ?? undefined}
      />
    </aside>
  );
}

const STATUS_STYLE: Record<DirectoryAgent["availability"], { dot: string; text: string; pill: string }> = {
  available: { dot: "bg-emerald-500", text: "text-emerald-700", pill: "bg-emerald-50 border-emerald-200" },
  soon:      { dot: "bg-amber-500",   text: "text-amber-700",   pill: "bg-amber-50 border-amber-200" },
  busy:      { dot: "bg-gray-400",    text: "text-gray-600",    pill: "bg-gray-50 border-gray-200" },
};

function AgentDirectoryView({
  pinned,
  onPin,
  onCall,
}: {
  pinned?: PermanentAgent;
  onPin: (a: PermanentAgent) => void;
  onCall: (a: DirectoryAgent) => void;
}) {
  const pinnedAgent = pinned
    ? AGENT_DIRECTORY.find((a) => a.name === pinned.name) ?? null
    : null;

  return (
    <div className="space-y-4">
      {pinnedAgent && (
        <div className="rounded-2xl border border-[#033592]/20 bg-[#E5F5F8] p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#033592]/70 mb-2 flex items-center gap-1">
            <BadgeCheck className="h-3.5 w-3.5" /> Your agent
          </div>
          <div className="flex items-center gap-3">
            <img src={pinnedAgent.avatar} alt={pinnedAgent.name} className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-sm" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-ink">{pinnedAgent.name}</div>
              <div className="text-xs text-muted-2">{pinnedAgent.title}</div>
            </div>
            <button
              type="button"
              onClick={() => onCall(pinnedAgent)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#033592] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#022b7a]"
            >
              <Phone className="h-3.5 w-3.5" /> Call my agent
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[#033592]/70 mb-2">
          <Sparkles className="h-3.5 w-3.5" /> {pinnedAgent ? "Browse other advisors" : "Choose your trusted advisor"}
        </div>
        <p className="text-xs text-muted-2 mb-3">
          Each advisor is a licensed Medicare expert. Pick someone you'd like to work with — you can make them your permanent agent any time.
        </p>
      </div>

      <ul className="space-y-3">
        {AGENT_DIRECTORY.map((a) => {
          const isPinned = pinned?.name === a.name;
          const s = STATUS_STYLE[a.availability];
          return (
            <li
              key={a.id}
              className="rounded-2xl border border-line bg-white p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start gap-3">
                <img
                  src={a.avatar}
                  alt={a.name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-ink truncate">{a.name}</div>
                      <div className="text-xs text-muted-2">{a.title}</div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.pill} ${s.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {a.availabilityLabel}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-2">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.location}</span>
                    <span className="uppercase tracking-wider">{a.npn}</span>
                  </div>
                </div>
              </div>

              {a.facts[0] && (
                <p className="mt-3 text-sm italic text-ink/70 leading-snug">"{a.facts[0]}"</p>
              )}

              <div className="mt-3 rounded-lg bg-[#E5F5F8]/60 border border-[#033592]/10 px-3 py-2 text-xs text-[#033592]">
                <span className="font-medium">Why you might like {a.name.split(" ")[0]}: </span>
                {a.specialty}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onCall(a)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#033592] px-3 py-2 text-sm font-medium text-white hover:bg-[#022b7a]"
                >
                  <Phone className="h-4 w-4" /> Call this agent
                </button>
                <button
                  type="button"
                  onClick={() => onPin(a)}
                  disabled={isPinned}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition ${
                    isPinned
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default"
                      : "border-[#033592]/30 text-[#033592] hover:bg-[#E5F5F8]"
                  }`}
                  title={isPinned ? "Your permanent agent" : "Make this my permanent agent"}
                >
                  {isPinned ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> My agent
                    </>
                  ) : (
                    <>
                      <Pin className="h-3.5 w-3.5" /> Make my agent
                    </>
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function WorksheetDrawer() {
  return (
    <AutoVerifyProvider>
      <WorksheetDrawerInner />
    </AutoVerifyProvider>
  );
}

