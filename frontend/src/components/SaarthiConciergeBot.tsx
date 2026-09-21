import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, X, Send, Sparkles, MessageSquare, FileText, Briefcase, Mail,
  Bot, Map, ArrowRight, ChevronRight,
  FlaskConical, GraduationCap, RefreshCw
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  actionTab?: string;
  actionLabel?: string;
  suggestions?: string[];
}

interface KnowledgeItem {
  keywords: string[];
  title: string;
  response: string;
  actionTab?: string;
  actionLabel?: string;
  suggestions?: string[];
}

const KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    keywords: ["resume", "ats", "cv", "score", "parse"],
    title: "Resume ATS Matcher & Optimizer",
    response: "The **Resume ATS Analyzer** parses your PDF or DOCX resume, evaluates keyword match percentage against target Job Descriptions, and suggests ATS optimizations to maximize your interview shortlisting.",
    actionTab: "resume",
    actionLabel: "Launch Resume ATS Analyzer",
    suggestions: ["Where is Job Finder?", "Where is Mock Interview?", "How to contact the team?"]
  },
  {
    keywords: ["job", "jobs", "find", "search", "openings", "hire", "apply"],
    title: "Smart Job Finder & Intelligence",
    response: "The **Job Finder** engine matches your background with verified tech & entry-level job openings, breaks down skill requirements, and lets you track your application pipeline.",
    actionTab: "jobs",
    actionLabel: "Explore Job Finder",
    suggestions: ["Where is Resume ATS?", "How to post job openings?", "Where is Discovery?"]
  },
  {
    keywords: ["discover", "discovery", "feedback", "rating", "34", "feature", "features", "survey"],
    title: "Discovery & Public Feature Rating",
    response: "The **Discovery Page** is our 4-step intelligence wizard! You can select your role persona, rate Saarthi's 31 public features, suggest skills candidates should learn, and submit recruiter job openings.",
    actionTab: "discover",
    actionLabel: "Open Discovery Page",
    suggestions: ["Where is Contact Page?", "Where is Job Finder?", "Who created Saarthi?"]
  },
  {
    keywords: ["contact", "email", "team", "support", "help", "message", "recruiter", "partner"],
    title: "Contact & Team Support Channel",
    response: "The **Contact Page** lets job seekers, recruiters, HR teams, and partners send direct inquiries to the Saarthi AI team at `saarthi.ai.team@gmail.com` with a fast response SLA.",
    actionTab: "contact",
    actionLabel: "Go to Contact Page",
    suggestions: ["Where is Discovery?", "Where is Resume ATS?", "Who created Saarthi?"]
  },
  {
    keywords: ["interview", "mock", "coach", "speech", "qa", "technical", "prep"],
    title: "Mock Interview & Speech Coach",
    response: "The **Mock Interview Coach** provides interactive technical & HR question sessions with Speech-to-Text capability, giving you real-time scorecards and answer improvements.",
    actionTab: "interview",
    actionLabel: "Start Mock Interview",
    suggestions: ["Where are AI Roadmaps?", "Where is Career Copilot?", "Where is Resume ATS?"]
  },
  {
    keywords: ["roadmap", "roadmaps", "learn", "skill", "path", "pathway"],
    title: "Personalized AI Learning Roadmaps",
    response: "The **AI Roadmaps** generator decomposes your target career roles into structured, step-by-step weekly milestone learning pathways tailored to your background.",
    actionTab: "roadmaps",
    actionLabel: "View AI Roadmaps",
    suggestions: ["Where is Mock Interview?", "Where is Growth Lab?", "Where is Job Finder?"]
  },
  {
    keywords: ["copilot", "chat", "ai coach", "advice", "assistant"],
    title: "AI Career Copilot & Coach",
    response: "The **Career Copilot & AI Coach** provides real-time strategic career advice, salary negotiation tips, profile reviews, and networking outreach guidance.",
    actionTab: "copilot",
    actionLabel: "Launch Career Copilot",
    suggestions: ["Where is Growth Lab?", "Where is Workspaces?", "Where is Resume ATS?"]
  },
  {
    keywords: ["growth", "lab", "forge", "paper", "research", "notes"],
    title: "Growth Lab & Research Hub",
    response: "The **Growth Lab** features the Skill Forge pipeline generator, research paper PDF analyzer, and AI-assisted study notes generator for continuous learning.",
    actionTab: "growthlab",
    actionLabel: "Open Growth Lab",
    suggestions: ["Where are Workspaces?", "Where is Career Toolkit?", "Where is Discovery?"]
  },
  {
    keywords: ["workspace", "workspaces", "rag", "document", "vector"],
    title: "Document & Research Workspaces",
    response: "The **Workspaces** module allows you to organize projects, upload research papers, and search multi-document text using local vector AI (RAG search).",
    actionTab: "workspaces",
    actionLabel: "Open Workspaces",
    suggestions: ["Where is Graduate Hub?", "Where is Growth Lab?", "Where is Resume ATS?"]
  },
  {
    keywords: ["graduate", "gradhub", "gate", "cat", "gre", "sop", "university", "study"],
    title: "Graduate Hub & Exam Prep",
    response: "The **Graduate Hub** includes trackers for GATE / CAT / GRE exams, an AI SOP & Essay Reviewer, university program finders, and scholarship opportunities.",
    actionTab: "gradhub",
    actionLabel: "Open Graduate Hub",
    suggestions: ["Where is Career Toolkit?", "Where is AI Roadmaps?", "Where is Contact Page?"]
  },
  {
    keywords: ["toolkit", "calculator", "utilities", "salary"],
    title: "Career Utilities & Toolkit",
    response: "The **Career Toolkit** offers salary benchmark calculators, notice period planning tools, and career utilities to help you navigate your professional trajectory.",
    actionTab: "toolkit",
    actionLabel: "Open Career Toolkit",
    suggestions: ["Where is Job Finder?", "Where is Growth Lab?", "Where is Contact Page?"]
  },
  {
    keywords: ["admin", "control", "center", "seeding", "analytics", "dashboard"],
    title: "Control Center & Admin Panel",
    response: "The **Control Center** provides system intelligence analytics, discovery survey statistics, recruiter signal submissions, and Google Sheets live job seeding status.",
    actionTab: "admin",
    actionLabel: "Open Control Center",
    suggestions: ["Where is Discovery?", "Where is Contact Page?", "Where is Job Finder?"]
  },
  {
    keywords: ["recruiter", "post", "hiring", "posting", "hr", "company", "agency"],
    title: "Posting Job Openings for Recruiters & HRs",
    response: "Recruiters, HR teams, and hiring partners can submit active job openings directly on the **Discovery Page** under Step 4 (Hiring Portal) or contact the Saarthi AI team on the **Contact Page**!",
    actionTab: "discover",
    actionLabel: "Go to Employer Hiring Portal",
    suggestions: ["Where is Contact Page?", "Where is Job Finder?", "Who created Saarthi?"]
  },
  {
    keywords: ["who", "author", "creator", "created", "architect", "built", "saarthi"],
    title: "About Saarthi AI",
    response: "Saarthi AI (**Guiding Intelligence • Connected Action**) is a career intelligence platform built to connect candidates, recruiters, and institutions through one shared system for resumes, jobs, learning, interviews, and decision support.",
    actionTab: "about",
    actionLabel: "Read About Saarthi",
    suggestions: ["Where is Contact Page?", "Where is Discovery?", "Where is Resume ATS?"]
  }
];

export default function SaarthiConciergeBot({ activeTab }: { activeTab: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const messageSequence = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "bot",
      text: "👋 Hi! I'm the **Saarthi AI Brain Guide**. Ask me anything about Saarthi features, where to find tools, or how to contact our team!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        "Where is Resume ATS?",
        "Where is Contact Page?",
        "Where is Discovery?",
        "Where is Job Finder?",
      ]
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  const handleSelectTab = (tabId: string) => {
    window.history.pushState(null, "", `#/${tabId}`);
    window.dispatchEvent(new Event("hashchange"));
    setIsOpen(false);
  };

  const nextMessageId = () => {
    messageSequence.current += 1;
    return `msg-${messageSequence.current}`;
  };

  const findKnowledgeMatch = (userQuery: string): KnowledgeItem | null => {
    const q = userQuery.toLowerCase();
    let bestMatch: KnowledgeItem | null = null;
    let maxMatches = 0;

    for (const item of KNOWLEDGE_BASE) {
      let matches = 0;
      for (const kw of item.keywords) {
        if (q.includes(kw)) matches++;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = item;
      }
    }

    return maxMatches > 0 ? bestMatch : null;
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: nextMessageId(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setTyping(true);

    setTimeout(() => {
      const match = findKnowledgeMatch(query);
      let botResponse: ChatMessage;

      if (match) {
        botResponse = {
          id: nextMessageId(),
          sender: "bot",
          text: `**${match.title}**\n\n${match.response}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionTab: match.actionTab,
          actionLabel: match.actionLabel,
          suggestions: match.suggestions,
        };
      } else {
        botResponse = {
          id: nextMessageId(),
          sender: "bot",
          text: `I'm here to guide you across Saarthi AI! You can explore our core tools using the quick navigation below, or visit our **Discovery Wizard** to rate the 31 public features.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionTab: "discover",
          actionLabel: "Open Discovery Page",
          suggestions: [
            "Where is Resume ATS?",
            "Where is Contact Page?",
            "Where is Job Finder?",
            "Where are AI Roadmaps?",
          ]
        };
      }

      setMessages(prev => [...prev, botResponse]);
      setTyping(false);
    }, 400);
  };

  if (activeTab === "chat") return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="pointer-events-auto mb-4 w-96 max-w-[calc(100vw-2.5rem)] h-[min(540px,calc(100dvh-7rem))] rounded-3xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/80 bg-muted/40 p-4">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 shadow-inner">
                  <Bot className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
                    <span>Saarthi AI Brain Bot</span>
                    <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                  </h3>
                  <span className="text-[10px] font-mono text-muted-foreground">● Live Site Navigator & Guide</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Reset conversation"
                  onClick={() => setMessages([{
                    id: "msg-welcome",
                    sender: "bot",
                    text: "👋 Hi! I'm the **Saarthi AI Brain Guide**. Ask me anything about Saarthi features, where to find tools, or how to contact our team!",
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    suggestions: ["Where is Resume ATS?", "Where is Contact Page?", "Where is Discovery?", "Where is Job Finder?"]
                  }])}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Feature Pills Toolbar */}
            <div className="flex items-center gap-1.5 overflow-x-auto p-2 bg-background/50 border-b border-border/40 scrollbar-none text-[11px]">
              {[
                { label: "Resume ATS", tab: "resume", icon: FileText },
                { label: "Job Finder", tab: "jobs", icon: Briefcase },
                { label: "Discovery", tab: "discover", icon: Compass },
                { label: "Contact", tab: "contact", icon: Mail },
                { label: "Interview", tab: "interview", icon: MessageSquare },
                { label: "Roadmaps", tab: "roadmaps", icon: Map },
                { label: "Growth Lab", tab: "growthlab", icon: FlaskConical },
                { label: "Graduate Hub", tab: "gradhub", icon: GraduationCap },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => handleSelectTab(item.tab)}
                    className="flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-1 font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
                  >
                    <Icon className="h-3 w-3" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-3.5 space-y-2.5 shadow-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground font-medium rounded-br-none"
                      : "bg-muted/70 text-foreground border border-border/60 rounded-bl-none"
                  }`}>
                    {/* Render text with basic markdown bold formatting */}
                    <div className="whitespace-pre-wrap">
                      {msg.text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                        if (part.startsWith("**") && part.endsWith("**")) {
                          return <strong key={i} className="font-extrabold text-primary">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                      })}
                    </div>

                    {/* Direct Navigation Jump Button */}
                    {msg.actionTab && (
                      <div className="pt-1 border-t border-border/40">
                        <button
                          type="button"
                          onClick={() => handleSelectTab(msg.actionTab!)}
                          className="flex w-full items-center justify-between rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
                        >
                          <span>{msg.actionLabel || `Jump to ${msg.actionTab}`}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <span className="text-[9px] font-mono text-muted-foreground mt-1 px-1">
                    {msg.timestamp}
                  </span>

                  {/* Quick Suggestion Chips */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[90%]">
                      {msg.suggestions.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSendMessage(sug)}
                          className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                        >
                          <span>{sug}</span>
                          <ChevronRight className="h-2.5 w-2.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {typing && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs italic p-2">
                  <Bot className="h-4 w-4 animate-bounce text-primary" />
                  <span>Saarthi AI Brain is thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="border-t border-border/80 bg-background/80 p-3 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about Resume ATS, Contact, Discovery, Jobs..."
                className="flex-1 rounded-xl border border-border bg-card p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom-Right Launcher Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen((open) => !open);
          if (!isOpen) setUnreadCount(0);
        }}
        className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-primary/40 bg-card px-4 py-3 text-xs font-bold text-foreground shadow-2xl backdrop-blur-xl hover:border-primary transition-all group"
      >
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Bot className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white border border-background">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex flex-col text-left">
          <span className="font-display font-extrabold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
            Saarthi Guide Bot
            <Sparkles className="h-3 w-3 text-amber-400" />
          </span>
          <span className="text-[9px] text-muted-foreground font-mono">Ask Anything 🧭</span>
        </div>
      </motion.button>
    </div>
  );
}
