import React, { useState, useRef } from "react";
import {
  Microscope, BookOpen, Layers, Upload, Loader2, FileText,
  Sparkles, ArrowUpRight, ChevronRight, Search, Brain, Star
} from "lucide-react";
import { api } from "../services/api";

interface PaperAnalysis {
  title?: string;
  summary: string;
  methodology: string;
  key_findings: string[];
  limitations: string[];
  research_gaps: string[];
  flashcards?: { question: string; answer: string }[];
}

type ActiveTool = "compass" | "decoder" | "matrix" | null;

// ── Tool Card ────────────────────────────────────────────────
function ToolCard({
  icon: Icon,
  title,
  description,
  badge,
  gradient,
  glowColor,
  onClick,
  active,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  badge: string;
  gradient: string;
  glowColor: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col text-left rounded-2xl border p-5 transition-all duration-200 overflow-hidden w-full
        ${active
          ? "border-violet-400/50 bg-violet-500/10"
          : "border-white/8 bg-slate-900/40 hover:border-white/15 hover:bg-white/[0.03] hover:-translate-y-0.5"
        }`}
      style={{ boxShadow: active ? `0 0 30px -5px ${glowColor}` : undefined }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-300 ${active ? "opacity-100" : "group-hover:opacity-60"}`} />
      
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border"
          style={{ background: `${glowColor}20`, borderColor: `${glowColor}50` }}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/60"
          style={{ background: `${glowColor}20`, border: `1px solid ${glowColor}50` }}>
          {badge}
        </span>
      </div>

      <div className="relative">
        <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
        <p className="text-[12px] text-slate-400 leading-relaxed">{description}</p>
      </div>

      <div className={`relative mt-3 flex items-center gap-1 text-[11px] font-semibold transition-all duration-200
        ${active ? "text-violet-300" : "text-slate-600 group-hover:text-slate-300"}`}>
        {active ? "Active" : "Open"}
        <ChevronRight className="h-3 w-3" />
      </div>
    </button>
  );
}

// ── Paper Decoder ────────────────────────────────────────────
function PaperDecoder() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaperAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFlashcard, setActiveFlashcard] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (f.type === "application/pdf") {
      setFile(f);
      setError(null);
    } else {
      setError("Only PDF files are supported. Please drop a .pdf file.");
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.analyzePaper(file);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer
          ${file ? "border-violet-500/40 bg-violet-500/5" : "border-white/10 bg-slate-900/30 hover:border-violet-500/30 hover:bg-violet-500/3"}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
        />
        {file ? (
          <>
            <FileText className="h-8 w-8 text-violet-400 mb-2" />
            <p className="text-sm font-semibold text-violet-300">{file.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-slate-500 mb-3" />
            <p className="text-sm font-semibold text-slate-300">Drop a PDF paper here</p>
            <p className="text-xs text-slate-600 mt-1">or click to browse · PDF only</p>
          </>
        )}
      </div>

      <button
        onClick={handleAnalyze}
        disabled={!file || loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 hover:from-violet-500 hover:to-fuchsia-400 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing Paper…</>
          : <><Sparkles className="h-4 w-4" /> Decode Paper</>
        }
      </button>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-xs text-red-400">{error}</div>
      )}

      {/* Results */}
      {result && (
        <div className="fade-in space-y-4">
          {result.title && (
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/8 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-1">Paper Title</p>
              <p className="text-sm font-bold text-white">{result.title}</p>
            </div>
          )}

          {/* Summary */}
          <div className="rounded-2xl border border-white/8 bg-slate-900/50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <BookOpen className="h-3 w-3" /> Summary
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">{result.summary}</p>
          </div>

          {/* Methodology */}
          <div className="rounded-2xl border border-white/8 bg-slate-900/50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Brain className="h-3 w-3" /> Methodology
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">{result.methodology}</p>
          </div>

          {/* Key findings */}
          {result.key_findings?.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-slate-900/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Star className="h-3 w-3" /> Key Findings
              </p>
              <ul className="space-y-2">
                {result.key_findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-green-500/15 text-[9px] font-bold text-green-400">{i + 1}</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Research Gaps */}
          {result.research_gaps?.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                <Search className="h-3 w-3" /> Research Gaps
              </p>
              <ul className="space-y-2">
                {result.research_gaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-amber-300/80">
                    <ArrowUpRight className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Flashcards */}
          {result.flashcards && result.flashcards.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-slate-900/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Flashcards</p>
              <div className="space-y-2">
                {result.flashcards.map((fc, i) => (
                  <div key={i} className="rounded-xl border border-white/5 bg-slate-950/40 overflow-hidden">
                    <button
                      onClick={() => setActiveFlashcard(activeFlashcard === i ? null : i)}
                      className="flex w-full items-center gap-2 p-3 text-left text-xs font-semibold text-slate-300 hover:text-white"
                    >
                      <span className="shrink-0 rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] text-violet-400">Q</span>
                      {fc.question}
                    </button>
                    {activeFlashcard === i && (
                      <div className="border-t border-white/5 px-3 pb-3 pt-2 text-xs text-slate-400 bg-slate-950/30">
                        <span className="mr-1.5 rounded bg-green-500/15 px-1.5 py-0.5 text-[9px] text-green-400">A</span>
                        {fc.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Research Compass ─────────────────────────────────────────
function ResearchCompass() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10">
        <Microscope className="h-7 w-7 text-cyan-400" />
      </div>
      <h3 className="text-base font-bold text-white mb-2">Research Compass</h3>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
        Enter your research interests to generate trending topics, literature maps, and publication roadmaps.
      </p>
      <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs text-cyan-400">
        🚧 Coming in the next build — connecting to arXiv & Semantic Scholar APIs
      </div>
    </div>
  );
}

// ── Literature Matrix ─────────────────────────────────────────
function LiteratureMatrix() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
        <Layers className="h-7 w-7 text-emerald-400" />
      </div>
      <h3 className="text-base font-bold text-white mb-2">Literature Matrix</h3>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
        Automatically map papers by Problem → Method → Dataset → Accuracy → Limitation in a visual comparison table.
      </p>
      <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-400">
        🚧 Coming in the next build — multi-paper batch upload
      </div>
    </div>
  );
}

const TOOLS = [
  {
    id: "compass" as const,
    icon: Microscope,
    title: "Research Compass",
    description: "Generate research roadmaps, trending topics, and field exploration maps from your interests.",
    badge: "Roadmap",
    gradient: "from-cyan-600/15 to-blue-600/5",
    glowColor: "rgba(6,182,212,0.4)",
  },
  {
    id: "decoder" as const,
    icon: BookOpen,
    title: "Paper Decoder",
    description: "Upload any research PDF to get AI-powered summaries, methodology breakdown, gaps, and flashcards.",
    badge: "PDF → AI",
    gradient: "from-violet-600/15 to-fuchsia-600/5",
    glowColor: "rgba(139,92,246,0.4)",
  },
  {
    id: "matrix" as const,
    icon: Layers,
    title: "Literature Matrix",
    description: "Compare multiple papers across Problem, Method, Dataset, Accuracy, and Limitations in one view.",
    badge: "Compare",
    gradient: "from-emerald-600/15 to-teal-600/5",
    glowColor: "rgba(16,185,129,0.4)",
  },
];

const ResearchHub: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ActiveTool>("decoder");

  return (
    <div className="relative flex-1 overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-72 h-72 rounded-full bg-cyan-600/6 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-violet-600/6 blur-[100px]" />
      </div>

      <div className="relative h-full overflow-y-auto custom-scrollbar px-6 py-7 lg:px-8">
        {/* Header */}
        <div className="fade-in-up mb-7">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
              <Microscope className="h-4 w-4 text-cyan-400" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-400">Research Hub</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Research Command Center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Decode papers, map research gaps, and accelerate your scholarly work with AI.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Tool selector column */}
          <div className="lg:col-span-1 space-y-3">
            {TOOLS.map((tool, i) => (
              <div key={tool.id} className={`fade-in-up stagger-${i + 2}`}>
                <ToolCard
                  {...tool}
                  active={activeTool === tool.id}
                  onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                />
              </div>
            ))}
          </div>

          {/* Active tool workspace */}
          <div className="lg:col-span-2">
            <div className="fade-in rounded-2xl border border-white/8 bg-slate-900/50 p-5 backdrop-blur-sm min-h-[400px]">
              {activeTool === null && (
                <div className="flex h-full min-h-[350px] flex-col items-center justify-center text-center py-12">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <Microscope className="h-6 w-6 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-500">Select a research tool on the left to get started.</p>
                </div>
              )}
              {activeTool === "compass" && <ResearchCompass />}
              {activeTool === "decoder" && <PaperDecoder />}
              {activeTool === "matrix" && <LiteratureMatrix />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchHub;