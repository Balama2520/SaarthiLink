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

import { useAppStore, type AccessRole } from "./store/useAppStore";
import { AUTH_EXPIRED_EVENT } from "./lib/auth";

import { CommandPalette } from "./components/CommandPalette";
import MobileBottomNav from "./components/MobileBottomNav";
import SaarthiConciergeBot from "./components/SaarthiConciergeBot";

const tabs = new Set([
  "landing", "discover", "about", "contact", "privacy", "terms",
  "dashboard", "profile", "resume", "jobs", "chat", "copilot", "goals",
  "interview", "roadmaps", "workspaces", "gradhub", "growthlab", "toolkit",
  "admin",
]);

const publicPaths: Record<string, string> = {
  landing: "/",
  discover: "/discover",
  about: "/about",
  contact: "/contact",
  resume: "/resume-analyzer",
  jobs: "/job-finder",
  copilot: "/career-copilot",
  goals: "/goals",
  interview: "/interview-coach",
  roadmaps: "/learning-roadmaps",
  workspaces: "/workspaces",
  gradhub: "/graduate-hub",
  growthlab: "/growth-lab",
  toolkit: "/career-toolkit",
  admin: "/admin",
};

const tabByPath = Object.fromEntries(
  Object.entries(publicPaths).map(([tab, path]) => [path, tab]),
) as Record<string, string>;

const seoByTab: Record<string, {
  title: string;
  description: string;
  keywords: string;
}> = {
  landing: {
    title: "Saarthi — AI Career Operating System & Resume Intelligence",
    description: "Saarthi is an AI-powered Career Operating System for resume intelligence, job matching, interview coaching, skill gap analysis, and personalized career roadmaps.",
    keywords: "Saarthi, AI career operating system, resume intelligence, AI job matching, mock interview coaching, career roadmap, skill gap analysis",
  },
  discover: {
    title: "Discover Saarthi — Smart Career Discovery Tools",
    description: "Explore personalized career opportunities, skill trends, and job discovery tools designed to help you find the right next move faster.",
    keywords: "discover careers, AI career discovery, job discovery, skill trends, career guidance, Saarthi discover",
  },
  about: {
    title: "About Saarthi — AI Guidance for Career Growth",
    description: "Learn how Saarthi blends AI, career intelligence, and guided action for modern learners, professionals, and job seekers.",
    keywords: "about Saarthi, AI career growth, career intelligence, AI guidance, professional development",
  },
  contact: {
    title: "Contact Saarthi — Get in Touch",
    description: "Reach out to the Saarthi team for support, partnership opportunities, or questions about AI-powered career tools.",
    keywords: "contact Saarthi, career product support, SaaS support, AI career platform",
  },
  dashboard: {
    title: "Saarthi Dashboard — Career Intelligence Overview",
    description: "View your career metrics, opportunities, progress, and AI-powered recommendations from the Saarthi dashboard.",
    keywords: "Saarthi dashboard, career dashboard, career intelligence overview, AI recommendations, career progress",
  },
  profile: {
    title: "Saarthi Profile — Career Snapshot and Skills",
    description: "Manage your profile, highlight strengths, and align your experience and skills with the best-fit opportunities.",
    keywords: "Saarthi profile, career profile, skills profile, professional profile, talent overview",
  },
  resume: {
    title: "Resume Analyzer — AI Resume Intelligence",
    description: "Analyze and improve your resume with AI-driven insights, keyword alignment, and realistic job-fit recommendations.",
    keywords: "resume analyzer, AI resume review, resume intelligence, ATS optimization, job-fit analysis",
  },
  goals: {
    title: "Career Goals — Plan Your Growth with Saarthi",
    description: "Set measurable goals, map milestones, and track career progress with AI-guided planning and personalized coaching.",
    keywords: "career goals, growth planning, career milestones, AI goal tracking, professional roadmap",
  },
  jobs: {
    title: "Job Finder — AI-Powered Career Matching",
    description: "Discover relevant jobs, compare opportunities, and match your skills with roles that fit your long-term career trajectory.",
    keywords: "job finder, AI job matching, career opportunities, jobs near me, role fit analysis",
  },
  copilot: {
    title: "Career Copilot — Guided AI Career Support",
    description: "Chat with your AI career copilot for strategy, role advice, resume feedback, and decision support across your journey.",
    keywords: "career copilot, AI career advice, job coaching, career planning assistant, professional guidance",
  },
  interview: {
    title: "Interview Coach — AI Mock Interview Practice",
    description: "Practice with AI-led mock interviews, get feedback, and sharpen your communication for real-world job conversations.",
    keywords: "interview coach, mock interviews, AI interview prep, interview feedback, job interview training",
  },
  roadmaps: {
    title: "Learning Roadmaps — Personalized Skill Paths",
    description: "Follow structured learning roadmaps that convert your current skills into the next role, track, and growth plan.",
    keywords: "learning roadmaps, career roadmap, skill path planning, personalized growth plan, upskilling",
  },
  chat: {
    title: "Saarthi Chat Coach — Real-Time Career Guidance",
    description: "Get practical, personalized career support from Saarthi's chat coach for decisions, prep, and growth conversations.",
    keywords: "AI chat coach, career guidance chat, instant career advice, personalized coaching, job support",
  },
  workspaces: {
    title: "Workspaces — Organize Your Career Projects",
    description: "Create spaces to track goals, resumes, projects, applications, and career tasks in one connected workflow.",
    keywords: "career workspaces, task tracking, resume workspace, role planning, talent workspace",
  },
  gradhub: {
    title: "Graduate Hub — Career Launch for New Graduates",
    description: "Access career guidance, first-job preparation, and community resources built for recent graduates and early-career professionals.",
    keywords: "graduate hub, career launch, first job support, graduate resources, early career guidance",
  },
  growthlab: {
    title: "Growth Lab — Skill Development and Experimentation",
    description: "Use Growth Lab to build new skills, test ideas, and accelerate learning with structured career experiments.",
    keywords: "growth lab, skill development, experiments, AI learning, career acceleration",
  },
  toolkit: {
    title: "Career Toolkit — Practical Tools for Smart Decisions",
    description: "Use practical career tools for planning, applying, tracking, and improving your momentum across your next moves.",
    keywords: "career toolkit, AI career tools, job application tools, career planning resources",
  },
  admin: {
    title: "Saarthi Admin — Platform Management",
    description: "Administrative controls and operational views for managing Saarthi's career platform and internal workflows.",
    keywords: "Saarthi admin, platform management, internal operations, career platform admin",
  },
  privacy: {
    title: "Privacy Policy — Saarthi",
    description: "Read the Saarthi privacy policy and understand how personal data is collected, protected, and used.",
    keywords: "Saarthi privacy policy, data privacy, career app privacy, user privacy",
  },
  terms: {
    title: "Terms of Service — Saarthi",
    description: "Review the Saarthi terms of service, platform usage guidelines, and responsibilities for members and visitors.",
    keywords: "Saarthi terms of service, platform terms, user agreement, SaaS terms",
  },
};

function tabFromHash() {
  const tab = window.location.hash.replace(/^#\/?/, "");
  if (tab) return tabs.has(tab) ? tab : "dashboard";
  return tabByPath[window.location.pathname] ?? (window.location.pathname === "/" ? "landing" : "dashboard");
}

function setMetaTag(selector: string, attributes: Record<string, string>, content?: string) {
  const existing = document.head.querySelector(selector) as HTMLMetaElement | null;
  const tag = existing ?? document.createElement("meta");

  Object.entries(attributes).forEach(([key, value]) => {
    tag.setAttribute(key, value);
  });

  if (content !== undefined) {
    tag.setAttribute("content", content);
  }

  if (!existing) {
    document.head.appendChild(tag);
  }
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

function AdminAccessGate({ onSignIn, isAuthenticated }: { onSignIn: () => void; isAuthenticated: boolean }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-border/80 bg-card/60 p-10 text-center shadow-xl backdrop-blur-xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-xl font-extrabold text-foreground">Admin Access Required</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Platform metrics, user activity, and integration controls are restricted to authorized administrators.
          </p>
        </div>
        {!isAuthenticated && (
          <button
            onClick={onSignIn}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary/90"
          >
            <LogIn className="h-4 w-4" />
            Sign In / Register
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const authenticated = useAppStore((state) => state.isAuthenticated);
  const username = useAppStore((state) => state.username);
  const role = useAppStore((state) => state.role);
  const activeTab = useAppStore((state) => state.activeTab);
  const setAuth = useAppStore((state) => state.setAuth);
  const enterGuestMode = useAppStore((state) => state.enterGuestMode);
  const logout = useAppStore((state) => state.logout);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [routeReady, setRouteReady] = useState(false);

  useEffect(() => {
    if (activeTab === "admin") {
      setActiveTab("admin");
    }
  }, [activeTab, setActiveTab]);

  useEffect(() => {
    const syncFromAddress = () => setActiveTab(tabFromHash());
    syncFromAddress();
    setRouteReady(true);
    window.addEventListener("hashchange", syncFromAddress);
    window.addEventListener("popstate", syncFromAddress);
    return () => {
      window.removeEventListener("hashchange", syncFromAddress);
      window.removeEventListener("popstate", syncFromAddress);
    };
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
    if (!routeReady) return;
    const nextPath = publicPaths[activeTab];
    if (nextPath) {
      if (window.location.pathname !== nextPath || window.location.hash) {
        window.history.pushState(null, "", nextPath);
      }
      return;
    }

    const nextHash = `#/${activeTab}`;
    if (window.location.hash !== nextHash) window.history.pushState(null, "", nextHash);
  }, [activeTab, routeReady]);

  useEffect(() => {
    const meta = seoByTab[activeTab] ?? seoByTab.landing;
    document.title = meta.title;

    setMetaTag('meta[name="description"]', { name: "description" }, meta.description);
    setMetaTag('meta[name="keywords"]', { name: "keywords" }, meta.keywords);
    setMetaTag('meta[property="og:title"]', { property: "og:title" }, meta.title);
    setMetaTag('meta[property="og:description"]', { property: "og:description" }, meta.description);
    const canonicalUrl = `https://saarthi-link.netlify.app${publicPaths[activeTab] ?? "/"}`;
    setMetaTag('meta[property="og:url"]', { property: "og:url" }, canonicalUrl);
    setMetaTag('meta[property="twitter:title"]', { property: "twitter:title" }, meta.title);
    setMetaTag('meta[property="twitter:description"]', { property: "twitter:description" }, meta.description);

    const canonical = document.head.querySelector('link[rel="canonical"]') ?? document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', canonicalUrl);
    if (!document.head.querySelector('link[rel="canonical"]')) {
      document.head.appendChild(canonical);
    }
  }, [activeTab]);

  const handleAuthSuccess = (user: string, token?: string, refreshToken?: string | null, persistence?: "local" | "session", accessRole?: AccessRole) => {
    if (token) setAuth(user, token, refreshToken, persistence, accessRole === "admin" ? "admin" : "user");
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
          role={role}
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
                <span className="text-[10px] text-muted-foreground font-mono">v2.1</span>
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
            {activeTab === "profile" && (
              authenticated
                ? <ProfilePage />
                : <AuthGate onSignIn={handleShowAuth} featureName="Profile" />
            )}
            {activeTab === "resume" && <ResumeAnalyzer />}
            {activeTab === "jobs" && <JobFinder />}
            {activeTab === "chat" && <ChatCoach />}
            {activeTab === "copilot" && <CareerCopilot />}
            {activeTab === "goals" && (
              authenticated
                ? <Goals />
                : <AuthGate onSignIn={handleShowAuth} featureName="Goals" />
            )}
            {activeTab === "interview" && <InterviewCoach />}
            {activeTab === "roadmaps" && <LearningRoadmaps />}
            {activeTab === "workspaces" && (
              authenticated
                ? <Workspaces />
                : <AuthGate onSignIn={handleShowAuth} featureName="Workspaces" />
            )}
            {activeTab === "gradhub" && (
              authenticated
                ? <GraduateHub />
                : <AuthGate onSignIn={handleShowAuth} featureName="Graduate Hub" />
            )}
            {activeTab === "growthlab" && <GrowthLab />}
            {activeTab === "toolkit" && <CareerToolkit />}
            {activeTab === "admin" && (
              role === "admin"
                ? <AdminPanel />
                : <AdminAccessGate onSignIn={handleShowAuth} isAuthenticated={authenticated} />
            )}
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
