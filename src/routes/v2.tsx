import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/v2")({
  head: () => ({
    meta: [
      { title: "Alternate view — Crinkle Health" },
      { name: "description", content: "Alternate design view." },
    ],
  }),
  component: V2Page,
});

function V2Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <Link
        to="/"
        className="text-sm font-medium text-primary underline underline-offset-4 hover:opacity-80"
      >
        ← Back to main view
      </Link>
    </div>
  );
}
