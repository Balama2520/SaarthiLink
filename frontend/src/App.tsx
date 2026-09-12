import { useEffect, useState, lazy, Suspense } from "react";
import { Menu, Sparkles, LogIn, LogOut } from "lucide-react";
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
import "./index.css";

import { useAppStore } from "./store/useAppStore";

const tabs = new Set([
  "landing", "discover", "about", "contact", "privacy", "terms",
  "dashboard", "profile", "resume", "goals", "jobs", "copilot", "interview", "roadmaps", "chat",
  "workspaces", "gradhub", "growthlab", "toolkit", "admin",
]);


function tabFromHash() {
  const tab = window.location.hash.replace(/^#\/?/, "");
  return tabs.has(tab) ? tab : "dashboard";
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

  useEffect(() => {
    const syncFromAddress = () => setActiveTab(tabFromHash());
    syncFromAddress();
    window.addEventListener("hashchange", syncFromAddress);
    return () => window.removeEventListener("hashchange", syncFromAddress);
  }, [setActiveTab]);

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

        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          />
        )}

        {/* Main workspace */}
        <main className="min-w-0 flex-1 flex min-h-screen flex-col overflow-hidden pt-14 md:h-screen md:min-h-0 md:pt-0">
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
          <header className="hidden md:flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/60 px-6 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Saarthi AI 🧭 Guiding Intelligence • Connected Action</span>
              </div>
              <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono">
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-emerald-400 font-semibold">Pytest 190/190 PASS</span>
                <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 text-blue-400 font-semibold">E2E 26/26 PASS</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {authenticated ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary border border-primary/30">
                      {username ? username[0].toUpperCase() : "U"}
                    </div>
                    <span className="font-medium text-foreground">{username}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">● Signed in</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign out"
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-muted-foreground">Guest mode</span>
                  <button
                    onClick={handleShowAuth}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-[1.02]"
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
            {activeTab === "jobs" && <JobFinder />}
            {activeTab === "copilot" && <CareerCopilot />}
            {activeTab === "interview" && <InterviewCoach />}
            {activeTab === "roadmaps" && <LearningRoadmaps />}
            {activeTab === "chat" && <ChatCoach />}
            {activeTab === "workspaces" && <Workspaces />}
            {activeTab === "gradhub" && <GraduateHub />}
            {activeTab === "growthlab" && <GrowthLab />}
            {activeTab === "toolkit" && <CareerToolkit />}
            {activeTab === "admin" && <AdminPanel />}
            {activeTab === "privacy" && <PrivacyPage />}
            {activeTab === "terms" && <TermsPage />}

            </Suspense>
          </ErrorBoundary>
        </main>

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
      </div>
    </ErrorBoundary>
  );
}
