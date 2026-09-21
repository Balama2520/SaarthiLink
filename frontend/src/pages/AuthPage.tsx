import { useState, useEffect } from "react";
import { api } from "../services/api";
import { BrandMark } from "../components/BrandMark";

interface AuthPageProps {
  onSuccess: (username: string, token: string, refreshToken?: string | null, persistence?: "local" | "session", role?: "admin" | "user") => void;
  onGuestAccess?: () => void;
}

// The actual sequence a person moves through in this product — used as the
// signature "path rail" element, not a decorative numbered list. Order here
// carries real meaning: you assess where you stand before you prepare, and
// you prepare before you walk into a room.
const JOURNEY = [
  { stage: "Assess", detail: "Upload your resume, see it the way an ATS does." },
  { stage: "Prepare", detail: "Practice interviews with feedback on what to fix." },
  { stage: "Apply", detail: "Jobs matched to the skills you actually have." },
  { stage: "Arrive", detail: "A roadmap for the gap between here and the offer." },
];

export default function AuthPage({ onSuccess, onGuestAccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    setLoading(true); setError(null);
    try {
      let data = isLogin
        ? await api.login(username, password)
        : await api.register(username, password);
      // Some backends return an access_token straight from /auth/register;
      // others just create the account and expect a separate /auth/login.
      // Cover both without the caller needing to know which: if register
      // didn't hand back a token, log in immediately with the same
      // credentials rather than silently dropping the user into guest mode.
      if (!isLogin && !data.access_token) {
        data = await api.login(username, password);
      }
      // "Keep me signed in" controls persistence: checked -> localStorage
      // (survives browser restarts), unchecked -> sessionStorage (cleared
      // when the tab/browser closes). src/lib/auth.ts's getToken() checks
      // both, and is the single place every other page reads from, so this
      // choice is respected consistently across the whole app.
      onSuccess(username, data.access_token, data.refresh_token, keepSignedIn ? "local" : "session", data.role);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-y-auto bg-background px-4 py-8">
      {/* Faint radial vignette, no aurora blobs / no noise texture — a quiet
          background lets the journey rail on the right be the one visual
          moment on this screen. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(233,162,59,0.06), transparent 60%)",
        }}
      />

      <div
        className={`relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-500 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* ── LEFT: sign-in form ── */}
          <div className="flex flex-col gap-6 border-b border-border p-8 md:border-b-0 md:border-r">
            <div className="flex items-center gap-3">
              <BrandMark className="h-10 w-10" />
              <div>
                <h1 id="auth-heading" className="font-display text-xl font-semibold leading-none text-foreground">
                  Saarthi
                </h1>
                <p className="mt-1 text-xs font-medium tracking-wide text-muted-foreground">
                  Guiding Intelligence • Connected Action
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} role="form" aria-labelledby="auth-heading" className="flex flex-col gap-4">
              {error && (
                <div role="alert" aria-live="assertive" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="auth-username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email or username
                </label>
                <input
                  id="auth-username"
                  name="username"
                  aria-label="Email or username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="you@domain.com"
                  autoComplete="username"
                  aria-required="true"
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="auth-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <input
                  id="auth-password"
                  name="password"
                  aria-label="Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-required="true"
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
                />
              </div>

              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                aria-disabled={loading}
                aria-label={isLogin ? "Sign in to Saarthi" : "Create account"}
                className="w-full rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in…" : isLogin ? "Sign in" : "Create account"}
              </button>

              <button
                id="auth-toggle-btn"
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                aria-pressed={!isLogin}
                className="w-full rounded-lg border border-border bg-transparent px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground"
              >
                {isLogin ? "Create a new account" : "Back to sign in"}
              </button>

              <div className="flex items-center justify-between text-sm">
                <label htmlFor="auth-remember-me" className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                  <input
                    id="auth-remember-me"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  Keep me signed in
                </label>
                <button
                  id="auth-forgot-btn"
                  type="button"
                  onClick={() => setError("Password reset isn't available yet — please contact support to regain access.")}
                  className="font-medium text-primary hover:underline"
                >
                  Forgot?
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={() => onGuestAccess?.()}
              className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Continue as a guest instead
            </button>
          </div>

          {/* ── RIGHT: the journey rail — signature element ── */}
          <div className="hidden flex-col justify-center gap-1 bg-secondary/40 p-8 md:flex">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
              Where this takes you
            </p>
            <div className="relative pl-6">
              <div aria-hidden className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-primary via-primary/40 to-transparent" />
              {JOURNEY.map((step, i) => (
                <div key={step.stage} className={`relative ${i !== JOURNEY.length - 1 ? "pb-7" : ""}`}>
                  <span
                    aria-hidden
                    className="absolute -left-6 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-primary bg-background"
                  />
                  <h3 className="font-display text-base font-medium text-foreground">{step.stage}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
