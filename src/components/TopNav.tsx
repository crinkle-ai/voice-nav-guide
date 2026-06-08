import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useApp } from "@/context/AppContext";
import { Check, Lock, LogOut, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { isAuthed, signOut } from "@/lib/mock-auth";

const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/learn", label: "Learn" },
  { to: "/find-doctors", label: "Find Doctors" },
  { to: "/compare-plans", label: "Compare Plans" },
] as const;

const JOURNEY_STEPS = [
  { label: "Learn", path: "/learn" },
  { label: "Find Doctors", path: "/find-doctors" },
  { label: "Compare Plans", path: "/compare-plans" },
];

export function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { state } = useApp();
  const [authed, setAuthed] = useState(false);

  // Re-check auth on every navigation so the lock/logout state stays in sync.
  useEffect(() => {
    setAuthed(isAuthed());
  }, [pathname]);

  const handleLogout = () => {
    signOut();
    setAuthed(false);
    navigate({ to: "/home" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Link to="/home" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            M
          </div>
          <span className="text-xl font-semibold text-foreground">
            Medicare Navigator
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-md px-4 py-2 text-base font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <Link
            to="/my-plans"
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-base font-medium transition-colors ${
              pathname === "/my-plans"
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            title={authed ? "My Plans" : "My Plans (sign-in required)"}
          >
            {!authed && <Lock className="h-3.5 w-3.5 opacity-70" />}
            My Plans
          </Link>

          {authed ? (
            <button
              type="button"
              onClick={handleLogout}
              className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              title="Sign out (resets demo)"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          ) : (
            <Link
              to="/"
              className="ml-1 rounded-md border border-primary/30 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              Intro
            </Link>
          )}
        </nav>
      </div>

      {/* Journey progress */}
      <div className="border-t bg-muted/40">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3 text-sm">
          <span className="font-semibold text-muted-foreground">Your journey:</span>
          <ol className="flex items-center gap-2">
            {JOURNEY_STEPS.map((step, idx) => {
              const visited = state.journey.visitedPages.includes(step.path);
              const isCurrent = pathname === step.path;
              return (
                <li key={step.path} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-2 rounded-full px-3 py-1 ${
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : visited
                          ? "bg-accent text-accent-foreground"
                          : "bg-background text-muted-foreground border"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                        isCurrent
                          ? "bg-primary-foreground text-primary"
                          : visited
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {visited && !isCurrent ? <Check className="h-3 w-3" /> : idx + 1}
                    </span>
                    <span className="font-medium">{step.label}</span>
                  </div>
                  {idx < JOURNEY_STEPS.length - 1 && (
                    <span className="text-muted-foreground">→</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </header>
  );
}
