import { useState, useRef, useEffect } from "react";
import { UserCircle2, LogOut, ChevronDown, Check } from "lucide-react";
import { useAuth } from "@/lib/v4/auth-store";
import { UhcSsoDialog } from "./uhc-sso-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useSession } from "@/lib/v4/session-store";

const HEADER_TEXT = "#ffffff";

export function UserMenu() {
  const { user, ready, signOut } = useAuth();
  const { reset: resetSession } = useSession();
  const [ssoOpen, setSsoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  if (!ready) {
    return <span className="text-sm opacity-60" style={{ color: HEADER_TEXT }}>…</span>;
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setSsoOpen(true)}
          className="inline-flex items-center gap-1.5 transition hover:opacity-80"
          style={{ color: HEADER_TEXT }}
        >
          <UserCircle2 className="h-5 w-5" style={{ color: HEADER_TEXT }} />
          <span>Sign in</span>
        </button>
        <UhcSsoDialog open={ssoOpen} onOpenChange={setSsoOpen} />
      </>
    );
  }

  const firstName = user.name.split(" ")[0];

  const doSignOut = () => {
    signOut();
    // Local copy is cleared so the next visitor on this device starts fresh.
    resetSession();
    setConfirmOut(false);
    setMenuOpen(false);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 transition hover:opacity-80"
          style={{ color: HEADER_TEXT }}
        >
          <div className="h-6 w-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[11px] font-medium">
            {firstName[0]}
          </div>
          <span className="text-sm">{firstName}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-80" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-[#033592]/15 bg-white shadow-lg text-[#131F69] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#033592]/10">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs text-ink/60">{user.email}</div>
              <div className="text-[10px] uppercase tracking-wider text-ink/50 mt-1">
                Member ID · {user.memberId}
              </div>
            </div>
            <div className="px-4 py-2 flex items-center gap-1.5 text-xs text-emerald-700">
              <Check className="h-3.5 w-3.5" /> Workspace synced to your CHC account
            </div>
            <button
              type="button"
              onClick={() => setConfirmOut(true)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-[#E5F5F8] border-t border-[#033592]/10"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={confirmOut} onOpenChange={setConfirmOut}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Your workspace stays saved to your CHC account. This device will start fresh
              on your next visit until you sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay signed in</AlertDialogCancel>
            <AlertDialogAction onClick={doSignOut}>Sign out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
