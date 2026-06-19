import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Mic, Sparkles } from "lucide-react";
import { getPersona } from "@/mock/personas";
import { usePersonaStore } from "@/state/usePersonaStore";
import { PersonaAvatar } from "@/components/workspace-card";
import { BackRow } from "@/components/back-row";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/ramble/$personaId")({
  head: () => ({ meta: [{ title: "Tell us what's on your mind · Medicare Decision Companion" }] }),
  component: () => (
    <AppShell>
      <Ramble />
    </AppShell>
  ),
});

function Ramble() {
  const { personaId } = Route.useParams();
  const persona = getPersona(personaId);
  const navigate = useNavigate();
  const hydrate = usePersonaStore((s) => s.hydrate);
  const [text, setText] = useState(persona.ramble);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { hydrate(persona.id); }, [persona.id, hydrate]);

  useEffect(() => {
    setText(persona.ramble);
  }, [persona.ramble]);

  const onGenerate = () => {
    setGenerating(true);
    setTimeout(() => navigate({ to: "/understanding/$personaId", params: { personaId: persona.id } }), 900);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-5 pb-16 pt-6">
        <BackRow backTo="/" backLabel="Change scenario" showHome={false} />

        <div className="mt-6 flex items-center gap-3">
          <PersonaAvatar name={persona.name} hue={persona.hue} size={44} />
          <div>
            <div className="font-display text-base text-ink">{persona.name}</div>
            <div className="text-xs text-muted-foreground">Age {persona.age}</div>
          </div>
        </div>

        <h1 className="mt-8 font-display text-3xl leading-tight text-ink">
          Just tell us what's on your mind.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          No forms. Talk or type the way you'd explain it to a friend — worries, what you know, what you're hoping for.
        </p>

        <div className="mt-6 rounded-3xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Listening
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            className="mt-3 w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            placeholder="Tell us what's on your mind…"
          />

          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <Mic className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <div className="flex items-end gap-0.5">
                {Array.from({ length: 24 }).map((_, i) => (
                  <motion.span key={i}
                    className="w-1 rounded-full bg-primary/50"
                    animate={{ height: [6, 14 + (i % 5) * 3, 8] }}
                    transition={{ duration: 0.6 + (i % 4) * 0.1, repeat: Infinity, delay: i * 0.04 }}
                  />
                ))}
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">or type</div>
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={generating || text.trim().length === 0}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-4 font-medium text-background transition hover:bg-ink/90 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {generating ? "Listening…" : "Here's what I'm hearing…"}
        </button>
      </div>
    </div>
  );
}