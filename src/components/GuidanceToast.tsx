import { useLiveAdvise } from "@/context/LiveAdviseContext";
import { MousePointer2 } from "lucide-react";

export function GuidanceToast() {
  const { guidanceToast, status } = useLiveAdvise();
  if (status !== "connected" || !guidanceToast) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[60] -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-600/95 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 backdrop-blur">
        <MousePointer2 className="h-4 w-4" />
        {guidanceToast}
      </div>
    </div>
  );
}
