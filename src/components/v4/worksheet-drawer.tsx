import { useState, type ReactNode } from "react";
import { DoctorVerificationPanel } from "@/components/v4/doctor-verification-panel";
import { MedicationVerificationPanel } from "@/components/v4/medication-verification-panel";
import { useSession } from "@/lib/v4/session-store";
import { useAutoVerifyIntake } from "@/components/v4/use-auto-verify-intake";
import { AutoVerifyProvider } from "@/components/v4/auto-verify-context";
import { formatMedication } from "@/lib/v3/intake-types";
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
}: {
  cardKey: CardKey;
  status: string;
  primary: string;
  secondary?: string;
  onClick: () => void;
}) {
  const p = PALETTE[cardKey];
  const Icon = p.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl ${p.bg} ${p.text} p-4 text-left shadow-[0_8px_24px_-12px_rgb(3_53_146/0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgb(3_53_146/0.45)]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`inline-flex items-center gap-1.5 rounded-full ${p.chip} px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider`}>
          <Icon className="h-3 w-3" />
          {p.label}
        </div>
        <span className="text-[10px] uppercase tracking-wider opacity-70">{status}</span>
      </div>
      <div className="mt-3 font-serif text-xl leading-tight">{primary}</div>
      {secondary && <div className="mt-1 text-xs opacity-85">{secondary}</div>}
      <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium opacity-90 transition group-hover:opacity-100">
        Open <ChevronRight className="h-3 w-3" />
      </div>
    </button>
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

function WorksheetDrawerInner() {
  const { state, ready } = useSession();
  const [size, setSize] = useState<Size>("min");
  const [card, setCard] = useState<CardKey | null>(null);
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
      const a = state.permanentAgent;
      return (
        <DetailWrap title="Your agent" onBack={() => setCard(null)}>
          {a ? (
            <div className="rounded-2xl border border-line bg-paper p-4">
              <div className="flex items-center gap-3">
                <img
                  src={a.avatar}
                  alt={a.name}
                  className="h-14 w-14 rounded-full object-cover border border-line"
                />
                <div className="min-w-0">
                  <div className="font-medium text-ink">{a.name}</div>
                  <div className="text-xs text-muted-2">
                    {a.title} · {a.location}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-2 mt-0.5">NPN {a.npn}</div>
                </div>
              </div>
              {a.facts[0] && <p className="mt-3 text-sm italic text-ink/70">“{a.facts[0]}”</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-2">
              No agent yet. Start a call from the composer and tap “Make this my permanent agent” to pin them here.
            </p>
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
    </aside>
  );
}

export function WorksheetDrawer() {
  return (
    <AutoVerifyProvider>
      <WorksheetDrawerInner />
    </AutoVerifyProvider>
  );
}
