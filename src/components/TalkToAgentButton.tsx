import { useLiveAdvise } from "@/context/LiveAdviseContext";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "nav" | "primary" | "ghost";
  className?: string;
  label?: string;
}

export function TalkToAgentButton({ variant = "nav", className, label = "Talk to an agent" }: Props) {
  const { startCall, status } = useLiveAdvise();
  const live = status === "connecting" || status === "connected";

  if (variant === "nav") {
    return (
      <button
        type="button"
        onClick={() => startCall()}
        disabled={live}
        className={cn(
          "ml-1 inline-flex items-center gap-1.5 rounded-md border border-emerald-600/40 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/40 dark:hover:bg-emerald-900/40",
          className,
        )}
        title="Connect with a licensed Crinkle agent"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <Video className="h-4 w-4" />
        {live ? "On call…" : label}
      </button>
    );
  }

  return (
    <Button
      onClick={() => startCall()}
      disabled={live}
      size={variant === "primary" ? "lg" : "default"}
      variant={variant === "ghost" ? "outline" : "default"}
      className={cn(variant === "primary" && "h-14 px-7 text-lg", "gap-2", className)}
    >
      <Video className="h-5 w-5" />
      {live ? "On call with Sarah…" : label}
    </Button>
  );
}
