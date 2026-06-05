import type { ReactNode } from "react";

interface PagePlaceholderProps {
  title: string;
  description: string;
  comingNext: string;
  children?: ReactNode;
}

export function PagePlaceholder({ title, description, comingNext, children }: PagePlaceholderProps) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-xl text-muted-foreground">{description}</p>

      <div className="mt-10 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Coming in Phase 2
        </p>
        <p className="mt-2 text-lg text-foreground">{comingNext}</p>
      </div>

      {children}
    </main>
  );
}
