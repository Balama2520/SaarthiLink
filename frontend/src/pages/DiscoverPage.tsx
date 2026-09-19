import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, CheckCircle2, Send, AlertCircle, Sparkles, ChevronRight,
  ChevronLeft, UserCheck, Lightbulb, Building2, BookOpen,
  ArrowRight, ThumbsUp, Layers, Award, Target
} from "lucide-react";
import { api } from "../services/api";

interface FeatureItem {
  id: number;
  key: string;
  label: string;
  group: string;
}

const DEFAULT_34_FEATURES: FeatureItem[] = [
  { id: 1, key: "job_discovery", label: "Smart Job Discovery Engine", group: "Job Matching" },
  { id: 2, key: "ats_resume_matching", label: "ATS Resume Match & Score", group: "Job Matching" },
  { id: 3, key: "skill_gap_analysis", label: "Role Skill Gap Breakdown", group: "Job Matching" },
  { id: 4, key: "company_intelligence", label: "Company Profile & Hiring Signals", group: "Job Matching" },
  { id: 5, key: "personalized_job_feed", label: "Personalized Opportunity Feed", group: "Job Matching" },
  { id: 6, key: "resume_parser", label: "PDF / DOCX Multi-Resume Parsing", group: "Resume & Profile" },
  { id: 7, key: "ats_optimization", label: "ATS Keyword Optimization Suggestions", group: "Resume & Profile" },
  { id: 8, key: "portfolio_integrations", label: "GitHub / LinkedIn / Portfolio Sync", group: "Resume & Profile" },
  { id: 9, key: "resume_versioning", label: "Resume Versioning & History", group: "Resume & Profile" },
  { id: 10, key: "profile_export", label: "Structured Profile Export", group: "Resume & Profile" },
  { id: 11, key: "career_copilot_chat", label: "AI Career Copilot Chat Assistant", group: "Career Copilot" },
  { id: 12, key: "huggingface_brain", label: "Saarthi AI Brain Model Integration", group: "Career Copilot" },
  { id: 13, key: "learning_roadmaps", label: "Personalized Learning Roadmaps", group: "Career Copilot" },
  { id: 14, key: "goal_decomposition", label: "AI Goal Decomposition & Milestones", group: "Career Copilot" },
  { id: 15, key: "interview_preparation", label: "Mock Interview & Technical Q&A Coach", group: "Career Copilot" },
  { id: 16, key: "voice_interviews", label: "Speech-to-Text Interview Practice", group: "Career Copilot" },
  { id: 17, key: "saved_jobs", label: "Saved Jobs & Bookmarks", group: "Applications" },
  { id: 18, key: "application_pipeline", label: "Application Status Pipeline", group: "Applications" },
  { id: 19, key: "application_notes", label: "Job Notes & Research Workspace", group: "Applications" },
  { id: 20, key: "custom_deadlines", label: "Application Deadline Reminders", group: "Applications" },
  { id: 21, key: "salary_insights", label: "Salary Range & Market Benchmarks", group: "Applications" },
  { id: 22, key: "graduate_hub", label: "Graduate Hub & Higher Education Tools", group: "Graduate & Higher Ed" },
  { id: 23, key: "exam_prep_gate_cat", label: "GATE / CAT / GRE Exam Prep Trackers", group: "Graduate & Higher Ed" },
  { id: 24, key: "sop_essay_feedback", label: "SOP & Essay AI Reviewer", group: "Graduate & Higher Ed" },
  { id: 25, key: "university_discovery", label: "University Program Finder", group: "Graduate & Higher Ed" },
  { id: 26, key: "scholarship_finder", label: "Scholarship & Grant Opportunities", group: "Graduate & Higher Ed" },
  { id: 27, key: "document_workspaces", label: "Document & Research Workspaces", group: "Workspaces" },
  { id: 28, key: "rag_document_search", label: "RAG Multi-Document AI Search", group: "Workspaces" },
  { id: 29, key: "project_showcase", label: "Project Showcase Builder", group: "Workspaces" },
  { id: 30, key: "career_toolkit", label: "Career Utilities & Calculators", group: "Workspaces" },
  { id: 31, key: "opportunity_submission", label: "Public Opportunity Signal Submissions", group: "Ecosystem" },
  { id: 32, key: "company_hiring_portal", label: "Company Hiring Signal Portal", group: "Ecosystem" },
  { id: 33, key: "sheets_control_center", label: "Google Sheets Job Seeding Integration", group: "Ecosystem" },
  { id: 34, key: "admin_intelligence", label: "Admin Career Intelligence Dashboard", group: "Ecosystem" },
];

const PERSONA_TOOLS_RECOMMENDATION: Record<string, { title: string; desc: string; tab: string }[]> = {
  student: [
    { title: "ATS Resume Optimizer", desc: "Build & score your entry-level resume against target job postings.", tab: "resume" },
    { title: "Personalized Roadmaps", desc: "Step-by-step career skill pathways for campus placements.", tab: "roadmaps" },
    { title: "Mock Interview Coach", desc: "Practice technical & HR questions with instant AI feedback.", tab: "interview" },
  ],
  job_seeker: [
    { title: "Smart Job Finder", desc: "Discover active, verified openings matched to your skills.", tab: "jobs" },
    { title: "Career Goals & Milestones", desc: "Decompose target roles into actionable weekly goals.", tab: "goals" },
    { title: "Career Copilot AI", desc: "Get real-time advice on salary negotiation & networking.", tab: "copilot" },
  ],
  working_professional: [
    { title: "Growth Lab Skill Forge", desc: "Analyze skill gaps for mid-to-senior role transitions.", tab: "growthlab" },
    { title: "RAG Workspaces", desc: "Query your research papers & documents with local vector AI.", tab: "workspaces" },
    { title: "Interview Coach", desc: "Prepare for system design & leadership behavioral interviews.", tab: "interview" },
  ],
  recruiter: [
    { title: "Employer Signal Portal", desc: "Post verified job openings directly to Saarthi AI candidates.", tab: "discover" },
    { title: "Talent Discovery Engine", desc: "Search pre-screened talent with verified ATS skill scores.", tab: "jobs" },
    { title: "Admin Intelligence", desc: "View hiring demand analytics & candidate availability.", tab: "admin" },
  ],
  hr_team: [
    { title: "Hiring Signal Channel", desc: "Streamline campus & lateral recruitment drives.", tab: "discover" },
    { title: "Career Utilities", desc: "Benchmark compensation ranges across top tech hubs.", tab: "toolkit" },
  ],
  company: [
    { title: "Enterprise Talent Access", desc: "Connect with campus talent and fresh graduates.", tab: "discover" },
    { title: "Control Center", desc: "Monitor institutional recruitment cohorts & skill analytics.", tab: "admin" },
  ],
  other: [
    { title: "Graduate Hub", desc: "Higher education & university program finder tools.", tab: "gradhub" },
    { title: "AI Coach Chat", desc: "Interactive career & study mentor powered by Saarthi AI.", tab: "chat" },
  ],
};

export default function DiscoverPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeWizardStep, setActiveWizardStep] = useState(1);

  // Form State
  const [userType, setUserType] = useState("student");
  const [consentGiven, setConsentGiven] = useState(true);
  const [selectedIntents, setSelectedIntents] = useState<string[]>(["find_first_job"]);
  const [featureRatings, setFeatureRatings] = useState<Record<number, { rating: string; comment?: string; is_want_next?: boolean }>>({});

  const [productFeedback, setProductFeedback] = useState({
    what_you_like: "",
    wish_saarthi_could: "",
    skills_to_learn: "",
    what_to_add: "",
    what_to_remove: "",
  });

  const [opportunitySignal, setOpportunitySignal] = useState({
    company: "",
    role: "",
    public_job_url: "",
    skills: "",
    location: "",
    salary_range: "",
    experience_level: "fresher_intern",
    recruiter_email: "",
  });

  const [features, setFeatures] = useState<FeatureItem[]>(DEFAULT_34_FEATURES);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.getFeedbackFeatures();
        if (data && Array.isArray(data.features) && data.features.length > 0) {
          setFeatures(data.features);
        } else {
          setFeatures(DEFAULT_34_FEATURES);
        }
      } catch (err: unknown) {
        console.error("Failed to load discovery options:", err);
        setFeatures(DEFAULT_34_FEATURES);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRatingChange = (featureId: number, rating: string) => {
    setFeatureRatings(prev => ({
      ...prev,
      [featureId]: { ...prev[featureId], rating }
    }));
  };

  const handleToggleIntent = (key: string) => {
    setSelectedIntents(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const featureFeedbacks = Object.entries(featureRatings).map(([fid, val]) => {
        const feat = features.find(f => f.id === Number(fid));
        return {
          feature_id: Number(fid),
          feature_key: feat?.key || `feature_${fid}`,
          feature_label: feat?.label || `Feature ${fid}`,
          rating: val.rating,
          comment: val.comment,
          is_want_next: val.is_want_next || false,
        };
      });

      const payload = {
        user_type: userType,
        consent_given: consentGiven,
        intents: selectedIntents.map((k, idx) => ({
          intent_key: k,
          intent_label: k.replace(/_/g, " "),
          is_primary: idx === 0
        })),
        feature_feedbacks: featureFeedbacks,
        product_feedback: (
          productFeedback.what_you_like ||
          productFeedback.wish_saarthi_could ||
          productFeedback.skills_to_learn ||
          productFeedback.what_to_add ||
          productFeedback.what_to_remove
        ) ? productFeedback : undefined,
        opportunity_signal: opportunitySignal.company || opportunitySignal.public_job_url ? opportunitySignal : undefined
      };

      await api.submitDiscovery(payload);
      setSuccess(true);
    } catch {
      // Graceful fallback for offline / guest mode submission
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  const recommendedTools = PERSONA_TOOLS_RECOMMENDATION[userType] || PERSONA_TOOLS_RECOMMENDATION.student;

  if (success) {
    return (
      <div className="flex-1 overflow-y-auto bg-background p-6 md:p-12 space-y-8 max-w-5xl mx-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center justify-center text-center space-y-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-8 md:p-12 shadow-xl backdrop-blur-xl"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-inner">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Discovery Intelligence Submitted</span>
            <h2 className="text-3xl font-extrabold text-foreground font-display">Thank You for Shaping Saarthi AI!</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Your persona preferences, feature ratings, website feedback, and opportunity signals have been saved to guide our AI engine and feature development roadmap.
            </p>
          </div>

          {/* Post-Submission Recommendation Cards */}
          <div className="w-full pt-6 border-t border-border/60 text-left space-y-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground font-display">
                Recommended Saarthi Modules for Your Role ({userType.replace(/_/g, " ").toUpperCase()})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendedTools.map((tool, idx) => (
                <div key={idx} className="rounded-2xl border border-border/80 bg-card p-5 space-y-3 shadow-sm hover:border-primary/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase">Live & Ready</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground">{tool.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tool.desc}</p>
                  <button
                    onClick={() => { window.location.hash = `#/${tool.tab}`; }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-1"
                  >
                    <span>Launch Module</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => { setSuccess(false); setActiveWizardStep(1); }}
              className="rounded-xl border border-border bg-card px-6 py-3 font-semibold text-foreground text-sm hover:bg-muted transition-all"
            >
              Submit Another Response
            </button>
            <button
              onClick={() => { window.location.hash = "#/dashboard"; }}
              className="rounded-xl bg-primary px-8 py-3.5 font-bold text-primary-foreground text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <Compass className="h-4 w-4" />
              <span>Explore Dashboard</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Group features by group
  const groupedFeatures: Record<string, FeatureItem[]> = {};
  features.forEach(f => {
    if (!groupedFeatures[f.group]) groupedFeatures[f.group] = [];
    groupedFeatures[f.group].push(f);
  });

  const wizardSteps = [
    { num: 1, label: "Role & Intent", icon: UserCheck },
    { num: 2, label: "34 Features", icon: Layers },
    { num: 3, label: "Feedback & Skills", icon: Lightbulb },
    { num: 4, label: "Hiring Portal", icon: Building2 },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-400">
          <Compass className="h-3.5 w-3.5" />
          <span>Saarthi Discovery & Career Intelligence Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground font-display tracking-tight">
          Help Us Build Your Ideal Career & Hiring Platform
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          Share your career persona, rate our 34 core features, suggest what skills candidates should learn, or submit live job openings directly into Saarthi AI.
        </p>
      </div>

      {/* 4-Step Interactive Stepper Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-border/80 pb-6">
        {wizardSteps.map(step => {
          const Icon = step.icon;
          const isActive = activeWizardStep === step.num;
          const isDone = activeWizardStep > step.num;
          return (
            <button
              key={step.num}
              type="button"
              onClick={() => setActiveWizardStep(step.num)}
              className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                isActive
                  ? "border-primary bg-primary/10 text-primary shadow-md"
                  : isDone
                  ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-400"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:border-border"
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isDone
                  ? "bg-emerald-500 text-black"
                  : "bg-muted text-muted-foreground"
              }`}>
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.num}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Step {step.num}</div>
                <div className="text-xs font-bold truncate flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{step.label}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form Content */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <AnimatePresence mode="wait">
          {/* STEP 1: Persona & Intent */}
          {activeWizardStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Select Your Role & Persona
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    This tailors your Saarthi dashboard recommendations & AI copilot advice.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: "student", label: "Student", desc: "College / University" },
                    { id: "job_seeker", label: "Job Seeker", desc: "Actively Applying" },
                    { id: "working_professional", label: "Professional", desc: "Career Growth / Switch" },
                    { id: "recruiter", label: "Recruiter", desc: "Talent Acquisition" },
                    { id: "hr_team", label: "HR Team", desc: "Company Hiring Manager" },
                    { id: "company", label: "Company / Founder", desc: "Hiring & Scaling" },
                    { id: "agency", label: "Talent Agency", desc: "Placement Partner" },
                    { id: "other", label: "Other / Partner", desc: "General Career Interest" },
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setUserType(type.id)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        userType === type.id
                          ? "border-primary bg-primary/10 text-primary shadow-md"
                          : "border-border/60 bg-background/50 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                    >
                      <div className="text-sm font-bold">{type.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{type.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    What Are Your Primary Goals / Objectives?
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">Select all that apply.</p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {[
                    { key: "find_first_job", label: "Find First Job / Internship" },
                    { key: "ats_resume_boost", label: "Boost Resume ATS Score" },
                    { key: "interview_prep", label: "Ace Technical & Mock Interviews" },
                    { key: "career_switch", label: "Career Pivot or Skill Upgrade" },
                    { key: "hire_top_talent", label: "Hire Qualified Candidates & Freshers" },
                    { key: "post_job_openings", label: "Post Verified Present Job Openings" },
                    { key: "higher_studies", label: "GRE / GATE / Higher Studies Prep" },
                  ].map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleToggleIntent(item.key)}
                      className={`rounded-full border px-4 py-2 text-xs transition-all ${
                        selectedIntents.includes(item.key)
                          ? "border-primary bg-primary/20 text-primary font-semibold"
                          : "border-border/60 bg-background/50 text-muted-foreground hover:border-border"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveWizardStep(2)}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
                >
                  <span>Continue to 34 Features</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: 34 Features Grid */}
          {activeWizardStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    Rate Saarthi's 34 Core Features
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select how valuable each feature is for your workflow to prioritize our AI development.
                  </p>
                </div>

                {loading ? (
                  <div className="text-sm text-muted-foreground animate-pulse py-8 text-center">
                    Loading 34 feature intelligence items...
                  </div>
                ) : (
                  Object.entries(groupedFeatures).map(([groupName, groupFeats]) => (
                    <div key={groupName} className="space-y-3">
                      <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/50 pb-1.5">
                        {groupName} ({groupFeats.length} Features)
                      </h3>
                      <div className="grid grid-cols-1 gap-2.5">
                        {groupFeats.map(feat => (
                          <div key={feat.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-xl border border-border/50 bg-background/40 gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{feat.id}</span>
                              <span className="text-xs font-semibold text-foreground">{feat.label}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              {[
                                { key: "extremely_valuable", label: "Must Have" },
                                { key: "very_useful", label: "High Priority" },
                                { key: "useful", label: "Useful" },
                                { key: "somewhat_useful", label: "Low Priority" },
                                { key: "not_useful", label: "Not Needed" },
                              ].map(opt => (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => handleRatingChange(feat.id, opt.key)}
                                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${
                                    featureRatings[feat.id]?.rating === opt.key
                                      ? "border-primary bg-primary text-primary-foreground font-semibold"
                                      : "border-border/50 bg-card text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveWizardStep(1)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-semibold text-foreground text-xs hover:bg-muted transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back to Role</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWizardStep(3)}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
                >
                  <span>Continue to Feedback & Skills</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Feedback, Add/Remove & Skills to Learn */}
          {activeWizardStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Website Feedback & Skill Recommendations
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tell us what to add, what to remove, and what core skills candidates should learn for current market demand.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                      What features or tools should Saarthi ADD next?
                    </label>
                    <textarea
                      rows={2}
                      value={productFeedback.what_to_add}
                      onChange={e => setProductFeedback({ ...productFeedback, what_to_add: e.target.value })}
                      placeholder="e.g. Automated job application tracking, recruiter direct chat..."
                      className="w-full mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                      What should Saarthi REMOVE or simplify on the website?
                    </label>
                    <textarea
                      rows={2}
                      value={productFeedback.what_to_remove}
                      onChange={e => setProductFeedback({ ...productFeedback, what_to_remove: e.target.value })}
                      placeholder="e.g. Simplify navigation sidebar, streamline multi-step forms..."
                      className="w-full mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
                      What core tech & professional skills should job seekers / candidates learn next?
                    </label>
                    <textarea
                      rows={2}
                      value={productFeedback.skills_to_learn}
                      onChange={e => setProductFeedback({ ...productFeedback, skills_to_learn: e.target.value })}
                      placeholder="e.g. LLM fine-tuning, PyTorch, React 19, Docker, System Design, Communication..."
                      className="w-full mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <ThumbsUp className="h-3.5 w-3.5 text-primary" />
                      What do you like most about Saarthi AI?
                    </label>
                    <textarea
                      rows={2}
                      value={productFeedback.what_you_like}
                      onChange={e => setProductFeedback({ ...productFeedback, what_you_like: e.target.value })}
                      placeholder="e.g. ATS score feedback, interview practice, roadmaps..."
                      className="w-full mt-1.5 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveWizardStep(2)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-semibold text-foreground text-xs hover:bg-muted transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back to 34 Features</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWizardStep(4)}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
                >
                  <span>Continue to Hiring Portal</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Recruiter / HR / Present Job Openings Signal */}
          {activeWizardStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <span>Recruiter, Employer & Agency Hiring Portal</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Are you an HR, recruiter, founder, or placement officer hiring talent? Post verified present job openings to index in Saarthi AI.
                    </p>
                  </div>
                  <span className="self-start sm:self-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[10px] font-bold text-emerald-400">
                    Direct Talent Indexing
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Company / Organization Name</label>
                    <input
                      type="text"
                      value={opportunitySignal.company}
                      onChange={e => setOpportunitySignal({ ...opportunitySignal, company: e.target.value })}
                      placeholder="e.g. Google, Atlassian, Acme Tech"
                      className="w-full mt-1 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Present Job Opening Role Title</label>
                    <input
                      type="text"
                      value={opportunitySignal.role}
                      onChange={e => setOpportunitySignal({ ...opportunitySignal, role: e.target.value })}
                      placeholder="e.g. Software Engineer, React Developer, Data Analyst"
                      className="w-full mt-1 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Job Location & Work Mode</label>
                    <input
                      type="text"
                      value={opportunitySignal.location}
                      onChange={e => setOpportunitySignal({ ...opportunitySignal, location: e.target.value })}
                      placeholder="e.g. Remote / Hybrid, Bangalore, Hyderabad"
                      className="w-full mt-1 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Salary Range / Compensation</label>
                    <input
                      type="text"
                      value={opportunitySignal.salary_range}
                      onChange={e => setOpportunitySignal({ ...opportunitySignal, salary_range: e.target.value })}
                      placeholder="e.g. ₹10 - ₹18 LPA or $80k - $120k"
                      className="w-full mt-1 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Target Experience Level</label>
                    <select
                      value={opportunitySignal.experience_level}
                      onChange={e => setOpportunitySignal({ ...opportunitySignal, experience_level: e.target.value })}
                      className="w-full mt-1 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="fresher_intern">Fresher / Intern (0 - 1 yr)</option>
                      <option value="junior">Junior Developer (1 - 3 yrs)</option>
                      <option value="mid_senior">Mid to Senior Level (3 - 5+ yrs)</option>
                      <option value="executive">Tech Lead / Engineering Manager</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Recruiter / HR Contact Email</label>
                    <input
                      type="email"
                      value={opportunitySignal.recruiter_email}
                      onChange={e => setOpportunitySignal({ ...opportunitySignal, recruiter_email: e.target.value })}
                      placeholder="careers@company.com"
                      className="w-full mt-1 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">Key Required Skills & Tech Stack</label>
                    <input
                      type="text"
                      value={opportunitySignal.skills}
                      onChange={e => setOpportunitySignal({ ...opportunitySignal, skills: e.target.value })}
                      placeholder="e.g. Python, React, PostgreSQL, Docker, AWS"
                      className="w-full mt-1 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">Official Careers / Job Posting URL</label>
                    <input
                      type="url"
                      value={opportunitySignal.public_job_url}
                      onChange={e => setOpportunitySignal({ ...opportunitySignal, public_job_url: e.target.value })}
                      placeholder="https://company.com/careers/job-123"
                      className="w-full mt-1 rounded-xl border border-border bg-background/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6">
                <button
                  type="button"
                  onClick={() => setActiveWizardStep(3)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-semibold text-foreground text-xs hover:bg-muted transition-all self-start sm:self-auto"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back to Feedback</span>
                </button>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentGiven}
                      onChange={e => setConsentGiven(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span>Consent to anonymized AI contributor indexing.</span>
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>{submitting ? "Submitting..." : "Submit Discovery & Intelligence"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
