// Mock auth — sessionStorage-backed only, for demo purposes.
export const AUTH_KEY = "mockAuth";
export const POST_LOGIN_VOICE_KEY = "voiceResumeAfterLogin";

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(AUTH_KEY) === "1";
  } catch {
    return false;
  }
}

export function signIn(username: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTH_KEY, "1");
  window.sessionStorage.setItem("mockAuthUser", username || "Member");
}

export function signOut() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AUTH_KEY);
  window.sessionStorage.removeItem("mockAuthUser");
}

export function currentUser(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("mockAuthUser");
}
