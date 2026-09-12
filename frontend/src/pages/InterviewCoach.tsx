import { useState, useEffect, useRef } from "react";
import { UserCheck, Sparkles, Target, TrendingUp, Mic, MicOff, Play, CheckCircle2, ChevronRight, ChevronDown, Activity, RotateCcw, AlertCircle } from "lucide-react";
import { api } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../hooks/useToast";

interface SpeechRecognitionEventLike {
  results: { [index: number]: { [index: number]: { transcript: string } }; length: number };
}
interface SpeechRecognitionInstance {
  continuous: boolean; interimResults: boolean; lang: string;
  start: () => void; stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const FILLER_WORDS = ["um", "uh", "like", "you know", "i guess", "maybe", "sort of", "kind of"];
function estimateConfidence(answers: string[]): number {
  const combined = answers.join(" ").toLowerCase();
  const words = combined.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const fillerCount = FILLER_WORDS.reduce((c, p) => c + (combined.split(p).length - 1), 0);
  const fillerDensity = fillerCount / words.length;
  const lengthScore = Math.min(words.length / 40, 1) * 60;
  const fillerPenalty = Math.min(fillerDensity * 200, 40);
  return Math.round(Math.max(0, Math.min(100, 40 + lengthScore - fillerPenalty)));
}
function estimateWpm(answers: string[], totalElapsedMs: number): number | null {
  const wordCount = answers.join(" ").split(/\s+/).filter(Boolean).length;
  if (wordCount === 0 || totalElapsedMs <= 0) return null;
  return Math.round(wordCount / Math.max(totalElapsedMs / 60000, 0.1));
}
function estimateClarity(answers: string[]): number {
  const sentences = answers.join(" ").split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  const wellFormed = sentences.filter(s => /^[A-Z]/.test(s.trim()) && /[.!?]$/.test(s.trim())).length;
  return Math.round(50 + (wellFormed / sentences.length) * 45);
}

interface InterviewFeedback {
  score: number; strengths: string[]; areas_for_improvement: string[];
  feedback: string; confidence?: number; speaking_speed?: number; grammar?: number; technical_accuracy?: number;
}

const QUESTIONS_DECK = {
  HR: [
    "Tell me about yourself and your career goals.",
    "Why do you want to join our organization specifically?",
    "Where do you see yourself in five years?"
  ],
  Technical: [
    "Explain the concept of virtual DOM and how React optimizes rendering.",
    "What is the difference between a process and a thread in OS?",
    "Describe how hash collisions are resolved in hash maps."
  ],
  Behavioral: [
    "Tell me about a time you resolved a major conflict in a group coding project.",
    "Describe a situation where you had to learn a complex framework under a tight deadline.",
    "Give an example of a mistake you made in a technical architecture decision."
  ],
  Coding: [
    "How would you optimize a search operation in a sorted array?",
    "Explain the time and space complexity of merge sort.",
    "Describe how you would implement an LRU Cache."
  ],
  "Stress Round": [
    "Your project fails to deploy 10 minutes before the product launch. What do you do?",
    "If we find your skills don't match this role, why should we still hire you?",
    "Why is your CGPA not as competitive as other applicants?"
  ]
};

function formatRoundName(roundType: keyof typeof QUESTIONS_DECK): string {
  return roundType.endsWith(" Round") ? roundType : `${roundType} Round`;
}



export default function InterviewCoach() {
  const { toast } = useToast();
  const [role, setRole] = useState("Software Engineer");
  const [roleOpen, setRoleOpen] = useState(false);
  const [roundType, setRoundType] = useState<keyof typeof QUESTIONS_DECK>("Technical");
  const [simActive, setSimActive] = useState(false);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);

  const [simStartedAt, setSimStartedAt] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const questionIdxRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { questionIdxRef.current = questionIdx; }, [questionIdx]);

  useEffect(() => {
    const recognitionWindow = window as SpeechRecognitionWindow;
    const Ctor = recognitionWindow.SpeechRecognition || recognitionWindow.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true; rec.interimResults = false; rec.lang = "en-US";
    rec.onresult = (e: SpeechRecognitionEventLike) => {
      const t = e.results[e.results.length - 1][0].transcript;
      const idx = questionIdxRef.current;
      setAnswers(prev => { const n = [...prev]; n[idx] = ((n[idx] ?? "") + " " + t).trim(); return n; });
    };
    rec.onerror = () => setIsRecording(false);
    recognitionRef.current = rec;
    return () => {
      rec.onresult = null;
      rec.onerror = null;
      recognitionRef.current = null;
      try { rec.stop(); } catch (stopError) { console.warn("Speech recognition already stopped", stopError); }
    };
  }, []);

  const startSimulation = () => {
    const deck = QUESTIONS_DECK[roundType];
    setQuestions(deck); setAnswers(Array(deck.length).fill(""));
    setQuestionIdx(0); setSimStartedAt(Date.now());
    setSimActive(true); setFeedback(null); setError(null);
  };

  const handleMicToggle = () => {
    const recognition = recognitionRef.current;
    if (!recognition) { toast("Voice recognition not supported. Please type your answer.", "error"); return; }
    if (isRecording) { recognition.stop(); setIsRecording(false); }
    else { recognition.start(); setIsRecording(true); }
  };

  const handleNext = () => {
    if (isRecording && recognitionRef.current) { recognitionRef.current.stop(); setIsRecording(false); }
    if (questionIdx < questions.length - 1) {
      setQuestionIdx(p => p + 1);
    } else {
      setSimActive(false); evaluateSimulation();
    }
  };

  const evaluateSimulation = async () => {
    setLoading(true); setError(null);
    const transcript = questions.map((q, i) => `Interviewer: ${q}\nCandidate: ${answers[i]}`).join("\n\n");
    const elapsed = simStartedAt ? Date.now() - simStartedAt : 0;
    try {
      const data = await api.evaluateInterview(transcript, role);
      setFeedback({ ...data, confidence: estimateConfidence(answers), speaking_speed: estimateWpm(answers, elapsed) ?? undefined, grammar: estimateClarity(answers), technical_accuracy: data.score });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed. Please try again.");
    } finally { setLoading(false); }
  };


  const progress = questions.length > 0 ? ((questionIdx + 1) / questions.length) * 100 : 0;

  return (
    <div className="flex h-full overflow-hidden bg-background text-foreground">
      {/* Left config panel */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col bg-background">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2.5 mb-5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/20`}>
              <UserCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Interview Coach</h1>
              <p className="text-[10px] text-muted-foreground">AI-powered simulation</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="relative">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Target Role</label>
                <button
                  type="button"
                  disabled={simActive}
                  onClick={() => setRoleOpen(!roleOpen)}
                  className="w-full flex items-center justify-between rounded-xl border border-border bg-border px-3 py-2.5 text-sm text-foreground focus:border-emerald-500/40 focus:outline-none disabled:opacity-50 hover:border-primary/30 transition-colors"
                >
                  {role}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
                {roleOpen && (
                  <div className="absolute z-10 w-full mt-1 rounded-xl border border-border bg-popover shadow-xl overflow-hidden py-1">
                    {["Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "Data Scientist", "Product Manager", "UI/UX Designer"].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setRole(r); setRoleOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${role === r ? 'bg-emerald-500/10 text-emerald-400 font-semibold' : 'text-foreground hover:bg-border hover:text-foreground'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Interview Track</label>
              <div className="space-y-1.5">
                {Object.keys(QUESTIONS_DECK).map(key => (
                  <button key={key} disabled={simActive} onClick={() => setRoundType(key as keyof typeof QUESTIONS_DECK)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-all disabled:opacity-50 ${
                      roundType === key ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                    }`}>
                    {formatRoundName(key as keyof typeof QUESTIONS_DECK)}
                    <span className="ml-2 text-[10px] opacity-50">{QUESTIONS_DECK[key as keyof typeof QUESTIONS_DECK].length}Q</span>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={startSimulation} disabled={simActive || loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all disabled:opacity-50">
              <Play className="h-4 w-4" />
              {simActive ? "In Progress…" : "Start Simulation"}
            </button>
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="flex-1 p-5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Tips</p>
          {["Use the STAR method for behavioral questions", "Speak clearly at ~120-150 WPM", "Pause 3s before answering to collect thoughts", "Back claims with specific examples"].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 mb-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60 mt-1.5 shrink-0" />
              <p className="text-xs text-muted-foreground">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {/* Simulation screen */}
          {simActive && (
            <motion.div key="sim" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-8 max-w-3xl mx-auto">
              {/* Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">{formatRoundName(roundType)} — Question {questionIdx + 1} of {questions.length}</span>
                  <button onClick={() => { setSimActive(false); setFeedback(null); }} className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                </div>
                <div className="h-1 bg-border rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                </div>
              </div>

              {/* Question card */}
              <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 to-transparent p-6 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 text-xs font-bold text-emerald-400">
                    {questionIdx + 1}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">{roundType}</span>
                </div>
                <p className="text-lg font-semibold text-foreground leading-relaxed">{questions[questionIdx]}</p>
              </div>

              {/* Answer area */}
              <div className="rounded-2xl border border-border bg-border p-5 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" /> Your Response
                  </label>
                  <button onClick={handleMicToggle}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                      isRecording ? "bg-red-500/15 border border-red-500/30 text-red-400 animate-pulse" : "bg-border border border-border text-muted-foreground hover:text-foreground"
                    }`}>
                    {isRecording ? <><MicOff className="h-3.5 w-3.5" /> Stop</> : <><Mic className="h-3.5 w-3.5" /> Voice</>}
                  </button>
                </div>
                <textarea rows={6} placeholder="Speak using the microphone or type your answer here…"
                  value={answers[questionIdx] ?? ""}
                  onChange={e => setAnswers(prev => { const n = [...prev]; n[questionIdx] = e.target.value; return n; })}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed" />
              </div>

              <div className="flex justify-end">
                <button onClick={handleNext}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg">
                  {questionIdx === questions.length - 1 ? "Submit Interview" : "Next Question"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Results */}
          {!simActive && feedback && (
            <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Performance Report</h2>
                  <p className="text-sm text-muted-foreground mt-1">Evaluated for {role} — {formatRoundName(roundType)}</p>
                </div>
                <button onClick={() => setFeedback(null)}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" /> New Session
                </button>
              </div>

              {/* Score */}
              <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-6 flex items-center gap-6">
                <div className="relative h-20 w-20 shrink-0">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-border" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <motion.path className="text-emerald-400" strokeWidth="3" strokeDasharray={`${feedback.score}, 100`} stroke="currentColor" fill="none"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-foreground">{feedback.score}</div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{feedback.score >= 80 ? "Excellent!" : feedback.score >= 60 ? "Good Performance" : "Keep Practicing"}</p>
                  <p className="text-sm text-muted-foreground">Overall interview score out of 100</p>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Confidence", value: feedback.confidence != null ? `${feedback.confidence}%` : "N/A", color: "text-primary" },
                  { label: "Pacing", value: feedback.speaking_speed != null ? `${feedback.speaking_speed} WPM` : "N/A", color: "text-accent" },
                  { label: "Clarity", value: feedback.grammar != null ? `${feedback.grammar}%` : "N/A", color: "text-success" },
                  { label: "Accuracy", value: feedback.technical_accuracy != null ? `${feedback.technical_accuracy}%` : "N/A", color: "text-amber-400" },
                ].map((m, i) => (
                  <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="rounded-xl border border-border bg-border p-4 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{m.label}</p>
                    <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Strengths & Areas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-5">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" /> Strengths</h4>
                  <ul className="space-y-2.5">
                    {feedback.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-5">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Target className="h-3.5 w-3.5" /> Focus Areas</h4>
                  <ul className="space-y-2.5">
                    {feedback.areas_for_improvement.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <ChevronRight className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />{a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-border p-5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Coach's Summary</p>
                <p className="text-sm text-foreground leading-relaxed">"{feedback.feedback}"</p>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full min-h-[500px] flex-col items-center justify-center text-center p-8">
              <div className="relative h-16 w-16 mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-t-emerald-400 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Analyzing your interview…</h3>
              <p className="text-sm text-muted-foreground max-w-sm">Running NLP evaluation on confidence, clarity, and technical accuracy.</p>
            </motion.div>
          )}

          {/* Empty / Ready state */}
          {!simActive && !feedback && !loading && (
            <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full min-h-[500px] flex-col items-center justify-center text-center p-8">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                <UserCheck className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Ready to simulate</h3>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">Configure your session in the panel on the left and press <span className="text-foreground font-medium">Start Simulation</span> when ready. Microphone access recommended for best results.</p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-left max-w-sm">
                {["Voice transcription", "Real-time scoring", "Confidence analysis", "AI coach feedback"].map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-emerald-400 shrink-0" />{f}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
