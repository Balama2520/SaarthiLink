import { useEffect, useState, lazy, Suspense } from "react";
import { Menu, Sparkles, LogIn, LogOut, Lock } from "lucide-react";
import AuthPage from "./pages/AuthPage";
import Sidebar from "./components/Sidebar";

// Lazy-load all pages for code splitting (each becomes its own chunk)
const LandingPage = lazy(() => import("./pages/LandingPage"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const JobFinder = lazy(() => import("./pages/JobFinder"));
const InterviewCoach = lazy(() => import("./pages/InterviewCoach"));
const LearningRoadmaps = lazy(() => import("./pages/LearningRoadmaps"));
const ProfilePage = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const ResumeAnalyzer = lazy(() => import("./components/ResumeAnalyzer"));
const Goals = lazy(() => import("./pages/Goals"));
const CareerCopilot = lazy(() => import("./pages/CareerCopilot"));
const ChatCoach = lazy(() => import("./pages/ChatCoach"));
const Workspaces = lazy(() => import("./pages/Workspaces"));
const GraduateHub = lazy(() => import("./pages/GraduateHub"));
const GrowthLab = lazy(() => import("./pages/GrowthLab"));
const CareerToolkit = lazy(() => import("./pages/CareerToolkit"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));

import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalAdScripts } from "./components/GlobalAdScripts";
import "./index.css";

import { useAppStore } from "./store/useAppStore";
import { AUTH_EXPIRED_EVENT } from "./lib/auth";

import { CommandPalette } from "./components/CommandPalette";
import MobileBottomNav from "./components/MobileBottomNav";
import SaarthiConciergeBot from "./components/SaarthiConciergeBot";

const tabs = new Set([
  "landing", "discover", "about", "contact", "privacy", "terms",
  "dashboard", "profile", "resume", "goals", "jobs", "copilot", "interview", "roadmaps", "chat",
  "workspaces", "gradhub", "growthlab", "toolkit", "admin",
]);

function tabFromHash() {
  const tab = window.location.hash.replace(/^#\/?/, "");
  return tabs.has(tab) ? tab : "dashboard";
}

/** Shown when a guest user tries to access an auth-required page */
function AuthGate({ onSignIn, featureName }: { onSignIn: () => void; featureName: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-border/80 bg-card/60 p-10 shadow-xl backdrop-blur-xl max-w-sm w-full text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/30 shadow-inner">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-display text-xl font-extrabold text-foreground">
            Sign In Required
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">{featureName}</span> is only
            available to signed-in users. Create a free account or sign in to continue.
          </p>
        </div>
        <button
          onClick={onSignIn}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
        >
          <LogIn className="h-4 w-4" />
          Sign In / Register
        </button>
        <p className="text-[11px] text-muted-foreground">
          It's free — no credit card required.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const authenticated = useAppStore((state) => state.isAuthenticated);
  const username = useAppStore((state) => state.username);
  const activeTab = useAppStore((state) => state.activeTab);
  const setAuth = useAppStore((state) => state.setAuth);
  const enterGuestMode = useAppStore((state) => state.enterGuestMode);
  const logout = useAppStore((state) => state.logout);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);

  useEffect(() => {
    const syncFromAddress = () => setActiveTab(tabFromHash());
    syncFromAddress();
    window.addEventListener("hashchange", syncFromAddress);
    return () => window.removeEventListener("hashchange", syncFromAddress);
  }, [setActiveTab]);

  useEffect(() => {
    const handleSessionExpiry = () => {
      enterGuestMode();
      setShowAuthModal(true);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleSessionExpiry);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleSessionExpiry);
  }, [enterGuestMode]);

  useEffect(() => {
    const nextHash = `#/${activeTab}`;
    if (window.location.hash !== nextHash) window.history.pushState(null, "", nextHash);
  }, [activeTab]);

  const handleAuthSuccess = (user: string, token?: string, refreshToken?: string | null, persistence?: "local" | "session") => {
    if (token) setAuth(user, token, refreshToken, persistence);
    else enterGuestMode();
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    logout();
  };

  const handleShowAuth = () => setShowAuthModal(true);
  const handleCloseAuth = () => setShowAuthModal(false);

  return (
    <ErrorBoundary>
      <div className="relative flex min-h-screen overflow-x-hidden text-foreground selection:bg-primary/20">
        <CommandPalette
          isOpen={showCmdPalette}
          onClose={() => setShowCmdPalette(false)}
          onSelectTab={(t) => setActiveTab(t)}
        />
        {/* Sidebar navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); setMobileNavOpen(false); }}
          username={username}
          isAuthenticated={authenticated}
          onLogout={handleLogout}
          onSignIn={handleShowAuth}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />
        <GlobalAdScripts />

        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          />
        )}

        {/* Main workspace */}
        <main className="min-w-0 flex-1 flex min-h-screen flex-col overflow-x-hidden pt-14 pb-16 md:h-screen md:min-h-0 md:pt-0 md:pb-0">
          {/* Mobile Header Bar */}
          <div className="fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md md:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileNavOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Menu className="h-5 w-5" />
              </button>
              <span className="truncate font-display text-sm font-semibold text-foreground">Saarthi AI 🧭</span>
            </div>

            <div className="flex items-center gap-2">
              {authenticated ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              ) : (
                <button
                  onClick={handleShowAuth}
                  className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Desktop Top Navbar Header */}
          <header className="hidden md:flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-card/60 px-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold">Saarthi Career Intelligence Engine</span>
                <span className="text-[10px] text-muted-foreground font-mono">v1.0</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowCmdPalette(true)}
                className="hidden lg:flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Command Palette & Jump...</span>
                <kbd className="ml-2 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">⌘K</kbd>
              </button>

              {authenticated ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card/80 px-3 py-1.5 text-xs shadow-sm">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-extrabold text-primary border border-primary/30">
                      {username ? username[0].toUpperCase() : "U"}
                    </div>
                    <span className="font-semibold text-foreground">{username}</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-medium">● Online</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign out"
                    className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> Guest Mode
                  </span>
                  <button
                    onClick={handleShowAuth}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign In / Register</span>
                  </button>
                </div>
              )}
            </div>
          </header>
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm animate-pulse">
                Loading module...
              </div>
            }>
            {activeTab === "landing" && <LandingPage onShowAuth={handleShowAuth} />}
            {activeTab === "discover" && <DiscoverPage />}
            {activeTab === "about" && <AboutPage />}
            {activeTab === "contact" && <ContactPage />}
            {activeTab === "dashboard" && (
              <Dashboard username={username} setActiveTab={setActiveTab} onLogout={handleLogout} />
            )}
            {activeTab === "profile" && <ProfilePage />}
            {activeTab === "resume" && <ResumeAnalyzer />}
            {activeTab === "goals" && <Goals />}
            {activeTab === "jobs" && (
              authenticated
                ? <JobFinder />
                : <AuthGate onSignIn={handleShowAuth} featureName="Job Finder" />
            )}
            {activeTab === "copilot" && <CareerCopilot />}
            {activeTab === "interview" && <InterviewCoach />}
            {activeTab === "roadmaps" && <LearningRoadmaps />}
            {activeTab === "chat" && <ChatCoach />}
            {activeTab === "workspaces" && (
              authenticated
                ? <Workspaces />
                : <AuthGate onSignIn={handleShowAuth} featureName="Workspaces" />
            )}
            {activeTab === "gradhub" && <GraduateHub />}
            {activeTab === "growthlab" && <GrowthLab />}
            {activeTab === "toolkit" && <CareerToolkit />}
            {activeTab === "admin" && <AdminPanel />}
            {activeTab === "privacy" && <PrivacyPage />}
            {activeTab === "terms" && <TermsPage />}

            </Suspense>
          </ErrorBoundary>
        </main>

        {/* Mobile Navigation Bar */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); setMobileNavOpen(false); }}
          onOpenMobileMenu={() => setMobileNavOpen(true)}
        />

        {/* Auth Page — full-screen overlay */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 fade-in">
            <AuthPage
              onSuccess={handleAuthSuccess}
              onGuestAccess={() => { handleAuthSuccess("Demo User"); }}
            />
            <button
              onClick={handleCloseAuth}
              aria-label="Close sign in"
              className="fixed right-5 top-5 z-[60] flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              ×
            </button>
          </div>
        )}

        {/* Global Floating Saarthi AI Site Guidance Bot */}
        <SaarthiConciergeBot activeTab={activeTab} />
      </div>
    </ErrorBoundary>
  );
}
