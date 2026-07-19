import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../services/api";

interface AuthPageProps {
  onSuccess: (username: string) => void;
  onGuestAccess?: () => void;
}

// ─── Particle System ────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; color: string;
    }[] = [];

    const colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#a78bfa", "#38bdf8"];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 1.4 + 0.4,
        opacity: Math.random() * 0.4 + 0.08,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections — radius tuned so nearby particles actually form
      // a faint constellation instead of rendering as disconnected specks
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 170) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99,102,241,${0.1 * (1 - dist / 170)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, "0");
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, zIndex: 1,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Animated Counter ────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = to / 40;
    const timer = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 30);
    return () => clearInterval(timer);
  }, [to]);
  return <span>{val.toLocaleString()}{suffix}</span>;
}

const FEATURES = [
  { icon: "📄", label: "ATS Resume Checker",    desc: "Beat the screening bots" },
  { icon: "🎤", label: "Mock Interviews",   desc: "Real-time AI feedback" },
  { icon: "💼", label: "Internships & Jobs",     desc: "Matched to your skills" },
  { icon: "🗺️", label: "Learning Roadmaps", desc: "Day-by-day study plans" },
  { icon: "📈", label: "Skill Tracking",     desc: "Monitor your growth" },
  { icon: "🤖", label: "24/7 AI Mentor",     desc: "Answers any career doubt" },
];

const STATS = [
  { value: 50000, suffix: "+", label: "Students" },
  { value: 95,    suffix: "%", label: "Placement Rate" },
  { value: 12000, suffix: "+", label: "Mock Sessions" },
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AuthPage({ onSuccess, onGuestAccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 100);
    return () => window.clearTimeout(timer);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -6, y: dx * 6 });
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    setLoading(true); setError(null);
    try {
      const data = isLogin
        ? await api.login(username, password)
        : await api.register(username, password);
      try {
        // NOTE: every other page in this app determines "isGuest" purely by
        // checking `localStorage.getItem("access_token")`. Writing to
        // sessionStorage here when "Keep me signed in" is unchecked used to
        // silently break the rest of the app for that session — the user
        // would appear logged out (guest) everywhere except this page.
        // Until session-only auth is wired up app-wide, always persist to
        // localStorage so login actually sticks.
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("username", username);
        if (!keepSignedIn) {
          // Best-effort signal for a future session-scoped auth mode.
          sessionStorage.setItem("prefers_session_only", "true");
        }
      } catch (storageError) {
        console.warn("Unable to persist authentication token", storageError);
      }
      onSuccess(username);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const gradientPos = `${mousePos.x}px ${mousePos.y}px`;

  return (
    <div style={{
      fontFamily: "'Geist Variable', 'Inter', system-ui, sans-serif",
      minHeight: "100vh",
      background: "#030712",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem 1rem",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        /* ── Global resets ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Aurora background ── */
        .s-aurora {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 80% 50% at 20% 20%, rgba(139,92,246,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 10%, rgba(245,158,11,0.12) 0%, transparent 55%),
            radial-gradient(ellipse 70% 60% at 60% 80%, rgba(225,29,72,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 10% 70%, rgba(99,102,241,0.15) 0%, transparent 50%);
          animation: auroraShift 12s ease-in-out infinite alternate;
        }
        @keyframes auroraShift {
          0%  { filter: hue-rotate(0deg)   brightness(1); }
          50% { filter: hue-rotate(20deg)  brightness(1.08); }
          100%{ filter: hue-rotate(-15deg) brightness(0.95); }
        }

        /* ── Noise texture overlay ── */
        .s-noise {
          position: fixed; inset: 0; z-index: 2; pointer-events: none; opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
          background-size: 256px 256px;
        }

        /* ── Dot grid ── */
        .s-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: radial-gradient(circle, rgba(99,102,241,0.18) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
        }

        /* ── Card mount animation ── */
        .s-card-wrap {
          opacity: 0; transform: translateY(32px) scale(0.97);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        .s-card-wrap.mounted {
          opacity: 1; transform: translateY(0) scale(1);
        }

        /* ── Gradient border ── */
        .s-card-border {
          padding: 1.5px; border-radius: 24px;
          background: linear-gradient(135deg, rgba(139,92,246,0.6), rgba(245,158,11,0.4), rgba(225,29,72,0.5), rgba(99,102,241,0.6));
          background-size: 300% 300%;
          animation: borderSpin 4s linear infinite;
          box-shadow:
            0 0 40px rgba(99,102,241,0.15),
            0 0 80px rgba(139,92,246,0.08),
            0 32px 64px rgba(0,0,0,0.5);
        }
        @keyframes borderSpin {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* ── Shimmer button ── */
        .s-btn-primary {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          border: none; border-radius: 10px;
          color: #111827; font-weight: 800; font-size: 0.95rem;
          padding: 13px 28px; cursor: pointer; width: 100%;
          letter-spacing: 0.01em;
          box-shadow: 0 0 20px rgba(245,158,11,0.3), 0 4px 16px rgba(0,0,0,0.3);
          transition: transform 0.18s, box-shadow 0.18s;
        }
        .s-btn-primary::after {
          content: "";
          position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
          transform: skewX(-20deg);
          animation: shimmer 2.4s infinite;
        }
        @keyframes shimmer { 0%{left:-100%} 100%{left:200%} }
        .s-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 32px rgba(245,158,11,0.5), 0 8px 24px rgba(0,0,0,0.4);
        }
        .s-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Ghost button ── */
        .s-btn-ghost {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: rgba(255,255,255,0.7);
          font-weight: 600; font-size: 0.9rem;
          padding: 13px 28px; cursor: pointer; width: 100%;
          transition: background 0.18s, border-color 0.18s, color 0.18s;
        }
        .s-btn-ghost:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
          color: #fff;
        }

        /* ── Input fields ── */
        .s-input {
          width: 100%; padding: 13px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; outline: none;
          color: #fff; font-size: 0.9rem;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .s-input::placeholder { color: rgba(255,255,255,0.3); }
        .s-input:focus {
          border-color: #f59e0b;
          background: rgba(245,158,11,0.08);
          box-shadow: 0 0 0 3px rgba(245,158,11,0.15);
        }

        /* ── Feature tile ── */
        .s-tile {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          transition: border-color 0.2s, background 0.2s, transform 0.2s;
          cursor: default;
        }
        .s-tile:hover {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.08);
          transform: translateY(-2px);
        }

        /* ── Stat card ── */
        .s-stat {
          display: flex; flex-direction: column; align-items: center;
          padding: 16px 8px; border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          flex: 1;
        }

        /* ── Glow orbs ── */
        .s-orb {
          position: fixed; border-radius: 50%;
          pointer-events: none; z-index: 0;
          animation: orbFloat 8s ease-in-out infinite;
        }
        @keyframes orbFloat {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(30px,-25px) scale(1.06); }
          66%     { transform: translate(-20px,20px) scale(0.94); }
        }

        /* ── Gradient text ── */
        .s-gradient-text {
          background: linear-gradient(135deg, #fff 0%, #fbbf24 40%, #f59e0b 80%, #fff 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientFlow 4s ease infinite;
        }
        @keyframes gradientFlow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* ── Stagger entrance ── */
        .s-stagger { opacity: 0; transform: translateY(16px); }
        .s-stagger.in { animation: staggerIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes staggerIn {
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Forgot link ── */
        .s-link {
          background: none; border: none; cursor: pointer;
          color: #a78bfa; font-weight: 600; font-size: 0.85rem;
          transition: color 0.18s; font-family: inherit;
        }
        .s-link:hover { color: #c4b5fd; text-decoration: underline; }

        /* ── Right panel CTA ── */
        .s-cta-primary {
          flex: 1; padding: 12px 20px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #111827; font-weight: 800; font-size: 0.875rem;
          cursor: pointer; transition: opacity 0.18s, transform 0.18s;
          box-shadow: 0 4px 16px rgba(245,158,11,0.25);
          font-family: inherit;
        }
        .s-cta-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .s-cta-secondary {
          flex: 1; padding: 12px 20px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.75); font-weight: 600; font-size: 0.875rem;
          cursor: pointer; transition: background 0.18s, color 0.18s;
          font-family: inherit;
        }
        .s-cta-secondary:hover { background: rgba(255,255,255,0.1); color: #fff; }

        /* ── Responsive ── */
        @media (max-width: 860px) {
          .s-split { grid-template-columns: 1fr !important; }
          .s-right-panel { display: none !important; }
        }
      `}</style>

      {/* ── Backgrounds ── */}
      <div className="s-aurora" />
      <div className="s-grid" />
      <ParticleCanvas />
      <div className="s-noise" />

      {/* ── Card ── */}
      <div className={`s-card-wrap${mounted ? " mounted" : ""}`} style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 1120 }}>
        <div className="s-card-border">
          <div
            ref={cardRef}
            className="s-split"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              borderRadius: 23,
              overflow: "hidden",
              background: "rgba(10,11,20,0.92)",
              backdropFilter: "blur(32px) saturate(150%)",
              transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: "transform 0.12s ease-out",
              // Mouse spotlight
              backgroundImage: `radial-gradient(circle 400px at ${gradientPos}, rgba(245,158,11,0.05), transparent 60%)`,
            }}
          >
            {/* ── LEFT PANEL ── */}
            <div style={{ padding: "3rem", display: "flex", flexDirection: "column", gap: "1.75rem", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

              {/* Logo */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.4rem", fontWeight: 900, color: "#111827",
                  boxShadow: "0 0 24px rgba(245,158,11,0.4), 0 8px 20px rgba(0,0,0,0.3)",
                  letterSpacing: "-0.02em",
                }}>S</div>
                <div>
                  <p style={{ margin: 0, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#f59e0b" }}>Career AI Copilot</p>
                  <h1 id="auth-heading" className="s-gradient-text" style={{ margin: "3px 0 0", fontSize: "2rem", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em" }}>Saarthi</h1>
                </div>
              </div>

              {/* Tagline */}
              <div>
                <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.8, color: "rgba(255,255,255,0.55)" }}>
                  Your personal AI copilot to navigate placements, internships, and land your dream career faster than ever.
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)" }} />

              {/* Form */}
              <form onSubmit={handleSubmit} role="form" aria-labelledby="auth-heading" style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                {error && (
                  <div role="alert" aria-live="assertive" style={{
                    background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.35)",
                    borderRadius: 10, padding: "12px 16px",
                    fontSize: "0.85rem", color: "#fca5a5",
                  }}>{error}</div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label htmlFor="auth-username" style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
                    Email / Username
                  </label>
                  <input
                    id="auth-username"
                    name="username"
                    aria-label="Email or username"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="you@domain.com"
                    className="s-input"
                    autoComplete="username"
                    aria-required="true"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label htmlFor="auth-password" style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
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
                    className="s-input"
                    autoComplete="current-password"
                    aria-required="true"
                  />
                </div>

                <button id="auth-submit-btn" type="submit" disabled={loading} className="s-btn-primary" aria-disabled={loading} aria-label={isLogin ? "Sign in to Saarthi" : "Create account"}>
                  {loading ? "Authenticating…" : isLogin ? "Sign in to Saarthi" : "Create account"}
                </button>

                <button
                  id="auth-toggle-btn"
                  type="button"
                  className="s-btn-ghost"
                  onClick={() => { setIsLogin(!isLogin); setError(null); }}
                  aria-pressed={!isLogin}
                >
                  {isLogin ? "Create a new account" : "Back to sign in"}
                </button>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "rgba(255,255,255,0.45)" }}>
                    <input id="auth-remember-me" checked={keepSignedIn} onChange={(e) => setKeepSignedIn(e.target.checked)} type="checkbox" style={{ accentColor: "#6366f1", width: 15, height: 15 }} />
                    Keep me signed in
                  </label>
                  <button
                    id="auth-forgot-btn"
                    type="button"
                    className="s-link"
                    onClick={() => setError("Password reset isn't available yet — please contact support to regain access.")}
                  >
                    Forgot?
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />

              {/* Social proof */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>
                  Trusted by <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>thousands of students</span> across India
                </p>
              </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div
              className="s-right-panel"
              style={{
                padding: "3rem",
                background: "rgba(5,6,15,0.5)",
                display: "flex",
                flexDirection: "column",
                gap: "1.6rem",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#f59e0b" }}>
                    All-in-one · Powered by AI
                  </p>
                  <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#fff", lineHeight: 1.3, letterSpacing: "-0.02em" }}>
                    Accelerate your tech career with AI guidance
                  </h2>
                </div>
                <div style={{
                  flexShrink: 0, padding: "5px 14px", borderRadius: 999,
                  background: "rgba(245,158,11,0.15)",
                  border: "1px solid rgba(245,158,11,0.4)",
                  color: "#fbbf24", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase",
                }}>24/7</div>
              </div>

              <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.8, color: "rgba(255,255,255,0.45)" }}>
                Saarthi integrates job discovery, AI-powered resume analysis, real-time interview coaching, and custom learning roadmaps into one seamless experience designed for students and freshers.
              </p>

              {/* Stats */}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {STATS.map(s => (
                  <div key={s.label} className="s-stat">
                    <span style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
                      <Counter to={s.value} suffix={s.suffix} />
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", fontWeight: 600, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Feature grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                {FEATURES.map(f => (
                  <div key={f.label} className="s-tile">
                    <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{f.icon}</span>
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "rgba(255,255,255,0.85)", lineHeight: 1.2 }}>{f.label}</div>
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Snapshot card */}
              <div style={{
                borderRadius: 14,
                border: "1px solid rgba(99,102,241,0.25)",
                background: "rgba(99,102,241,0.07)",
                padding: "1.1rem 1.25rem",
                backdropFilter: "blur(8px)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Example Progress</p>
                    <p style={{ margin: "5px 0 0", fontSize: "0.95rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>Resume ATS: 85% · 2 Upcoming Interviews</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 800, color: "rgba(255,255,255,0.5)",
                      textTransform: "uppercase", letterSpacing: "0.12em",
                      padding: "3px 9px", borderRadius: 999,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}>Sample</span>
                  </div>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{ width: "85%", height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #fbbf24, #f59e0b)" }} />
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
                  85% prepared for your target role
                </p>
              </div>

              {/* CTAs */}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  id="auth-dashboard-btn"
                  className="s-cta-primary"
                  onClick={() => onGuestAccess?.()}
                >
                  Enter Dashboard →
                </button>
                <button
                  id="auth-demo-btn"
                  className="s-cta-secondary"
                  onClick={() => {
                    // Distinct from "Enter Dashboard": flag that the visitor
                    // wants to see filled-in sample content rather than the
                    // normal empty guest state (e.g. "Sign in to track your
                    // progress"). NOTE: this flag isn't read anywhere yet —
                    // guest-mode screens still need to check it and render
                    // sample data accordingly. Until then this button takes
                    // you to the same guest dashboard as "Enter Dashboard".
                    try {
                      localStorage.setItem("saarthi_demo_mode", "true");
                    } catch (storageError) {
                      console.warn("Unable to set demo mode flag", storageError);
                    }
                    onGuestAccess?.();
                  }}
                >
                  Use Demo Data
                </button>
              </div>

              {/* Preview of a signed-in profile card */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1rem" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.9rem", fontWeight: 800, color: "#111827",
                }}>?</div>
                <div>
                  <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>Your profile, once signed in</p>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(255,255,255,0.3)" }}>Track progress across every tool in one place</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}