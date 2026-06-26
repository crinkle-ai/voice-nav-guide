import { createFileRoute, Outlet } from "@tanstack/react-router";
import { WorksheetDrawer } from "@/components/v4/worksheet-drawer";
import { DemoCheatsheet } from "@/components/v4/demo-cheatsheet";

export const Route = createFileRoute("/v4")({
  component: V4Layout,
});

function V4Layout() {
  return (
    <div className="v3-scope">
      <Outlet />
      <WorksheetDrawer />
      <DemoCheatsheet />
    </div>
  );
}
