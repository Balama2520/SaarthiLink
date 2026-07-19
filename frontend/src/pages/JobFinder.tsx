import { useState, useEffect } from "react";
import { 
  Search, Building, FileText, Loader2,
  MapPin, Users, Sparkles, Kanban, Trash2, ArrowUpRight
} from "lucide-react";
import { api } from "../services/api";

interface JobMatch {
  match_percentage: number;
  missing_skills: string[];
  recommendation: string;
  missing_projects?: string[];
  cover_letter?: string;
  rewritten_section?: string;
}

interface RadarJob {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  tag: "Best Match" | "Easy Apply" | "Fresh Job" | "Low Competition" | "Hidden Gem";
  url: string;
}

const RADAR_JOBS: RadarJob[] = [
  { id: "j1", title: "Backend Engineer", company: "Atlassian", location: "Remote, India", source: "Greenhouse", tag: "Best Match", url: "#" },
  { id: "j2", title: "Frontend Developer (React)", company: "Stripe", location: "Bengaluru, IN", source: "Lever", tag: "Fresh Job", url: "#" },
  { id: "j3", title: "Junior ML Engineer", company: "Zeta Global", location: "Hyderabad, IN", source: "LinkedIn", tag: "Low Competition", url: "#" },
  { id: "j4", title: "Full Stack Engineer (Early Stage)", company: "Hyperplane (YC W26)", location: "Remote / US", source: "YC jobs", tag: "Hidden Gem", url: "#" },
  { id: "j5", title: "Software Engineer Intern", company: "Adobe", location: "Noida, IN", source: "Company Career Page", tag: "Easy Apply", url: "#" }
];

export default function JobFinder() {
  const [activeSubTab, setActiveSubTab] = useState<"radar" | "iq" | "decoder" | "network" | "crm">("radar");
  const [loading, setLoading] = useState(false);

  // Job Radar states
  const [radarFilter, setRadarFilter] = useState<string>("All");
  const [radarSearch, setRadarSearch] = useState("");
  const [radarJobsList] = useState<RadarJob[]>(RADAR_JOBS);

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
  const [crmList, setCrmList] = useState<Array<{ id: string; company: string; role: string; status: "applied" | "oa" | "interview" | "offer" | "rejected" }>>([]);
  const [newCrmCompany, setNewCrmCompany] = useState("");
  const [newCrmRole, setNewCrmRole] = useState("");

  type CrmStatus = "applied" | "oa" | "interview" | "offer" | "rejected";
  const mapPlacementsToCrm = (apps: any[]): Array<{ id: string; company: string; role: string; status: CrmStatus }> =>
    apps.map((p: any) => ({
      id: p.id,
      company: p.company,
      role: p.role,
      status: (p.status === "eligible" ? "applied" : p.status === "interviewing" ? "interview" : p.status === "offered" ? "offer" : p.status === "rejected" ? "rejected" : p.status === "oa" ? "oa" : "applied") as CrmStatus
    }));

  // Load CRM apps on mount
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

  const handleCrmAdd = async () => {
    if (!newCrmCompany.trim() || !newCrmRole.trim()) return;
    try {
      await api.addPlacement(newCrmCompany, newCrmRole, "[]", undefined, "applied");
      const apps = await api.getPlacements();
      setCrmList(mapPlacementsToCrm(apps));
      setNewCrmCompany("");
      setNewCrmRole("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleCrmDelete = async (id: string) => {
    try {
      await api.deletePlacement(id);
      setCrmList(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const CRM_STATUS_TO_BACKEND: Record<string, string> = {
    applied: "eligible",
    oa: "oa",
    interview: "interviewing",
    offer: "offered",
    rejected: "rejected",
  };

  const handleCrmStatusChange = async (id: string, status: "applied" | "oa" | "interview" | "offer" | "rejected") => {
    // Update the board immediately so the kanban is usable even if the
    // backend doesn't (yet) support a dedicated status-update endpoint.
    setCrmList(prev => prev.map(c => (c.id === id ? { ...c, status } : c)));
    try {
      const anyApi = api as any;
      if (typeof anyApi.updatePlacementStatus === "function") {
        await anyApi.updatePlacementStatus(id, CRM_STATUS_TO_BACKEND[status]);
      } else if (typeof anyApi.updatePlacement === "function") {
        await anyApi.updatePlacement(id, { status: CRM_STATUS_TO_BACKEND[status] });
      } else {
        console.warn("No placement status-update endpoint available — change is local only and won't persist across reloads.");
      }
    } catch (err) {
      console.error("Failed to persist status change", err);
    }
  };

  // Run Job Match IQ
  const handleJobMatchIQ = async () => {
    if (!iqResume.trim() || !iqJD.trim() || !iqTitle.trim()) return;
    setLoading(true);
    setIqResult(null);
    setCoverLetter("");
    setRewrittenSection("");
    try {
      const matchRes = await api.matchJob(iqResume, iqJD, iqCompany || "Target Company", iqTitle);

      const coverPrompt = `Draft a compelling cover letter based on this resume and job description.
      Resume: ${iqResume.substring(0, 1000)}
      JD: ${iqJD.substring(0, 1000)}`;

      let covText = "";
      try {
        await api.chatStream(coverPrompt, "matching_session", "career", "phi3", (chunk) => { covText += chunk; }, () => {}, () => {});
      } catch (coverErr) {
        console.error("Cover letter generation failed", coverErr);
      }

      // Only surface fields the backend actually returned — previously this
      // injected the exact same hardcoded "Core Full Stack project" /
      // "35% latency reductions" text for every resume+JD pair regardless
      // of content, presenting fabricated boilerplate as personalized
      // analysis.
      const updatedRes: JobMatch = {
        match_percentage: matchRes.match_percentage,
        missing_skills: matchRes.missing_skills,
        recommendation: matchRes.recommendation,
        missing_projects: (matchRes as any).missing_projects,
        cover_letter: covText || undefined,
        rewritten_section: (matchRes as any).rewritten_section,
      };
      setIqResult(updatedRes);
      setCoverLetter(covText);
      setRewrittenSection((matchRes as any).rewritten_section || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Run Company Decoder
  const handleDecodeCompany = async () => {
    if (!decoderInput.trim()) return;
    setLoading(true);
    setDecodedCompany(null);
    try {
      const res = await api.decodeCompany(decoderInput);
      setDecodedCompany(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Run Network outreach builder
  const handleNetworkBuilder = async () => {
    if (!netCompany.trim() || !netSkills.trim()) return;
    setLoading(true);
    setNetTemplates(null);
    try {
      const res = await api.buildNetworkOutreach(netPerson, netCompany, netSkills);
      setNetTemplates(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 overflow-y-auto px-8 py-10 font-sans text-slate-100">
      
      {/* Header */}
      <div className="mb-8 max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2.5 text-white">
            <Kanban className="w-9 h-9 text-violet-400" /> Job & Network Command
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 max-w-xl">
            Explore job radar, check resume matches, analyze target corporate structures, find mentors, and track pipeline status.
          </p>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="max-w-5xl mx-auto mb-8 border-b border-white/5 flex flex-wrap gap-2">
        {([
          { id: "radar", label: "Job Radar", icon: Search },
          { id: "iq", label: "Job Match IQ", icon: FileText },
          { id: "decoder", label: "Company Decoder", icon: Building },
          { id: "network", label: "Network Builder", icon: Users },
          { id: "crm", label: "Application CRM", icon: Kanban }
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

      <div className="max-w-5xl mx-auto">
        
        {/* SUBTAB 1: Job Radar */}
        {activeSubTab === "radar" && (
          <div className="space-y-6 animate-fade-in">
            {/* These listings are static sample data, not a live feed — flagged
                clearly so they aren't mistaken for real, current openings. */}
            <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              Sample listings shown for demonstration — connect a job feed to see live, personalized openings.
            </div>
            {/* Filters row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 border border-white/10 rounded-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                {["All", "Best Match", "Easy Apply", "Fresh Job", "Low Competition", "Hidden Gem"].map(f => (
                  <button
                    key={f}
                    onClick={() => setRadarFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      radarFilter === f 
                        ? "bg-violet-600 border-violet-500 text-white" 
                        : "bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search jobs..."
                  value={radarSearch}
                  onChange={(e) => setRadarSearch(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-500 w-52"
                />
              </div>
            </div>

            {/* Jobs lists */}
            <div className="grid gap-4">
              {radarJobsList
                .filter(j => radarFilter === "All" || j.tag === radarFilter)
                .filter(j => radarSearch === "" || j.title.toLowerCase().includes(radarSearch.toLowerCase()) || j.company.toLowerCase().includes(radarSearch.toLowerCase()))
                .map((job) => (
                  <div key={job.id} className="p-4 bg-slate-900 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-violet-500/30 transition-all">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="text-xs font-bold text-white">{job.title}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><Building className="w-3 h-3"/> {job.company}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3"/> {job.location}</span>
                        <span>&middot;</span>
                        <span className="px-2 py-0.5 rounded bg-slate-950/80 border border-white/5">{job.source}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-violet-300 bg-violet-500/10 px-2 py-1 rounded-full border border-violet-500/20">{job.tag}</span>
                      <button 
                        onClick={() => {
                          setIqTitle(job.title);
                          setIqCompany(job.company);
                          setActiveSubTab("iq");
                        }}
                        className="py-1.5 px-4 bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white rounded-xl transition flex items-center gap-1"
                      >
                        Match IQ <ArrowUpRight className="w-3 h-3"/>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* SUBTAB 2: Job Match IQ */}
        {activeSubTab === "iq" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            {/* Input card */}
            <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" /> Match IQ Scanner
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Job Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Backend Developer"
                    value={iqTitle}
                    onChange={(e) => setIqTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Company</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Atlassian"
                    value={iqCompany}
                    onChange={(e) => setIqCompany(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Job Description</label>
                <textarea 
                  rows={4}
                  placeholder="Paste target JD requirements..."
                  value={iqJD}
                  onChange={(e) => setIqJD(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Paste Resume text</label>
                <textarea 
                  rows={4}
                  placeholder="Paste your CV copy..."
                  value={iqResume}
                  onChange={(e) => setIqResume(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none resize-none"
                />
              </div>
              <button
                onClick={handleJobMatchIQ}
                disabled={loading || !iqTitle.trim() || !iqJD.trim() || !iqResume.trim()}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-semibold rounded-xl transition"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                Evaluate Match Score
              </button>
            </div>

            {/* Results card */}
            <div className="space-y-6">
              {iqResult ? (
                <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-5 animate-fade-in">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-violet-600/10 border-2 border-violet-500 flex items-center justify-center text-lg font-bold text-violet-300">
                      {iqResult.match_percentage}%
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{iqTitle}</h4>
                      <p className="text-xs text-slate-400">Match score evaluated successfully</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-red-400 block mb-1.5">Missing Technical Skills:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {iqResult.missing_skills.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-950/40 text-red-300 border border-red-900/35">{s}</span>
                      ))}
                    </div>
                  </div>
                  {iqResult.missing_projects && iqResult.missing_projects.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-violet-300 block mb-1">Recommended Projects:</span>
                      <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                        {iqResult.missing_projects.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                  {coverLetter ? (
                    <div className="p-3 bg-slate-950/50 rounded-xl border border-white/5 text-[11px] max-h-[120px] overflow-y-auto custom-scrollbar">
                      <strong className="text-cyan-400 block mb-1">AI Optimized Cover Letter:</strong>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{coverLetter}</p>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950/50 rounded-xl border border-white/5 text-[11px] text-slate-500 italic">
                      Cover letter generation didn't return content — try again.
                    </div>
                  )}
                  {rewrittenSection && (
                    <div className="p-3 bg-slate-950/50 rounded-xl border border-white/5 text-[11px]">
                      <strong className="text-violet-400 block mb-1">Tailored Section Rewrite:</strong>
                      <p className="text-slate-300 leading-relaxed">{rewrittenSection}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full min-h-[300px] border border-white/10 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-slate-900/40">
                  <FileText className="w-12 h-12 text-slate-500 mb-4" />
                  <p className="text-slate-400 text-sm">Enter resume details and JD to evaluate match gaps.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 3: Company Decoder */}
        {activeSubTab === "decoder" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Selector */}
            <div className="lg:col-span-1 p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-violet-400" /> Decode Corporate
              </h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Enter Target Company</label>
                <input 
                  type="text" 
                  placeholder="e.g. Amazon, Google..."
                  value={decoderInput}
                  onChange={(e) => setDecoderInput(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
              <button
                onClick={handleDecodeCompany}
                disabled={loading || !decoderInput.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-xs font-bold rounded-xl transition"
              >
                Decode Company Intelligence
              </button>
            </div>

            {/* Results */}
            <div className="lg:col-span-2">
              {decodedCompany ? (
                <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-4 animate-fade-in text-xs leading-relaxed">
                  <div className="border-b border-white/5 pb-3">
                    <h4 className="text-lg font-bold text-white">{decoderInput} Overview</h4>
                    <p className="text-slate-400 mt-1">{decodedCompany.summary}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5">
                      <strong className="text-violet-300">Engineering Tech Stack:</strong>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {decodedCompany.tech_stack.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-900 rounded border border-white/5 text-[10px]">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5">
                      <strong className="text-cyan-300">Average Salary Package:</strong>
                      <p className="text-slate-300 mt-1">{decodedCompany.salary_range}</p>
                    </div>
                  </div>
                  <div>
                    <strong className="text-slate-300 block mb-1">Interview Process Rounds:</strong>
                    <ul className="list-disc pl-4 text-slate-400 space-y-0.5">
                      {decodedCompany.interview_process.map((p, idx) => <li key={idx}>{p}</li>)}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong className="text-slate-300 block mb-0.5">Work Culture:</strong>
                      <p className="text-slate-400">{decodedCompany.culture}</p>
                    </div>
                    <div>
                      <strong className="text-slate-300 block mb-0.5">Hiring Trends & Structure:</strong>
                      <p className="text-slate-400">{decodedCompany.hiring_trends}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] border border-white/10 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-slate-900/40">
                  <Building className="w-12 h-12 text-slate-500 mb-4" />
                  <p className="text-slate-400 text-sm">Decode corporate pipelines and recruitment metrics.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 4: Network Builder */}
        {activeSubTab === "network" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Settings */}
            <div className="lg:col-span-1 p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-400" /> Warm Outreach
              </h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Target Person Role</label>
                <select
                  value={netPerson}
                  onChange={(e) => setNetPerson(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Alumni">Alumni</option>
                  <option value="Recruiter">Recruiter</option>
                  <option value="Hiring Manager">Hiring Manager</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Target Company</label>
                <input 
                  type="text" 
                  placeholder="e.g. Stripe"
                  value={netCompany}
                  onChange={(e) => setNetCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Your Context / Target Focus</label>
                <input 
                  type="text" 
                  placeholder="e.g. Backend React student with Docker projects"
                  value={netSkills}
                  onChange={(e) => setNetSkills(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white"
                />
              </div>
              <button
                onClick={handleNetworkBuilder}
                disabled={loading || !netCompany.trim() || !netSkills.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-xs font-bold rounded-xl transition"
              >
                Generate Templates
              </button>
            </div>

            {/* Templates output */}
            <div className="lg:col-span-2">
              {netTemplates ? (
                <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-4 animate-fade-in text-xs">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5">
                    <strong className="text-violet-300 block mb-1">LinkedIn Connection Request (Under 300 char):</strong>
                    <p className="text-slate-300 italic">{netTemplates.connection_request}</p>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5">
                    <strong className="text-cyan-300 block mb-1">Cold Outreach Email / Message:</strong>
                    <p className="text-slate-300 whitespace-pre-wrap">{netTemplates.outreach_message}</p>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5">
                    <strong className="text-pink-300 block mb-1">Referral Request:</strong>
                    <p className="text-slate-300">{netTemplates.referral_message}</p>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] border border-white/10 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-slate-900/40">
                  <Users className="w-12 h-12 text-slate-500 mb-4" />
                  <p className="text-slate-400 text-sm">Generate referral requests and cold email outreach copies.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 5: Application CRM pipeline tracker */}
        {activeSubTab === "crm" && (
          <div className="space-y-6 animate-fade-in">
            {/* Input logger row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 bg-slate-900/60 p-4 border border-white/10 rounded-2xl">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-1 uppercase font-semibold">Company</label>
                <input 
                  type="text" 
                  placeholder="Atlassian"
                  value={newCrmCompany}
                  onChange={(e) => setNewCrmCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-1 uppercase font-semibold">Role</label>
                <input 
                  type="text" 
                  placeholder="Backend Developer"
                  value={newCrmRole}
                  onChange={(e) => setNewCrmRole(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <button
                onClick={handleCrmAdd}
                className="py-2.5 px-6 bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white rounded-xl transition"
              >
                Log Application
              </button>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {([
                { id: "applied", label: "Applied", color: "text-blue-400 bg-blue-500/5" },
                { id: "oa", label: "OA Test", color: "text-amber-400 bg-amber-500/5" },
                { id: "interview", label: "Interview", color: "text-purple-400 bg-purple-500/5" },
                { id: "offer", label: "Offer", color: "text-green-400 bg-green-500/5" },
                { id: "rejected", label: "Rejected", color: "text-red-400 bg-red-500/5" }
              ] as const).map(col => (
                <div key={col.id} className={`p-4 rounded-2xl border border-white/5 ${col.color} flex flex-col min-h-[300px]`}>
                  <div className="border-b border-white/5 pb-2 mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">{col.label}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{crmList.filter(c => c.status === col.id).length}</span>
                  </div>
                  <div className="flex-1 space-y-2">
                    {crmList
                      .filter(c => c.status === col.id)
                      .map(app => (
                        <div key={app.id} className="p-3 bg-slate-950 rounded-xl border border-white/5 flex flex-col justify-between gap-1 group">
                          <div>
                            <p className="text-xs font-bold text-white truncate">{app.role}</p>
                            <p className="text-[10px] text-slate-500">{app.company}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-white/5">
                            <select
                              value={app.status}
                              onChange={(e) => handleCrmStatusChange(app.id, e.target.value as typeof app.status)}
                              className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-violet-500"
                            >
                              <option value="applied">Applied</option>
                              <option value="oa">OA Test</option>
                              <option value="interview">Interview</option>
                              <option value="offer">Offer</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            <button onClick={() => handleCrmDelete(app.id)} className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}