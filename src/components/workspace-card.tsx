import { type ReactNode } from "react";

export function WorkspaceCard({
  title, badge, action, children, tone = "default",
}: {
  title: string;
  badge?: string;
  action?: ReactNode;
  children: ReactNode;
  tone?: "default" | "warm";
}) {
  return (
    <section className={[
      "rounded-2xl border p-4",
      tone === "warm" ? "border-warm/40 bg-warm-soft" : "border-border bg-card",
    ].join(" ")}>
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base text-ink">{title}</h3>
          {badge && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <header className="px-5 pb-4 pt-8">
      {eyebrow && <div className="mb-2 text-[11px] uppercase tracking-widest text-primary">{eyebrow}</div>}
      <h1 className="font-display text-3xl text-ink">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
    </header>
  );
}

export function PersonaAvatar({ name, hue, size = 56 }: { name: string; hue: number; size?: number }) {
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const bg = `linear-gradient(135deg, oklch(0.82 0.08 ${hue}), oklch(0.62 0.12 ${(hue + 40) % 360}))`;
  return (
    <div
      className="flex items-center justify-center rounded-full font-display text-white shadow-sm"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}