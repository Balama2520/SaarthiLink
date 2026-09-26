import { useState, useEffect } from "react";
import { 
  Search, Building, FileText, Loader2,
  MapPin, Users, Sparkles, Kanban, Trash2, ArrowUpRight,
  Target, Zap, Briefcase, CheckCircle2, ChevronDown, Bookmark, BookmarkCheck,
  X, MessageSquare, Route, Copy, ChevronRight, RefreshCw, SlidersHorizontal,
  Clock, ChevronLeft
} from "lucide-react";
import { api } from "../services/api";
import { getToken } from "../lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../hooks/useToast";
import { CTOGuideBanner } from "../components/CTOGuideBanner";

interface JobMatch {
  match_percentage: number;
  missing_skills: string[];
  recommendation: string;
  missing_projects?: string[];
  cover_letter?: string;
  rewritten_section?: string;
}

interface MatchResponse extends JobMatch {
  missing_projects?: string[];
  rewritten_section?: string;
}

interface PrepKitResult {
  resume_id: string;
  job_id: string;
  job_title: string;
  company_name: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  cover_letter: string;
  interview_questions: Array<{ question: string; type: string; tip: string }>;
  roadmap_focus: string[];
  roadmap_target_role: string;
  recommendation: string;
}

interface RadarJob {
  id: string;
  title: string;
  company: { name: string; logo_url?: string };
  location?: string;
  source?: string;
  status: string;
  apply_url?: string;
  job_type?: string;
  description?: string;
  employment_type?: string;
  remote_type?: string;
  salary_min?: number;
  salary_max?: number;
  experience_required?: string;
  posted_at?: string;
  created_at?: string;
  skills?: Array<string | { skill_name: string; is_required: boolean }>;
}

type CrmStatus = "applied" | "oa" | "interview" | "offer" | "rejected";
type JobFinderTab = "radar" | "iq" | "decoder" | "network" | "crm" | "saved";
type PlacementRecord = { id: string; company: string; role: string; status: string };
type RecommendedJob = RadarJob | { job: RadarJob; match_score?: number };

function isRecommendedJob(item: RecommendedJob): item is { job: RadarJob; match_score?: number } {
  return "job" in item;
}

function getSkillName(skill: string | { skill_name: string; is_required: boolean }): string {
  return typeof skill === "string" ? skill : skill.skill_name;
}

function formatSalary(min?: number, max?: number): string | null {
  if (min == null && max == null) return null;
  const lower = min ?? max ?? 0;
  const upper = max ?? min ?? 0;
  return `₹${(lower / 100000).toFixed(1)}L - ₹${(upper / 100000).toFixed(1)}L`;
}

function formatRelativeDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

const mapPlacementsToCrm = (apps: PlacementRecord[]): Array<{ id: string; company: string; role: string; status: CrmStatus }> =>
  apps.map((p) => ({
    id: p.id,
    company: p.company,
    role: p.role,
    status: (p.status === "eligible" ? "applied" : p.status === "interviewing" ? "interview" : p.status === "offered" ? "offer" : p.status === "rejected" ? "rejected" : p.status === "oa" ? "oa" : "applied") as CrmStatus
  }));

export default function JobFinder() {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<JobFinderTab>("radar");
  const [loading, setLoading] = useState(false);
  const [netPersonOpen, setNetPersonOpen] = useState(false);

  // Latest resume (for auto-fill and Prep Kit)
  const [latestResumeId, setLatestResumeId] = useState<string | null>(null);
  const [latestResumeText, setLatestResumeText] = useState<string | null>(null);

  // Prep Kit modal state
  const [prepKitJob, setPrepKitJob] = useState<RadarJob | null>(null);
  const [prepKitData, setPrepKitData] = useState<PrepKitResult | null>(null);
  const [prepKitLoading, setPrepKitLoading] = useState(false);
  const [prepKitCopied, setPrepKitCopied] = useState(false);

  // Job Radar states
  const [radarFilter, setRadarFilter] = useState<string>("All");
  const [radarSearch, setRadarSearch] = useState("");
  const [radarLocation, setRadarLocation] = useState("");
  const [radarExperience, setRadarExperience] = useState("");
  const [radarJobsList, setRadarJobsList] = useState<RadarJob[]>([]);
  const [recommendedJobsList, setRecommendedJobsList] = useState<RecommendedJob[]>([]);
  const [radarLoading, setRadarLoading] = useState(true);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [radarPage, setRadarPage] = useState(1);
  const [radarLastRefreshedAt, setRadarLastRefreshedAt] = useState<Date | null>(null);
  const [radarRetryKey, setRadarRetryKey] = useState(0);
  const [jobDetails, setJobDetails] = useState<RadarJob | null>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);

  // (rest unchanged...)


  // Saved Jobs states
  const [savedJobs, setSavedJobs] = useState<RadarJob[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [savedLoading, setSavedLoading] = useState(false);

  // Job Match IQ states
  const [iqTitle, setIqTitle] = useState("");
  const [iqCompany, setIqCompany] = useState("");
  const [iqJD, setIqJD] = useState("");
  const [iqResume, setIqResume] = useState("");
  const [iqResult, setIqResult] = useState<JobMatch | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [rewrittenSection, setRewrittenSection] = useState("");

  // Company Decoder states
  const [decoderInput, setDecoderInput] = useState("");
  const [decodedCompany, setDecodedCompany] = useState<{
    summary: string;
    tech_stack: string[];
    products: string[];
    culture: string;
    interview_process: string[];
    salary_range: string;
    hiring_trends: string;
    team_structure: string;
  } | null>(null);

  // Network Builder states
  const [netPerson, setNetPerson] = useState("Recruiter");
  const [netCompany, setNetCompany] = useState("");
  const [netSkills, setNetSkills] = useState("");
  const [netTemplates, setNetTemplates] = useState<{ connection_request: string; outreach_message: string; referral_message: string } | null>(null);

  // CRM Tracker states
  const [crmList, setCrmList] = useState<Array<{ id: string; company: string; role: string; status: CrmStatus }>>([]);
  const [newCrmCompany, setNewCrmCompany] = useState("");
  const [newCrmRole, setNewCrmRole] = useState("");

  useEffect(() => {
    async function loadCrm() {
      try {
        const apps = await api.getPlacements();
        setCrmList(mapPlacementsToCrm(apps));
      } catch (err) {
        console.error(err);
      }
    }
    loadCrm();
  }, []);

  // Load latest resume ID + text on mount (for Prep Kit + IQ auto-fill)
  useEffect(() => {
    async function loadLatestResume() {
      if (!getToken()) return;
      try {
        const data = await api.getLatestResume();
        if (data?.resume_id) {
          setLatestResumeId(data.resume_id);
          if (data.raw_text) setLatestResumeText(data.raw_text);
        }
      } catch {
        /* no resume yet, silent */
      }
    }
    loadLatestResume();
  }, []);

  useEffect(() => {
    async function loadSaved() {
      // Saved jobs are a private resource. A guest has no token, so avoid an
      // expected 401 (and the misleading console error it previously caused).
      if (!getToken()) {
        setSavedJobs([]);
        setSavedIds(new Set());
        setSavedLoading(false);
        return;
      }
      setSavedLoading(true);
      try {
        const jobs = await api.getSavedJobs();
        const list: RadarJob[] = Array.isArray(jobs)
          ? jobs.map((saved: { job: RadarJob }) => saved.job).filter(Boolean)
          : [];
        setSavedJobs(list);
        setSavedIds(new Set(list.map((j) => j.id)));
      } catch (err) {
        console.error("Failed to load saved jobs", err);
      } finally {
        setSavedLoading(false);
      }
    }
    loadSaved();
  }, []);

  const handleSaveJob = async (job: RadarJob) => {
    if (savedIds.has(job.id) || savingJobId === job.id) return;
    setSavingJobId(job.id);
    try {
      await api.saveJob(job.id);
      setSavedIds((prev) => new Set(prev).add(job.id));
      setSavedJobs((prev) => [job, ...prev]);
      toast("Job saved.", "success");
    } catch {
      toast("Couldn't save this job. Please try again.", "error");
    } finally {
      setSavingJobId(null);
    }
  };

  const handleUnsaveJob = async (job: RadarJob) => {
    if (savingJobId === job.id) return;
    setSavingJobId(job.id);
    try {
      await api.unsaveJob(job.id);
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      setSavedJobs((prev) => prev.filter((saved) => saved.id !== job.id));
      toast("Job removed from saved jobs.", "success");
    } catch {
      toast("Couldn't remove this saved job. Please try again.", "error");
    } finally {
      setSavingJobId(null);
    }
  };

  const handleApply = async (jobId: string) => {
    if (!getToken()) return;
    try {
      await api.trackJobApplication(jobId);
    } catch {
      toast("We couldn't save this application to your tracker.", "error");
    }
  };

  const handleViewJob = async (job: RadarJob) => {
    setJobDetailsLoading(true);
    try {
      setJobDetails(await api.getJob(job.id));
    } catch (err) {
      console.error(err);
      toast("Couldn't load the full job details. Please try again.", "error");
    } finally {
      setJobDetailsLoading(false);
    }
  };

  useEffect(() => {
    const debounce = window.setTimeout(() => {
    async function loadJobs() {
      setRadarLoading(true);
      setRadarError(null);
      try {
        if (radarFilter === "Recommended") {
          const recs = await api.getRecommendedJobs((radarPage - 1) * 20, 20);
          setRecommendedJobsList(recs);
        } else {
          const hasSearchFilters = radarSearch || radarLocation || radarExperience;
          const serverJobType = radarFilter === "Full-time" || radarFilter === "Internship" ? radarFilter : "";
          const serverRemoteType = radarFilter === "Remote" ? "Remote" : "";
          const jobs = hasSearchFilters
            ? await api.searchJobs(radarSearch, radarLocation, radarExperience, (radarPage - 1) * 20, 20, serverJobType, serverRemoteType)
            : (serverJobType || serverRemoteType)
              ? await api.searchJobs("", "", "", (radarPage - 1) * 20, 20, serverJobType, serverRemoteType)
              : await api.getJobs((radarPage - 1) * 20, 20);
          setRadarJobsList(jobs);
        }
        setRadarLastRefreshedAt(new Date());
      } catch (err) {
        console.error("Failed to load jobs", err);
        setRadarError("We couldn't load opportunities right now.");
      } finally {
        setRadarLoading(false);
      }
    }
    void loadJobs();
    }, 250);
    return () => window.clearTimeout(debounce);
  }, [radarFilter, radarSearch, radarLocation, radarExperience, radarPage, radarRetryKey]);

  const visibleRadarJobs = radarFilter === "Recommended"
    ? recommendedJobsList
    : radarJobsList;

  const hasNextRadarPage = radarFilter === "Recommended"
    ? recommendedJobsList.length === 20
    : radarJobsList.length === 20;

  const setRadarFilterAndResetPage = (filter: string) => {
    setRadarFilter(filter);
    setRadarPage(1);
  };

  const handleCrmAdd = async () => {
    if (!newCrmCompany.trim() || !newCrmRole.trim()) return;
    try {
      await api.addPlacement(newCrmCompany, newCrmRole, "[]", undefined, "applied");
      const apps = await api.getPlacements();
      setCrmList(mapPlacementsToCrm(apps));
      setNewCrmCompany("");
      setNewCrmRole("");
      toast("Application added to your tracker.", "success");
    } catch (err) {
      console.error(err);
      toast("Failed to add this application. Please try again.", "error");
    }
  };

  const handleCrmDelete = async (id: string) => {
    try {
      await api.deletePlacement(id);
      setCrmList(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      toast("Failed to remove this application. Please try again.", "error");
    }
  };

  const CRM_STATUS_TO_BACKEND: Record<string, string> = {
    applied: "eligible",
    oa: "oa",
    interview: "interviewing",
    offer: "offered",
    rejected: "rejected",
  };

  const handleCrmStatusChange = async (id: string, status: CrmStatus) => {
    // Optimistic update so the board feels instant, with a rollback if the
    // persist call fails — otherwise a failed save silently reverts on the
    // next page load and looks like data loss.
    const previous = crmList;
    setCrmList(prev => prev.map(c => (c.id === id ? { ...c, status } : c)));
    try {
      await api.updatePlacement(id, { status: CRM_STATUS_TO_BACKEND[status] });
    } catch (err) {
      console.error("Failed to persist status change", err);
      setCrmList(previous);
      toast("Couldn't save that status change. Please try again.", "error");
    }
  };

  const handleJobMatchIQ = async () => {
    if (!iqJD.trim() || !iqTitle.trim()) return;
    setLoading(true);
    setIqResult(null);
    setCoverLetter("");
    setRewrittenSection("");
    try {
      const resumeForMatch = iqResume.trim() || null; // null triggers auto-fetch on backend
      const matchRes = await api.matchJob(resumeForMatch, iqJD, iqCompany || "Target Company", iqTitle) as MatchResponse;
      const coverPrompt = `Draft a compelling cover letter based on this resume and job description.\nResume: ${(iqResume || "").substring(0, 1000)}\nJD: ${iqJD.substring(0, 1000)}`;
      let covText = "";
      try {
        await api.chatStream(coverPrompt, "matching_session", "career", "phi3", (chunk) => { covText += chunk; }, () => {}, () => {});
      } catch (coverErr) {
        console.error("Cover letter generation failed", coverErr);
      }
      
      setIqResult({
        match_percentage: matchRes.match_percentage,
        missing_skills: matchRes.missing_skills,
        recommendation: matchRes.recommendation,
        missing_projects: matchRes.missing_projects,
        cover_letter: covText || undefined,
        rewritten_section: matchRes.rewritten_section,
      });
      setCoverLetter(covText);
      setRewrittenSection(matchRes.rewritten_section || "");
    } catch (err) {
      console.error(err);
      toast("Couldn't analyze this match. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGetPrepKit = async (job: RadarJob) => {
    if (!getToken()) {
      toast("Sign in to generate a Prep Kit.", "error");
      return;
    }
    if (!latestResumeId) {
      toast("Upload a resume first to generate a Prep Kit.", "error");
      window.location.hash = "#/resume";
      return;
    }
    setPrepKitJob(job);
    setPrepKitData(null);
    setPrepKitLoading(true);
    try {
      const data = await api.resumeJobPipeline(latestResumeId, job.id) as PrepKitResult;
      setPrepKitData(data);
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Prep Kit generation failed.", "error");
      setPrepKitJob(null);
    } finally {
      setPrepKitLoading(false);
    }
  };

  const closePrepKit = () => { setPrepKitJob(null); setPrepKitData(null); setPrepKitLoading(false); };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setPrepKitCopied(true);
      setTimeout(() => setPrepKitCopied(false), 1800);
    }).catch(() => toast("Could not copy to clipboard.", "error"));
  };

  const handleDecodeCompany = async () => {
    if (!decoderInput.trim()) return;
    setLoading(true);
    setDecodedCompany(null);
    try {
      const res = await api.decodeCompany(decoderInput);
      setDecodedCompany(res);
    } catch (err) {
      console.error(err);
      toast("Couldn't decode this company. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleNetworkBuilder = async () => {
    if (!netCompany.trim() || !netSkills.trim()) return;
    setLoading(true);
    setNetTemplates(null);
    try {
      const res = await api.buildNetworkOutreach(netPerson, netCompany, netSkills);
      setNetTemplates(res);
    } catch (err) {
      console.error(err);
      toast("Couldn't draft outreach templates. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-background overflow-y-auto px-4 py-8 sm:px-6 lg:px-10 text-foreground relative custom-scrollbar">

      <AnimatePresence>
        {jobDetails && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl"
            onClick={(e) => { if (e.target === e.currentTarget) setJobDetails(null); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
              className="w-full max-w-2xl max-h-[88vh] overflow-y-auto custom-scrollbar bg-card border border-border rounded-3xl shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 p-5 bg-card border-b border-border rounded-t-3xl">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{jobDetails.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">{jobDetails.company?.name || "Company"} · {jobDetails.location || "Location not specified"}</p>
                </div>
                <button onClick={() => setJobDetails(null)} className="p-2 rounded-xl hover:bg-border" aria-label="Close job details">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ["Type", jobDetails.job_type],
                    ["Work mode", jobDetails.employment_type || jobDetails.remote_type],
                    ["Experience", jobDetails.experience_required],
                    ["Salary", jobDetails.salary_min || jobDetails.salary_max ? `₹${((jobDetails.salary_min || 0) / 100000).toFixed(1)}L–₹${((jobDetails.salary_max || jobDetails.salary_min || 0) / 100000).toFixed(1)}L` : undefined],
                    ["Posted", formatRelativeDate(jobDetails.posted_at || jobDetails.created_at)],
                  ].map(([label, value]) => value && (
                    <div key={label} className="p-3 bg-border border border-border rounded-xl">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
                      <p className="text-xs text-foreground font-semibold mt-1">{value}</p>
                    </div>
                  ))}
                </div>
                <section>
                  <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Job Description</h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{jobDetails.description || "No description was provided for this listing."}</p>
                </section>
                {(jobDetails.skills || []).length > 0 && (
                  <section>
                    <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {(jobDetails.skills || []).map((skill, index) => {
                        const name = typeof skill === "string" ? skill : skill.skill_name;
                        const required = typeof skill === "string" || skill.is_required;
                        return <span key={`${name}-${index}`} className={`px-2.5 py-1 rounded-lg text-xs border ${required ? "bg-primary/10 border-primary/25 text-primary" : "bg-border border-border text-muted-foreground"}`}>{name}{required ? " · required" : ""}</span>;
                      })}
                    </div>
                  </section>
                )}
                <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border">
                  <button onClick={() => { setIqTitle(jobDetails.title); setIqCompany(jobDetails.company?.name || "Company"); setIqJD(jobDetails.description || ""); setJobDetails(null); setActiveSubTab("iq"); }} className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">Check Match IQ</button>
                  {jobDetails.apply_url && <a href={jobDetails.apply_url} target="_blank" rel="noopener noreferrer" onClick={() => { void handleApply(jobDetails.id); }} className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground">Apply <ArrowUpRight className="inline w-3 h-3" /></a>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Prep Kit Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {prepKitJob && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl"
            onClick={(e) => { if (e.target === e.currentTarget) closePrepKit(); }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto custom-scrollbar bg-card border border-border rounded-3xl shadow-2xl"
            >
              {/* Modal header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-card border-b border-border rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">{prepKitJob.title}</h2>
                    <p className="text-[11px] text-muted-foreground">{prepKitJob.company?.name} · Prep Kit</p>
                  </div>
                </div>
                <button onClick={closePrepKit} className="p-2 rounded-xl hover:bg-border transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {prepKitLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Analyzing your resume against this role…</p>
                  </div>
                ) : prepKitData ? (
                  <>
                    {/* Match Score */}
                    <div className="flex items-center gap-5 p-5 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-2xl">
                      <div className="relative flex-shrink-0">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
                          <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="6"
                            strokeDasharray={`${2 * Math.PI * 32}`}
                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - (prepKitData.match_score ?? 0) / 100)}`}
                            strokeLinecap="round"
                            className={prepKitData.match_score >= 75 ? "text-emerald-400" : prepKitData.match_score >= 50 ? "text-amber-400" : "text-red-400"}
                            style={{ transition: "stroke-dashoffset 0.8s ease" }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-black text-foreground">{prepKitData.match_score ?? 0}%</span>
                          <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Match</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground">{prepKitData.job_title} at {prepKitData.company_name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{prepKitData.recommendation}</p>
                      </div>
                    </div>

                    {/* Skills */}
                    {(prepKitData.missing_skills?.length > 0 || prepKitData.matched_skills?.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {prepKitData.matched_skills?.length > 0 && (
                          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block mb-2">✓ Matched Skills</span>
                            <div className="flex flex-wrap gap-1.5">
                              {prepKitData.matched_skills.map((s, i) => <span key={i} className="px-2 py-0.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{s}</span>)}
                            </div>
                          </div>
                        )}
                        {prepKitData.missing_skills?.length > 0 && (
                          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 block mb-2">✗ Gap Skills</span>
                            <div className="flex flex-wrap gap-1.5">
                              {prepKitData.missing_skills.map((s, i) => <span key={i} className="px-2 py-0.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-300 border border-red-500/20">{s}</span>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cover Letter */}
                    {prepKitData.cover_letter && (
                      <div className="p-4 bg-border border border-border rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5"><FileText className="w-3 h-3" /> Cover Letter</span>
                          <button
                            onClick={() => copyToClipboard(prepKitData.cover_letter)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-card border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {prepKitCopied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {prepKitCopied ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <div className="text-xs text-foreground leading-relaxed max-h-40 overflow-y-auto custom-scrollbar whitespace-pre-wrap bg-card/50 p-3 rounded-xl border border-border">
                          {prepKitData.cover_letter}
                        </div>
                      </div>
                    )}

                    {/* Interview Questions */}
                    {prepKitData.interview_questions?.length > 0 && (
                      <div className="p-4 bg-border border border-border rounded-2xl">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary block mb-3 flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> Likely Interview Questions</span>
                        <div className="space-y-2">
                          {prepKitData.interview_questions.map((q, i) => (
                            <div key={i} className="p-3 bg-card/50 rounded-xl border border-border">
                              <div className="flex items-start gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-[9px] text-primary font-bold shrink-0 mt-0.5">{i+1}</span>
                                <div>
                                  <p className="text-xs font-semibold text-foreground leading-snug">{q.question}</p>
                                  {q.tip && <p className="text-[10px] text-muted-foreground mt-1 leading-snug">💡 {q.tip}</p>}
                                </div>
                              </div>
                              {q.type && <span className="mt-1.5 ml-7 inline-block px-1.5 py-0.5 text-[9px] font-bold rounded bg-primary/10 text-primary uppercase tracking-wide">{q.type}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Roadmap Focus */}
                    {prepKitData.roadmap_focus?.length > 0 && (
                      <div className="p-4 bg-border border border-border rounded-2xl">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block mb-2">📚 What to Learn Before Applying</span>
                        <div className="flex flex-wrap gap-1.5">
                          {prepKitData.roadmap_focus.map((s, i) => <span key={i} className="px-2 py-0.5 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">{s}</span>)}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={() => {
                          if (prepKitData.roadmap_target_role) sessionStorage.setItem("saarthi_prefill_role", prepKitData.roadmap_target_role);
                          if (prepKitData.missing_skills?.length) sessionStorage.setItem("saarthi_prefill_focus", prepKitData.missing_skills.join(","));
                          closePrepKit();
                          window.location.hash = "#roadmaps";
                        }}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                      >
                        <Route className="w-3.5 h-3.5" /> Generate Roadmap
                      </button>
                      <button
                        onClick={() => {
                          sessionStorage.setItem("saarthi_prefill_role", prepKitData.roadmap_target_role || prepKitJob.title);
                          sessionStorage.setItem("saarthi_prefill_company", prepKitData.company_name || prepKitJob.company?.name || "");
                          closePrepKit();
                          window.location.hash = "#interview";
                        }}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Start Interview Prep
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Career Intelligence</p>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Find your next move</h1>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3 ml-[52px] max-w-xl">
              Search verified opportunities, understand your fit, and move every promising role into action.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-border border border-border rounded-xl px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Curated job intelligence
          </div>
        </div>

        <div className="mt-6">
          <CTOGuideBanner
            title="Job Radar & Match IQ Guide"
            subtitle="Search verified job listings, evaluate your fit against any job description, and generate 1-click Prep Kits."
            steps={[
              { title: "Browse Radar", desc: "Filter active openings by keywords, location, remote work, or experience level." },
              { title: "Check Fit Score", desc: "Click 'Check My Match' or paste any job description to calculate your Match IQ score." },
              { title: "Generate Prep Kit", desc: "Click 'Generate Prep Kit' on any role card for a tailored cover letter and interview questions." },
              { title: "Save & Apply", desc: "Bookmark top choices to your Saved tab and track application progress." },
            ]}
            ctoTip="Make sure to upload your resume on the Resume ATS page first so Job Match IQ auto-populates your technical skills!"
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex flex-wrap gap-1 p-1 bg-muted rounded-lg">
          {[
            { id: "radar", label: "Internal Radar", icon: Search },
            { id: "iq", label: "Check My Match", icon: FileText },
            { id: "decoder", label: "Company Decoder", icon: Building },
            { id: "network", label: "Warm Outreach", icon: Users },
            { id: "saved", label: "Saved", icon: Bookmark },
            { id: "crm", label: "My Applications", icon: Kanban }
          ].map((tab) => {
            const isActive = activeSubTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as JobFinderTab)}
                className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive ? "text-foreground bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        
        {/* SUBTAB 1: Job Radar */}
        {activeSubTab === "radar" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-border p-4 border border-border rounded-2xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground">Opportunity radar</span>
                  <span>•</span>
                  <span>{radarFilter === "Recommended" ? "Personalized for you" : "Latest verified roles"}</span>
                  {radarLastRefreshedAt && <span className="text-[10px]">Updated {radarLastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                {["All", "Recommended", "Full-time", "Internship", "Remote"].map(f => (
                  <button
                    key={f}
                    onClick={() => setRadarFilterAndResetPage(f)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      radarFilter === f 
                        ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" 
                        : "bg-border border-border text-muted-foreground hover:bg-border"
                    }`}
                  >
                    {f}
                  </button>
                ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_auto] gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search roles..."
                    value={radarSearch}
                    onChange={(e) => { setRadarSearch(e.target.value); setRadarPage(1); }}
                    className="bg-border border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 w-full sm:w-52 transition-all"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Location e.g. Bangalore"
                  value={radarLocation}
                  onChange={(e) => { setRadarLocation(e.target.value); setRadarPage(1); }}
                  className="bg-border border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 w-full sm:w-48 transition-all"
                />
                <select
                  aria-label="Experience level"
                  value={radarExperience}
                  onChange={(e) => { setRadarExperience(e.target.value); setRadarPage(1); }}
                  className="bg-border border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 w-full sm:w-44 transition-all"
                >
                  <option value="">Any experience</option>
                  <option value="Fresher">Fresher</option>
                  <option value="0-1">0-1 years</option>
                  <option value="1-3">1-3 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5+">5+ years</option>
                </select>
                <button
                  onClick={() => { setRadarSearch(""); setRadarLocation(""); setRadarExperience(""); setRadarPage(1); }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted-foreground bg-border border border-border rounded-xl hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {radarLoading && [0, 1, 2].map((item) => <div key={item} className="h-44 rounded-2xl border border-border bg-border animate-pulse" />)}
              {!radarLoading && radarError && (
                <div className="py-12 text-center border border-dashed border-red-500/30 rounded-3xl bg-red-500/5">
                  <p className="text-foreground font-bold mb-3">{radarError}</p>
                  <button onClick={() => setRadarRetryKey((key) => key + 1)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground"><RefreshCw className="w-3.5 h-3.5" /> Try again</button>
                </div>
              )}
              {!radarLoading && !radarError && visibleRadarJobs
                .map((item) => {
                  const job = isRecommendedJob(item) ? item.job : item;
                  const matchScore = isRecommendedJob(item) ? item.match_score : undefined;
                  const salary = formatSalary(job.salary_min, job.salary_max);
                  const postedDate = formatRelativeDate(job.posted_at || job.created_at);
                  const skills = (job.skills || []).map(getSkillName).filter(Boolean).slice(0, 5);
                  
                  return (
                  <div key={job.id} className="p-5 bg-border border border-border rounded-2xl hover:border-primary/30 transition-all group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 overflow-hidden">
                        {job.company?.logo_url ? <img src={job.company.logo_url} alt="" className="w-8 h-8 object-contain" /> : <Briefcase className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-bold text-foreground leading-tight truncate">{job.title}</h3>
                          {matchScore !== undefined && matchScore >= 70 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Hot Match</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium text-foreground"><Building className="w-3 h-3"/> {job.company?.name || "Company"}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {job.location || "Remote"}</span>
                          {(job.employment_type || job.remote_type) && <span className="bg-card border border-border px-2 py-0.5 rounded">{job.employment_type || job.remote_type}</span>}
                          {job.experience_required && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {job.experience_required}</span>}
                          {postedDate && <span className="text-muted-foreground">{postedDate}</span>}
                        </div>
                        {(salary || skills.length > 0) && <div className="mt-3 flex flex-wrap items-center gap-2">
                          {salary && <span className="text-xs font-bold text-emerald-400">{salary}</span>}
                          {skills.map((skill) => <span key={skill} className="px-2 py-0.5 rounded-md bg-card border border-border text-[10px] text-muted-foreground">{skill}</span>)}
                        </div>}
                        {job.description && <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-2">{job.description}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-4 border-t border-border">
                      {matchScore !== undefined && (
                        <div className="flex flex-col items-end mr-2">
                          <span className="text-xs font-bold text-primary">{matchScore}%</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Match</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleViewJob(job)}
                        disabled={jobDetailsLoading}
                        className="px-3 py-2 rounded-xl text-[11px] font-bold bg-border text-foreground border border-border hover:border-primary/40 transition-all"
                      >
                        {jobDetailsLoading ? <Loader2 className="inline w-3 h-3 animate-spin" /> : "View details"}
                      </button>
                      <button
                        onClick={() => handleGetPrepKit(job)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 transition-all"
                        title="Get Prep Kit"
                      >
                        <Zap className="w-3.5 h-3.5" /> Prep Kit
                      </button>
                      <button
                        onClick={() => savedIds.has(job.id) ? handleUnsaveJob(job) : handleSaveJob(job)}
                        disabled={savingJobId === job.id}
                        className={`p-2 rounded-xl border transition-all ${
                          savedIds.has(job.id)
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-border hover:bg-muted border-border text-muted-foreground hover:text-foreground"
                        }`}
                        title={savedIds.has(job.id) ? "Saved" : "Save job"}
                      >
                        {savingJobId === job.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : savedIds.has(job.id) ? (
                          <BookmarkCheck className="w-4 h-4" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                      <button 
                        onClick={() => {
                          setIqTitle(job.title);
                          setIqCompany(job.company?.name || "Company");
                          setIqJD(job.description || "");
                          setActiveSubTab("iq");
                        }}
                        className="p-2 rounded-xl bg-border hover:bg-muted border border-border text-foreground hover:text-foreground transition-all"
                        title="Check Match IQ"
                      >
                        <Target className="w-4 h-4 text-amber-400" />
                      </button>
                      {job.apply_url && (
                        <a href={job.apply_url} target="_blank" rel="noopener noreferrer" onClick={() => { void handleApply(job.id); }} className="py-2 px-4 bg-primary hover:bg-primary/90 text-xs font-bold text-primary-foreground rounded-xl transition flex items-center gap-1.5">
                           Apply <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )})}
                {!radarLoading && !radarError && !visibleRadarJobs.length && (
                  <div className="py-16 text-center border border-dashed border-border rounded-3xl bg-border flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Briefcase className="w-8 h-8 text-primary/60" />
                    </div>
                    <div>
                      <p className="text-foreground font-bold mb-1">
                        {radarSearch || radarLocation || radarExperience || radarFilter !== "All" ? "No matching jobs" : "No opportunities available"}
                      </p>
                      <p className="text-muted-foreground text-sm font-medium">
                        {radarSearch || radarLocation || radarExperience
                          ? "Try a different filter or search term"
                          : "New verified opportunities will appear here after the next catalog sync."}
                      </p>
                    </div>
                  </div>
                )}
                {!radarLoading && !radarError && visibleRadarJobs.length > 0 && <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">Page {radarPage}</span>
                  <div className="flex items-center gap-2">
                    <button disabled={radarPage === 1} onClick={() => setRadarPage((page) => Math.max(1, page - 1))} className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                    <button disabled={!hasNextRadarPage} onClick={() => setRadarPage((page) => page + 1)} className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>}
            </div>
          </motion.div>
        )}

        {/* SUBTAB: Saved Jobs */}
        {activeSubTab === "saved" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {savedLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
              </div>
            ) : savedJobs.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-border rounded-3xl bg-border flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Bookmark className="w-8 h-8 text-primary/60" />
                </div>
                <div>
                  <p className="text-foreground font-bold mb-1">No saved jobs yet</p>
                  <p className="text-muted-foreground text-sm font-medium">Bookmark roles from Find Opportunities to review later</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {savedJobs.map((job) => (
                  <div key={job.id} className="p-5 bg-border border border-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-border border border-border flex items-center justify-center shrink-0">
                        <Briefcase className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground leading-tight mb-1">{job.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium text-foreground"><Building className="w-3 h-3"/> {job.company?.name || "Company"}</span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {job.location || "Remote"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleGetPrepKit(job)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 transition-all"
                        title="Get Prep Kit"
                      >
                        <Zap className="w-3.5 h-3.5" /> Prep Kit
                      </button>
                      <button
                        onClick={() => {
                          setIqTitle(job.title);
                          setIqCompany(job.company?.name || "Company");
                          setIqJD(job.description || "");
                          setActiveSubTab("iq");
                        }}
                        className="p-2 rounded-xl bg-border hover:bg-muted border border-border text-foreground transition-all"
                        title="Check Match IQ"
                      >
                        <Target className="w-4 h-4 text-amber-400" />
                      </button>
                      <button
                        onClick={() => handleUnsaveJob(job)}
                        className="p-2 rounded-xl bg-primary/10 hover:bg-destructive/10 border border-primary/30 text-primary hover:text-destructive transition-all"
                        title="Remove saved job"
                      >
                        <Bookmark className="w-4 h-4 fill-current" />
                      </button>
                      {job.apply_url && (
                        <a href={job.apply_url} target="_blank" rel="noopener noreferrer" onClick={() => { void handleApply(job.id); }} className="py-2 px-4 bg-primary hover:bg-primary/90 text-xs font-bold text-primary-foreground rounded-xl transition flex items-center gap-1.5">
                          Apply <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* SUBTAB 2: Job Match IQ */}
        {activeSubTab === "iq" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 bg-border border border-border rounded-3xl space-y-4 relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                  <Target className="w-24 h-24 text-primary" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2 mb-6">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Match IQ Scanner
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Job Title</label>
                    <input type="text" placeholder="Backend Engineer" value={iqTitle} onChange={(e) => setIqTitle(e.target.value)}
                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Company</label>
                    <input type="text" placeholder="Atlassian" value={iqCompany} onChange={(e) => setIqCompany(e.target.value)}
                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Job Description</label>
                  <textarea rows={4} placeholder="Paste requirements..." value={iqJD} onChange={(e) => setIqJD(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none resize-none custom-scrollbar transition-colors" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your Resume</label>
                    {latestResumeText && !iqResume && (
                      <button
                        onClick={() => setIqResume(latestResumeText)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 transition-colors"
                      >
                        <ChevronRight className="w-3 h-3" /> Use My Latest Resume
                      </button>
                    )}
                    {latestResumeText && iqResume && (
                      <button
                        onClick={() => setIqResume("")}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-border text-muted-foreground border border-border hover:text-foreground transition-colors"
                      >
                        <X className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>
                  <textarea rows={4} placeholder={latestResumeId ? "Auto-loaded from your uploaded resume, or paste manually..." : "Paste resume text..."} value={iqResume} onChange={(e) => setIqResume(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none resize-none custom-scrollbar transition-colors" />
                </div>
                <button
                  onClick={handleJobMatchIQ} disabled={loading || !iqTitle.trim() || !iqJD.trim()}
                  className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-primary/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-300" />}
                  Evaluate Fit
                </button>
              </div>
            </div>

            <div className="lg:col-span-7">
              {iqResult ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <div className="p-6 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-3xl flex items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-background border border-border shadow-[0_0_30px_rgba(233,162,59,0.15)] flex items-center justify-center flex-col shrink-0">
                      <span className="text-2xl font-black text-primary">{iqResult.match_percentage}</span>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Score</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground">{iqTitle} at {iqCompany || "Company"}</h4>
                      <p className="text-sm text-foreground mt-1">{iqResult.recommendation}</p>
                    </div>
                  </div>

                  {(iqResult.missing_skills?.length > 0) && (
                    <div className="p-5 bg-border border border-border rounded-2xl">
                      <span className="text-xs font-bold uppercase tracking-widest text-red-400 block mb-3">Critical Missing Skills</span>
                      <div className="flex flex-wrap gap-2">
                        {iqResult.missing_skills.map((s, i) => (
                          <span key={i} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-500/10 text-red-300 border border-red-500/20">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {rewrittenSection && (
                    <div className="p-5 bg-border border border-border rounded-2xl">
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 block mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Recommended Resume Tweak
                      </span>
                      <p className="text-sm text-foreground leading-relaxed bg-card/50 p-4 rounded-xl border border-border">{rewrittenSection}</p>
                    </div>
                  )}

                  {coverLetter && (
                    <div className="p-5 bg-border border border-border rounded-2xl">
                      <span className="text-xs font-bold uppercase tracking-widest text-accent block mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> AI Drafted Cover Letter
                      </span>
                      <div className="text-xs text-foreground leading-relaxed bg-card/50 p-4 rounded-xl border border-border max-h-[250px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                        {coverLetter}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="h-full min-h-[400px] border border-border border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-border">
                  <Target className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-sm">Waiting for input parameters.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* SUBTAB 3: Company Decoder */}
        {activeSubTab === "decoder" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-4">
              <div className="p-6 bg-border border border-border rounded-3xl space-y-4 backdrop-blur-md">
                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2 mb-6">
                  <Building className="w-4 h-4 text-accent" /> Target Decoder
                </h3>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Enter Company Name</label>
                  <input type="text" placeholder="Netflix, Meta..." value={decoderInput} onChange={(e) => setDecoderInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleDecodeCompany()}
                    className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none transition-colors" />
                </div>
                <button
                  onClick={handleDecodeCompany} disabled={loading || !decoderInput.trim()}
                  className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Decode Architecture"}
                </button>
              </div>
            </div>

            <div className="lg:col-span-8">
              {decodedCompany ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 bg-border border border-border rounded-3xl space-y-6">
                  <div>
                    <h4 className="text-2xl font-black text-foreground bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                      {decoderInput} Inside Look
                    </h4>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{decodedCompany.summary}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-card/60 rounded-2xl border border-border">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-2">Engineering Stack</span>
                      <div className="flex flex-wrap gap-1.5">
                        {decodedCompany.tech_stack.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 bg-border border border-border rounded-lg text-xs text-foreground">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-card/60 rounded-2xl border border-border">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block mb-1">Average Comp Range</span>
                      <p className="text-lg font-bold text-foreground">{decodedCompany.salary_range}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary block mb-2">Interview Process</span>
                      <ul className="space-y-2">
                        {decodedCompany.interview_process.map((p, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-[8px] text-primary font-bold mt-0.5 shrink-0">{idx+1}</span>
                            <span className="leading-snug">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-1">Culture</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{decodedCompany.culture}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block mb-1">Hiring Outlook</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{decodedCompany.hiring_trends}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full min-h-[300px] border border-border border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-border">
                  <Building className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-sm">Decode corporate pipelines and recruitment metrics.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* SUBTAB 4: Network Builder */}
        {activeSubTab === "network" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-4">
              <div className="p-6 bg-border border border-border rounded-3xl space-y-4 backdrop-blur-md">
                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2 mb-6">
                  <Users className="w-4 h-4 text-accent" /> Warm Outreach
                </h3>
                <div className="relative">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Target Persona</label>
                  <div
                    className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground cursor-pointer hover:border-primary/40 transition-colors flex items-center justify-between"
                    onClick={() => setNetPersonOpen(!netPersonOpen)}
                  >
                    <span>{netPerson}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${netPersonOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {netPersonOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden z-20 py-1">
                      {["Alumni", "Recruiter", "Hiring Manager", "Employee"].map(p => (
                        <div
                          key={p}
                          className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${netPerson === p ? "bg-primary/20 text-primary font-medium" : "text-foreground hover:bg-border hover:text-foreground"}`}
                          onClick={() => { setNetPerson(p); setNetPersonOpen(false); }}
                        >
                          {p}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Company</label>
                  <input type="text" placeholder="Stripe" value={netCompany} onChange={(e) => setNetCompany(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Your Focus</label>
                  <input type="text" placeholder="React & Node.js Developer" value={netSkills} onChange={(e) => setNetSkills(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" />
                </div>
                <button
                  onClick={handleNetworkBuilder} disabled={loading || !netCompany.trim() || !netSkills.trim()}
                  className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-accent/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Draft Outreach"}
                </button>
              </div>
            </div>

            <div className="lg:col-span-8">
              {netTemplates ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <div className="p-5 bg-border border border-border rounded-2xl relative group">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-2 flex items-center gap-1.5"><Zap className="w-3 h-3"/> LinkedIn Request (Short)</span>
                    <p className="text-sm text-foreground font-medium leading-relaxed">{netTemplates.connection_request}</p>
                  </div>
                  <div className="p-5 bg-border border border-border rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block mb-2 flex items-center gap-1.5"><FileText className="w-3 h-3"/> Cold Email Pitch</span>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{netTemplates.outreach_message}</p>
                  </div>
                  <div className="p-5 bg-border border border-border rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block mb-2 flex items-center gap-1.5"><Users className="w-3 h-3"/> Referral Ask</span>
                    <p className="text-sm text-foreground leading-relaxed">{netTemplates.referral_message}</p>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full min-h-[300px] border border-border border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-border">
                  <Users className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-sm">Generate referral requests and cold email outreach copies.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* SUBTAB 5: Application CRM pipeline tracker */}
        {activeSubTab === "crm" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 bg-border p-5 border border-border rounded-3xl backdrop-blur-md">
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Company</label>
                <input type="text" placeholder="Meta" value={newCrmCompany} onChange={(e) => setNewCrmCompany(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Role</label>
                <input type="text" placeholder="Frontend Intern" value={newCrmRole} onChange={(e) => setNewCrmRole(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none" />
              </div>
              <button
                onClick={handleCrmAdd}
                className="py-3 px-6 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl transition shadow-lg shadow-primary/20 whitespace-nowrap"
              >
                Track Opportunity
              </button>
            </div>

            <div className="flex md:grid md:grid-cols-5 gap-4 overflow-x-auto pb-4 custom-scrollbar">
              {([
                { id: "applied", label: "Applied", color: "text-accent", bg: "bg-accent/5", border: "border-accent/10" },
                { id: "oa", label: "OA / Test", color: "text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/10" },
                { id: "interview", label: "Interview", color: "text-primary", bg: "bg-primary/5", border: "border-primary/10" },
                { id: "offer", label: "Offer", color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/10" },
                { id: "rejected", label: "Rejected", color: "text-muted-foreground", bg: "bg-muted/30", border: "border-muted" }
              ] as const).map(col => (
                <div key={col.id} className={`p-4 rounded-3xl border ${col.border} ${col.bg} flex flex-col min-h-[400px] min-w-[240px]`}>
                  <div className="pb-3 mb-3 border-b border-border flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${col.color}`}>{col.label}</span>
                    <span className="text-[10px] bg-card px-2 py-0.5 rounded-full text-muted-foreground font-bold border border-border">{crmList.filter(c => c.status === col.id).length}</span>
                  </div>
                  <div className="flex-1 space-y-3">
                    <AnimatePresence>
                      {crmList.filter(c => c.status === col.id).map(app => (
                        <motion.div 
                          layout 
                          initial={{ opacity: 0, scale: 0.9 }} 
                          animate={{ opacity: 1, scale: 1 }} 
                          exit={{ opacity: 0, scale: 0.9 }}
                          key={app.id} 
                          className="p-3 bg-background rounded-2xl border border-border hover:border-border transition-all flex flex-col group"
                        >
                          <div className="mb-2">
                            <p className="text-sm font-bold text-foreground truncate leading-tight">{app.role}</p>
                            <p className="text-[10px] font-medium text-muted-foreground mt-0.5 flex items-center gap-1"><Building className="w-2.5 h-2.5"/> {app.company}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-border">
                            <select
                              value={app.status}
                              onChange={(e) => handleCrmStatusChange(app.id, e.target.value as typeof app.status)}
                              className="bg-card border border-border hover:border-border rounded-lg px-2 py-1 text-[10px] text-foreground focus:outline-none transition-colors cursor-pointer"
                            >
                              <option value="applied">Applied</option>
                              <option value="oa">OA Test</option>
                              <option value="interview">Interview</option>
                              <option value="offer">Offer</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            <button onClick={() => handleCrmDelete(app.id)} className="p-1 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
