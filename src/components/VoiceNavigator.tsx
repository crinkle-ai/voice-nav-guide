import { Mic, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";

export function VoiceNavigator() {
  const { state, dispatch } = useApp();
  const { navigatorOpen, voiceState } = state;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => dispatch({ type: "TOGGLE_NAVIGATOR" })}
        aria-label="Open voice navigator"
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
      >
        <Mic className="h-7 w-7" />
      </button>

      {/* Slide-up panel */}
      {navigatorOpen && (
        <div className="fixed bottom-28 right-6 z-50 w-[min(380px,calc(100vw-3rem))] rounded-xl border bg-card text-card-foreground shadow-2xl">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">Voice Navigator</h2>
              <p className="text-sm text-muted-foreground capitalize">
                Status: {voiceState}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => dispatch({ type: "TOGGLE_NAVIGATOR", open: false })}
              aria-label="Close navigator"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="px-5 py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <p className="text-base text-muted-foreground">
              Voice assistant coming in Phase 2. This will let you ask questions
              and navigate hands-free.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
