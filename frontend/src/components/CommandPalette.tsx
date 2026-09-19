import { useEffect, useState } from "react";
import { Search, Briefcase, FileText, Target, Compass, Map, MessageSquare, Sparkles, Wrench, GraduationCap, FolderKanban, ShieldCheck, X } from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
}

const COMMAND_ITEMS = [
  { id: "jobs", name: "Job Finder & Semantic Search", category: "Career Core", icon: Briefcase, shortcut: "J" },
  { id: "resume", name: "Resume Analyzer & ATS Scoring", category: "Career Core", icon: FileText, shortcut: "R" },
  { id: "goals", name: "Career Goals & Milestones", category: "Career Core", icon: Target, shortcut: "G" },
  { id: "copilot", name: "Career Copilot AI Mentor", category: "AI Tools", icon: Compass, shortcut: "C" },
  { id: "roadmaps", name: "AI Learning Roadmaps", category: "AI Tools", icon: Map, shortcut: "M" },
  { id: "interview", name: "Mock Interview Simulator", category: "AI Tools", icon: MessageSquare, shortcut: "I" },
  { id: "chat", name: "Interactive AI Career Coach", category: "AI Tools", icon: Sparkles, shortcut: "A" },
  { id: "growthlab", name: "Growth Lab & Capstones", category: "Builder Studio", icon: FolderKanban, shortcut: "B" },
  { id: "toolkit", name: "Career Toolkit & Scripts", category: "Builder Studio", icon: Wrench, shortcut: "T" },
  { id: "gradhub", name: "Graduate Hub & GRE Prep", category: "Builder Studio", icon: GraduationCap, shortcut: "H" },
  { id: "admin", name: "Control Center & Admin Panel", category: "System", icon: ShieldCheck, shortcut: "S" },
];

export function CommandPalette({ isOpen, onClose, onSelectTab }: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery("");
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = COMMAND_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-background/80 backdrop-blur-md fade-in">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl">
        {/* Search Bar */}
        <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3.5">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or jump to tool... (e.g., Resume, Jobs, Copilot)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 custom-scrollbar space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching modules found for "{query}".
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs text-foreground transition-all hover:bg-primary/10 hover:text-primary group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-muted/30 group-hover:border-primary/40 group-hover:bg-primary/20">
                      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground group-hover:text-primary">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.category}</p>
                    </div>
                  </div>
                  <kbd className="rounded border border-border/70 bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {item.shortcut}
                  </kbd>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2 text-[10px] text-muted-foreground">
          <span>Use <b>↑ ↓</b> to navigate</span>
          <span><b>ESC</b> to close</span>
        </div>
      </div>
    </div>
  );
}
