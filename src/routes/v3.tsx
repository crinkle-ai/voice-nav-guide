import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/v3")({
  component: V3Layout,
});

function V3Layout() {
  return (
    <div className="v3-scope">
      <Outlet />
    </div>
  );
}
