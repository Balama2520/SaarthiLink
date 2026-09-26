import { useState, useEffect } from "react";
import { api } from "../services/api";
import { 
  Plus, Trash2, CheckCircle2, Target, Calendar, BarChart3, 
  AlertCircle, Flame, Sparkles, ChevronDown, ChevronRight, Check,
  Zap, Compass, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CTOGuideBanner } from "../components/CTOGuideBanner";

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  priority: string;
  progress: number;
  due_date?: string;
  created_at: string;
  type?: string;
  parent_id?: string;
  children?: Goal[];
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Career");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("pending");
  const [progress, setProgress] = useState(0);
  const [dueDate, setDueDate] = useState("");

  // Tree and UI states
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  const [goalTrees, setGoalTrees] = useState<Record<string, Goal>>({});
  
  // Inline add states
  const [addingMilestoneTo, setAddingMilestoneTo] = useState<string | null>(null);
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");

  // AI suggestions state
  const [generatingAiFor, setGeneratingAiFor] = useState<string | null>(null);

  const categories = ["Career", "Learning", "Project", "Interview", "Application"];

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const data = await api.getGoals();
      setGoals(data);
      setError("");
    } catch {
      setError("Failed to load goals. Make sure you are signed in.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchGoals(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const newGoal = await api.createGoal({
        title, description, category, priority, status, progress, due_date: dueDate || null,
      });
      setGoals((prev) => [newGoal, ...prev]);
      resetForm();
      setIsAdding(false);
    } catch (err) {
      setError("Failed to create goal.");
    }
  };

  const handleDeleteGoal = async (id: string, parentId?: string) => {
    try {
      await api.deleteGoal(id);
      if (parentId) {
        fetchGoalTree(parentId); 
      } else {
        setGoals((prev) => prev.filter((g) => g.id !== id));
      }
      setDeletingGoalId(null);
    } catch (err) {
      setError("Failed to delete goal.");
      setDeletingGoalId(null);
    }
  };

  const handleToggleComplete = async (goal: Goal, rootGoalId?: string) => {
    const newStatus = goal.status === "completed" ? "in_progress" : "completed";
    const newProgress = newStatus === "completed" ? 100 : goal.progress;
    try {
      const updated = await api.updateGoal(goal.id, {
        status: newStatus, progress: newProgress,
      });
      
      if (rootGoalId && rootGoalId !== goal.id) {
        fetchGoalTree(rootGoalId);
      } else {
        setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
      }
    } catch (err) {
      setError("Failed to update status.");
    }
  };

  const handleUpdateProgress = async (id: string, newProgress: number) => {
    const newStatus = newProgress === 100 ? "completed" : "in_progress";
    try {
      const updated = await api.updateGoal(id, {
        progress: newProgress, status: newStatus,
      });
      setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (err) {
      setError("Failed to update progress.");
    }
  };

  const resetForm = () => {
    // Must match the initial useState value and an entry in `categories` —
    // otherwise the <select> holds a value with no matching <option> and
    // silently desyncs from what's rendered.
    setTitle(""); setDescription(""); setCategory("Career");
    setPriority("medium"); setStatus("pending"); setProgress(0); setDueDate("");
  };

  const fetchGoalTree = async (goalId: string) => {
    try {
      const tree = await api.getGoalTree(goalId);
      setGoalTrees(prev => ({ ...prev, [goalId]: tree }));
    } catch (err) {
      setError("Failed to load goal details.");
    }
  };

  const toggleExpand = (goalId: string) => {
    const isExpanded = !!expandedGoals[goalId];
    setExpandedGoals(prev => ({ ...prev, [goalId]: !isExpanded }));
    
    if (!isExpanded && !goalTrees[goalId]) {
      fetchGoalTree(goalId);
    }
  };

  const handleGenerateAiPlan = async (goalId: string) => {
    try {
      setGeneratingAiFor(goalId);
      await api.generateGoalPlan(goalId);
      await fetchGoalTree(goalId);
      setExpandedGoals(prev => ({ ...prev, [goalId]: true }));
    } catch (err) {
      setError("Failed to generate AI plan.");
    } finally {
      setGeneratingAiFor(null);
    }
  };

  const handleAddMilestone = async (goalId: string) => {
    if (!inlineTitle.trim()) {
      setAddingMilestoneTo(null);
      return;
    }
    try {
      await api.addMilestone(goalId, { title: inlineTitle });
      setInlineTitle("");
      setAddingMilestoneTo(null);
      fetchGoalTree(goalId);
    } catch (err) {
      setError("Failed to add milestone");
    }
  };

  const handleAddTask = async (milestoneId: string, rootGoalId: string) => {
    if (!inlineTitle.trim()) {
      setAddingTaskTo(null);
      return;
    }
    try {
      await api.addTask(milestoneId, { title: inlineTitle });
      setInlineTitle("");
      setAddingTaskTo(null);
      fetchGoalTree(rootGoalId);
    } catch (err) {
      setError("Failed to add task");
    }
  };

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === "completed").length;
  const inProgressGoals = goals.filter((g) => g.status === "in_progress" || g.status === "pending").length;
  const completionRate = totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0;

  return (
    <div className="flex-1 bg-background overflow-y-auto px-4 py-8 sm:px-6 lg:px-10 font-sans text-foreground relative custom-scrollbar">
      {/* Ambient background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-3 text-foreground">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20">
              <Target className="w-6 h-6 text-primary" />
            </div>
            Goal Engine
          </h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-xl ml-15">
            Define high-level objectives, break them into milestones, and use AI to generate precise execution plans.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold rounded-xl transition-all self-start md:self-auto shadow-lg shadow-primary/20"
        >
          <Plus className={`w-4 h-4 transition-transform ${isAdding ? "rotate-45" : ""}`} /> {isAdding ? "Cancel" : "New Goal"}
        </button>
      </div>

      <div className="max-w-6xl mx-auto mb-8 relative z-10">
        <CTOGuideBanner
          title="Goal Engine & Execution Guide"
          subtitle="Define target career outcomes, generate automated AI sub-task breakdowns, and track milestone progress."
          steps={[
            { title: "New Goal", desc: "Click '+ New Goal' to enter a target objective (e.g. 'Backend Engineer in 90 Days')." },
            { title: "AI Milestones", desc: "Use the AI generator button to break your goal into 4 weekly action steps." },
            { title: "Set Priority", desc: "Assign High, Medium, or Low priority and a target completion deadline date." },
            { title: "Track Progress", desc: "Check off sub-tasks as you complete them to boost your overall completion score." },
          ]}
          ctoTip="Align your goals directly with your Learning Roadmaps for maximum focus!"
        />
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto mb-6 bg-red-500/10 border border-red-500/20 text-red-300 px-5 py-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Goals", value: totalGoals, icon: Compass, bgBorder: "bg-primary/10 border-primary/20", text: "text-primary" },
          { label: "Active", value: inProgressGoals, icon: Flame, bgBorder: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400" },
          { label: "Completed", value: completedGoals, icon: CheckCircle2, bgBorder: "bg-success/10 border-success/20", text: "text-success" },
          { label: "Success Rate", value: `${completionRate}%`, icon: BarChart3, bgBorder: "bg-accent/10 border-accent/20", text: "text-accent" },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
              key={stat.label} 
              className="bg-border border border-border rounded-3xl p-5 flex items-center gap-4 hover:bg-border transition-colors"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${stat.bgBorder}`}>
                <Icon className={`h-6 w-6 ${stat.text}`} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">{stat.value}</h3>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Goal Creation Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
            animate={{ opacity: 1, height: "auto", marginBottom: 32 }} 
            exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
            onSubmit={handleAddGoal} 
            className="max-w-6xl mx-auto bg-gradient-to-br from-border to-transparent border border-border rounded-3xl p-6 space-y-5 backdrop-blur-md"
          >
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2 border-b border-border pb-4">
              <Zap className="w-4 h-4 text-primary" /> Define New Objective
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Goal Title</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Master System Design"
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none transition-colors">
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Description & Key Metrics</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detail the target outcomes..." rows={3}
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none resize-none transition-colors" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none transition-colors">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Target Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Initial Progress: {progress}%</label>
                <input type="range" min="0" max="100" value={progress} onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer mt-3 accent-primary" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-xl bg-border hover:bg-muted text-sm font-bold text-foreground transition-colors">
                Clear
              </button>
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-sm font-bold text-primary-foreground transition-colors shadow-lg shadow-primary/20">
                Initialize Goal
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto space-y-4 relative z-10 pb-20">
        {loading ? (
           <div className="space-y-4">
             {[1,2,3].map(i => (
               <div key={i} className="h-28 rounded-3xl bg-border border border-border animate-pulse" />
             ))}
           </div>
        ) : goals.length === 0 ? (
          <div className="border border-border border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-12 bg-border">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">No active objectives</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">Set a high-level goal and use the AI Planner to automatically generate a step-by-step roadmap.</p>
          </div>
        ) : (
          goals.map((g) => {
            const isExpanded = expandedGoals[g.id];
            const tree = goalTrees[g.id];
            const isCompleted = g.status === "completed";
            
            return (
            <motion.div
              layout
              key={g.id}
              className={`border transition-all duration-300 rounded-3xl overflow-hidden backdrop-blur-sm ${
                isCompleted ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "border-border bg-border hover:bg-border hover:border-primary/25"
              }`}
            >
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => handleToggleComplete(g)}
                      className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                        isCompleted
                          ? "border-emerald-500 bg-emerald-500 text-background shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                          : "border-border hover:border-primary bg-card"
                      }`}
                    >
                      {isCompleted && <Check className="h-4 w-4 stroke-[3]" />}
                    </button>
                    <button onClick={() => toggleExpand(g.id)} className="p-1 rounded-md bg-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                      {isExpanded ? <ChevronDown className="h-3 w-3"/> : <ChevronRight className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-extrabold text-lg sm:text-xl truncate ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {g.title}
                    </h3>
                    {g.description && <p className={`text-sm mt-1.5 leading-relaxed line-clamp-2 ${isCompleted ? "text-muted-foreground" : "text-muted-foreground"}`}>{g.description}</p>}
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-border border border-border text-foreground px-2.5 py-1 rounded-lg shadow-sm">
                        {g.category}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm ${
                          g.priority === "high"
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : g.priority === "medium"
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            : "bg-muted-foreground/10 border-muted-foreground/20 text-muted-foreground"
                        }`}
                      >
                        {g.priority}
                      </span>
                      {g.due_date && (
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 ml-1">
                          <Calendar className="h-3.5 w-3.5" /> {g.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex sm:flex-col items-center sm:items-end gap-3 justify-between sm:justify-start pt-2 sm:pt-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerateAiPlan(g.id)}
                      disabled={generatingAiFor === g.id || isCompleted}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all text-xs font-bold disabled:opacity-50 disabled:bg-muted shadow-lg shadow-primary/20"
                    >
                      {generatingAiFor === g.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} 
                      {generatingAiFor === g.id ? "Drafting..." : "AI Plan"}
                    </button>
                    {deletingGoalId === g.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDeleteGoal(g.id)} className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors border border-destructive/20">
                          Confirm
                        </button>
                        <button onClick={() => setDeletingGoalId(null)} className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-border text-foreground hover:bg-muted transition-colors border border-border">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingGoalId(g.id)} className="p-1.5 rounded-lg border border-transparent hover:border-red-500/30 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Progress Ring / Bar */}
                  <div className="flex items-center gap-3 w-full sm:w-48 sm:mt-4">
                    <div className="text-[10px] font-black tracking-widest text-muted-foreground w-8">{g.progress}%</div>
                    <input type="range" min="0" max="100" value={g.progress} onChange={(e) => handleUpdateProgress(g.id, Number(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary" />
                  </div>
                </div>
              </div>

              {/* Expanded Tree View */}
              <AnimatePresence>
                {isExpanded && tree && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-background/50 border-t border-border p-5 sm:p-6">
                    <div className="space-y-4 pl-4 sm:pl-10 border-l-2 border-border ml-2 sm:ml-3">
                      {tree.children && tree.children.length > 0 ? (
                        tree.children.map(milestone => (
                          <div key={milestone.id} className="bg-border border border-border rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                 <button
                                  onClick={() => handleToggleComplete(milestone, g.id)}
                                  className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    milestone.status === "completed"
                                      ? "border-emerald-500 bg-emerald-500 text-background shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                      : "border-border hover:border-primary bg-card"
                                  }`}
                                >
                                  {milestone.status === "completed" && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                </button>
                                <h4 className={`font-bold text-sm ${milestone.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                  {milestone.title}
                                </h4>
                              </div>
                              <button onClick={() => handleDeleteGoal(milestone.id, g.id)} className="text-muted-foreground hover:text-red-400 p-1">
                                 <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            
                            {/* Tasks within Milestone */}
                            <div className="pl-8 space-y-2.5">
                              {milestone.children && milestone.children.map(task => (
                                <div key={task.id} className="flex items-center justify-between group">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => handleToggleComplete(task, g.id)}
                                      className={`h-4 w-4 rounded-[4px] border flex items-center justify-center transition-colors ${
                                        task.status === "completed"
                                          ? "border-emerald-500 bg-emerald-500 text-background"
                                          : "border-border hover:border-primary"
                                      }`}
                                    >
                                      {task.status === "completed" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                    </button>
                                    <span className={`text-xs font-medium ${task.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                      {task.title}
                                    </span>
                                  </div>
                                  <button onClick={() => handleDeleteGoal(task.id, g.id)} className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              
                              {/* Add Task Input */}
                              {addingTaskTo === milestone.id ? (
                                 <div className="flex items-center gap-2 mt-3 bg-background/50 p-1.5 rounded-xl border border-border">
                                   <input 
                                     autoFocus value={inlineTitle} onChange={e => setInlineTitle(e.target.value)}
                                     onKeyDown={e => e.key === 'Enter' && handleAddTask(milestone.id, g.id)}
                                     placeholder="Type task title and press Enter..."
                                     className="bg-transparent px-2 py-1 text-xs text-foreground w-full focus:outline-none"
                                   />
                                   <button onClick={() => handleAddTask(milestone.id, g.id)} className="text-emerald-400 hover:text-emerald-300 p-1"><CheckCircle2 className="h-4 w-4"/></button>
                                   <button onClick={() => {setAddingTaskTo(null); setInlineTitle("");}} className="text-muted-foreground hover:text-foreground p-1"><Plus className="h-4 w-4 rotate-45"/></button>
                                 </div>
                              ) : (
                                 <button 
                                   onClick={() => { setAddingTaskTo(milestone.id); setInlineTitle(""); }} 
                                   className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary flex items-center gap-1.5 mt-3 transition-colors"
                                 >
                                   <Plus className="h-3 w-3" /> Add Task
                                 </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm font-medium text-muted-foreground py-2">No milestones defined. Use AI Plan or add one manually.</div>
                      )}
                      
                      {/* Add Milestone Input */}
                      {addingMilestoneTo === g.id ? (
                         <div className="flex items-center gap-2 mt-4 bg-card border border-border p-1.5 rounded-xl">
                           <input 
                             autoFocus value={inlineTitle} onChange={e => setInlineTitle(e.target.value)}
                             onKeyDown={e => e.key === 'Enter' && handleAddMilestone(g.id)}
                             placeholder="New Milestone Title..."
                             className="bg-transparent px-3 py-1 text-sm font-bold text-foreground w-full focus:outline-none"
                           />
                           <button onClick={() => handleAddMilestone(g.id)} className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg hover:bg-emerald-500/30"><CheckCircle2 className="h-4 w-4"/></button>
                           <button onClick={() => {setAddingMilestoneTo(null); setInlineTitle("");}} className="bg-border text-muted-foreground p-1.5 rounded-lg hover:bg-muted"><Plus className="h-4 w-4 rotate-45"/></button>
                         </div>
                      ) : (
                         <button 
                           onClick={() => { setAddingMilestoneTo(g.id); setInlineTitle(""); }} 
                           className="text-[11px] font-bold uppercase tracking-widest text-primary hover:text-primary flex items-center gap-1.5 mt-4 transition-colors"
                         >
                           <Plus className="h-3.5 w-3.5" /> Add Milestone
                         </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )})
        )}
      </div>
    </div>
  );
}
