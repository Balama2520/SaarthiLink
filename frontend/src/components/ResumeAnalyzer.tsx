import { useState, useCallback, useRef, useEffect } from "react";
import { api } from "../services/api";
import { useToast } from "../hooks/useToast";
import { useAppStore } from "../store/useAppStore";
import { ChevronDown, Sparkles } from "lucide-react";
import { useStreamingText } from "../hooks/useStreamingText";

function StreamingSummary({ text }: { text: string }) {
  const { displayedText, isTyping } = useStreamingText(text, 15);
  return (
    <div className="bg-card/40 backdrop-blur-md border border-border rounded-3xl p-8 shadow-xl mt-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px]" />
      <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" /> AI Executive Summary
      </h3>
      <p className="text-foreground/80 leading-relaxed min-h-[60px]">
        {displayedText}
        {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse" />}
      </p>
    </div>
  );
}

interface AnalysisResult {
  overall_ats_score: number;
  section_scores: {
    structure: number;
    skills: number;
    education: number;
    experience: number;
    keywords: number;
  };
  personal_info: { name: string; email: string; phone: string };
  education: unknown[];
  experience: unknown[];
  projects: unknown[];
  tech_skills: string[];
  soft_skills: string[];
  certifications: string[];
  languages: string[];
  links: Record<string, unknown>;
  strengths: string[];
  weaknesses: string[];
  skill_gaps: string[];
  recommendations: string[];
  summary: string;
  word_count: number;
}

const ROLES = [
  "ML Engineer",
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Data Scientist",
  "DevOps Engineer",
  "Full Stack Developer",
];

function ScoreRing({ score, label, size = "lg" }: { score: number, label?: string, size?: "sm" | "lg" }) {
  const radius = size === "lg" ? 54 : 36;
  const stroke = size === "lg" ? 12 : 8;
  const circumference = 2 * Math.PI * radius;
  const progress = ((100 - score) / 100) * circumference;
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const svgSize = size === "lg" ? 136 : 88;
  const center = svgSize / 2;

  return (
    <div className={`relative flex flex-col items-center justify-center ${size === "lg" ? 'w-36 h-36' : 'w-24 h-24'} mx-auto`}>
      <svg className={`-rotate-90`} width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        <circle cx={center} cy={center} r={radius} className="text-border" stroke="currentColor" strokeWidth={stroke} fill="none" />
        <circle
          cx={center} cy={center} r={radius}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <div className={`${size === "lg" ? 'text-3xl' : 'text-xl'} font-bold`} style={{ color }}>{score}</div>
      </div>
      {label && <div className="text-xs text-muted-foreground mt-2 whitespace-nowrap">{label}</div>}
    </div>
  );
}

function SkillTag({ label, variant = "blue" }: { label: string; variant?: "green" | "amber" | "red" | "blue" }) {
  const styles = {
    green: "bg-green-900/40 text-green-300 border-green-700/50",
    amber: "bg-amber-900/40 text-amber-300 border-amber-700/50",
    red: "bg-red-900/40 text-red-300 border-red-700/50",
    blue: "bg-accent/15 text-accent border-accent/30",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[variant]} capitalize`}>
      {label}
    </span>
  );
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

export default function ResumeAnalyzer() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isGuest = !isAuthenticated;
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{parsed_data: AnalysisResult, resume_id: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setRoleOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validateAndSetFile = useCallback((candidate: File | null) => {
    if (!candidate) return;
    const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) =>
      candidate.name.toLowerCase().endsWith(ext)
    );
    if (!hasAllowedExtension) {
      toast("Please upload a .pdf, .docx, or .txt file.", "error");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      toast("File is too large. Please upload a resume under 10 MB.", "error");
      return;
    }
    setFile(candidate);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    validateAndSetFile(e.dataTransfer.files[0] ?? null);
  }, [validateAndSetFile]);

  const handleAnalyze = async () => {
    if (!file) return;
    if (isGuest) { setError("Please sign in to analyze resumes"); return; }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.analyzeResume(file, targetRole); // Returns { message, resume_id, parsed_data }
      setResult({ parsed_data: data.parsed_data, resume_id: data.resume_id });
      toast("Resume parsed successfully!", "success");
      setShowSyncModal(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Something went wrong");
      toast("Failed to parse resume.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncProfile = async () => {
    if (!result?.resume_id) return;
    setSyncing(true);
    try {
      await api.syncResumeProfile(result.resume_id, true);
      toast("Profile synchronized successfully!", "success");
      setShowSyncModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      toast(message, "error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 py-10 relative z-10">
        <div className="mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-2">Resume Intelligence</h1>
          <p className="text-muted-foreground font-medium">Upload a PDF or DOCX. SaarthiLink analyzes ATS fit, extracts skills, and can sync new facts into your profile without overwriting what you already entered.</p>
        </div>

        {/* Upload Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div
              className={`relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 backdrop-blur-sm
                ${dragging ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(233,162,59,0.15)]" : "border-border hover:border-primary/50 hover:bg-border bg-card/40"}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => validateAndSetFile(e.target.files?.[0] || null)}
              />
              <div className="text-5xl mb-4">📄</div>
              {file ? (
                <div>
                  <p className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary font-bold text-xl">{file.name}</p>
                  <p className="text-muted-foreground text-sm mt-2 font-medium">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-foreground font-bold text-lg">Drop your resume here</p>
                  <p className="text-muted-foreground text-sm mt-2 font-medium">PDF, DOCX, or TXT · Max 10MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="relative" ref={dropdownRef}>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Target Role (optional)</label>
              <div 
                className="w-full bg-card/60 border border-border rounded-xl px-4 py-3.5 text-foreground text-sm cursor-pointer hover:border-primary/40 transition-colors flex items-center justify-between shadow-inner backdrop-blur-sm"
                onClick={() => setRoleOpen(!roleOpen)}
              >
                <span className="font-medium text-foreground">{targetRole || "Any role"}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${roleOpen ? "rotate-180" : ""}`} />
              </div>
              
              {roleOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden z-20 py-1">
                  <div 
                    className={`px-4 py-3 text-sm cursor-pointer transition-colors ${!targetRole ? "bg-primary/20 text-primary font-medium" : "text-foreground hover:bg-border hover:text-foreground"}`}
                    onClick={() => { setTargetRole(""); setRoleOpen(false); }}
                  >
                    Any role
                  </div>
                  {ROLES.map(r => (
                    <div 
                      key={r}
                      className={`px-4 py-3 text-sm cursor-pointer transition-colors ${targetRole === r ? "bg-primary/20 text-primary font-medium" : "text-foreground hover:bg-border hover:text-foreground"}`}
                      onClick={() => { setTargetRole(r); setRoleOpen(false); }}
                    >
                      {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              id="analyze-btn"
              onClick={handleAnalyze}
              disabled={!file || loading || isGuest}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all duration-200
                bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
                text-primary-foreground shadow-lg shadow-primary/20"
            >
              {loading ? "Parsing & Analyzing..." : "Analyze Resume"}
            </button>
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {result?.parsed_data && (
          <div className="space-y-6 animate-fade-in">
            {/* Score Overview */}
            <div className="bg-card/40 backdrop-blur-md border border-border rounded-3xl p-8 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
                <div className="flex justify-center">
                  <ScoreRing score={result.parsed_data.overall_ats_score} label="Overall ATS Score" />
                </div>
                <div className="md:col-span-3">
                  <h3 className="text-xl font-bold text-foreground mb-2">ATS Section Breakdown</h3>
                  <div className="flex flex-wrap gap-8 mt-4">
                    <ScoreRing score={result.parsed_data.section_scores.structure || 0} size="sm" label="Structure" />
                    <ScoreRing score={result.parsed_data.section_scores.skills || 0} size="sm" label="Skills" />
                    <ScoreRing score={result.parsed_data.section_scores.experience || 0} size="sm" label="Experience" />
                    <ScoreRing score={result.parsed_data.section_scores.education || 0} size="sm" label="Education" />
                  </div>
                </div>
              </div>
            </div>

            {result.parsed_data.summary && <StreamingSummary text={result.parsed_data.summary} />}

            {/* Content Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Tech Skills */}
              <div className="bg-card/40 backdrop-blur-md border border-border rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-green-400">✓</span> Tech Skills Found ({result.parsed_data.tech_skills?.length || 0})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.parsed_data.tech_skills?.length > 0
                    ? result.parsed_data.tech_skills.map((s, i) => <SkillTag key={i} label={s} variant="green" />)
                    : <span className="text-muted-foreground text-sm">No tech skills detected</span>}
                </div>
              </div>

              {/* Skill Gaps */}
              <div className="bg-card/40 backdrop-blur-md border border-border rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-red-400">✗</span> Skill Gaps for <span className="text-accent">{targetRole || "Target"}</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.parsed_data.skill_gaps?.length > 0
                    ? result.parsed_data.skill_gaps.map((s, i) => <SkillTag key={i} label={s} variant="red" />)
                    : <span className="text-muted-foreground text-sm">No major skill gaps</span>}
                </div>
              </div>

              {/* Strengths */}
              <div className="bg-card/40 backdrop-blur-md border border-border rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold text-foreground mb-4 text-success">Strengths</h3>
                <ul className="list-disc list-inside text-foreground/80 text-sm space-y-2">
                  {result.parsed_data.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="bg-card/40 backdrop-blur-md border border-border rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold mb-4 text-accent">💡 Actionable Recommendations</h3>
                <ul className="space-y-3">
                  {result.parsed_data.recommendations?.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-foreground/80">
                      <span className="text-primary mt-0.5 shrink-0">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sync Profile Modal */}
      {showSyncModal && result?.parsed_data && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-popover border border-border rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-semibold text-foreground">Sync Resume with Profile</h3>
              <p className="text-muted-foreground text-sm mt-1">
                We extracted detailed information from your resume. Would you like to update your SaarthiLink Profile and Skills to match?
              </p>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Diff view representation */}
              <div className="text-sm">
                <div className="font-medium text-foreground mb-2">New Info to Add/Merge:</div>
                <ul className="text-muted-foreground space-y-2">
                  <li>• {result.parsed_data.tech_skills.length} Technical Skills</li>
                  <li>• {result.parsed_data.experience.length} Experience Entries</li>
                  <li>• {result.parsed_data.education.length} Education Entries</li>
                </ul>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-3 rounded-lg text-xs">
                Note: Your existing profile data will not be overwritten if it already exists. New data will be merged.
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button 
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-border hover:bg-muted transition-colors"
              >
                Skip for now
              </button>
              <button 
                onClick={handleSyncProfile}
                disabled={syncing}
                className="px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {syncing ? "Syncing..." : "Sync Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
