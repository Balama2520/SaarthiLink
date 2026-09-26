import { useState, useEffect, useRef } from "react";
import { UserCheck, Sparkles, Target, TrendingUp, Mic, MicOff, Play, CheckCircle2, ChevronRight, ChevronDown, Activity, RotateCcw, AlertCircle } from "lucide-react";
import { api } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../hooks/useToast";
import { getToken } from "../lib/auth";
import { CTOGuideBanner } from "../components/CTOGuideBanner";

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

function buildLocalFeedback(answers: string[]): InterviewFeedback {
  const answered = answers.filter((answer) => answer.trim().length > 0);
  const confidence = estimateConfidence(answers);
  const clarity = estimateClarity(answers);
  const score = Math.round((confidence + clarity + Math.min(answered.length / Math.max(answers.length, 1), 1) * 100) / 3);
  return {
    score,
    confidence,
    grammar: clarity,
    technical_accuracy: Math.max(0, Math.min(100, score - 5)),
    speaking_speed: estimateWpm(answers, 0) ?? undefined,
    strengths: answered.length > 0 ? ["You completed the practice round", "Your responses can be reviewed without an AI provider"] : ["You started the interview practice"],
    areas_for_improvement: answered.length < answers.length ? ["Answer every question before submitting", "Add specific examples and measurable outcomes"] : ["Add specific examples and measurable outcomes", "Use a clear structure such as STAR"],
    feedback: "This offline report is based on response coverage, clarity, and confidence signals. Connect an AI provider for deeper technical feedback.",
  };
}

interface InterviewFeedback {
  score: number; strengths: string[]; areas_for_improvement: string[];
  feedback: string; confidence?: number; speaking_speed?: number; grammar?: number; technical_accuracy?: number;
}

const ROLE_QUESTIONS_DECKS: Record<string, Record<string, string[]>> = {
  "Software Engineer": {
    HR: [
      "Tell me about yourself and your software engineering background.",
      "Why do you want to join our engineering team specifically?",
      "Where do you see yourself technically in five years?"
    ],
    Technical: [
      "What is the difference between monolithic and microservices architecture?",
      "What is the difference between a process and a thread in OS?",
      "Describe how hash collisions are resolved in hash maps."
    ],
    Behavioral: [
      "Tell me about a time you resolved a major conflict in a technical project.",
      "Describe a situation where you had to adopt a new technology under a tight deadline.",
      "Give an example of a mistake you made in a technical architecture decision."
    ],
    Coding: [
      "How would you optimize a search operation in a sorted array?",
      "Explain the time and space complexity of merge sort.",
      "Describe how you would implement an LRU Cache."
    ],
    "Stress Round": [
      "Your production release crashes 10 minutes before a launch. What is your triage process?",
      "If we find your skills don't match this role, why should we still hire you?",
      "Why should we choose you over candidates with more experience in this stack?"
    ]
  },
  "Frontend Developer": {
    HR: [
      "What inspired you to specialize in Frontend Development?",
      "How do you stay updated with rapidly evolving web technologies?",
      "Where do you see your UI engineering career in 3 years?"
    ],
    Technical: [
      "Explain the Virtual DOM and how React optimizes rendering via reconciliation.",
      "What are CSS specificity, flexbox, and grid, and when would you use each?",
      "Explain Event Delegation, Event Bubbling, and Capturing in JavaScript."
    ],
    Behavioral: [
      "Describe a time when UX design requirements were difficult to implement technically.",
      "How do you handle feedback from designers or product managers on your frontend UI?",
      "Tell me about a difficult performance bug you fixed in a web app."
    ],
    Coding: [
      "How would you implement a custom debounce and throttle function in JavaScript?",
      "Write a function to deep clone an object handling circular references.",
      "How do you implement virtual scrolling for a list with 100,000 items?"
    ],
    "Stress Round": [
      "Your web application page load time increases from 1s to 8s in production. How do you debug it?",
      "The client demands a complete design overhaul 2 days before launch. How do you respond?",
      "Why should we hire you over a developer who knows 5 modern frontend frameworks?"
    ]
  },
  "Backend Developer": {
    HR: [
      "Why did you choose to focus on backend systems engineering?",
      "What kind of team environment allows you to build your best backend systems?",
      "What are your long-term goals as a backend architect?"
    ],
    Technical: [
      "Explain ACID properties in relational databases and how transactions work.",
      "How do you handle database connection pooling, indexing, and query optimization?",
      "What are the key trade-offs between RESTful APIs, gRPC, and GraphQL?"
    ],
    Behavioral: [
      "Tell me about an API outage or backend database lock contention you investigated.",
      "How do you balance writing clean maintainable backend code with meeting tight deadlines?",
      "Describe how you handled breaking API changes without disrupting active clients."
    ],
    Coding: [
      "Design a rate limiter algorithm for an API gateway.",
      "How do you handle concurrent database writes using pessimistic vs optimistic locking?",
      "Describe how to design a distributed queue system for asynchronous background tasks."
    ],
    "Stress Round": [
      "Database CPU spikes to 100% and connection pool is exhausted during peak traffic. How do you recover?",
      "A security vulnerability is discovered in an upstream dependency in production. What steps do you take?",
      "Why should we hire you if your primary language experience differs from our tech stack?"
    ]
  },
  "Full Stack Developer": {
    HR: [
      "How do you balance depth vs breadth across frontend and backend technologies?",
      "What motivated you to become a Full Stack Engineer?",
      "How do you prioritize technical debt across the entire application stack?"
    ],
    Technical: [
      "Explain end-to-end data flow from client browser click to database write and SSE response.",
      "How do CORS, CSRF tokens, JWT authentication, and HTTP cookies work together securely?",
      "How do state management libraries on the frontend interact with caching layers on the backend?"
    ],
    Behavioral: [
      "Describe a full-stack feature you delivered end-to-end under tight constraints.",
      "How do you coordinate API contracts between frontend requirements and backend schemas?",
      "Tell me about a time when a frontend bug turned out to be caused by a backend edge case."
    ],
    Coding: [
      "Design an end-to-end file upload feature with drag-and-drop UI and cloud object storage presigned URLs.",
      "Implement a real-time collaborative feature using WebSockets and client-side optimistic UI updates.",
      "Write a backend pagination API endpoint and matching frontend infinite scroll consumer."
    ],
    "Stress Round": [
      "Both frontend bundle size and backend response latency double after a major release. How do you triage?",
      "You are the sole engineer responsible for an entire product. How do you decide what to sacrifice under pressure?",
      "Why should we hire a Full Stack developer instead of dedicated frontend and backend specialists?"
    ]
  },
  "Machine Learning Engineer": {
    HR: [
      "What drew you into Machine Learning and Applied AI engineering?",
      "How do you bridge the gap between ML research papers and production software?",
      "Where do you see ML engineering heading in the next 5 years?"
    ],
    Technical: [
      "Explain the bias-variance tradeoff and how regularization (L1/L2) mitigates overfitting.",
      "How do Transformer architectures (Self-Attention) differ from traditional Recurrent Neural Networks (RNNs)?",
      "Explain data drift, concept drift, and how you monitor ML model degradation in production."
    ],
    Behavioral: [
      "Tell me about an ML model that performed well in offline metrics but failed in production deployment.",
      "How do you explain complex model predictions to non-technical business stakeholders?",
      "Describe a time when data quality issues impacted model training and how you resolved them."
    ],
    Coding: [
      "Implement a basic matrix multiplication or self-attention calculation in NumPy/PyTorch.",
      "Design a vector search indexing and retrieval pipeline for RAG embeddings using FAISS or ChromaDB.",
      "Write a Python pipeline for data preprocessing, feature scaling, and train-test splitting."
    ],
    "Stress Round": [
      "Your model's inference latency is 2500ms, but the production SLA requires sub-200ms. How do you optimize it?",
      "A production ML model displays demographic bias during live evaluation. What immediate actions do you take?",
      "Why should we hire you if your academic background is in computer science rather than pure statistics/PhD?"
    ]
  },
  "Data Scientist": {
    HR: [
      "How do you use data analysis to drive business decisions?",
      "What type of data science problems excite you the most?",
      "How do you communicate analytical findings to executive leadership?"
    ],
    Technical: [
      "Explain A/B testing methodology, hypothesis testing, p-values, and statistical power.",
      "What is the difference between supervised, unsupervised, and reinforcement learning?",
      "How do you handle imbalanced datasets when training classification models?"
    ],
    Behavioral: [
      "Tell me about an instance where your analytical insights reversed a major business decision.",
      "Describe a situation where data was incomplete, noisy, or corrupt and how you handled it.",
      "How do you handle disagreement with product managers on metrics definitions?"
    ],
    Coding: [
      "Write SQL queries involving window functions (ROW_NUMBER, LAG, LEAD) and GROUP BY HAVING.",
      "How would you build an automated anomaly detection system for time-series metrics?",
      "Write a Pandas pipeline to clean missing data, encode categorical variables, and compute summary stats."
    ],
    "Stress Round": [
      "Your A/B test results are statistically inconclusive after 4 weeks of running. What is your recommendation?",
      "The CEO questions your statistical methodology during a company-wide review. How do you defend it?",
      "Why should we hire a Data Scientist instead of an ML Engineer or Data Analyst for this team?"
    ]
  },
  "Product Manager": {
    HR: [
      "What makes a product truly great in your opinion?",
      "Why do you want to manage products at our company?",
      "How do you measure your success as a Product Manager?"
    ],
    Technical: [
      "How do you define key product metrics (NORTH STAR, DAU/MAU, CAC, LTV, Retention)?",
      "Explain how you conduct user discovery, user story mapping, and feature prioritization (RICE / MoSCoW).",
      "How do you work with technical engineering leads when estimating feature feasibility and architecture trade-offs?"
    ],
    Behavioral: [
      "Describe a time when you had to say 'No' to a major stakeholder or customer request.",
      "Tell me about a product feature launch that failed to meet adoption goals and what you learned.",
      "How do you resolve conflicting priorities between engineering tech debt and business sales requests?"
    ],
    Coding: [
      "Create a Product Requirements Document (PRD) framework for an AI-powered search feature.",
      "How would you design the onboarding user funnel to improve day-1 conversion by 20%?",
      "Prioritize 5 competing feature requests given limited engineering bandwidth and strict quarterly deadlines."
    ],
    "Stress Round": [
      "A key competitor launches your exact roadmap feature 2 weeks before your planned launch. What is your strategy?",
      "Engineering tells you a committed feature will take 3x longer than planned. How do you adjust scope?",
      "Why should we hire you if you don't have a background in our specific industry domain?"
    ]
  },
  "UI/UX Designer": {
    HR: [
      "What is your design philosophy and user-centered research approach?",
      "Why are you interested in designing for our product domain?",
      "Where do you see design tools and design systems evolving?"
    ],
    Technical: [
      "Explain the design thinking process: Empathize, Define, Ideate, Prototype, Test.",
      "How do you construct an accessible design system (WCAG compliance, color contrast, typography scale)?",
      "What is the difference between low-fidelity wireframes, high-fidelity mockups, and interactive prototypes?"
    ],
    Behavioral: [
      "Describe a situation where usability testing revealed that users disliked your initial design concept.",
      "How do you handle pushback from software engineers who say a design is too difficult to implement?",
      "Tell me about a time you redesigned an existing complex workflow to reduce user friction."
    ],
    Coding: [
      "Walk through your step-by-step UX audit process for an e-commerce checkout flow.",
      "How do you structure design tokens, component variants, and auto-layout in Figma for seamless dev handoff?",
      "Design a user journey map for a first-time mobile app user trying to complete onboarding."
    ],
    "Stress Round": [
      "Engineers shipped a version of your design that doesn't match Figma specs at all. How do you resolve it?",
      "You are given 24 hours to design a complete dashboard flow for a pitch. What do you prioritize?",
      "Why should we hire a UI/UX Designer instead of relying on frontend engineers to design UI?"
    ]
  }
};

const DEFAULT_DECKS = ROLE_QUESTIONS_DECKS["Software Engineer"];

function getDeckForRoleAndRound(roleName: string, roundName: string): string[] {
  const roleDeck = ROLE_QUESTIONS_DECKS[roleName] || DEFAULT_DECKS;
  return roleDeck[roundName] || roleDeck["Technical"] || DEFAULT_DECKS["Technical"];
}

const QUESTIONS_DECK = DEFAULT_DECKS;

function formatRoundName(roundType: string): string {
  return roundType.endsWith(" Round") ? roundType : `${roundType} Round`;
}



export default function InterviewCoach() {
  const { toast } = useToast();
  const [role, setRole] = useState("Software Engineer");
  const [roleOpen, setRoleOpen] = useState(false);
  const [roundType, setRoundType] = useState<string>("Technical");
  const [difficulty, setDifficulty] = useState("medium");
  const [company, setCompany] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
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
    const prepCompany = sessionStorage.getItem("saarthi_prep_company");
    const prepRole = sessionStorage.getItem("saarthi_prep_role");
    const prepQuestions = sessionStorage.getItem("saarthi_prep_questions");

    if (prepRole) {
      setRole(prepRole);
      sessionStorage.removeItem("saarthi_prep_role");
    }
    if (prepCompany) {
      setCompany(prepCompany);
      sessionStorage.removeItem("saarthi_prep_company");
    }
    if (prepQuestions) {
      try {
        const parsed = JSON.parse(prepQuestions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuestions(parsed);
          setAnswers(Array(parsed.length).fill(""));
          setQuestionIdx(0);
          setSimStartedAt(Date.now());
          setSimActive(true);
          toast(`Loaded prep kit questions for ${prepRole || "Role"}!`, "success");
        }
      } catch (e) {
        console.error("Failed to parse prep questions", e);
      }
      sessionStorage.removeItem("saarthi_prep_questions");
    }
  }, [toast]);

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

  const startSimulation = async () => {
    const deck = getDeckForRoleAndRound(role, roundType);
    let generatedQuestions = deck;
    setLoading(true);
    try {
      if (getToken()) {
        const session = await api.createInterviewSession(role, company || null, difficulty);
        if (!Array.isArray(session.questions) || session.questions.length === 0) throw new Error("Interview session returned no questions");
        setSessionId(session.id);
        generatedQuestions = session.questions;
      } else setSessionId(null);
    } catch {
      setSessionId(null);
      toast("Using offline practice questions; sign in to save your session.", "error");
    } finally { setLoading(false); }
    setQuestions(generatedQuestions); setAnswers(Array(generatedQuestions.length).fill(""));
    setQuestionIdx(0); setSimStartedAt(Date.now());
    setSimActive(true); setFeedback(null); setError(null);
  };

  const handleMicToggle = () => {
    const recognition = recognitionRef.current;
    if (!recognition) { toast("Voice recognition not supported. Please type your answer.", "error"); return; }
    if (isRecording) { recognition.stop(); setIsRecording(false); }
    else { recognition.start(); setIsRecording(true); }
  };

  const handleNext = async () => {
    if (isRecording && recognitionRef.current) { recognitionRef.current.stop(); setIsRecording(false); }
    if (questionIdx < questions.length - 1) {
      if (sessionId) {
        try {
          await api.answerInterviewSession(sessionId, answers[questionIdx] ?? "No response", questionIdx);
        } catch (err) {
          const message = err instanceof Error ? err.message : "We couldn't save this answer.";
          setError(message);
          toast("Your answer was not saved. Please try again.", "error");
          return;
        }
      }
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
      let data: InterviewFeedback;
      if (sessionId) {
        const persisted = await api.answerInterviewSession(sessionId, answers[questionIdx] ?? "No response", questionIdx);
        data = persisted.feedback || buildLocalFeedback(answers);
      } else if (getToken()) data = await api.evaluateInterview(transcript, role);
      else data = buildLocalFeedback(answers);
      setFeedback({ ...data, confidence: estimateConfidence(answers), speaking_speed: estimateWpm(answers, elapsed) ?? undefined, grammar: estimateClarity(answers), technical_accuracy: data.score });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed. Please try again.");
    } finally { setLoading(false); }
  };


  const progress = questions.length > 0 ? ((questionIdx + 1) / questions.length) * 100 : 0;

  return (
    <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden bg-background text-foreground">
      {/* Left config panel */}
      <div className={`w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-border flex flex-col bg-background ${simActive ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2.5 mb-5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/20`}>
              <UserCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Interview Coach</h1>
              <p className="text-[10px] text-muted-foreground">AI-powered simulation</p>
            </div>

            <input value={company} onChange={(event) => setCompany(event.target.value)} disabled={simActive} placeholder="Target company (optional)" className="w-full rounded-xl border border-border bg-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground" />
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} disabled={simActive} className="w-full rounded-xl border border-border bg-border px-3 py-2.5 text-sm text-foreground">
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="faang">FAANG-level</option>
            </select>
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
            <motion.div key="sim" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 sm:p-8 max-w-3xl mx-auto">
              {/* Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">{formatRoundName(roundType)} — Question {questionIdx + 1} of {questions.length}</span>
                  <button onClick={() => { setSimActive(false); setFeedback(null); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                </div>
                <div className="h-1 bg-border rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                </div>
              </div>

              {/* Question card */}
              <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 to-transparent p-4 sm:p-6 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 text-xs font-bold text-emerald-400">
                    {questionIdx + 1}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">{roundType}</span>
                </div>
                <p className="text-base sm:text-lg font-semibold text-foreground leading-relaxed">{questions[questionIdx]}</p>
              </div>

              {/* Answer area */}
              <div className="rounded-2xl border border-border bg-border p-4 sm:p-5 mb-5">
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
            <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-8 max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">Performance Report</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Evaluated for {role} — {formatRoundName(roundType)}</p>
                </div>
                <button onClick={() => setFeedback(null)}
                  className="self-start sm:self-auto flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" /> New Session
                </button>
              </div>

              {/* Score */}
              <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-5 sm:p-6 flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 sm:gap-6">
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
            <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full min-h-[500px] flex-col items-center justify-center text-center p-6 md:p-8">
              <div className="mb-6 w-full max-w-xl text-left">
                <CTOGuideBanner
                  title="Interview Coach & Mock Practice Guide"
                  subtitle="Simulate real-world technical, behavioral (STAR method), and HR interviews with real-time feedback."
                  steps={[
                    { title: "Select Role", desc: "Choose target role & round type (HR, Technical, Behavioral, Stress) in the left panel." },
                    { title: "Start Session", desc: "Click 'Start Simulation' to load realistic interview questions." },
                    { title: "Record / Type", desc: "Click the mic button to record your voice answer or type your response manually." },
                    { title: "Review Feedback", desc: "Get instant scores on confidence, speaking speed (WPM), clarity, and technical accuracy." },
                  ]}
                  ctoTip="Use the STAR method (Situation, Task, Action, Result) for behavioral questions to score 90+!"
                />
              </div>

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
