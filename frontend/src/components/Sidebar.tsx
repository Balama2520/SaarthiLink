import {
  Briefcase, Compass, FileText, FlaskConical, GraduationCap,
  LayoutDashboard, LogOut, Map, MessageSquare, ShieldCheck, Sparkles,
  Target, User, Wrench, X, FolderKanban, Info, Mail, Home
} from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useAppStore, type PersonaType } from "../store/useAppStore";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  username: string;
  isAuthenticated: boolean;
  onLogout: () => void;
  onSignIn: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const discoveryItems = [
  { id: "landing", name: "Overview", icon: Home },
  { id: "discover", name: "Discovery", icon: Compass },
  { id: "about", name: "About", icon: Info },
  { id: "contact", name: "Contact", icon: Mail },
];

const careerItems = [
  { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
  { id: "profile", name: "Profile", icon: User },
  { id: "resume", name: "Resume", icon: FileText },
  { id: "goals", name: "Goals", icon: Target },
  { id: "jobs", name: "Jobs", icon: Briefcase },
];

const prepareItems = [
  { id: "copilot", name: "Copilot", icon: Compass },
  { id: "roadmaps", name: "Roadmaps", icon: Map },
  { id: "interview", name: "Interview", icon: MessageSquare },
  { id: "chat", name: "AI Chat", icon: Sparkles },
];

const buildItems = [
  { id: "growthlab", name: "Growth Lab", icon: FlaskConical },
  { id: "workspaces", name: "Workspaces", icon: FolderKanban },
  { id: "toolkit", name: "Toolkit", icon: Wrench },
  { id: "gradhub", name: "Graduate Hub", icon: GraduationCap },
];

const systemItems = [
  { id: "admin", name: "Admin", icon: ShieldCheck },
];

const PERSONAS: { id: PersonaType; label: string }[] = [
  { id: "undergrad", label: "Undergrad" },
  { id: "mtech", label: "M.Tech" },
  { id: "phd", label: "PhD" },
  { id: "ms_abroad", label: "MS abroad" },
  { id: "professional", label: "Professional" },
];

// Which nav items are most relevant to each path — surfaced as a "for you"
// dot rather than hidden, since every item stays reachable regardless of
// path (nothing here is exclusive to one persona, it's just more or less
// relevant), and hard-hiding risks a person losing track of a tool they
// were already using before picking a path.
const PERSONA_RECOMMENDATIONS: Record<Exclude<PersonaType, null>, string[]> = {
  undergrad: ["jobs", "roadmaps", "toolkit", "gradhub"],
  mtech: ["growthlab", "gradhub", "goals"],
  phd: ["growthlab", "gradhub", "goals"],
  ms_abroad: ["gradhub", "toolkit"],
  professional: ["jobs", "resume", "interview", "copilot"],
};

export default function Sidebar({
  activeTab, setActiveTab, username, isAuthenticated, onLogout, onSignIn,
  mobileOpen, onMobileClose
}: SidebarProps) {
  const persona = useAppStore((s) => s.persona);
  const setPersona = useAppStore((s) => s.setPersona);
  const recommended = persona ? PERSONA_RECOMMENDATIONS[persona] : [];

  const renderItems = (items: typeof careerItems) =>
    items.map((item) => {
      const Icon = item.icon;
      const isActive = activeTab === item.id;
      const isRecommended = recommended.includes(item.id);
      return (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          title={isRecommended ? `${item.name} — recommended for your path` : item.name}
          aria-current={isActive ? "page" : undefined}
          className={`
            group flex w-full items-center gap-2.5 rounded-md px-3 py-2
            text-sm transition-colors duration-150
            ${isActive
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground font-normal"
            }
          `}
        >
          <Icon
            aria-hidden
            className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
          />
          <span className="truncate flex-1 text-left">{item.name}</span>
          {isRecommended && (
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          )}
        </button>
      );
    });

  return (
    <aside
      aria-label="Main sidebar"
      className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-background transition-transform duration-200 md:relative md:z-10 md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex items-center gap-3 border-b border-border px-5 py-[18px]">
        <BrandMark className="h-9 w-9" />
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-foreground leading-none">Saarthi</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Career OS</p>
        </div>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onMobileClose}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav
        role="navigation"
        aria-label="Primary"
        className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-4"
      >
        <div>
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Career</p>
          <div className="space-y-0.5">{renderItems(careerItems)}</div>
        </div>
        <div>
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Prepare</p>
          <div className="space-y-0.5">{renderItems(prepareItems)}</div>
        </div>
        <div>
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Build</p>
          <div className="space-y-0.5">{renderItems(buildItems)}</div>
        </div>
        <div>
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Discovery & Info</p>
          <div className="space-y-0.5">{renderItems(discoveryItems)}</div>
        </div>
        <div>
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">System</p>
          <div className="space-y-0.5">{renderItems(systemItems)}</div>
        </div>
      </nav>

      <div className="border-t border-border p-3 space-y-2">
        <label htmlFor="persona-select" className="px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Path
        </label>
        <select
          id="persona-select"
          value={persona || ""}
          onChange={(e) => setPersona((e.target.value || null) as PersonaType)}
          className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground"
        >
          <option value="">Choose your path</option>
          {PERSONAS.map((p) => (
            <option key={p.id || "none"} value={p.id || ""}>{p.label}</option>
          ))}
        </select>
        {persona && (
          <p className="px-2 text-[10px] text-muted-foreground flex items-center gap-1.5">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> marks tools for your path
          </p>
        )}

        <div className="flex items-center justify-around text-[10px] text-muted-foreground pt-1 border-t border-border/50">
          <button onClick={() => setActiveTab("privacy")} className="hover:text-primary transition-colors">Privacy Policy</button>
          <span>•</span>
          <button onClick={() => setActiveTab("terms")} className="hover:text-primary transition-colors">Terms of Service</button>
        </div>

        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">

          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary border border-primary/20">
            {username ? username[0].toUpperCase() : "G"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground leading-none">
              {username || "Guest User"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isAuthenticated ? "Signed in" : "Guest mode"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {!isAuthenticated && (
              <button
                onClick={onSignIn}
                title="Sign in"
                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Sign In
              </button>
            )}
            <button
              onClick={onLogout}
              title="Sign out"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
