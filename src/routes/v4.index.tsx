import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/v4/")({
  beforeLoad: () => {
    throw redirect({ to: "/v4/intake" });
  },
});
