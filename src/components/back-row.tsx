import { Link } from "@tanstack/react-router";
import { ArrowLeft, Home } from "lucide-react";

type Props = {
  backTo: "/" | "/ramble/$personaId" | "/understanding/$personaId" | "/workspace/$personaId";
  backLabel: string;
  personaId?: string;
  showHome?: boolean;
};

export function BackRow({ backTo, backLabel, personaId, showHome = true }: Props) {
  return (
    <div className="flex items-center justify-between">
      {backTo === "/" ? (
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
        </Link>
      ) : (
        <Link
          to={backTo}
          params={{ personaId: personaId ?? "" }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
        </Link>
      )}
      {showHome && backTo !== "/" && (
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"
        >
          <Home className="h-3.5 w-3.5" /> Change scenario
        </Link>
      )}
    </div>
  );
}