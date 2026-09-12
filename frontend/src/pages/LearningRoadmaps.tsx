import { useState } from "react";
import {
  Route, Loader2, CheckCircle2, Circle, ChevronDown, ChevronUp,
  Sparkles, Target, Clock, Zap, RotateCcw, BookOpen, Code, Globe
} from "lucide-react";
import { api } from "../services/api";
import { isAuthenticated } from "../lib/auth";

interface Milestone {
  day_range: string;
  topic: string;
  tasks: string[];
}

interface Roadmap {
  target_role: string;
  duration_days: number;
  milestones: Milestone[];
}

const QUICK_ROLES = [
  "Frontend Developer", "Backend Engineer", "Data Scientist",
  "DevOps Engineer", "ML Engineer", "Full Stack Developer",
  "Android Developer", "Cloud Architect",
];

const ROLE_ICONS: Record<string, typeof Code> = {
  "Frontend Developer": Globe,
  "Backend Engineer": Code,
  "Data Scientist": BookOpen,
  "ML Engineer": Sparkles,
};

function MilestoneCard({
  milestone, index, total
}: {
  milestone: Milestone;
  index: number;
  total: number;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const progress = milestone.tasks.length > 0 ? Math.round((checked.size / milestone.tasks.length) * 100) : 0;
  const isLast = index === total - 1;

  const toggleCheck = (i: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

  return (
    <div className="relative flex gap-5">
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-xl border-2 font-black text-sm transition-all duration-300
          ${checked.size === milestone.tasks.length
            ? "border-green-500/60 bg-green-500/15 text-green-400"
            : "border-primary/50 bg-primary/10 text-primary"
          }`}>
          {index + 1}
        </div>
        {!isLast && (
          <div className="mt-2 flex-1 w-0.5 min-h-[24px] bg-gradient-to-b from-primary/30 to-transparent" />
        )}
      </div>

      {/* Card */}
      <div className={`mb-5 flex-1 rounded-2xl border transition-all duration-200
        ${expanded ? "border-border bg-card/60" : "border-border bg-card/30"}`}>
        {/* Card header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-3 p-4 text-left"
        >
          <span className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            {milestone.day_range}
          </span>
          <h3 className="flex-1 text-sm font-bold text-foreground">{milestone.topic}</h3>

          {/* Progress mini-bar */}
          {checked.size > 0 && (
            <div className="flex items-center gap-2 mr-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-green-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{progress}%</span>
            </div>
          )}

          {expanded
            ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          }
        </button>

        {/* Tasks list */}
        {expanded && (
          <div className="border-t border-border px-4 pb-4 pt-3 space-y-2 fade-in">
            {milestone.tasks.map((task, i) => (
              <button
                key={i}
                onClick={() => toggleCheck(i)}
                className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-all text-sm
                  ${checked.has(i)
                    ? "bg-green-500/8 text-green-300/80"
                    : "text-foreground hover:bg-border"
                  }`}
              >
                {checked.has(i)
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-400" />
                  : <Circle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                }
                <span className={checked.has(i) ? "line-through opacity-60" : ""}>{task}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LearningRoadmaps() {
  const isGuest = !isAuthenticated();
  const [targetRole, setTargetRole] = useState("");
  const [duration, setDuration] = useState<30 | 90>(30);
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (role?: string) => {
    const finalRole = role ?? targetRole;
    if (!finalRole.trim()) return;
    if (isGuest) { setError("Please sign in to generate roadmaps."); return; }
    setLoading(true);
    setError(null);
    setRoadmap(null);
    try {
      const data = await api.generateRoadmap(finalRole, duration);
      setRoadmap(data);
      if (role) setTargetRole(role);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to generate roadmap. Is the AI server online?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex-1 overflow-hidden bg-background text-foreground font-sans">
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/6 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-accent/6 blur-[100px]" />
      </div>

      <div className="relative h-full overflow-y-auto custom-scrollbar px-6 py-7 lg:px-8">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="fade-in-up mb-7 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 border border-primary/30">
                <Route className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Learning Roadmaps</span>
            </div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Build Your Learning Path</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              AI generates a structured, milestone-based roadmap for any role in seconds.
            </p>
          </div>
          {roadmap && (
            <button
              onClick={() => { setRoadmap(null); setError(null); }}
              className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" /> New Roadmap
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* ── Config Panel ───────────────────────────────── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Input card */}
            <div className="fade-in-up stagger-2 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm">
              <h3 className="mb-4 text-sm font-bold text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Configure
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Target Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ML Engineer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Duration
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([30, 90] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all
                          ${duration === d
                            ? "border-primary/50 bg-primary/15 text-primary"
                            : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <Clock className="h-3 w-3" />
                        {d} Days
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleGenerate()}
                  disabled={loading || !targetRole.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                    : <><Sparkles className="h-4 w-4" /> Generate Roadmap</>
                  }
                </button>

                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2.5 text-xs text-red-400">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Quick roles */}
            <div className="fade-in-up stagger-3 rounded-2xl border border-border bg-card/40 p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                Quick Roles
              </p>
              <div className="space-y-1.5">
                {QUICK_ROLES.map((role) => {
                  const Icon = ROLE_ICONS[role] ?? Zap;
                  return (
                    <button
                      key={role}
                      onClick={() => handleGenerate(role)}
                      disabled={loading}
                      className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-background/30 px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:bg-primary/5 disabled:opacity-40"
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Roadmap Display ─────────────────────────────── */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-primary/15 bg-card/40 py-20 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <Loader2 className="h-7 w-7 text-primary animate-spin" />
                </div>
                <p className="text-base font-bold text-foreground">Building your roadmap…</p>
                <p className="mt-1 text-sm text-muted-foreground">AI is crafting milestones for {targetRole}</p>
              </div>
            ) : roadmap ? (
              <div className="fade-in">
                {/* Roadmap header */}
                <div className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/5 p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Your Roadmap</span>
                  </div>
                  <h2 className="font-display text-xl font-semibold text-foreground">{roadmap.target_role}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {roadmap.duration_days}-day journey · {roadmap.milestones.length} milestones · Click tasks to mark progress
                  </p>
                </div>

                {/* Timeline */}
                <div>
                  {roadmap.milestones.map((m, i) => (
                    <MilestoneCard
                      key={i}
                      milestone={m}
                      index={i}
                      total={roadmap.milestones.length}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="fade-in flex min-h-[460px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/20 text-center p-8">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/8">
                  <Route className="h-8 w-8 text-primary/60" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">No Roadmap Yet</h3>
                <p className="max-w-xs text-sm text-muted-foreground leading-relaxed">
                  Enter your target role (e.g. "ML Engineer") and click{" "}
                  <span className="text-primary font-semibold">Generate Roadmap</span>, or pick a quick role on the left.
                </p>

                {/* Feature highlights */}
                <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm">
                  {[
                    { icon: Target, text: "Milestone-based" },
                    { icon: CheckCircle2, text: "Trackable tasks" },
                    { icon: Clock, text: "30 or 90 days" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="rounded-xl border border-border bg-card/40 p-3 text-center">
                      <Icon className="mx-auto mb-1.5 h-4 w-4 text-primary/70" />
                      <p className="text-[11px] text-muted-foreground">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}