import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, LogIn } from "lucide-react";
import { signIn, isAuthed, POST_LOGIN_VOICE_KEY } from "@/lib/mock-auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Medicare Navigator" },
      { name: "description", content: "Sign in to view your saved Medicare plans." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/my-plans",
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [username, setUsername] = useState("demo@medicare.gov");
  const [password, setPassword] = useState("demo");
  const [submitting, setSubmitting] = useState(false);

  // If already authed, bounce straight through.
  useEffect(() => {
    if (isAuthed()) {
      navigate({ to: redirect as "/my-plans", replace: true });
    }
  }, [navigate, redirect]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setSubmitting(true);
    signIn(username.trim());
    // Flag for the voice navigator: once we land on the protected page,
    // it should send a contextual "now that you're signed in…" message.
    try {
      window.sessionStorage.setItem(POST_LOGIN_VOICE_KEY, redirect);
    } catch { /* noop */ }
    navigate({ to: redirect as "/my-plans", replace: true });
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-180px)] max-w-md items-center px-6 py-12">
      <div className="w-full rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Mock login — any username and password works.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium">
              Email or username
            </label>
            <input
              id="username"
              type="text"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 w-full rounded-md border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-md border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" /> Sign in
          </button>

          <p className="text-center text-xs text-muted-foreground">
            You'll be returned to <span className="font-mono">{redirect}</span> after signing in.
          </p>
        </form>
      </div>
    </main>
  );
}
