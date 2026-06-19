import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, UserCog, RefreshCw, FileText } from "lucide-react";
import { type ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/workspace" as const, label: "Workspace", icon: LayoutGrid, match: "/workspace" },
    { to: "/plans" as const, label: "Plans", icon: FileText, match: "/plans" },
    { to: "/understanding" as const, label: "Shop My Way", icon: UserCog, match: "/understanding" },
  ];

  return (
    <div className="min-h-screen bg-background pb-28">
      {children}
      <nav className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:bottom-6">
        <div
          className="flex items-stretch gap-1 rounded-full border border-black/5 bg-white/75 px-2 py-1.5 shadow-[0_10px_40px_-12px_rgb(0_0_0/0.18)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/65"
        >
          {tabs.map((t) => {
            const active = pathname === t.match || pathname.startsWith(t.match + "/");
            const Icon = t.icon;
            return (
              <Link
                key={t.label}
                to={t.to}
                className={[
                  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium transition",
                  active ? "bg-ink text-background" : "text-ink-soft hover:text-ink",
                ].join(" ")}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="hidden sm:inline">{t.label}</span>
              </Link>
            );
          })}
          <div className="mx-1 my-1.5 w-px bg-border" />
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-ink"
            aria-label="Restart"
          >
            <RefreshCw className="h-[18px] w-[18px]" />
            <span className="hidden sm:inline">Restart</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
