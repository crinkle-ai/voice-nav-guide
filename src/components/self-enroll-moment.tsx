import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PartyPopper, ArrowRight, Phone, X } from "lucide-react";

type Props = {
  personaId: string;
  personaName: string;
  confidence: number;
  onDismiss: () => void;
};

export function SelfEnrollMoment({ personaId, personaName, confidence, onDismiss }: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-6 pt-12 sm:items-center sm:pb-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_-20px_rgb(0_0_0/0.35)]"
      >
        {/* Confetti-ish ambient blobs */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-success/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-8 top-24 h-32 w-32 rounded-full bg-warm/30 blur-3xl" aria-hidden />

        <button
          onClick={onDismiss}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative p-6 pt-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1 text-[11px] uppercase tracking-widest text-ink">
            <PartyPopper className="h-3.5 w-3.5" />
            Milestone
          </div>

          <h2 className="mt-4 font-display text-3xl leading-tight text-ink">
            You're ready to enroll yourself, {personaName.split(" ")[0]}.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Your decision confidence just crossed <span className="font-medium text-ink">{confidence}/10</span>.
            Most people at this point enroll online in under 10 minutes — no agent call needed.
          </p>

          <div className="mt-5 rounded-2xl bg-muted/60 p-3 text-xs text-ink-soft">
            <span className="font-medium text-ink">8 of 10 people</span> at your confidence level
            finish enrollment on their own from here.
          </div>

          <div className="mt-6 space-y-2">
            <Link
              to="/workspace/$personaId/activity/$activityId"
              params={{ personaId, activityId: "enroll" }}
              onClick={onDismiss}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-4 font-medium text-background transition hover:bg-ink/90"
            >
              Enroll myself online
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={onDismiss}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm text-muted-foreground transition hover:text-ink"
            >
              <Phone className="h-3.5 w-3.5" />
              I'd still like to talk to someone
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
