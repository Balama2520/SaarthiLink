import { useState } from "react";
import AuthPage from "./pages/AuthPage";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import ChatCoach from "./pages/ChatCoach";
import GraduateHub from "./pages/GraduateHub";
import AIWorkspaces from "./pages/AIWorkspaces";
import SkillForge from "./pages/SkillForge";
import JobFinder from "./pages/JobFinder";
import InterviewCoach from "./pages/InterviewCoach";
import AdminPanel from "./pages/AdminPanel";
import Notes from "./pages/Notes";
import ResearchHub from "./pages/ResearchHub";
import ExperimentStudio from "./pages/ExperimentStudio";
import AdmissionsHub from "./pages/AdmissionsHub";
import LearningRoadmaps from "./pages/LearningRoadmaps";
import Goals from "./pages/Goals";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem("access_token")));
  const [username, setUsername] = useState(() => localStorage.getItem("username") || "Guest User");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAuthModal, setShowAuthModal] = useState(false);


  const handleAuthSuccess = (user: string) => {
    setUsername(user);
    setAuthenticated(true);
    setActiveTab("dashboard");
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    setAuthenticated(false);
    setUsername("Guest User");
    setActiveTab("dashboard");
  };

  const handleShowAuth = () => setShowAuthModal(true);
  const handleCloseAuth = () => setShowAuthModal(false);

  return (
    <ErrorBoundary>
      <div className="relative flex min-h-screen bg-slate-950 text-slate-50 selection:bg-violet-500/30">
        {/* Sidebar navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          username={username}
          isAuthenticated={authenticated}
          onLogout={handleLogout}
          onSignIn={handleShowAuth}
        />

        {/* Main workspace */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <ErrorBoundary>
            {activeTab === "dashboard" && (
              <Dashboard username={username} setActiveTab={setActiveTab} onLogout={handleLogout} />
            )}
            {activeTab === "goals" && <Goals />}
            {activeTab === "gradhub" && <GraduateHub />}
            {activeTab === "research" && <ResearchHub />}
            {activeTab === "experiments" && <ExperimentStudio />}
            {activeTab === "admissions" && <AdmissionsHub />}
            {activeTab === "workspaces" && <AIWorkspaces />}
            {activeTab === "skillforge" && <SkillForge />}
            {activeTab === "jobs" && <JobFinder />}
            {activeTab === "interview" && <InterviewCoach />}
            {activeTab === "chat" && <ChatCoach username={username} />}
            {activeTab === "notes" && <Notes />}
            {activeTab === "roadmaps" && <LearningRoadmaps />}
            {activeTab === "admin" && <AdminPanel />}
          </ErrorBoundary>
        </main>

        {/* Auth Page — full-screen overlay */}
        {showAuthModal && (
          <div
            className="fixed inset-0 z-50"
            style={{ animation: "fadeIn 0.25s ease" }}
          >
            <AuthPage
              onSuccess={handleAuthSuccess}
              onGuestAccess={() => { handleAuthSuccess("Demo User"); }}
            />
            {/* Close button */}
            <button
              onClick={handleCloseAuth}
              aria-label="Close sign in"
              style={{
                position: "fixed", top: 20, right: 20, zIndex: 60,
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem", cursor: "pointer", lineHeight: 1,
                transition: "background 0.2s, color 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
