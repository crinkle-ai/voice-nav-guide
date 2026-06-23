import { createFileRoute, Outlet, redirect, useMatches } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/workspace" || location.pathname === "/workspace/") {
      throw redirect({ to: "/" });
    }
  },
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  // Pass-through layout — workspace landing now lives in the global Workspace drawer.
  // Sub-routes like /workspace/activity/$activityId still render through this Outlet.
  useMatches();
  return <Outlet />;
}
