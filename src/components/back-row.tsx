import { Link } from "@tanstack/react-router";
import { ArrowLeft, Home } from "lucide-react";

type Props = {
  backTo: "/" | "/understanding" | "/workspace";
  backLabel: string;
  showHome?: boolean;
};

export function BackRow({ backTo, backLabel, showHome = true }: Props) {
  return (
    <div className="flex items-center justify-between">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
      </Link>
      {showHome && backTo !== "/" && (
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"
        >
          <Home className="h-3.5 w-3.5" /> Start over
        </Link>
      )}
    </div>
  );
}
