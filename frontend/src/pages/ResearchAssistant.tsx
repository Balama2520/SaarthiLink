import { useState, useRef } from "react";
import { BookOpen, FileText, Loader2, GraduationCap, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";

interface PaperAnalysis {
  summary: string;
  explanation: string;
  notes: string[];
  quiz: {
    question: string;
    options: string[];
    answer: string;
  }[];
}

export default function ResearchAssistant() {
  const isGuest = !localStorage.getItem("access_token");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<PaperAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    if (!file) return;
    if (isGuest) { setError("Please sign in to analyze papers"); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await api.analyzePaper(file);
      setAnalysis(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to analyze paper");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 overflow-y-auto px-8 py-10 font-sans text-slate-100">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2.5">
          <BookOpen className="w-8 h-8 text-indigo-400" /> AI Research Assistant
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload a research paper or document to automatically generate summaries, notes, and quizzes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 bg-slate-900/90 border border-white/10 rounded-2xl shadow-lg shadow-black/20">
            <h3 className="font-semibold text-white mb-4">Upload Paper</h3>
            
            <div 
              className="border border-white/10 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900/80 transition-colors mb-4"
              onClick={() => inputRef.current?.click()}
            >
              <input type="file" ref={inputRef} accept=".pdf,.txt" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              <FileText className="w-8 h-8 text-indigo-500/50 mb-2" />
              {file ? (
                <span className="text-sm text-indigo-400 font-medium text-center">{file.name}</span>
              ) : (
                <span className="text-xs text-slate-500 text-center">Click to upload PDF or TXT</span>
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !file}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-500 hover:to-purple-400 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Analyzing Document..." : "Analyze Paper"}
            </button>
            {error && <div className="text-red-400 text-xs mt-2">{error}</div>}
          </div>
        </div>

        <div className="lg:col-span-3">
          {analysis ? (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-900/90 border border-indigo-500/20 rounded-2xl p-6 shadow-lg shadow-black/20">
                <h3 className="text-lg font-bold text-indigo-300 mb-2">Executive Summary</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{analysis.summary}</p>
              </div>

              <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
                <h3 className="font-semibold text-white mb-3">Key Concepts & Explanation</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{analysis.explanation}</p>
              </div>

              <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
                <h3 className="font-semibold text-white mb-3">Study Notes</h3>
                <ul className="space-y-3">
                  {analysis.notes.map((note, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-3 bg-slate-900/80 p-3 rounded-lg border border-white/10">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-400" /> 
                  Knowledge Quiz
                </h3>
                <div className="space-y-6">
                  {analysis.quiz.map((q, idx) => (
                    <div key={idx} className="p-5 border border-white/5 rounded-xl bg-[#0a0a0f]">
                      <p className="text-sm font-semibold text-white mb-3">Q{idx + 1}: {q.question}</p>
                      <div className="space-y-2 mb-3">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="text-xs text-slate-400 p-2 border border-white/10 rounded-lg bg-slate-900/80">
                            {opt}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-indigo-400 bg-indigo-500/10 inline-block px-3 py-1.5 rounded-md font-medium border border-indigo-500/20">
                        Answer: {q.answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border border-white/10 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-slate-900/80">
              <BookOpen className="w-12 h-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-bold text-slate-300 mb-2">No Analysis Available</h3>
              <p className="text-sm text-slate-400 max-w-sm">
                Upload a document and our AI Research Assistant will break it down for you.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}