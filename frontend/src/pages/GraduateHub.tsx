import { useState, useEffect } from "react";
import { 
  GraduationCap, Award, Compass, Globe, DollarSign, Plus, Trash2, CheckCircle2, 
  Sparkles, Loader2, FileText, Briefcase, Calculator, FolderGit2, Link2
} from "lucide-react";
import { api } from "../services/api";

interface Course {
  id: string;
  semester: number;
  course_name: string;
  credits: number;
  gpa: string | null;
  status: string;
}

interface Certification {
  id: string;
  name: string;
  provider: string;
  target_date: string | null;
  status: string;
}

interface Placement {
  id: string;
  company: string;
  role: string;
  rounds_json: string;
  package: string | null;
  status: string;
}

export default function GraduateHub() {
  const [activeSubTab, setActiveSubTab] = useState<"resume" | "optimizer" | "tracker" | "compass" | "global">("resume");

  // NOTE: previously all six AI actions below (STAR bullets, keyword scan,
  // GitHub review, LinkedIn review, salary insight, global path) shared a
  // single `loading` boolean. Since they live on different sub-tabs and can
  // be triggered independently, one action finishing would silently clear
  // the spinner/disabled-state for a completely different action still in
  // flight. Each now has its own loading + error state.
  const [loadingStar, setLoadingStar] = useState(false);
  const [errorStar, setErrorStar] = useState<string | null>(null);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [errorKeywords, setErrorKeywords] = useState<string | null>(null);
  const [loadingGit, setLoadingGit] = useState(false);
  const [errorGit, setErrorGit] = useState<string | null>(null);
  const [loadingLi, setLoadingLi] = useState(false);
  const [errorLi, setErrorLi] = useState<string | null>(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [errorSalary, setErrorSalary] = useState<string | null>(null);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  // Resume builder states
  const [resumeText, setResumeText] = useState("");
  const [bulletTopic, setBulletTopic] = useState("");
  const [bulletDesc, setBulletDesc] = useState("");
  const [starBullets, setStarBullets] = useState<string[]>([]);
  const [optimizeTargetRole, setOptimizeTargetRole] = useState("Software Engineer");
  const [optimizeResults, setOptimizeResults] = useState<{ missing_keywords: string[]; critical_skills: string[]; recommendation: string } | null>(null);

  // Profile Optimizer states
  const [gitInput, setGitInput] = useState("");
  const [gitReview, setGitReview] = useState<{ profile_score: number; strengths: string[]; weaknesses: string[]; readme_advice: string; project_ideas: string[] } | null>(null);
  const [liInput, setLiInput] = useState("");
  const [liReview, setLiReview] = useState<{ headline_suggestions: string[]; about_summary: string; star_bullets: string[]; keyword_boosters: string[] } | null>(null);

  // Tracker states
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourse, setNewCourse] = useState({ semester: 1, name: "", credits: 3, gpa: "", status: "planned" });
  const [certs, setCerts] = useState<Certification[]>([]);
  const [newCert, setNewCert] = useState({ name: "", provider: "", date: "", status: "planned" });
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [newPlacement, setNewPlacement] = useState({ company: "", role: "", pkg: "", status: "eligible" });

  // Global & Salary states
  const [salaryRole, setSalaryRole] = useState("Software Engineer");
  const [salaryLoc, setSalaryLoc] = useState("Bengaluru");
  const [salaryData, setSalaryData] = useState<{ market_range: string; fresher_average: string; tax_estimate: string; cost_of_living_ratio: string; negotiation_tactics: string[] } | null>(null);
  const [globalCountry, setGlobalCountry] = useState("United States");
  const [globalData, setGlobalData] = useState<{ visa_type: string; masters_prep: string; scholarships: string[]; english_test_prep: string; remote_job_potential: string } | null>(null);

  // Compass states (timelines)
  const [compassRole, setCompassRole] = useState("Full Stack Developer");
  const [compassTimeline] = useState<Array<{ title: string; tasks: string[] }>>([
    { title: "Today", tasks: ["Complete 2 DSA questions on Arrays", "Add a commit to active repository"] },
    { title: "This Week", tasks: ["Structure project landing page in React", "Connect with 3 alumni on LinkedIn", "Solve 10 Leetcode questions"] },
    { title: "This Month", tasks: ["Host back-end project on Render/Vercel", "Acquire AWS Cloud Practitioner Cert", "Apply to 5 early-stage startup openings"] },
    { title: "90 Days Plan", tasks: ["Solve 100+ total DSA problems", "Generate detailed project template", "Secure 2 recruiter warm intros"] },
    { title: "6 Months Plan", tasks: ["Graduate campus degree syllabus", "Build 3 core proof-of-work repositories", "Interview for target roles"] }
  ]);

  // Load Trackers on Mount
  useEffect(() => {
    async function loadTrackerData() {
      try {
        const cList = await api.getDegreeCourses();
        setCourses(cList);
        const ceList = await api.getCerts();
        setCerts(ceList);
        const pList = await api.getPlacements();
        setPlacements(pList);
      } catch (err) {
        console.error("Failed to load tracker logs", err);
      }
    }
    loadTrackerData();
  }, []);

  // Handlers for Degree Course
  const handleAddCourse = async () => {
    if (!newCourse.name.trim()) return;
    try {
      await api.addDegreeCourse(newCourse.semester, newCourse.name, newCourse.credits, newCourse.gpa || undefined, newCourse.status);
      const data = await api.getDegreeCourses();
      setCourses(data);
      setNewCourse({ semester: 1, name: "", credits: 3, gpa: "", status: "planned" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await api.deleteDegreeCourse(id);
      setCourses(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Handlers for Certs
  const handleAddCert = async () => {
    if (!newCert.name.trim()) return;
    try {
      await api.addCert(newCert.name, newCert.provider, newCert.date || undefined, newCert.status);
      const data = await api.getCerts();
      setCerts(data);
      setNewCert({ name: "", provider: "", date: "", status: "planned" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCert = async (id: string) => {
    try {
      await api.deleteCert(id);
      setCerts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Handlers for Placements
  const handleAddPlacement = async () => {
    if (!newPlacement.company.trim()) return;
    try {
      await api.addPlacement(newPlacement.company, newPlacement.role, "[]", newPlacement.pkg || undefined, newPlacement.status);
      const data = await api.getPlacements();
      setPlacements(data);
      setNewPlacement({ company: "", role: "", pkg: "", status: "eligible" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePlacement = async (id: string) => {
    try {
      await api.deletePlacement(id);
      setPlacements(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // STAR Bullets generator
  const handleGenStar = async () => {
    if (!bulletTopic.trim() || !bulletDesc.trim()) return;
    setLoadingStar(true);
    setErrorStar(null);
    try {
      const res = await api.generateStarBullets(bulletTopic, bulletDesc);
      setStarBullets(res);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setErrorStar(message || "Failed to generate STAR bullets. Please try again.");
    } finally {
      setLoadingStar(false);
    }
  };

  // Keyword Optimizer
  const handleKeywords = async () => {
    if (!resumeText.trim()) return;
    setLoadingKeywords(true);
    setErrorKeywords(null);
    try {
      const res = await api.optimizeKeywords(resumeText, optimizeTargetRole);
      setOptimizeResults(res);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setErrorKeywords(message || "Failed to scan keywords. Please try again.");
    } finally {
      setLoadingKeywords(false);
    }
  };

  // Profile reviewer
  const handleGitReview = async () => {
    if (!gitInput.trim()) return;
    setLoadingGit(true);
    setErrorGit(null);
    try {
      const res = await api.githubReview(gitInput, optimizeTargetRole);
      setGitReview(res);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setErrorGit(message || "Failed to analyze GitHub profile. Please try again.");
    } finally {
      setLoadingGit(false);
    }
  };

  const handleLiReview = async () => {
    if (!liInput.trim()) return;
    setLoadingLi(true);
    setErrorLi(null);
    try {
      const res = await api.linkedinOptimize(liInput, optimizeTargetRole);
      setLiReview(res);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setErrorLi(message || "Failed to optimize LinkedIn copy. Please try again.");
    } finally {
      setLoadingLi(false);
    }
  };

  // Salary insights
  const handleSalary = async () => {
    setLoadingSalary(true);
    setErrorSalary(null);
    try {
      const res = await api.getSalaryInsight(salaryRole, salaryLoc);
      setSalaryData(res);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setErrorSalary(message || "Failed to load salary insights. Please try again.");
    } finally {
      setLoadingSalary(false);
    }
  };

  // Global visa insights
  const handleGlobal = async () => {
    setLoadingGlobal(true);
    setErrorGlobal(null);
    try {
      const res = await api.getGlobalPath(globalCountry);
      setGlobalData(res);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setErrorGlobal(message || "Failed to load global path insights. Please try again.");
    } finally {
      setLoadingGlobal(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 overflow-y-auto px-8 py-10 font-sans text-slate-100 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.08),_transparent_35%)] pointer-events-none"></div>
      
      {/* Tab Header Title */}
      <div className="mb-8 max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2.5 text-white">
            <GraduationCap className="w-9 h-9 text-violet-400" /> Graduate Hub & Compass
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 max-w-xl">
            Everything needed to prepare for graduation, plan career compass roadmaps, map CGPAs, and optimize hiring portfolios.
          </p>
        </div>
      </div>

      {/* Sub-Tab navigation buttons */}
      <div className="max-w-5xl mx-auto mb-8 border-b border-white/5 flex flex-wrap gap-2">
        {([
          { id: "resume", label: "Resume STAR Builder", icon: FileText },
          { id: "optimizer", label: "GitHub & LinkedIn Optimizer", icon: Link2 },
          { id: "tracker", label: "Academics & Certs Logs", icon: Award },
          { id: "compass", label: "Career Compass", icon: Compass },
          { id: "global", label: "Salary & Global Path", icon: Globe }
        ] as const).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 ${
                activeSubTab === tab.id 
                  ? "border-violet-500 text-violet-300 bg-violet-500/5" 
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Page Content Render area */}
      <div className="max-w-5xl mx-auto">
        
        {/* SUBTAB: Resume Star Bullets */}
        {activeSubTab === "resume" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            {/* Left: Input */}
            <div className="space-y-6">
              <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl relative">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-violet-400" /> STAR Bullet Generator
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold uppercase">Project or Experience Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Personal Portfolio website"
                      value={bulletTopic}
                      onChange={(e) => setBulletTopic(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold uppercase">Raw Accomplishments</label>
                    <textarea 
                      rows={4}
                      placeholder="e.g. I coded the frontend in React. People said it looks nice. I also connected it to Node database."
                      value={bulletDesc}
                      onChange={(e) => setBulletDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-violet-500 resize-none"
                    />
                  </div>
                  <button
                    onClick={handleGenStar}
                    disabled={loadingStar || !bulletTopic.trim() || !bulletDesc.trim()}
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-semibold rounded-xl transition hover:brightness-110 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
                  >
                    {loadingStar && <Loader2 className="w-4 h-4 animate-spin" />}
                    Generate STAR Bullets
                  </button>
                  {errorStar && <p className="text-red-400 text-xs">{errorStar}</p>}
                </div>
              </div>

              {/* Keyword Optimizer */}
              <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Calculator className="w-4.5 h-4.5 text-cyan-400" /> ATS Keyword Scanner
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold uppercase">Target Job Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Backend Developer"
                      value={optimizeTargetRole}
                      onChange={(e) => setOptimizeTargetRole(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold uppercase">Paste Resume Text</label>
                    <textarea 
                      rows={4}
                      placeholder="Paste your CV content..."
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-violet-500 resize-none"
                    />
                  </div>
                  <button
                    onClick={handleKeywords}
                    disabled={loadingKeywords || !resumeText.trim()}
                    className="w-full py-3 bg-slate-950 border border-violet-500/20 hover:border-violet-400 hover:bg-violet-500/10 text-violet-200 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
                  >
                    {loadingKeywords && <Loader2 className="w-4 h-4 animate-spin" />}
                    Scan ATS Keywords
                  </button>
                  {errorKeywords && <p className="text-red-400 text-xs">{errorKeywords}</p>}
                </div>
              </div>
            </div>

            {/* Right: Output */}
            <div className="space-y-6">
              {/* STAR Bullets Output */}
              <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl min-h-[220px] flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">STAR Bullet Points</h4>
                  {starBullets.length > 0 ? (
                    <ul className="space-y-4">
                      {starBullets.map((bullet, idx) => (
                        <li key={idx} className="p-3 bg-slate-950/50 rounded-xl border border-white/5 text-sm text-slate-200 flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-sm italic">Define experience credentials on the left to review STAR rewrites.</p>
                  )}
                </div>
              </div>

              {/* Keyword Output */}
              <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl min-h-[220px]">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Keyword Audit Findings</h4>
                {optimizeResults ? (
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="font-semibold text-red-400 mb-2">Missing Keywords:</p>
                      <div className="flex flex-wrap gap-2">
                        {optimizeResults.missing_keywords.map((kw, i) => (
                          <span key={i} className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-950/40 text-red-300 border border-red-900/30">{kw}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-cyan-400 mb-2">Critical Skills to Emphasize:</p>
                      <div className="flex flex-wrap gap-2">
                        {optimizeResults.critical_skills.map((s, i) => (
                          <span key={i} className="px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-950/40 text-cyan-300 border border-cyan-900/30">{s}</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                      <strong>AI Tip:</strong> {optimizeResults.recommendation}
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm italic">Scan resume to see keyword analytics and ATS placement recommendations.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: GitHub & LinkedIn Optimizer */}
        {activeSubTab === "optimizer" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            {/* GitHub Optimizer */}
            <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-violet-400" /> GitHub Profile Review
              </h3>
              <div className="space-y-4">
                <input 
                  type="text"
                  placeholder="Enter GitHub Username or paste project list..."
                  value={gitInput}
                  onChange={(e) => setGitInput(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={handleGitReview}
                  disabled={loadingGit || !gitInput.trim()}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  {loadingGit && <Loader2 className="w-4 h-4 animate-spin" />}
                  Analyze GitHub Profile
                </button>
                {errorGit && <p className="text-red-400 text-xs">{errorGit}</p>}
              </div>

              {gitReview && (
                <div className="space-y-4 border-t border-white/5 pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Profile Score:</span>
                    <span className="text-lg font-bold text-cyan-400">{gitReview.profile_score}/100</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300 block mb-1">Strengths:</span>
                    <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1">
                      {gitReview.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300 block mb-1">Areas to Improve:</span>
                    <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1">
                      {gitReview.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-white/5 text-xs">
                    <strong className="text-violet-400">Readme Advice:</strong> {gitReview.readme_advice}
                  </div>
                </div>
              )}
            </div>

            {/* LinkedIn Optimizer */}
            <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-cyan-400" /> LinkedIn Optimization
              </h3>
              <div className="space-y-4">
                <textarea 
                  rows={2}
                  placeholder="Paste your current LinkedIn summary / headline..."
                  value={liInput}
                  onChange={(e) => setLiInput(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-violet-500 resize-none"
                />
                <button
                  onClick={handleLiReview}
                  disabled={loadingLi || !liInput.trim()}
                  className="w-full py-3 bg-slate-950 border border-violet-500/20 hover:border-violet-400 hover:bg-violet-500/10 text-violet-200 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  {loadingLi && <Loader2 className="w-4 h-4 animate-spin" />}
                  Optimize Profile Copy
                </button>
                {errorLi && <p className="text-red-400 text-xs">{errorLi}</p>}
              </div>

              {liReview && (
                <div className="space-y-4 border-t border-white/5 pt-4 text-sm">
                  <div>
                    <span className="font-semibold text-slate-300 block mb-1.5">Headline Suggestions:</span>
                    <div className="space-y-1">
                      {liReview.headline_suggestions.map((h, i) => (
                        <div key={i} className="p-2 bg-slate-950/40 rounded border border-white/5 text-xs text-violet-200">{h}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300 block mb-1">About Summary Story:</span>
                    <p className="text-xs text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-white/5 leading-relaxed">{liReview.about_summary}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300 block mb-1">Keywords To Boost:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {liReview.keyword_boosters.map((k, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] rounded-full bg-cyan-950/50 text-cyan-300 border border-cyan-900/20">{k}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB: Academic trackers */}
        {activeSubTab === "tracker" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Degree course tracker */}
            <div className="lg:col-span-1 p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-violet-400" /> Degree Syllabus Logs
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="w-20">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Sem</label>
                    <select
                      value={newCourse.semester}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, semester: parseInt(e.target.value) }))}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Course Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Data Structures"
                      value={newCourse.name}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Credits</label>
                    <input 
                      type="number" 
                      value={newCourse.credits}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, credits: parseInt(e.target.value) }))}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 block mb-0.5">GPA/Grade</label>
                    <input 
                      type="text" 
                      placeholder="e.g. A+ or 9.0"
                      value={newCourse.gpa}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, gpa: e.target.value }))}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddCourse}
                  className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Course
                </button>
              </div>

              {/* Course lists */}
              <div className="mt-4 border-t border-white/5 pt-4 max-h-[250px] overflow-y-auto space-y-2 pr-1.5">
                {courses.map((course) => (
                  <div key={course.id} className="p-2.5 rounded-lg bg-slate-950/40 border border-white/5 flex items-center justify-between text-xs text-slate-300">
                    <div>
                      <p className="font-semibold text-white truncate max-w-[150px]">{course.course_name}</p>
                      <p className="text-[10px] text-slate-500">Sem {course.semester} · {course.credits} Credits {course.gpa ? `· Grade: ${course.gpa}` : ""}</p>
                    </div>
                    <button onClick={() => handleDeleteCourse(course.id)} className="p-1 rounded text-slate-500 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Certification planner */}
            <div className="lg:col-span-1 p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" /> Certification Planner
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Cert Name</label>
                  <input 
                    type="text" 
                    placeholder="AWS Solutions Architect"
                    value={newCert.name}
                    onChange={(e) => setNewCert(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Provider</label>
                    <input 
                      type="text" 
                      placeholder="Amazon / Google"
                      value={newCert.provider}
                      onChange={(e) => setNewCert(prev => ({ ...prev, provider: e.target.value }))}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Target Date</label>
                    <input 
                      type="text" 
                      placeholder="Q3 2026"
                      value={newCert.date}
                      onChange={(e) => setNewCert(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddCert}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-xs text-black font-semibold rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Plan Certificate
                </button>
              </div>

              {/* Certifications lists */}
              <div className="mt-4 border-t border-white/5 pt-4 max-h-[250px] overflow-y-auto space-y-2 pr-1.5">
                {certs.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-lg bg-slate-950/40 border border-white/5 flex items-center justify-between text-xs text-slate-300">
                    <div>
                      <p className="font-semibold text-white truncate max-w-[150px]">{c.name}</p>
                      <p className="text-[10px] text-slate-500">{c.provider} · Target: {c.target_date || "N/A"}</p>
                    </div>
                    <button onClick={() => handleDeleteCert(c.id)} className="p-1 rounded text-slate-500 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Campus placements */}
            <div className="lg:col-span-1 p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-400" /> Placement CRM Tracker
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Company Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Goldman Sachs"
                    value={newPlacement.company}
                    onChange={(e) => setNewPlacement(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Role</label>
                    <input 
                      type="text" 
                      placeholder="Analyst"
                      value={newPlacement.role}
                      onChange={(e) => setNewPlacement(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] text-slate-400 block mb-0.5">CTC (INR)</label>
                    <input 
                      type="text" 
                      placeholder="18 LPA"
                      value={newPlacement.pkg}
                      onChange={(e) => setNewPlacement(prev => ({ ...prev, pkg: e.target.value }))}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddPlacement}
                  className="w-full py-2 bg-gradient-to-r from-violet-600 to-cyan-500 text-xs font-semibold text-white rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Placement
                </button>
              </div>

              {/* Placements lists */}
              <div className="mt-4 border-t border-white/5 pt-4 max-h-[250px] overflow-y-auto space-y-2 pr-1.5">
                {placements.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-lg bg-slate-950/40 border border-white/5 flex items-center justify-between text-xs text-slate-300">
                    <div>
                      <p className="font-semibold text-white truncate max-w-[150px]">{p.company}</p>
                      <p className="text-[10px] text-slate-500">{p.role} {p.package ? `· ${p.package}` : ""}</p>
                    </div>
                    <button onClick={() => handleDeletePlacement(p.id)} className="p-1 rounded text-slate-500 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: Career Compass roadmaps timeline */}
        {activeSubTab === "compass" && (
          <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-violet-400" /> Career Compass Milestones
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Personalized week-by-week timeline generated grounded on goals.</p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  value={compassRole} 
                  onChange={(e) => setCompassRole(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white w-44" 
                />
                <button
                  type="button"
                  disabled
                  title="Dynamic recalculation isn't wired up yet — this timeline is a static template for now."
                  className="px-3 py-1.5 bg-slate-800 text-slate-500 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-not-allowed"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Recalculate
                </button>
              </div>
            </div>

            <div className="relative border-l border-violet-500/20 ml-4 space-y-6">
              {compassTimeline.map((item, idx) => (
                <div key={idx} className="relative pl-6">
                  <div className="absolute -left-[6px] top-1.5 w-3 h-3 rounded-full bg-slate-950 border-2 border-violet-500"></div>
                  <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/20 mb-2 inline-block">
                      {item.title}
                    </span>
                    <ul className="space-y-2 mt-1">
                      {item.tasks.map((task, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB: Global paths & Salary benchmarks */}
        {activeSubTab === "global" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            {/* Salary Insights */}
            <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-cyan-400" /> Salary Insights & Market Scale
              </h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1 uppercase font-semibold">Target Job</label>
                    <input 
                      type="text" 
                      value={salaryRole} 
                      onChange={(e) => setSalaryRole(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-slate-100 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1 uppercase font-semibold">Location</label>
                    <input 
                      type="text" 
                      value={salaryLoc} 
                      onChange={(e) => setSalaryLoc(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-slate-100 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSalary}
                  disabled={loadingSalary}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2"
                >
                  {loadingSalary && <Loader2 className="w-4 h-4 animate-spin" />}
                  Get Salary Insights
                </button>
                {errorSalary && <p className="text-red-400 text-xs">{errorSalary}</p>}
              </div>

              {salaryData && (
                <div className="space-y-4 border-t border-white/5 pt-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] text-slate-400">Market Range</p>
                      <p className="text-sm font-bold text-white mt-1">{salaryData.market_range}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] text-slate-400">Average Fresher Salary</p>
                      <p className="text-sm font-bold text-cyan-400 mt-1">{salaryData.fresher_average}</p>
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-950/50 rounded-2xl border border-white/5 leading-relaxed">
                    <p className="font-semibold text-slate-300 mb-1">Tax Bracket Estimate:</p>
                    <p className="text-slate-400 text-[11px]">{salaryData.tax_estimate}</p>
                  </div>
                  <div className="p-3.5 bg-slate-950/50 rounded-2xl border border-white/5">
                    <p className="font-semibold text-slate-300 mb-1.5">Salary Negotiation Tactics:</p>
                    <ul className="list-disc pl-4 text-slate-400 space-y-1">
                      {salaryData.negotiation_tactics.map((t, idx) => <li key={idx}>{t}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Global Path Masters / Visas */}
            <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-violet-400" /> Global Path & Abroad Relocation
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 uppercase font-semibold">Target Relocation Country</label>
                  <select
                    value={globalCountry}
                    onChange={(e) => setGlobalCountry(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-slate-100 text-sm focus:outline-none"
                  >
                    {["United States", "Germany", "Canada", "United Kingdom", "Singapore", "Japan"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleGlobal}
                  disabled={loadingGlobal}
                  className="w-full py-3 bg-slate-950 border border-violet-500/20 hover:border-violet-400 hover:bg-violet-500/10 text-violet-200 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  {loadingGlobal && <Loader2 className="w-4 h-4 animate-spin" />}
                  Analyze Relocation Path
                </button>
                {errorGlobal && <p className="text-red-400 text-xs">{errorGlobal}</p>}
              </div>

              {globalData && (
                <div className="space-y-4 border-t border-white/5 pt-4 text-xs leading-relaxed">
                  <div className="p-3 bg-slate-950/60 border border-white/5 rounded-xl">
                    <strong className="text-violet-300">Visa Requirements:</strong>
                    <p className="text-slate-400 mt-1 text-[11px]">{globalData.visa_type}</p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-white/5 rounded-xl">
                    <strong className="text-cyan-300">Masters Admissions Blueprint:</strong>
                    <p className="text-slate-400 mt-1 text-[11px]">{globalData.masters_prep}</p>
                  </div>
                  <div>
                    <strong className="text-slate-300 block mb-1">Scholarships Available:</strong>
                    <ul className="list-disc pl-4 text-slate-400 space-y-1">
                      {globalData.scholarships.map((s, idx) => <li key={idx}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-white/5 text-[10px]">
                    <span className="text-slate-400 uppercase font-semibold">IELTS/TOEFL Benchmarks:</span>
                    <span className="font-bold text-violet-200">{globalData.english_test_prep}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}