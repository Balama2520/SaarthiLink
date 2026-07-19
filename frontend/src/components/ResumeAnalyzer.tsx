import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "../services/api";
import { localDB } from "../services/localDB";
interface AnalysisResult {
  ats_score: number;
  word_count: number;
  found_sections: string[];
  missing_sections: string[];
  tech_skills_found: string[];
  soft_skills_found: string[];
  skill_gaps: string[];
  target_role: string | null;
  education: { has_degree: boolean; cgpa: string | null };
  suggestions: string[];
  summary: string;
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

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = ((100 - score) / 100) * circumference;
  const color =
    score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center w-36 h-36 mx-auto">
      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} stroke="#1e1e2e" strokeWidth="12" fill="none" />
        <circle
          cx="64" cy="64" r={radius}
          stroke={color} strokeWidth="12" fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold" style={{ color }}>{score}</div>
        <div className="text-xs text-gray-400 mt-0.5">ATS Score</div>
      </div>
    </div>
  );
}

function SkillTag({ label, variant }: { label: string; variant: "green" | "amber" | "red" | "blue" }) {
  const styles = {
    green: "bg-green-900/40 text-green-300 border-green-700/50",
    amber: "bg-amber-900/40 text-amber-300 border-amber-700/50",
    red: "bg-red-900/40 text-red-300 border-red-700/50",
    blue: "bg-blue-900/40 text-blue-300 border-blue-700/50",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[variant]} capitalize`}>
      {label}
    </span>
  );
}

export default function ResumeAnalyzer() {
  const isGuest = !localStorage.getItem("access_token");
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  useEffect(() => {
    async function loadSavedAnalysis() {
      const saved = await localDB.getResumeAnalysis();
      if (saved) {
        setResult(saved as AnalysisResult);
        setLoadedFromCache(true);
      }
    }
    loadSavedAnalysis();
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;
    if (isGuest) { setError("Please sign in to analyze resumes"); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    setLoadedFromCache(false);

    try {
      const data: AnalysisResult = await api.analyzeResume(file, targetRole);
      setResult(data);
      await localDB.saveResumeAnalysis(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-sm font-bold">S</div>
        <span className="font-semibold text-white">Saarthi AI</span>
        <span className="text-gray-500 text-sm ml-1">/ Resume Analyzer</span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Resume Analyzer</h1>
          <p className="text-gray-400">Get your ATS score, identify skill gaps, and receive actionable suggestions to land your next role.</p>
        </div>

        {/* Upload Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
                ${dragging ? "border-violet-500 bg-violet-500/10" : "border-white/10 hover:border-violet-500/50 hover:bg-white/5 bg-white/2"}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div className="text-5xl mb-4">📄</div>
              {file ? (
                <div>
                  <p className="text-violet-400 font-semibold text-lg">{file.name}</p>
                  <p className="text-gray-500 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-white font-medium">Drop your resume here</p>
                  <p className="text-gray-500 text-sm mt-1">PDF or TXT · Max 5MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Target Role (optional)</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              >
                <option value="">Any role</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button
              id="analyze-btn"
              onClick={handleAnalyze}
              disabled={!file || loading || isGuest}
              className="w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200
                bg-violet-600 hover:bg-violet-500 disabled:bg-white/10 disabled:text-gray-500 disabled:cursor-not-allowed
                text-white shadow-lg shadow-violet-600/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Analyzing...
                </span>
              ) : "Analyze Resume"}
            </button>
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-fade-in">
            {loadedFromCache && (
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 text-sm text-violet-100">
                Loaded saved resume analysis from your browser cache.
              </div>
            )}
            {/* Score Overview */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <ScoreRing score={result.ats_score} />
                <div className="md:col-span-2">
                  <p className="text-lg font-medium text-white mb-2">{result.summary}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    <span>📝 {result.word_count} words</span>
                    <span>📚 {result.education.has_degree ? "Degree found" : "No degree detected"}{result.education.cgpa ? ` · CGPA ${result.education.cgpa}` : ""}</span>
                    <span>🗂 {result.found_sections.length}/{result.found_sections.length + result.missing_sections.length} sections</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-green-400">✓</span> Tech Skills Found ({result.tech_skills_found.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.tech_skills_found.length > 0
                    ? result.tech_skills_found.map((s) => <SkillTag key={s} label={s} variant="green" />)
                    : <span className="text-gray-500 text-sm">No tech skills detected</span>}
                </div>
              </div>

              <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-amber-400">⚠</span> Soft Skills Found ({result.soft_skills_found.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.soft_skills_found.length > 0
                    ? result.soft_skills_found.map((s) => <SkillTag key={s} label={s} variant="amber" />)
                    : <span className="text-gray-500 text-sm">No soft skills detected</span>}
                </div>
              </div>
            </div>

            {/* Skill Gaps */}
            {result.skill_gaps.length > 0 && (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-red-400">✗</span> Skill Gaps for <span className="text-violet-400">{result.target_role}</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.skill_gaps.map((s) => <SkillTag key={s} label={s} variant="red" />)}
                </div>
              </div>
            )}

            {/* Missing Sections */}
            {result.missing_sections.length > 0 && (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-4">Missing Sections</h3>
                <div className="flex flex-wrap gap-2">
                  {result.missing_sections.map((s) => <SkillTag key={s} label={s} variant="blue" />)}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-4">💡 Suggestions to Improve</h3>
                <ul className="space-y-3">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-300">
                      <span className="text-violet-400 mt-0.5 shrink-0">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
