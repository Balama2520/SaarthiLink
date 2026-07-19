import { useState, useEffect } from "react";
import { 
  FolderGit2, Loader2, Rocket, Target, LayoutTemplate, Database, Server, CheckCircle2,
  Terminal, Sparkles, Code2, BookOpen, Send, Compass
} from "lucide-react";
import { api } from "../services/api";
import { localDB } from "../services/localDB";

interface SkillForgeProject {
  stage: string;
  title: string;
  description: string;
  architecture: string;
  roadmap: string[];
  github_structure: string;
}

const LEETCODE_PROBLEMS = [
  { id: "1", title: "Two Sum", difficulty: "Easy", desc: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target." },
  { id: "2", title: "Longest Substring Without Repeating Characters", difficulty: "Medium", desc: "Given a string s, find the length of the longest substring without repeating characters." },
  { id: "3", title: "Merge k Sorted Lists", difficulty: "Hard", desc: "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it." }
];

export default function SkillForge() {
  const [activeSubTab, setActiveSubTab] = useState<"projects" | "arena" | "learning">("projects");

  // NOTE: previously a single shared `loading` boolean covered four
  // independent async actions (pipeline generation, coding-arena actions,
  // course generation, tutor chat) across different sub-tabs, so finishing
  // one action could clear the disabled/spinner state for another still in
  // flight. The course-generate and tutor-send buttons weren't even wired
  // to it, so they could be spam-clicked to fire overlapping requests.
  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [loadingArena, setLoadingArena] = useState(false);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [loadingTutor, setLoadingTutor] = useState(false);

  // SkillForge states
  const [targetRole, setTargetRole] = useState("");
  const [currentSkills, setCurrentSkills] = useState("");
  const [pipeline, setPipeline] = useState<SkillForgeProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Coding Arena states
  const [activeProblem, setActiveProblem] = useState(LEETCODE_PROBLEMS[0]);
  const [userCode, setUserCode] = useState("def solve(nums, target):\n    # Write your solution here\n    pass");
  const [codeLanguage, setCodeLanguage] = useState("python");
  const [arenaLogs, setArenaLogs] = useState("");
  const [arenaComplexity, setArenaComplexity] = useState("");

  // Learning Hub states
  const [courseTopic, setCourseTopic] = useState("");
  const [learningModules, setLearningModules] = useState<Array<{ day_range: string; topic: string; tasks: string[] }>>([]);
  const [tutorQuery, setTutorQuery] = useState("");
  const [tutorChat, setTutorChat] = useState<Array<{ role: string; content: string }>>([
    { role: "assistant", content: "Hi, I am your technical AI Tutor. Ask me any concept questions or request coding walkthroughs." }
  ]);

  // Load saved pipeline on mount
  useEffect(() => {
    async function loadSavedData() {
      const saved = await localDB.getPipeline();
      if (saved) {
        setPipeline(saved as SkillForgeProject[]);
      }
    }
    loadSavedData();
  }, []);

  const handleGeneratePipeline = async () => {
    if (!targetRole.trim() || !currentSkills.trim()) return;
    setLoadingPipeline(true);
    setError(null);
    try {
      const data = await api.generateSkillForgePipeline(targetRole, currentSkills);
      setPipeline(data.pipeline);
      await localDB.savePipeline(data.pipeline);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to generate pipeline");
    } finally {
      setLoadingPipeline(false);
    }
  };

  const getStageIcon = (stage: string) => {
    if (stage.toLowerCase().includes("foundation")) return <LayoutTemplate className="w-5 h-5 text-blue-400" />;
    if (stage.toLowerCase().includes("core")) return <Database className="w-5 h-5 text-violet-300" />;
    return <Server className="w-5 h-5 text-pink-400" />;
  };

  // Coding Arena Evaluators
  const handleArenaAction = async (mode: "hint" | "debug" | "evaluate") => {
    setLoadingArena(true);
    setArenaLogs("");
    try {
      const res = await api.codingArena(activeProblem.title, codeLanguage, userCode, mode);
      setArenaLogs(res.feedback);
      if (res.complexity) setArenaComplexity(res.complexity);
    } catch (err) {
      console.error(err);
      setArenaLogs("Failed to run analyzer. Try checking network connection.");
    } finally {
      setLoadingArena(false);
    }
  };

  // Learning Hub course generator
  const handleGenerateCourse = async () => {
    if (!courseTopic.trim()) return;
    setLoadingCourse(true);
    try {
      const res = await api.generateRoadmap(courseTopic, 30);
      if (res && res.milestones) {
        setLearningModules(res.milestones);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCourse(false);
    }
  };

  const handleTutorSend = async () => {
    if (!tutorQuery.trim() || loadingTutor) return;
    const query = tutorQuery;
    setTutorQuery("");
    setTutorChat(prev => [...prev, { role: "user", content: query }]);
    setLoadingTutor(true);

    let assistantText = "";
    setTutorChat(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      await api.chatStream(
        query,
        "tutor_session",
        "learning",
        "phi3",
        (chunk) => {
          assistantText += chunk;
          setTutorChat(prev => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: assistantText };
            return next;
          });
        },
        () => {
          setLoadingTutor(false);
        },
        (_err) => {
          setLoadingTutor(false);
          setTutorChat(prev => [...prev, { role: "assistant", content: "Error communicating with AI tutor." }]);
        }
      );
    } catch (_err) {
      setLoadingTutor(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 overflow-y-auto px-8 py-10 font-sans text-slate-100">
      
      {/* Tab Header Title */}
      <div className="mb-8 max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2.5 text-white">
            <FolderGit2 className="w-9 h-9 text-violet-400" /> Employability & SkillForge
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 max-w-xl">
            Build proof-of-work project templates, debug algorithm puzzles, and generate custom course modules with an AI Tutor.
          </p>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="max-w-5xl mx-auto mb-8 border-b border-white/5 flex gap-2">
        {([
          { id: "projects", label: "SkillForge Projects", icon: Compass },
          { id: "arena", label: "Coding Arena", icon: Terminal },
          { id: "learning", label: "Learning Hub", icon: BookOpen }
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

      {/* Render sub-tabs */}
      <div className="max-w-5xl mx-auto">
        
        {/* TAB 1: SkillForge Projects (Original core dashboard code) */}
        {activeSubTab === "projects" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-in">
            <div className="lg:col-span-1 space-y-6">
              <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl relative overflow-hidden shadow-lg shadow-black/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 opacity-40"></div>
                <h3 className="font-semibold text-white mb-5 flex items-center gap-2 relative z-10">
                  <Target className="w-4 h-4 text-violet-400"/> Define Goal
                </h3>
                <div className="space-y-4 relative z-10">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5 font-medium uppercase tracking-wider">Target Role</label>
                    <input
                      type="text"
                      placeholder="e.g. Backend Engineer"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5 font-medium uppercase tracking-wider">Current Skills</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Python, basic SQL"
                      value={currentSkills}
                      onChange={(e) => setCurrentSkills(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-violet-500 resize-none"
                    />
                  </div>
                  <button
                    onClick={handleGeneratePipeline}
                    disabled={loadingPipeline || !targetRole.trim() || !currentSkills.trim()}
                    className="w-full mt-2 py-3.5 bg-gradient-to-r from-violet-600 to-cyan-500 hover:brightness-110 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loadingPipeline && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loadingPipeline ? "Forging Pipeline..." : "Generate Pipeline"}
                  </button>
                  {error && <div className="text-red-500 text-xs mt-2 p-2 bg-red-900/10 border border-red-500/20 rounded-lg">{error}</div>}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              {pipeline ? (
                <div className="space-y-8 animate-fade-in relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-violet-500/35 before:to-transparent">
                  {pipeline.map((project, index) => (
                    <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-violet-500/20 bg-slate-900 shadow-xl shadow-black/30 text-violet-200 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        {getStageIcon(project.stage)}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-3xl bg-slate-900/95 shadow-xl shadow-black/30 border border-white/10 hover:shadow-2xl hover:border-violet-500/30 transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-3 py-1 bg-violet-500/10 text-violet-200 text-xs font-bold uppercase tracking-wider rounded-full border border-violet-500/20">
                            Stage {index + 1}: {project.stage}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
                        <p className="text-slate-300 text-sm mb-5 leading-relaxed">{project.description}</p>
                        <div className="space-y-4">
                          <div className="p-4 bg-slate-950/80 rounded-2xl border border-white/10">
                            <h4 className="font-semibold text-slate-100 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                              <Rocket className="w-3.5 h-3.5 text-violet-400"/> Architecture
                            </h4>
                            <p className="text-sm text-slate-300 leading-relaxed">{project.architecture}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-100 text-xs uppercase tracking-wider mb-3 ml-1">Roadmap</h4>
                            <ul className="space-y-2">
                              {project.roadmap.map((step, i) => (
                                <li key={i} className="text-sm text-slate-300 flex items-start gap-2.5 p-2 hover:bg-slate-950/40 rounded-lg transition-colors">
                                  <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full min-h-[450px] border-2 border-violet-500/20 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-slate-900/40">
                  <div className="w-20 h-20 bg-gradient-to-tr from-violet-500 to-cyan-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <FolderGit2 className="w-10 h-10 text-white animate-bounce" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Pipeline Empty</h3>
                  <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                    Define your target role and skills on the left to compile a 3-stage proof-of-work project roadmap.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Coding Arena compiler and debug boards */}
        {activeSubTab === "arena" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Left: Problem Statement & Select */}
            <div className="lg:col-span-1 p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-violet-400" /> Problems Deck
              </h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Select Challenge</label>
                <select
                  value={activeProblem.id}
                  onChange={(e) => {
                    const found = LEETCODE_PROBLEMS.find(p => p.id === e.target.value);
                    if (found) {
                      setActiveProblem(found);
                      setUserCode(`def solve(nums, target):\n    # Write your solution here for ${found.title}\n    pass`);
                    }
                  }}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                >
                  {LEETCODE_PROBLEMS.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.difficulty})</option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{activeProblem.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${activeProblem.difficulty === "Easy" ? "bg-green-500/10 text-green-400" : activeProblem.difficulty === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>
                    {activeProblem.difficulty}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{activeProblem.desc}</p>
              </div>
            </div>

            {/* Middle: Code Editor & actions */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-4 flex flex-col">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" /> Python IDE Sandbox
                  </span>
                  <select 
                    value={codeLanguage} 
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-300 px-2.5 py-1"
                  >
                    <option value="python">Python 3</option>
                    <option value="javascript">JavaScript</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>

                <textarea
                  rows={10}
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none"
                />

                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => handleArenaAction("hint")} 
                    disabled={loadingArena}
                    className="py-2.5 bg-slate-950 hover:bg-slate-900 border border-white/10 text-slate-300 text-xs font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    AI Hints
                  </button>
                  <button 
                    onClick={() => handleArenaAction("debug")} 
                    disabled={loadingArena}
                    className="py-2.5 bg-slate-950 border border-violet-500/20 hover:border-violet-400 hover:bg-violet-500/10 text-violet-200 text-xs font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Check Bugs
                  </button>
                  <button 
                    onClick={() => handleArenaAction("evaluate")} 
                    disabled={loadingArena}
                    className="py-2.5 bg-gradient-to-r from-violet-600 to-cyan-500 hover:brightness-110 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Run Complexity
                  </button>
                </div>
              </div>

              {/* Arena outputs */}
              <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl min-h-[140px]">
                <div className="flex items-center justify-between mb-3 text-slate-400 font-bold uppercase tracking-wider text-xs">
                  <span>Compiler Logs</span>
                  {arenaComplexity && <span className="text-cyan-400 text-[10px]">{arenaComplexity}</span>}
                </div>
                {arenaLogs ? (
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{arenaLogs}</p>
                ) : (
                  <p className="text-slate-500 text-xs italic">Review results logs from compiler analysis board.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Learning Hub course planner and AI Tutor chat */}
        {activeSubTab === "learning" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-fade-in">
            {/* Course generator */}
            <div className="lg:col-span-2 p-6 bg-slate-900/90 border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" /> Syllabus Planner
              </h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="e.g. React Redux, Kubernetes..."
                  value={courseTopic}
                  onChange={(e) => setCourseTopic(e.target.value)}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                />
                <button
                  onClick={handleGenerateCourse}
                  disabled={loadingCourse || !courseTopic.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-black rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {loadingCourse && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Generate
                </button>
              </div>

              <div className="space-y-3.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {learningModules.map((mod, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/40 border border-white/5 rounded-2xl">
                    <span className="text-[9px] font-bold text-cyan-400">{mod.day_range}</span>
                    <h4 className="font-semibold text-xs text-white mt-0.5">{mod.topic}</h4>
                    <ul className="list-disc pl-4 text-[10px] text-slate-400 space-y-0.5 mt-1">
                      {mod.tasks.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                ))}
                {learningModules.length === 0 && (
                  <p className="text-slate-500 text-xs italic text-center p-4">Enter a learning focus to map syllabus units.</p>
                )}
              </div>
            </div>

            {/* AI Tutor Chat */}
            <div className="lg:col-span-3 p-6 bg-slate-900/90 border border-white/10 rounded-3xl flex flex-col h-[450px]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <Sparkles className="w-5 h-5 text-violet-400" /> Tech AI Tutor
              </h3>
              <div className="flex-1 overflow-y-auto my-4 space-y-3 custom-scrollbar pr-1">
                {tutorChat.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs border leading-relaxed ${msg.role === "user" ? "bg-violet-600 border-violet-500/20 text-white rounded-tr-none" : "bg-slate-950/60 border-white/5 text-slate-300 rounded-tl-none"}`} style={{ whiteSpace: "pre-wrap" }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ask me tech questions or ask to clarify code..."
                  value={tutorQuery}
                  onChange={(e) => setTutorQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTutorSend()}
                  disabled={loadingTutor}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleTutorSend}
                  disabled={loadingTutor || !tutorQuery.trim()}
                  className="p-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-white transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingTutor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
