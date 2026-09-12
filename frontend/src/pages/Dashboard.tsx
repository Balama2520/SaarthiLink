import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Flame, CheckSquare,
  ArrowUpRight, Target, ChevronRight,
  Zap, Clock, Gauge
} from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { useProfileCompleteness } from "../hooks/useProfile";

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
}

interface DashboardGoal {
  id: string;
  title: string;
  status: string;
  category?: string;
  progress?: number;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-border ${className}`} />;
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
    <div className={`flex items-center justify-between rounded-xl border p-3 transition-all duration-300
      ${done ? "border-emerald-500/20 bg-emerald-500/5 shadow-[inset_0_0_20px_rgba(16,185,129,0.02)]" : "border-border bg-border hover:bg-border hover:border-primary/25"}`}>
      <div className="flex gap-3 items-center">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all ${
          done ? "bg-emerald-500/20 border-emerald-500/30" : "bg-border border-border"
        }`}>
          {done ? <CheckSquare className="h-4 w-4 text-emerald-400" /> : <div className="h-2 w-2 rounded-full bg-border" />}
        </div>
        <div>
          <p className={`text-sm font-semibold leading-tight transition-colors ${done ? "text-emerald-300" : "text-foreground"}`}>
            {label}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{subLabel}</p>
        </div>
      </div>
      <button
        onClick={onTick}
        disabled={done}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all
          ${done
            ? "cursor-default text-emerald-400 opacity-80"
            : "bg-border hover:bg-muted text-foreground border border-border hover:border-primary/30 active:scale-95"
          }`}
      >
        {done ? "Completed" : buttonLabel}
      </button>
    </div>
  );
}

export default function Dashboard({ username, setActiveTab }: DashboardProps) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
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
          
          {/* ── Welcome Header ── */}
          <motion.header 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div className="flex items-center gap-5">
              <div className="relative group cursor-pointer">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/10 text-xl font-bold text-primary">
                  {username ? username[0].toUpperCase() : "S"}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-emerald-500">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">{greeting()}</p>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  {username || "User"}
                </h1>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> {timeString}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Find Jobs", tab: "jobs", icon: Briefcase },
                { label: "Roadmaps", tab: "roadmaps", icon: Target },
              ].map(({ label, tab, icon: Icon }) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="group flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </motion.header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* ── Left Column (Daily Mission) ── */}
            <div className="lg:col-span-7 space-y-6">
              
              <motion.section 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-500" /> Daily Mission
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Complete tasks to maintain your streak.</p>
                    </div>
                    {mission && (
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 text-xl font-bold text-foreground">
                          {mission.streak} <span className="text-orange-500 text-sm">🔥</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Day Streak</p>
                      </div>
                    )}
                  </div>

                  {loadingMission ? (
                    <div className="space-y-3">
                      {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                    </div>
                  ) : !isAuthenticated ? (
                    <div className="space-y-3 py-2">
                      <p className="text-sm text-muted-foreground">
                        Daily missions become personal once you sign in. Explore the Career OS, then create an account to track streak, goals, and resume progress.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("profile")}
                        className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground"
                      >
                        Start with Profile
                      </button>
                    </div>
                  ) : mission ? (
                    <div className="space-y-4">
                      {/* Progress bar */}
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-2">
                          <span className="text-muted-foreground uppercase tracking-wider">Mission Progress</span>
                          <span className="text-emerald-400">{missionProgress}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-success to-accent transition-all duration-1000 ease-out"
                            style={{ width: `${missionProgress}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
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
                    <div className="py-8 text-center text-muted-foreground text-sm">Failed to load mission data.</div>
                  )}
              </motion.section>

            </div>

            {/* ── Right Column (Stats & Intelligence) ── */}
            <div className="lg:col-span-5 space-y-6">

              {/* Profile Health */}
              {isAuthenticated && completeness && (
                <motion.section
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-primary" /> Profile Health
                    </h2>
                    <span className="text-xl font-bold text-foreground">{completenessPct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-4">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
                      style={{ width: `${completenessPct}%` }}
                    />
                  </div>
                  {topSuggestion ? (
                    <button
                      onClick={() => setActiveTab("profile")}
                      className="w-full flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-left text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <span className="leading-snug">{topSuggestion}</span>
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground">Your profile looks solid. Keep it fresh as your skills and goals evolve.</p>
                  )}
                </motion.section>
              )}

              {/* Career Intelligence Summary */}
              <motion.section 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
                className="rounded-xl border border-border bg-primary/5 p-6 relative overflow-hidden"
              >
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" /> Intelligence Brief
                </h2>
                
                {loadingSummary ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : careerSummary ? (
                  <div className="space-y-6 relative z-10">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-foreground leading-tight mb-2">
                        {careerSummary.headline || "No roadmap defined yet"}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(careerSummary.focus_areas || []).slice(0,3).map((area, idx) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-primary/20 border border-primary/30 text-[10px] font-bold text-primary uppercase tracking-wider">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {careerSummary.next_actions?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recommended Actions</p>
                        <ul className="space-y-2">
                          {careerSummary.next_actions.slice(0,2).map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                              <ChevronRight className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                              <span className="leading-snug">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => setActiveTab('copilot')}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-muted hover:bg-muted/80 border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View Full Intelligence <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Initialize your career parameters to get AI insights.</p>
                )}
              </motion.section>

              {/* Active Goals Mini-Widget */}
              <motion.section 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> Priority Goals
                  </h2>
                  <button onClick={() => setActiveTab('goals')} className="text-xs font-bold text-primary hover:text-primary">
                    View All
                  </button>
                </div>
                
                <div className="space-y-3">
                  {goalsList.filter(g => g.status !== 'completed').slice(0, 3).map(goal => (
                    <div key={goal.id} className="p-3 rounded-xl bg-border border border-border flex justify-between items-center group cursor-pointer" onClick={() => setActiveTab('goals')}>
                      <div className="truncate pr-4">
                        <p className="text-sm font-semibold text-foreground truncate">{goal.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">{goal.category}</p>
                      </div>
                      <div className="text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">
                        {goal.progress}%
                      </div>
                    </div>
                  ))}
                  {goalsList.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                      No active goals. Time to set some!
                    </div>
                  )}
                </div>
              </motion.section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
