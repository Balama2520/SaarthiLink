import { useEffect, useState } from "react";
import {
  Sparkles, Briefcase, BookOpen, Flame, CheckSquare, Award,
  ArrowUpRight, Zap, Target,
  ChevronRight
} from "lucide-react";
import { api } from "../services/api";

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

interface Opportunity {
  id: string;
  title: string;
  category: string;
  deadline: string;
  url: string;
}

// ─── Skeleton shimmer ────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

// ─── Mission task row ─────────────────────────────────────────
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
    <div className={`flex items-center justify-between rounded-2xl border p-3 transition-all duration-200
      ${done ? "border-green-500/20 bg-green-500/5" : "border-white/5 bg-slate-950/50"}`}>
      <div className="text-sm">
        <p className={`font-semibold leading-tight ${done ? "text-green-300" : "text-slate-200"}`}>
          {label}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">{subLabel}</p>
      </div>
      <button
        onClick={onTick}
        disabled={done}
        className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all
          ${done
            ? "cursor-default bg-green-500/15 text-green-400 border border-green-500/20"
            : "bg-violet-600 hover:bg-violet-500 text-white hover:-translate-y-0.5 active:translate-y-0"
          }`}
      >
        {done ? "✓ Done" : buttonLabel}
      </button>
    </div>
  );
}



export default function Dashboard({ username, setActiveTab, onLogout }: DashboardProps) {
  const [timeString, setTimeString] = useState("");
  const [mission, setMission] = useState<MissionStatus | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadingMission, setLoadingMission] = useState(true);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [tickingTask, setTickingTask] = useState<string | null>(null);
  const [goalsList, setGoalsList] = useState<any[]>([]);



  useEffect(() => {
    const updateTime = () => {
      setTimeString(new Date().toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadMission() {
      setLoadingMission(true);
      try {
        const mis = await api.getMissionStatus();
        setMission(mis);
      } catch (err) {
        console.error("Mission load failed", err);
      } finally {
        setLoadingMission(false);
      }
    }
    async function loadGoals() {
      try {
        const data = await api.getGoals();
        setGoalsList(data);
      } catch (err) {
        console.error("Goals load failed", err);
      }
    }
    loadMission();
    loadGoals();
  }, []);

  useEffect(() => {
    async function loadOpps() {
      setLoadingOpps(true);
      try {
        const opps = await api.getOpportunityFeed();
        setOpportunities(opps);
      } catch (err) {
        console.error("Opportunity feed load failed", err);
      } finally {
        setLoadingOpps(false);
      }
    }
    loadOpps();
  }, []);

  const handleTick = async (type: string) => {
    if (tickingTask) return;
    setTickingTask(type);
    try {
      const res = await api.tickMissionTask(type);
      setMission(res.mission);
    } catch (err) {
      console.error(err);
    } finally {
      setTickingTask(null);
    }
  };

  const completedCount = mission
    ? [
        mission.dsa >= 2,
        !!mission.git,
        !!mission.linkedin,
        mission.jobs >= 3,
        !!mission.course,
        !!mission.interview,
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
    <div className="relative flex-1 overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-violet-600/8 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-cyan-600/8 blur-[80px]" />
      </div>

      <div className="relative h-full overflow-y-auto px-6 py-6 custom-scrollbar lg:px-8 lg:py-8">

        {/* ── Welcome Header ─────────────────────────────── */}
        <div className="fade-in-up mb-6 rounded-[24px] border border-white/8 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-xl font-black text-white shadow-lg shadow-violet-500/25">
                {username ? username[0].toUpperCase() : "S"}
                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-slate-900 bg-green-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-violet-400">
                  {greeting()},
                </p>
                <h1 className="text-2xl font-extrabold text-white leading-tight">
                  {username || "Warrior"} 👋
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">{timeString}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              {/* Quick action buttons */}
              {[
                { label: "AI Chat", tab: "chat", icon: Sparkles },
                { label: "Jobs", tab: "jobs", icon: Briefcase },
                { label: "Workspaces", tab: "workspaces", icon: BookOpen },
              ].map(({ label, tab, icon: Icon }) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-violet-500/40 hover:text-white hover:bg-violet-500/8 transition-all"
                >
                  <Icon className="h-3.5 w-3.5 text-violet-400" />
                  {label}
                </button>
              ))}
              <button
                onClick={onLogout}
                className="rounded-xl border border-red-500/20 bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/40 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* ── Dashboard Grid ─────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-3">

          {/* ── Column 1: Daily Mission ─────────────────── */}
          <div className="fade-in-up stagger-2 lg:col-span-1 rounded-[24px] border border-white/8 bg-slate-900/40 p-5 backdrop-blur-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-white">
                  <CheckSquare className="h-4 w-4 text-violet-400" />
                  Daily Mission
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Complete tasks · build your streak</p>
              </div>
              {mission && (
                <div className="flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold text-amber-300">{mission.streak}d streak</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {mission && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500">Today's Progress</span>
                  <span className="font-bold text-violet-300">{completedCount}/6 done</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700"
                    style={{ width: `${missionProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Tasks */}
            <div className="flex-1 space-y-2.5">
              {loadingMission ? (
                <>
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-4/5" />
                </>
              ) : mission ? (
                <>
                  <MissionRow label="Solve DSA Problems" subLabel={`${mission.dsa} of 2 solved`} done={mission.dsa >= 2} onTick={() => handleTick("dsa")} buttonLabel="+1 DSA" />
                  <MissionRow label="GitHub Commit" subLabel={mission.git ? "Pushed today" : "No commit yet"} done={!!mission.git} onTick={() => handleTick("git")} buttonLabel="Commit" />
                  <MissionRow label="LinkedIn Post" subLabel={mission.linkedin ? "Posted" : "Not posted"} done={!!mission.linkedin} onTick={() => handleTick("linkedin")} buttonLabel="Post" />
                  <MissionRow label="Apply to Jobs" subLabel={`${mission.jobs} of 3 applied`} done={mission.jobs >= 3} onTick={() => handleTick("jobs")} buttonLabel="+1 Apply" />
                  <MissionRow label="Course Lecture" subLabel={mission.course ? "Completed" : "Pending"} done={!!mission.course} onTick={() => handleTick("course")} buttonLabel="Study" />
                  <MissionRow label="Mock Interview" subLabel={mission.interview ? "Practiced" : "Not done"} done={!!mission.interview} onTick={() => handleTick("interview")} buttonLabel="Mock" />
                </>
              ) : (
                <div className="rounded-2xl border border-white/5 p-6 text-center text-slate-500 text-sm">
                  <Target className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Mission not available.<br />
                  <span className="text-xs">Sign in to track your progress.</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-slate-600">
              <span>Resets daily at midnight</span>
              <Sparkles className="h-3 w-3 text-violet-500/40" />
            </div>
          </div>

          {/* ── Column 2: Goal Navigator Widget ──────────────── */}
          <div className="fade-in-up stagger-3 lg:col-span-1 rounded-[24px] border border-white/8 bg-slate-900/40 p-5 backdrop-blur-sm flex flex-col">
            <h3 className="flex items-center gap-2 text-base font-bold text-white border-b border-white/5 pb-4 mb-4">
              <Target className="h-4 w-4 text-violet-400" />
              Active Goals
              <button
                onClick={() => setActiveTab("goals")}
                className="text-[10px] font-semibold text-violet-400 hover:text-violet-300 ml-auto"
              >
                Manage All
              </button>
            </h3>

            {/* Goals list */}
            <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar max-h-[300px]">
              {loadingMission ? (
                <div className="text-slate-500 text-xs text-center py-6">Loading goals...</div>
              ) : goalsList && goalsList.length > 0 ? (
                goalsList.slice(0, 3).map((g: any) => (
                  <div key={g.id} className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white truncate max-w-[150px]">{g.title}</span>
                      <span className="text-[9px] font-semibold uppercase bg-violet-500/10 text-violet-300 border border-violet-500/20 px-1.5 py-0.5 rounded">
                        {g.category}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${g.progress}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
                      <span>Progress</span>
                      <span>{g.progress}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 border border-dashed border-white/5 rounded-2xl bg-slate-950/10">
                  <Target className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No active goals found.</p>
                  <button
                    onClick={() => setActiveTab("goals")}
                    className="mt-2 text-[10px] bg-violet-600 hover:bg-violet-500 text-white font-bold py-1 px-3 rounded-lg"
                  >
                    Add Your First Goal
                  </button>
                </div>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={() => setActiveTab("goals")}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/8 bg-slate-950/40 py-2.5 text-xs font-semibold text-slate-300 hover:border-violet-500/40 hover:text-violet-300 transition-all"
            >
              <Target className="h-3.5 w-3.5 text-violet-400" />
              Open Goal Navigator
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {/* ── Column 3: Opportunity Feed ──────────────── */}
          <div className="fade-in-up stagger-4 lg:col-span-1 rounded-[24px] border border-white/8 bg-slate-900/40 p-5 backdrop-blur-sm flex flex-col">
            <h3 className="flex items-center gap-2 text-base font-bold text-white border-b border-white/5 pb-4 mb-4">
              <Zap className="h-4 w-4 text-amber-400" />
              Opportunity Feed
            </h3>

            {loadingOpps ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : opportunities.length > 0 ? (
              <div className="flex-1 space-y-2.5 overflow-y-auto custom-scrollbar">
                {opportunities.map((opp) => (
                  <a
                    key={opp.id}
                    href={opp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl border border-white/5 bg-slate-950/60 p-3.5 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group hover-lift"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-400">
                        {opp.category}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors">
                        By {opp.deadline}
                        <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
                      {opp.title}
                    </p>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-8">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/8">
                  <Zap className="h-5 w-5 text-amber-400/60" />
                </div>
                <p className="text-sm text-slate-500">No opportunities yet</p>
                <p className="text-[11px] text-slate-600 mt-1">Sign in to see personalized feeds</p>
              </div>
            )}

            {/* Quick nav */}
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">Jump To</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Job Finder", tab: "jobs", icon: Briefcase },
                  { label: "AI Workspace", tab: "workspaces", icon: BookOpen },
                  { label: "Roadmaps", tab: "roadmaps", icon: Target },
                  { label: "Interview", tab: "interview", icon: Award },
                ].map(({ label, tab, icon: Icon }) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-950/40 p-2 text-[11px] font-medium text-slate-400 hover:border-violet-500/30 hover:text-slate-200 transition-all hover-lift"
                  >
                    <Icon className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}