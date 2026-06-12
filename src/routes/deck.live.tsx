import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/deck/live")({
  beforeLoad: () => {
    throw redirect({ to: "/deck/ai" });
  },
});
