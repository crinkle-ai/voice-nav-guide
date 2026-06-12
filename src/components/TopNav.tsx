import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useApp } from "@/context/AppContext";
import { Check, Lock, LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { isAuthed, signOut } from "@/lib/mock-auth";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setAuthed(isAuthed());
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    signOut();
    setAuthed(false);
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4">
        <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-base sm:text-lg shrink-0">
            M
          </div>
          <span className="text-base sm:text-xl font-semibold text-foreground truncate">
            Crinkle Health
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`shrink-0 rounded-md px-3 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors ${
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
            className={`shrink-0 flex items-center gap-1.5 rounded-md px-3 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors ${
              pathname === "/my-plans"
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            title={authed ? "My Plans" : "My Plans (sign-in required)"}
          >
            {!authed && <Lock className="h-3.5 w-3.5 opacity-70" />}
            My Plans
          </Link>


          <Link
            to="/deck"
            className="shrink-0 ml-1 inline-flex items-center rounded-md px-3 py-2 text-sm sm:text-base font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title="View executive deck"
          >
            View Deck
          </Link>

          {authed ? (
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 ml-1 inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              title="Sign out (resets demo)"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          ) : null}
        </nav>

        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-md border border-input text-foreground hover:bg-accent"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:w-80 p-0 flex flex-col">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`min-h-11 flex items-center rounded-md px-4 py-3 text-base font-medium transition-colors ${
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
                onClick={() => setMobileOpen(false)}
                className={`min-h-11 flex items-center gap-2 rounded-md px-4 py-3 text-base font-medium transition-colors ${
                  pathname === "/my-plans"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {!authed && <Lock className="h-4 w-4 opacity-70" />}
                My Plans
              </Link>

              <Link
                to="/deck"
                onClick={() => setMobileOpen(false)}
                className="min-h-11 flex items-center rounded-md px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                View Deck
              </Link>


              {authed ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="mt-2 min-h-11 inline-flex items-center justify-center gap-2 rounded-md border border-input px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              ) : null}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Journey progress */}
      <div id="journey-strip" className="border-t bg-muted/40 scroll-mt-24">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 sm:px-6 py-3 text-sm overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="font-semibold text-muted-foreground shrink-0">Your journey:</span>
          <ol className="flex items-center gap-2">
            {JOURNEY_STEPS.map((step, idx) => {
              const visited = state.journey.visitedPages.includes(step.path);
              const isCurrent = pathname === step.path;
              return (
                <li key={step.path} className="flex items-center gap-2 shrink-0">
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
