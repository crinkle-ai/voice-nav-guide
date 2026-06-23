import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/understanding")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
