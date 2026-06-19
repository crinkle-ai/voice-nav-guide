import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/plans")({
  component: () => <Navigate to="/compare-plans" replace />,
});
