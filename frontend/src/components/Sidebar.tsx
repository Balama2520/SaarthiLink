import {
  Briefcase, Compass, FileText, FlaskConical, GraduationCap,
  LayoutDashboard, LogOut, Map, MessageSquare, ShieldCheck, Sparkles,
  Target, User, Wrench, X, FolderKanban, Info, Mail, Home
} from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useAppStore, type AccessRole, type PersonaType } from "../store/useAppStore";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  username: string;
  isAuthenticated: boolean;
  role: AccessRole;
  onLogout: () => void;
  onSignIn: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}
const workspaceItems = [
  { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
  { id: "profile", name: "Profile", icon: User },
  { id: "chat", name: "AI Coach", icon: Sparkles },
  { id: "copilot", name: "Career Copilot", icon: Sparkles },
  { id: "goals", name: "Goals", icon: Target },
  { id: "workspaces", name: "Workspaces", icon: FolderKanban },
];

const careerToolItems = [
  { id: "resume", name: "Resume ATS", icon: FileText },
  { id: "jobs", name: "Job Finder", icon: Briefcase },
  { id: "interview", name: "Interview Coach", icon: MessageSquare },
  { id: "roadmaps", name: "Roadmaps", icon: Map },
  { id: "gradhub", name: "Graduate Hub", icon: GraduationCap },
  { id: "growthlab", name: "Growth Lab", icon: FlaskConical },
  { id: "toolkit", name: "Career Toolkit", icon: Wrench },
];

const discoveryItems = [
  { id: "landing", name: "Overview", icon: Home },
  { id: "discover", name: "Discovery", icon: Compass },
  { id: "about", name: "About", icon: Info },
  { id: "contact", name: "Contact", icon: Mail },
];

const PERSONAS: { id: PersonaType; label: string }[] = [
  { id: "undergrad", label: "Undergrad" },
  { id: "mtech", label: "M.Tech" },
  { id: "phd", label: "PhD" },
  { id: "ms_abroad", label: "MS Abroad" },
  { id: "professional", label: "Professional" },
];

const PERSONA_RECOMMENDATIONS: Record<Exclude<PersonaType, null>, string[]> = {
  undergrad: ["jobs", "roadmaps", "toolkit", "gradhub"],
  mtech: ["growthlab", "gradhub", "goals"],
  phd: ["growthlab", "gradhub", "goals"],
  ms_abroad: ["gradhub", "toolkit"],
  professional: ["jobs", "resume", "interview", "copilot"],
};

export default function Sidebar({
  activeTab, setActiveTab, username, isAuthenticated, onLogout, onSignIn,
  mobileOpen, onMobileClose, role
}: SidebarProps) {
  const persona = useAppStore((s) => s.persona);
  const setPersona = useAppStore((s) => s.setPersona);
  const recommended = persona ? PERSONA_RECOMMENDATIONS[persona] : [];

  const renderGroup = (title: string, items: typeof workspaceItems) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-1">
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
          {title}
        </p>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isRecommended = recommended.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isRecommended ? `${item.name} — Recommended for your path` : item.name}
              aria-current={isActive ? "page" : undefined}
              className={`
                group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold
                transition-all duration-150
                ${isActive
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:bg-card hover:text-foreground border border-transparent"
                }
              `}
            >
              <Icon
                aria-hidden
                className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              <span className="truncate flex-1 text-left">{item.name}</span>
              {isRecommended && (
                <span
                  aria-label="Recommended for your path"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <aside
      aria-label="Main sidebar"
      className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-border/80 bg-card/40 backdrop-blur-xl transition-transform duration-200 md:relative md:z-10 md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
        <BrandMark className="h-9 w-9 text-primary drop-shadow-md" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-display text-base font-extrabold tracking-tight text-foreground">Saarthi AI</p>
            <span className="rounded-full bg-primary/20 border border-primary/30 px-1.5 py-0.2 text-[9px] font-bold text-primary">OS</span>
          </div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Career Intelligence</p>
        </div>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onMobileClose}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Scrollable Body */}
      <nav
        role="navigation"
        aria-label="Primary Navigation"
        className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-5"
      >
        {renderGroup("Workspace", workspaceItems)}
        {renderGroup("Career Tools", careerToolItems)}
        {renderGroup("Platform & Info", discoveryItems)}
      </nav>

      {/* Footer & Persona Selector */}
      <div className="border-t border-border/80 p-3 space-y-3 bg-card/60">
        <div>
          <div className="flex items-center justify-between px-1">
            <label htmlFor="persona-select" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Target Career Path
            </label>
            {persona && (
              <span className="flex items-center gap-1 text-[9px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Active
              </span>
            )}
          </div>
          <select
            id="persona-select"
            value={persona || ""}
            onChange={(e) => setPersona((e.target.value || null) as PersonaType)}
            className="mt-1 w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          >
            <option value="">Choose Your Path (Undergrad, Pro...)</option>
            {PERSONAS.map((p) => (
              <option key={p.id || "none"} value={p.id || ""}>{p.label}</option>
            ))}
          </select>
          {persona ? (
            <p className="mt-1.5 px-1 text-[10px] text-amber-400 font-semibold flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 animate-pulse" />
              Showing <b>Recommended</b> badges for {PERSONAS.find(p => p.id === persona)?.label}s
            </p>
          ) : (
            <p className="mt-1.5 px-1 text-[10px] text-muted-foreground font-medium">
              💡 Select a path to highlight tools tailored to your career stage.
            </p>
          )}
        </div>

        <div className="flex items-center justify-around text-[10px] font-medium text-muted-foreground pt-1 border-t border-border/50">
          <button onClick={() => setActiveTab("privacy")} className="hover:text-primary transition-colors">Privacy</button>
          <span>•</span>
          <button onClick={() => setActiveTab("terms")} className="hover:text-primary transition-colors">Terms</button>
        </div>

        <button
          onClick={() => role === "admin" && setActiveTab("admin")}
          disabled={role !== "admin"}
          title={role === "admin" ? "Admin" : "Admin access required"}
          aria-current={activeTab === "admin" ? "page" : undefined}
          className={`group flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
            activeTab === "admin"
              ? "border-primary/30 bg-primary/15 text-primary"
              : role === "admin"
                ? "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                : "cursor-not-allowed border-border/40 text-muted-foreground/50"
          }`}
        >
          <ShieldCheck className={`h-4 w-4 shrink-0 ${activeTab === "admin" ? "text-primary" : "text-muted-foreground/60"}`} />
          <span>Admin</span>
          {role !== "admin" && <span className="ml-auto text-[9px] font-medium text-muted-foreground/60">Restricted</span>}
        </button>

        {/* User Badge Bar */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-xs font-black text-primary border border-primary/30">
            {username ? username[0].toUpperCase() : "G"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-foreground leading-none">
              {username || "Guest User"}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${isAuthenticated ? "bg-emerald-400" : "bg-amber-400"}`} />
              {isAuthenticated ? "Authenticated" : "Guest Mode"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {!isAuthenticated && (
              <button
                onClick={onSignIn}
                title="Sign in"
                className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
              >
                Sign In
              </button>
            )}
            <button
              onClick={onLogout}
              title="Sign out"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
