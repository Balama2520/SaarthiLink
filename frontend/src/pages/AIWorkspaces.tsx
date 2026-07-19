import { useState, useEffect, useRef } from "react";
import { UserCheck, Sparkles, Target, TrendingUp, Mic, MicOff, Play, CheckCircle2, ChevronRight, Activity } from "lucide-react";
import { api } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";

// Minimal shape of the Web Speech API we rely on (no official TS lib types).
interface SpeechRecognitionEventLike {
  results: { [index: number]: { [index: number]: { transcript: string } }; length: number };
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

const FILLER_WORDS = ["um", "uh", "like", "you know", "i guess", "maybe", "sort of", "kind of"];

/** Heuristic 0-100 confidence estimate from the candidate's own answer text
 *  (length + filler-word density) — not a substitute for real audio/sentiment
 *  analysis, but grounded in what the person actually typed/said rather than
 *  a random number. */
function estimateConfidence(answers: string[]): number {
  const combined = answers.join(" ").toLowerCase();
  const words = combined.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const fillerCount = FILLER_WORDS.reduce(
    (count, phrase) => count + (combined.split(phrase).length - 1),
    0
  );
  const fillerDensity = fillerCount / words.length;
  const lengthScore = Math.min(words.length / 40, 1) * 60; // up to 60 pts for substance
  const fillerPenalty = Math.min(fillerDensity * 200, 40); // up to -40 pts
  return Math.round(Math.max(0, Math.min(100, 40 + lengthScore - fillerPenalty)));
}

/** Estimate words-per-minute from real elapsed time across questions, so
 *  "pacing" reflects how long the person actually took, not a random guess. */
function estimateWpm(answers: string[], totalElapsedMs: number): number | null {
  const wordCount = answers.join(" ").split(/\s+/).filter(Boolean).length;
  if (wordCount === 0 || totalElapsedMs <= 0) return null;
  const minutes = totalElapsedMs / 60000;
  return Math.round(wordCount / Math.max(minutes, 0.1));
}

/** Very rough grammar/clarity heuristic based on sentence structure signals
 *  (capitalisation, terminal punctuation, sentence length) rather than a
 *  random score. Real grammar checking should come from the backend. */
function estimateClarity(answers: string[]): number {
  const sentences = answers.join(" ").split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  const wellFormed = sentences.filter(s => /^[A-Z]/.test(s.trim()) && /[.!?]$/.test(s.trim())).length;
  const ratio = wellFormed / sentences.length;
  return Math.round(50 + ratio * 45);
}

interface InterviewFeedback {
  score: number;
  strengths: string[];
  areas_for_improvement: string[];
  feedback: string;
  confidence?: number;
  speaking_speed?: number; // WPM
  grammar?: number;
  technical_accuracy?: number;
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
    "Describe how you would implement a LRU Cache cache invalidation system."
  ],
  "Stress Round": [
    "Your project fails to deploy 10 minutes before the product launch. What exactly do you do?",
    "If we find that your skills do not match this target role, why should we still hire you?",
    "Why is your CGPA/project list not as competitive as other applicants in this cohort?"
  ]
};

export default function InterviewCoach() {
  const [role, setRole] = useState("Software Engineer");
  const [roundType, setRoundType] = useState<keyof typeof QUESTIONS_DECK>("Technical");
  
  // Simulation states
  const [simActive, setSimActive] = useState(false);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);

  // Voice transcription states
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognitionInstance | null>(null);
  const questionIdxRef = useRef(0);

  // Results
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref in sync so the (single, long-lived) recognition instance
  // always appends to the question that's currently on screen.
  useEffect(() => {
    questionIdxRef.current = questionIdx;
    // Reset the timer whenever a new question is shown so pacing (WPM)
    // is measured from real elapsed time, not guessed.
    setQuestionStartedAt(Date.now());
  }, [questionIdx]);

  // Initialize Speech Recognition once and clean it up on unmount.
  useEffect(() => {
    const SpeechRecognitionCtor: SpeechRecognitionConstructor | undefined =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recObj = new SpeechRecognitionCtor();
    recObj.continuous = true;
    recObj.interimResults = false;
    recObj.lang = "en-US";

    recObj.onresult = (event: SpeechRecognitionEventLike) => {
      const transcriptText = event.results[event.results.length - 1][0].transcript;
      const idx = questionIdxRef.current;
      setAnswers(prev => {
        const next = [...prev];
        next[idx] = ((next[idx] ?? "") + " " + transcriptText).trim();
        return next;
      });
    };

    recObj.onerror = (e: unknown) => {
      console.error("Speech recognition error", e);
      setIsRecording(false);
    };

    setRecognition(recObj);

    return () => {
      recObj.onresult = null;
      recObj.onerror = null;
      try { recObj.stop(); } catch { /* already stopped */ }
    };
  }, []);

  const startSimulation = () => {
    const deck = QUESTIONS_DECK[roundType];
    setQuestions(deck);
    setAnswers(Array(deck.length).fill(""));
    setQuestionIdx(0);
    setQuestionStartedAt(Date.now());
    setSimActive(true);
    setFeedback(null);
    setError(null);
  };

  const handleMicToggle = () => {
    if (!recognition) {
      alert("Voice speech recognition is not supported in this browser. Please type your answer.");
      return;
    }
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleNext = () => {
    if (isRecording && recognition) {
      recognition.stop();
      setIsRecording(false);
    }
    if (questionIdx < questions.length - 1) {
      setQuestionIdx(prev => prev + 1);
    } else {
      // Completed last question. Evaluate!
      setSimActive(false);
      evaluateSimulation();
    }
  };

  const evaluateSimulation = async () => {
    setLoading(true);
    setError(null);

    const transcriptText = questions.map((q, i) => `Interviewer: ${q}\nCandidate: ${answers[i]}`).join("\n\n");
    const totalElapsedMs = questionStartedAt ? Date.now() - questionStartedAt : 0;

    try {
      const data = await api.evaluateInterview(transcriptText, role);

      const confidence = estimateConfidence(answers);
      const speaking_speed = estimateWpm(answers, totalElapsedMs) ?? undefined;
      const grammar = estimateClarity(answers);
      const technical_accuracy = data.score ?? undefined;

      setFeedback({
        ...data,
        confidence,
        speaking_speed,
        grammar,
        technical_accuracy
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(err);
      setError(message || "Failed to evaluate your interview. Please try again.");
      setFeedback(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 max-w-7xl mx-auto space-y-8"
    >
      {/* Header */}
      <header className="mb-10 text-center max-w-3xl mx-auto">
        <motion.div initial={{ y: -20 }} animate={{ y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl mb-4">
            <UserCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 mb-4">
            AI Interview Coach
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Master your narrative. Practice with live speech transcription and receive instant, AI-driven performance metrics.
          </p>
        </motion.div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Control Panel */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-4"
        >
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
            
            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" /> Session Configuration
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">Target Role</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={simActive}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50 transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">Interview Track</label>
                <select
                  value={roundType}
                  onChange={(e) => setRoundType(e.target.value as keyof typeof QUESTIONS_DECK)}
                  disabled={simActive}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50 transition-all cursor-pointer appearance-none"
                >
                  {Object.keys(QUESTIONS_DECK).map(key => (
                    <option key={key} value={key}>{key} Round</option>
                  ))}
                </select>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startSimulation}
                disabled={simActive || loading}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:shadow-lg hover:shadow-emerald-500/25 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" /> Start Simulation
              </motion.button>
              {error && <div className="text-rose-500 text-sm mt-2 text-center">{error}</div>}
            </div>
          </div>
        </motion.div>

        {/* Center/Right Simulation Area */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {/* SIMULATOR SCREEN */}
            {simActive && (
              <motion.div 
                key="simulator"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-3xl p-8 shadow-xl"
              >
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                      {questionIdx + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">of {questions.length}</span>
                  </div>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-xs font-bold uppercase tracking-wider">
                    {roundType} Track
                  </span>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white leading-relaxed">
                    {questions[questionIdx]}
                  </h2>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-500" /> Your Response
                    </label>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleMicToggle}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        isRecording 
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 ring-2 ring-rose-500/50 animate-pulse" 
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      {isRecording ? "Stop Recording" : "Voice Input"}
                    </motion.button>
                  </div>
                  
                  <textarea
                    rows={6}
                    placeholder="Speak using the microphone or type your answer here..."
                    value={answers[questionIdx]}
                    onChange={(e) => setAnswers(prev => {
                      const next = [...prev];
                      next[questionIdx] = e.target.value;
                      return next;
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none text-lg leading-relaxed transition-all"
                  />
                </div>

                <div className="flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNext}
                    className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {questionIdx === questions.length - 1 ? "Submit Interview" : "Next Question"} <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* SIMULATION RESULTS */}
            {!simActive && feedback && (
              <motion.div 
                key="feedback"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-3xl p-8 shadow-xl"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-8 border-b border-slate-100 dark:border-slate-800 gap-6">
                  <div>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Performance Report</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Evaluated against standards for {role}</p>
                  </div>
                  <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-900/20 px-6 py-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                    <div className="text-center">
                      <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{feedback.score}</p>
                      <span className="text-xs font-bold text-emerald-700/70 dark:text-emerald-500 uppercase tracking-widest">Overall</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                  {[
                    { label: 'Confidence', value: feedback.confidence != null ? `${feedback.confidence}%` : 'N/A', color: 'text-blue-500' },
                    { label: 'Pacing', value: feedback.speaking_speed != null ? `${feedback.speaking_speed} WPM` : 'N/A', color: 'text-cyan-500' },
                    { label: 'Clarity', value: feedback.grammar != null ? `${feedback.grammar}%` : 'N/A', color: 'text-purple-500' },
                    { label: 'Accuracy', value: feedback.technical_accuracy != null ? `${feedback.technical_accuracy}%` : 'N/A', color: 'text-amber-500' }
                  ].map((metric, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
                      key={metric.label} 
                      className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-center"
                    >
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{metric.label}</p>
                      <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                    <h4 className="font-bold text-emerald-700 dark:text-emerald-400 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" /> Key Strengths
                    </h4>
                    <ul className="space-y-3">
                      {feedback.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                    <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5" /> Focus Areas
                    </h4>
                    <ul className="space-y-3">
                      {feedback.areas_for_improvement.map((a, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
                          <ChevronRight className="w-5 h-5 text-amber-500 shrink-0" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-slate-800 dark:text-white mb-3 text-sm uppercase tracking-wider">Coach's Summary</h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    "{feedback.feedback}"
                  </p>
                </div>
              </motion.div>
            )}

            {/* LOADING STATE */}
            {loading && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-[400px] border border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8"
              >
                <div className="w-16 h-16 relative mb-6">
                  <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Analyzing Transcript</h3>
                <p className="text-slate-500 max-w-sm">Running natural language processing to evaluate your technical accuracy, sentiment, and communication clarity.</p>
              </motion.div>
            )}

            {/* INITIAL AWAITING PANEL */}
            {!simActive && !feedback && !loading && (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-[400px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-900/30"
              >
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <UserCheck className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Ready to begin</h3>
                <p className="text-slate-500 max-w-sm leading-relaxed">
                  Configure your session on the left and start the simulator when you're ready. Ensure your microphone is connected.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}