import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/v4")({
  component: V4Layout,
});

function V4Layout() {
  return (
    <div className="v3-scope">
      <Outlet />
    </div>
  );
}
