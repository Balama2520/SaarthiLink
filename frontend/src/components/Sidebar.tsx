import {
  Home, MessageSquare, UserCheck, Search, Map, LogOut,
  ShieldAlert, FolderGit2, BookOpen, StickyNote, GraduationCap,
  Microscope, Briefcase, ChevronRight, Sparkles, Target
} from "lucide-react";
import { usePersona } from "../context/PersonaContext";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  username: string;
  isAuthenticated: boolean;
  onLogout: () => void;
  onSignIn: () => void;
}

const personaMeta: Record<string, { label: string; color: string }> = {
  undergrad:    { label: "Undergraduate",  color: "text-violet-300 bg-violet-500/15 border-violet-500/30" },
  mtech:        { label: "M.Tech",         color: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30" },
  phd:          { label: "PhD",            color: "text-amber-300 bg-amber-500/15 border-amber-500/30" },
  ms_abroad:    { label: "MS Abroad",      color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30" },
  professional: { label: "Professional",   color: "text-rose-300 bg-rose-500/15 border-rose-500/30" },
};

export default function Sidebar({
  activeTab, setActiveTab, username, isAuthenticated, onLogout, onSignIn
}: SidebarProps) {
  const { persona, setPersona } = usePersona();

  const coreItems = [
    { id: "dashboard",  name: "Dashboard",          icon: Home },
    { id: "goals",      name: "Goal Navigator",     icon: Target },
    { id: "workspaces", name: "AI Workspaces",       icon: FolderGit2 },
    { id: "chat",       name: "AI OS Chat",          icon: MessageSquare },
  ];

  const personaItems = (() => {
    switch (persona) {
      case 'mtech':
      case 'phd':
        return [
          { id: "research",    name: "Research Hub",       icon: Microscope },
          { id: "experiments", name: "Experiment Studio",  icon: BookOpen },
          { id: "gradhub",     name: "Graduate Hub",       icon: GraduationCap },
        ];
      case 'ms_abroad':
        return [
          { id: "admissions", name: "Admissions Navigator", icon: Map },
          { id: "gradhub",    name: "Grad Hub & Compass",   icon: GraduationCap },
        ];
      case 'undergrad':
        return [
          { id: "gradhub",   name: "Graduate Hub",          icon: GraduationCap },
          { id: "skillforge", name: "Employability & Code", icon: BookOpen },
          { id: "jobs",       name: "Job Command Center",   icon: Search },
          { id: "interview",  name: "Interview Simulator",  icon: UserCheck },
        ];
      case 'professional':
        return [
          { id: "jobs",      name: "Job & Network Hub",     icon: Briefcase },
          { id: "interview", name: "Interview Simulator",   icon: UserCheck },
        ];
      default:
        return [];
    }
  })();

  const systemItems = [
    { id: "notes", name: "AI Study Notes", icon: StickyNote },
    { id: "admin", name: "System Admin",   icon: ShieldAlert },
  ];

  const allItems = [
    { section: "Core",    items: coreItems },
    { section: persona ? (personaMeta[persona]?.label ?? "Tools") : "Tools", items: personaItems },
    { section: "System",  items: systemItems },
  ];

  const personaBadge = persona ? personaMeta[persona] : null;

  return (
    <aside
      aria-label="Main sidebar"
      className="relative flex h-screen w-64 shrink-0 flex-col border-r border-white/[0.06] bg-slate-950 font-sans shadow-2xl z-10"
    >
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-950/20 via-transparent to-transparent" />

      {/* ── Brand Header ──────────────────────────────────── */}
      <div className="relative flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-500/25 pulse-glow shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="overflow-hidden">
          <span className="block text-sm font-bold text-white tracking-wide leading-none">Saarthi OS</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.25em] text-violet-400 mt-0.5">
            AI Operating System
          </span>
        </div>
      </div>

      {/* ── Persona Badge ─────────────────────────────────── */}
      {personaBadge && (
        <div className="relative mx-4 mt-3">
          <button
            onClick={() => setPersona(null)}
            title="Switch persona"
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80 ${personaBadge.color}`}
          >
            <span>{personaBadge.label}</span>
            <ChevronRight className="h-3 w-3 opacity-50" />
          </button>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────── */}
      <nav
        role="navigation"
        aria-label="Primary"
        className="relative flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-5"
      >
        {allItems.map(({ section, items }) => {
          if (!items.length) return null;
          return (
            <div key={section}>
              <p className="mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-600">
                {section}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      title={item.name}
                      aria-current={isActive ? "page" : undefined}
                      className={`
                        group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                        text-sm font-medium transition-all duration-200
                        ${isActive
                          ? "bg-violet-500/12 text-white"
                          : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"
                        }
                      `}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-violet-400 shadow-[0_0_8px_2px_rgba(139,92,246,0.5)]" />
                      )}

                      <Icon
                        aria-hidden
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105
                          ${isActive ? "text-violet-400" : "text-slate-600 group-hover:text-slate-300"}`}
                      />
                      <span className="truncate">{item.name}</span>

                      {/* Active dot */}
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── User Footer ───────────────────────────────────── */}
      <div className="relative border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-2.5 rounded-xl p-2">
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-xs font-bold text-white shadow-md">
            {username ? username[0].toUpperCase() : "G"}
          </div>

          {/* Name + status */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-slate-200 leading-none">
              {username || "Guest User"}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-600">
              {isAuthenticated ? "● Signed In" : "○ Guest Mode"}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {!isAuthenticated && (
              <button
                onClick={onSignIn}
                title="Sign in"
                className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-violet-300 hover:bg-violet-500/20 transition-colors"
              >
                Sign In
              </button>
            )}
            <button
              onClick={onLogout}
              title="Sign out / Clear data"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
