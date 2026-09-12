import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, Sparkles, Database,
  ArrowRight, CheckCircle2, ShieldCheck,
  Bot, Zap, Play, Pause, RotateCcw, X, Video, UserCheck
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { api } from "../services/api";

type ComponentStatus = "configured" | "config_required" | "unavailable" | "ok" | "unknown" | "coming_soon";

function statusStyle(status: ComponentStatus) {
  if (status === "ok") return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  if (status === "configured" || status === "coming_soon") return "text-blue-400 border-blue-500/30 bg-blue-500/10";
  if (status === "config_required") return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  return "text-muted-foreground border-border bg-muted/40";
}

interface LandingPageProps {
  onShowAuth?: () => void;
  customVideoUrl?: string;
}

export default function LandingPage({ onShowAuth, customVideoUrl = "/demo-video.mp4" }: LandingPageProps) {
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const [serviceStatus, setServiceStatus] = useState<Record<string, { status?: ComponentStatus }>>({});
  
  // Video showcase state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [videoSrc] = useState<string>(customVideoUrl);
  const [hasVideoError, setHasVideoError] = useState(false);

  useEffect(() => {
    void api.getHealth()
      .then((health) => setServiceStatus(health.components ?? {}))
      .catch(() => setServiceStatus({}));
  }, []);

  // Video walkthrough step simulation
  const videoSteps = [
    { title: "1. Assess Your Profile", detail: "Upload your resume and see instant ATS scores, keyword matches, and structural feedback.", icon: "📄" },
    { title: "2. Prepare & Practice", detail: "Practice interviews with AI-guided coaching, speech-to-text practice, and actionable fixes.", icon: "🎙️" },
    { title: "3. Apply & Match", detail: "Discover verified job opportunities matched specifically to the skills and experience you have.", icon: "🎯" },
    { title: "4. Arrive & Learn", detail: "Build personalized 30/90-day learning roadmaps to bridge the gap to your target offer.", icon: "🗺️" }
  ];

  useEffect(() => {
    let interval: number | undefined;
    if (showVideoModal && isVideoPlaying && hasVideoError) {
      interval = window.setInterval(() => {
        setActiveStepIndex((prev) => {
          if (prev >= videoSteps.length - 1) {
            setIsVideoPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3500);
    }
    return () => { if (interval) window.clearInterval(interval); };
  }, [showVideoModal, isVideoPlaying, hasVideoError]);

  const handleStartVideo = () => {
    setShowVideoModal(true);
    setIsVideoPlaying(true);
    setActiveStepIndex(0);
  };

  const handleFinishVideoAndShowAuth = () => {
    setShowVideoModal(false);
    setIsVideoPlaying(false);
    if (onShowAuth) {
      onShowAuth();
    } else {
      setActiveTab("dashboard");
    }
  };

  const pillars = [
    {
      icon: Compass,
      title: "Discovery & Feedback Signal Loop",
      description: "Captures granular feature ratings across 34 capability modules from job seekers, students, and companies.",
      badge: "IMPLEMENTED",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400"
    },
    {
      icon: Database,
      title: "14-Tab Sheets Control Center",
      description: "A configurable Google Sheets control surface for staging, deduplicating, and normalizing public opportunities.",
      badge: "CONFIG_REQUIRED",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400"
    },
    {
      icon: Bot,
      title: "Dual AI Gateway Architecture",
      description: "Primary Google Gemini LLM paired with Hugging Face Saarthi Brain adapter for career guidance and resume evaluation.",
      badge: "CONFIG_REQUIRED",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      color: "from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-400"
    },
    {
      icon: ShieldCheck,
      title: "Opportunity Submission & Review",
      description: "Public job links and hiring signals can be submitted for validation; publication is not automatic.",
      badge: "IMPLEMENTED",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400"
    }
  ];

  const userPaths = [
    {
      title: "Job Seekers & Students",
      tag: "CANDIDATE PATH",
      steps: [
        "Create profile & discover career alignment",
        "Upload resume for ATS & skill gap analysis",
        "Practice role-specific mock interviews",
        "Explore opportunities when a configured source has published them"
      ],
      actionText: "Launch Candidate Path",
      actionTab: "discover"
    },
    {
      title: "Companies & Hiring Teams",
      tag: "RECRUITER PATH",
      steps: [
        "Register organization profile & hiring needs",
        "Submit opportunity signals & job roles",
        "Specify required skills & experience levels",
        "Shape talent discovery pipeline rules"
      ],
      actionText: "Submit Hiring Signal",
      actionTab: "contact"
    }
  ];

  const integrationStatuses = [
    { name: "Google Gemini AI Gateway", status: serviceStatus.ai_gateway?.status ?? "unknown" },
    { name: "Hugging Face Brain Adapter", status: serviceStatus.huggingface?.status ?? "unknown" },
    { name: "Google Sheets Job Control", status: serviceStatus.google_sheets?.status ?? "unknown" },
    { name: "Discovery & Feedback API", status: serviceStatus.api?.status ?? "unknown" },
    { name: "Direct ATS Recruiter Sync", status: "coming_soon" as ComponentStatus }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-10 space-y-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card to-background p-8 md:p-14 shadow-2xl"
      >
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>SAARTHI AI — Guiding Intelligence • Connected Action</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground font-display leading-tight">
            Architecting the Future of <span className="bg-gradient-to-r from-primary via-cyan-400 to-purple-400 bg-clip-text text-transparent">Career & Opportunity Intelligence</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed">
            Saarthi AI helps job seekers and students organize career information, submit feedback, and use AI-assisted guidance when a provider is configured. Opportunity data retains its source and is never invented to fill the interface.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button
              onClick={handleStartVideo}
              className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 font-bold text-amber-950 shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-950/20 text-amber-950">
                <Play className="h-3.5 w-3.5 fill-amber-950 ml-0.5" />
              </div>
              <span>Watch App Demo Video</span>
            </button>

            <button
              onClick={() => setActiveTab("discover")}
              className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-6 py-3.5 font-semibold text-primary backdrop-blur-md transition-all hover:bg-primary/20 hover:scale-[1.02]"
            >
              <Compass className="h-5 w-5" />
              <span>Explore Discovery Engine</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => setActiveTab("dashboard")}
              className="flex items-center gap-2 rounded-xl border border-border bg-card/80 px-6 py-3.5 font-semibold text-foreground backdrop-blur-md transition-all hover:bg-muted"
            >
              <Zap className="h-5 w-5 text-primary" />
              <span>Launch Dashboard</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* App Video Walkthrough Showcase Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Video Header */}
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">Saarthi AI — App Video Showcase</h3>
                    <p className="text-xs text-muted-foreground">Guided tour of intelligence, preparation, and career actions</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowVideoModal(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Video Player Display Container */}
              <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
                {!hasVideoError ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/80 bg-slate-950 shadow-inner flex items-center justify-center">
                    <video
                      src={videoSrc}
                      controls
                      autoPlay
                      onEnded={handleFinishVideoAndShowAuth}
                      onError={() => setHasVideoError(true)}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/80 bg-slate-950 p-6 md:p-10 flex flex-col justify-between shadow-inner">
                    {/* Simulated App Screen Player */}
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="ml-2 font-mono text-[11px]">Saarthi AI Platform Video Tour</span>
                      </div>
                      <span className="font-mono text-emerald-400">Step {activeStepIndex + 1} of {videoSteps.length}</span>
                    </div>

                    {/* Active Step Content Screen */}
                    <motion.div
                      key={activeStepIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="my-auto space-y-4 text-center max-w-xl mx-auto"
                    >
                      <div className="text-5xl">{videoSteps[activeStepIndex].icon}</div>
                      <h4 className="text-2xl font-bold text-white font-display">
                        {videoSteps[activeStepIndex].title}
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {videoSteps[activeStepIndex].detail}
                      </p>
                    </motion.div>

                    {/* Step Progress Pills */}
                    <div className="grid grid-cols-4 gap-2 pt-4">
                      {videoSteps.map((s, idx) => (
                        <button
                          key={s.title}
                          onClick={() => { setActiveStepIndex(idx); setIsVideoPlaying(false); }}
                          className={`h-2 rounded-full transition-all ${
                            idx === activeStepIndex
                              ? "bg-amber-400 shadow-sm shadow-amber-400/50"
                              : idx < activeStepIndex
                              ? "bg-emerald-500"
                              : "bg-slate-800"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Player Controls & Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                      className="flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-xs font-semibold text-foreground transition-all hover:bg-muted"
                    >
                      {isVideoPlaying ? <Pause className="h-4 w-4 text-amber-400" /> : <Play className="h-4 w-4 text-emerald-400" />}
                      <span>{isVideoPlaying ? "Pause Video" : "Play Video"}</span>
                    </button>

                    <button
                      onClick={() => { setActiveStepIndex(0); setIsVideoPlaying(true); }}
                      className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Replay</span>
                    </button>
                  </div>

                  <button
                    onClick={handleFinishVideoAndShowAuth}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-amber-950 shadow-md shadow-amber-500/25 transition-all hover:scale-[1.02]"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Continue to Sign In / Guest Access</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Candidate vs Company Paths */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-display">Dual Platform Navigation</h2>
          <p className="text-sm text-muted-foreground">Candidate tools are available today; company signals are collected for review and do not imply an employer partnership.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userPaths.map((path, i) => (
            <motion.div
              key={path.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border/70 bg-card p-7 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <span className="inline-block rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {path.tag}
                </span>
                <h3 className="text-2xl font-bold text-foreground font-display">{path.title}</h3>
                <ul className="space-y-2.5">
                  {path.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => setActiveTab(path.actionTab as any)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 px-5 py-3 font-semibold text-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                <span>{path.actionText}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Core Platform Pillars */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-display">Platform Pillars & Architecture</h2>
          <p className="text-sm text-muted-foreground">Built on transparent factual analysis, structured job pipeline rules, and AI guidance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-7 transition-all hover:border-primary/40 hover:shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border bg-gradient-to-br ${pillar.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${pillar.badgeColor}`}>
                    {pillar.badge}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-bold text-foreground font-display group-hover:text-primary transition-colors">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Real System Integration Status Table */}
      <div className="rounded-2xl border border-border/70 bg-card p-7 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground font-display">System Integration Status</h3>
            <p className="text-xs text-muted-foreground">Status is read from the backend. “Configured” means settings exist; it is not a claim that a third-party service is currently reachable.</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {integrationStatuses.map((item) => (
            <div key={item.name} className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/30">
              <span className="text-xs font-medium text-foreground">{item.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle(item.status)}`}>
                {item.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Footer Banner */}
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/10 to-cyan-500/10 p-8 text-center space-y-4">
        <h3 className="text-2xl font-bold text-foreground font-display">Contribute to the Saarthi AI Ecosystem</h3>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Participate in our feature discovery survey, submit hiring opportunity signals, or reach out to our engineering team.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={() => setActiveTab("discover")}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
          >
            Start Discovery Survey
          </button>
          <button
            onClick={() => setActiveTab("contact")}
            className="rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted"
          >
            Contact Engineering Team
          </button>
        </div>
      </div>
    </div>
  );
}
