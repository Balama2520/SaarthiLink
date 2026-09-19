import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Flame, CheckSquare,
  ArrowUpRight, Target, ChevronRight,
  Zap, Clock, Gauge, FileText, MessageSquare, TrendingUp, Sparkles,
  Compass, FlaskConical, UserPlus, Upload
} from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { useProfileCompleteness } from "../hooks/useProfile";
import { PublicAdSlot } from "../components/PublicAdSlot";
import { NativeAdSlot } from "../components/NativeAdSlot";
import { GearRecommendCard } from "../components/GearRecommendCard";

interface DashboardProps {
  username: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

interface MissionStatus {
  date: string;
  dsa: number;
  git: number;
  linkedin: number;
  jobs: number;
  course: number;
  interview: number;
  streak: number;
}

interface CareerSummary {
  headline: string;
  focus_areas: string[];
  next_actions: string[];
  mission_progress: number;
  goal_count: number;
  stats: {
    applications: number;
    interviews: number;
    ats_score: number;
    goals_in_progress: number;
  };
  activity: Array<{ id: string; type: "application" | "interview"; title: string; created_at: string }>;
}

interface DashboardGoal {
  id: string;
  title: string;
  status: string;
  category?: string;
  progress?: number;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-border/60 ${className}`} />;
}

function MissionRow({
  label, subLabel, done, onTick, buttonLabel
}: {
  label: string;
  subLabel: string;
  done: boolean;
  onTick: () => void;
  buttonLabel: string;
}) {
  return (
    <div className={`flex items-center justify-between rounded-2xl border p-3.5 transition-all duration-300
      ${done
        ? "border-emerald-500/30 bg-emerald-500/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.03)]"
        : "border-border/80 bg-background/50 hover:bg-card hover:border-primary/30"
      }`}
    >
      <div className="flex gap-3.5 items-center min-w-0">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all ${
          done ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-card border-border/80 text-muted-foreground"
        }`}>
          {done ? <CheckSquare className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />}
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-bold leading-tight truncate transition-colors ${done ? "text-emerald-300" : "text-foreground"}`}>
            {label}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subLabel}</p>
        </div>
      </div>
      <button
        onClick={onTick}
        disabled={done}
        className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ml-2
          ${done
            ? "cursor-default text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 opacity-90"
            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-95"
          }`}
      >
        {done ? "Done" : buttonLabel}
      </button>
    </div>
  );
}

export default function Dashboard({ username, setActiveTab }: DashboardProps) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const persona = useAppStore((s) => s.persona);
  const [timeString, setTimeString] = useState("");
  const [tickingTask, setTickingTask] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: completeness } = useProfileCompleteness();
  const completenessPct = completeness?.overall_percentage ?? 0;
  const topSuggestion = completeness?.suggestions?.[0];

  const { data: mission, isLoading: loadingMission } = useQuery<MissionStatus | null>({
    queryKey: ['missionStatus'],
    queryFn: () => api.getMissionStatus().catch(() => null)
  });

  const { data: goalsList = [] } = useQuery<DashboardGoal[]>({
    queryKey: ['goals'],
    queryFn: () => api.getGoals().catch(() => [])
  });

  const { data: careerSummary, isLoading: loadingSummary } = useQuery<CareerSummary | null>({
    queryKey: ['careerDashboard'],
    queryFn: () => api.getCareerDashboard().catch(() => null)
  });

  useEffect(() => {
    const updateTime = () => {
      setTimeString(new Date().toLocaleString("en-US", {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const tickMutation = useMutation({
    mutationFn: (type: string) => api.tickMissionTask(type),
    onMutate: (type) => {
      setTickingTask(type);
    },
    onSuccess: (res) => {
      queryClient.setQueryData(['missionStatus'], res.mission);
    },
    onSettled: () => {
      setTickingTask(null);
    }
  });

  const handleTick = (type: string) => {
    if (tickingTask) return;
    tickMutation.mutate(type);
  };

  const completedCount = mission
    ? [
        mission.dsa >= 2, !!mission.git, !!mission.linkedin,
        mission.jobs >= 3, !!mission.course, !!mission.interview,
      ].filter(Boolean).length
    : 0;

  const missionProgress = mission ? Math.round((completedCount / 6) * 100) : 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="relative flex-1 overflow-hidden bg-background text-foreground">
      <div className="relative h-full overflow-y-auto px-4 py-8 sm:px-6 lg:px-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* ── World-Class Professional Welcome Header Card ── */}
          <motion.header 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-3xl border border-primary/25 bg-gradient-to-br from-card/90 via-card/60 to-primary/5 p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

            <div className="flex items-center gap-5 relative z-10">
              <div className="relative group cursor-pointer shrink-0">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/20 via-cyan-500/10 to-amber-500/10 text-2xl font-black text-primary shadow-inner">
                  {username ? username[0].toUpperCase() : "S"}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-background bg-emerald-500 shadow-sm">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-[11px] font-bold text-primary">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    <span>{greeting()}</span>
                  </span>

                  {persona ? (
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      ● {persona.replace(/_/g, " ")} Path
                    </span>
                  ) : !isAuthenticated && (
                    <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                      ● Guest Mode Active
                    </span>
                  )}
                </div>

                <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight font-display">
                  {username || "Guest User"}
                </h1>

                <p className="text-xs text-muted-foreground flex items-center gap-2 font-mono">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{timeString}</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-emerald-400 font-semibold">Saarthi AI v1.0</span>
                </p>
              </div>
            </div>
            
            {/* Quick Feature Shortcut Pills */}
            <div className="flex flex-wrap gap-2.5 relative z-10">
              {[
                { label: "Resume ATS", tab: "resume", icon: FileText, desc: "Analyze CV" },
                { label: "Match Jobs", tab: "jobs", icon: Briefcase, desc: "Browse Openings" },
                { label: "Roadmaps", tab: "roadmaps", icon: Target, desc: "Skill Paths" },
                { label: "Mock Interview", tab: "interview", icon: Zap, desc: "Q&A Trainer" },
              ].map(({ label, tab, icon: Icon, desc }) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="group flex items-center gap-2.5 rounded-2xl border border-border/80 bg-background/60 hover:bg-card px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all shadow-sm active:scale-95"
                >
                  <Icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <div className="font-bold text-foreground leading-none">{label}</div>
                    <div className="text-[10px] font-normal text-muted-foreground mt-0.5">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.header>

          {/* ── High-Impact 4-Stats Bar (Professional Cards) ── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              {
                label: "Applications Logged",
                value: careerSummary?.stats?.applications ?? 0,
                unit: "Total Apps",
                action: "View Jobs ➔",
                tab: "jobs",
                icon: Briefcase,
                bg: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
              },
              {
                label: "Interviews Conducted",
                value: careerSummary?.stats?.interviews ?? 0,
                unit: "Rounds Done",
                action: "Practice ➔",
                tab: "interview",
                icon: MessageSquare,
                bg: "bg-amber-500/10 border-amber-500/20 text-amber-400"
              },
              {
                label: "ATS Resume Score",
                value: `${careerSummary?.stats?.ats_score ?? 0}%`,
                unit: "Match Rating",
                action: "Upload CV ➔",
                tab: "resume",
                icon: TrendingUp,
                bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              },
              {
                label: "Active Goals",
                value: careerSummary?.stats?.goals_in_progress ?? 0,
                unit: "In Progress",
                action: "Set Goals ➔",
                tab: "goals",
                icon: Target,
                bg: "bg-primary/10 border-primary/20 text-primary"
              },
            ].map((stat) => (
              <button
                key={stat.label}
                type="button"
                onClick={() => setActiveTab(stat.tab)}
                className="group flex flex-col justify-between rounded-3xl border border-border/80 bg-card/70 p-5 text-left transition-all hover:border-primary/50 hover:bg-card shadow-sm hover:shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${stat.bg} shadow-inner`}>
                    <stat.icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-[11px] font-bold text-primary group-hover:underline flex items-center gap-1 font-mono">
                    <span>{stat.action}</span>
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-foreground tracking-tight font-display">
                      {loadingSummary ? "—" : stat.value}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">{stat.unit}</span>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mt-1 block">
                    {stat.label}
                  </span>
                </div>
              </button>
            ))}
          </motion.section>

          {/* ── Balanced 2-Column Main Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* ── Left Column (Daily Mission, Quick Launchpad & Activity) ── */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Daily Mission Card */}
              <motion.section 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                className="rounded-3xl border border-border/80 bg-card/70 p-6 md:p-7 shadow-xl backdrop-blur-md relative overflow-hidden space-y-6"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2 font-display">
                      <Flame className="h-5 w-5 text-amber-500 fill-amber-500/20 animate-pulse" />
                      <span>Daily Career Mission</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Complete actions to build your streak & placement readiness.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-full">
                    <span className="text-base">🔥</span>
                    <span className="text-base font-extrabold text-foreground">{mission ? mission.streak : 0}</span>
                    <span className="text-[10px] uppercase font-bold text-amber-400">Day Streak</span>
                  </div>
                </div>

                {loadingMission ? (
                  <div className="space-y-3">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : !isAuthenticated ? (
                  <div className="space-y-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-inner">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-foreground">Unlock Personalized Streaks & Applications Tracking</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Sign in to save your daily streak, track ATS resume scores, auto-log job applications, and sync AI roadmaps.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-amber-500/20">
                      <button
                        type="button"
                        onClick={() => setActiveTab("profile")}
                        className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-1.5"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Create Free Account / Sign In</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("resume")}
                        className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5 text-primary" />
                        <span>Upload Resume First</span>
                      </button>
                    </div>
                  </div>
                ) : mission ? (
                  <div className="space-y-5">
                    {/* Progress bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-muted-foreground uppercase tracking-wider">Mission Progress</span>
                        <span className="text-emerald-400">{missionProgress}%</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden p-0.5 border border-border/50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-1000 ease-out shadow-sm"
                          style={{ width: `${missionProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <MissionRow
                        label={`Solve 2 DSA Questions (${Math.min(mission.dsa, 2)}/2)`}
                        subLabel="LeetCode, Codeforces, or HackerRank"
                        done={mission.dsa >= 2}
                        onTick={() => handleTick("dsa")}
                        buttonLabel="+1 Solved"
                      />
                      <MissionRow
                        label="GitHub Commit"
                        subLabel="Push code to any repository"
                        done={!!mission.git}
                        onTick={() => handleTick("git")}
                        buttonLabel="Mark Pushed"
                      />
                      <MissionRow
                        label="LinkedIn Activity"
                        subLabel="Post, comment, or connect"
                        done={!!mission.linkedin}
                        onTick={() => handleTick("linkedin")}
                        buttonLabel="Mark Active"
                      />
                      <MissionRow
                        label={`Apply to 3 Jobs (${Math.min(mission.jobs, 3)}/3)`}
                        subLabel="Send applications or reach out"
                        done={mission.jobs >= 3}
                        onTick={() => handleTick("jobs")}
                        buttonLabel="+1 App"
                      />
                      <MissionRow
                        label="Course Progress"
                        subLabel="Complete a lesson or module"
                        done={!!mission.course}
                        onTick={() => handleTick("course")}
                        buttonLabel="Mark Done"
                      />
                      <MissionRow
                        label="Interview Practice"
                        subLabel="Run a mock round in Interview Coach"
                        done={!!mission.interview}
                        onTick={() => handleTick("interview")}
                        buttonLabel="Mark Practiced"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-xs">Failed to load mission data.</div>
                )}
              </motion.section>

              {/* Quick Launchpad & Career Shortcuts */}
              <motion.section
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
                className="rounded-3xl border border-border/80 bg-card/70 p-6 shadow-xl backdrop-blur-md space-y-4"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h2 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary" /> Career Quick Launchpad
                  </h2>
                  <span className="text-[10px] font-mono text-muted-foreground">Fast Shortcuts</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Resume Optimizer", desc: "PDF parse & ATS score", tab: "resume", icon: FileText, color: "text-emerald-400" },
                    { label: "Smart Job Finder", desc: "Discover active listings", tab: "jobs", icon: Briefcase, color: "text-cyan-400" },
                    { label: "Mock Interview Coach", desc: "Speech-to-text Q&A", tab: "interview", icon: MessageSquare, color: "text-amber-400" },
                    { label: "Growth Lab Forge", desc: "Skill gap pipeline", tab: "growthlab", icon: FlaskConical, color: "text-primary" },
                  ].map((item) => (
                    <button
                      key={item.tab}
                      type="button"
                      onClick={() => setActiveTab(item.tab)}
                      className="group flex flex-col items-start p-3.5 rounded-2xl border border-border/70 bg-background/50 hover:bg-card hover:border-primary/40 transition-all text-left shadow-sm"
                    >
                      <item.icon className={`h-4 w-4 ${item.color} mb-2 group-hover:scale-110 transition-transform`} />
                      <span className="text-xs font-bold text-foreground">{item.label}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 truncate w-full">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </motion.section>

              {/* Recent Activity Log */}
              <motion.section
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
                className="rounded-3xl border border-border/80 bg-card/70 p-6 shadow-xl backdrop-blur-md space-y-3"
              >
                <h2 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" /> Recent Activity Stream
                </h2>
                {careerSummary?.activity?.length ? (
                  <ul className="space-y-2">
                    {careerSummary.activity.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{item.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Your job applications and mock interview practice logs will appear here.</p>
                )}
              </motion.section>

            </div>

            {/* ── Right Column (Intelligence & Health) ── */}
            <div className="lg:col-span-6 space-y-6">

              {/* Profile Health */}
              {completeness && (
                <motion.section
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
                  className="rounded-3xl border border-border/80 bg-card/70 p-6 shadow-xl backdrop-blur-md space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2 font-display">
                      <Gauge className="w-4 h-4 text-primary" /> Profile Readiness Score
                    </h2>
                    <span className="text-xl font-extrabold text-foreground">{completenessPct}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden border border-border/40">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary via-emerald-400 to-amber-400 transition-all duration-1000 ease-out"
                      style={{ width: `${completenessPct}%` }}
                    />
                  </div>
                  {topSuggestion ? (
                    <button
                      onClick={() => setActiveTab("profile")}
                      className="w-full flex items-start gap-2.5 rounded-2xl border border-border/80 bg-muted/40 p-3.5 text-left text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/70 transition-all group"
                    >
                      <ChevronRight className="w-4 h-4 mt-0.5 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      <span className="leading-relaxed">{topSuggestion}</span>
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed">Your career profile is fully optimized and ready for job matching.</p>
                  )}
                </motion.section>
              )}

              {/* Career Intelligence Summary Brief */}
              <motion.section 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
                className="rounded-3xl border border-primary/30 bg-primary/5 p-6 relative overflow-hidden shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2 font-display">
                    <Zap className="w-4 h-4 text-primary" /> Intelligence Brief
                  </h2>
                  <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                </div>
                
                {loadingSummary ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : careerSummary ? (
                  <div className="space-y-4 relative z-10">
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground leading-snug mb-2">
                        {careerSummary.headline || "Active Career Roadmap"}
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {(careerSummary.focus_areas || []).slice(0,3).map((area, idx) => (
                          <span key={idx} className="px-2.5 py-1 rounded-md bg-primary/15 border border-primary/25 text-[10px] font-extrabold text-primary uppercase tracking-wider">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {careerSummary.next_actions?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recommended Actions</p>
                        <ul className="space-y-2">
                          {careerSummary.next_actions.slice(0,2).map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                              <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                              <span className="leading-snug">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => setActiveTab('copilot')}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-card hover:bg-muted border border-border text-xs font-bold text-foreground transition-all shadow-sm"
                    >
                      <span>View Copilot Analysis</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Initialize your career trajectory to generate AI recommendations, skill gap analysis, and market readiness scores.
                    </p>
                    <button
                      onClick={() => setActiveTab('copilot')}
                      className="w-full py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/30 text-xs font-bold text-primary transition-all flex items-center justify-center gap-2"
                    >
                      <Zap className="w-3.5 h-3.5" /> Run AI Career Diagnostic
                    </button>
                  </div>
                )}
              </motion.section>

              {/* Active Goals Mini-Widget */}
              <motion.section 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}
                className="rounded-3xl border border-border/80 bg-card/70 p-6 shadow-xl backdrop-blur-md space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2 font-display">
                    <Target className="w-4 h-4 text-primary" /> Priority Goals
                  </h2>
                  <button onClick={() => setActiveTab('goals')} className="text-xs font-bold text-primary hover:underline">
                    View All
                  </button>
                </div>
                
                <div className="space-y-2.5">
                  {goalsList.filter(g => g.status !== 'completed').slice(0, 3).map(goal => (
                    <div key={goal.id} className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex justify-between items-center group cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setActiveTab('goals')}>
                      <div className="truncate pr-4">
                        <p className="text-xs font-bold text-foreground truncate">{goal.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold uppercase tracking-wider">{goal.category}</p>
                      </div>
                      <div className="text-xs font-extrabold text-primary">
                        {goal.progress || 0}%
                      </div>
                    </div>
                  ))}
                  {goalsList.length === 0 && (
                    <div className="space-y-3 py-2 text-center">
                      <p className="text-xs text-muted-foreground">No active goals yet. Choose a starter goal to begin:</p>
                      <div className="grid grid-cols-1 gap-2 text-left">
                        <button
                          onClick={() => setActiveTab('goals')}
                          className="rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/70 hover:border-primary/30 transition-all flex items-center justify-between"
                        >
                          <span>🎯 Target 3 SDE Applications / Week</span>
                          <ChevronRight className="w-3.5 h-3.5 text-primary" />
                        </button>
                        <button
                          onClick={() => setActiveTab('goals')}
                          className="rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/70 hover:border-primary/30 transition-all flex items-center justify-between"
                        >
                          <span>📄 Boost Resume ATS Score to 85%+</span>
                          <ChevronRight className="w-3.5 h-3.5 text-primary" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Contextual gear recommendation */}
              <GearRecommendCard
                variant="general"
                dismissKey="dashboard-gear"
                tip="Students on Saarthi use these tools to stay productive and focused. Purchases support Saarthi at no extra cost to you."
              />

              {/* Optional Sponsored Content */}
              <PublicAdSlot />

            </div>
          </div>

          {/* Optional Native Sponsored Content */}
          <NativeAdSlot />
        </div>
      </div>
    </div>
  );
}
