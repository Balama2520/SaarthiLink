import { LayoutDashboard, Briefcase, FileText, Sparkles, Menu } from "lucide-react";

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenMobileMenu: () => void;
}

export default function MobileBottomNav({
  activeTab,
  setActiveTab,
  onOpenMobileMenu,
}: MobileBottomNavProps) {
  const navItems = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "jobs", label: "Jobs", icon: Briefcase },
    { id: "resume", label: "Resume", icon: FileText },
    { id: "chat", label: "AI Coach", icon: Sparkles },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur-lg px-2 shadow-lg md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
              isActive
                ? "text-primary font-bold scale-105"
                : "text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            <Icon className={`h-5 w-5 ${isActive ? "text-primary stroke-[2.5]" : ""}`} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[56px]">
              {item.label}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Open full menu"
        className="flex flex-col items-center justify-center w-14 py-1 rounded-xl text-muted-foreground hover:text-foreground transition-all font-medium"
      >
        <Menu className="h-5 w-5" />
        <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
      </button>
    </div>
  );
}
