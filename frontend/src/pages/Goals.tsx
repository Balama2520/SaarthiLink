import { useState, useEffect } from "react";
import { api } from "../services/api";
import { Plus, Trash2, CheckCircle2, Target, Calendar, BarChart3, AlertCircle, ArrowUpRight, Flame, Sparkles } from "lucide-react";

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
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("pending");
  const [progress, setProgress] = useState(0);
  const [dueDate, setDueDate] = useState("");

  // AI suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [generatingAi, setGeneratingAi] = useState(false);

  const categories = ["General", "Career", "Learning", "Health", "Finance", "Business", "Settings"];

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const data = await api.getGoals();
      setGoals(data);
      setError("");
    } catch (err: any) {
      setError("Failed to load goals. Make sure you are signed in.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const newGoal = await api.createGoal({
        title,
        description,
        category,
        priority,
        status,
        progress,
        due_date: dueDate || null,
      });
      setGoals((prev) => [newGoal, ...prev]);
      resetForm();
      setIsAdding(false);
    } catch (err: any) {
      setError("Failed to create goal.");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    try {
      await api.deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setError("Failed to delete goal.");
    }
  };

  const handleToggleComplete = async (goal: Goal) => {
    const newStatus = goal.status === "completed" ? "in_progress" : "completed";
    const newProgress = newStatus === "completed" ? 100 : goal.progress;
    try {
      const updated = await api.updateGoal(goal.id, {
        status: newStatus,
        progress: newProgress,
      });
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
    } catch (err) {
      setError("Failed to update status.");
    }
  };

  const handleUpdateProgress = async (id: string, newProgress: number) => {
    const newStatus = newProgress === 100 ? "completed" : "in_progress";
    try {
      const updated = await api.updateGoal(id, {
        progress: newProgress,
        status: newStatus,
      });
      setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (err) {
      setError("Failed to update progress.");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("General");
    setPriority("medium");
    setStatus("pending");
    setProgress(0);
    setDueDate("");
  };

  const getAiRoadmap = async (goalTitle: string) => {
    try {
      setGeneratingAi(true);
      setAiSuggestions([]);
      const prompt = `Break down the goal "${goalTitle}" into 4 actionable steps or milestones. Keep suggestions short and highly specific. Output each milestone as a separate item.`;
      
      const res = await api.post("/chat", {
        message: prompt,
        session_id: "default",
        personality: "professional",
        model: "phi3"
      });
      
      if (res && res.data && res.data.response) {
        const text = res.data.response;
        const items = text.split(/\d+\.\s+/).map((s: string) => s.trim()).filter(Boolean);
        setAiSuggestions(items.length > 0 ? items : [text]);
      } else {
        setAiSuggestions([
          "Define specific milestones and timelines",
          "Identify resources and tools required",
          "Allocate 30 minutes daily to task execution",
          "Conduct weekly progress review and adjust variables"
        ]);
      }
    } catch (err) {
      setAiSuggestions([
        "Define specific milestones and timelines",
        "Identify resources and tools required",
        "Allocate 30 minutes daily to task execution",
        "Conduct weekly progress review and adjust variables"
      ]);
    } finally {
      setGeneratingAi(false);
    }
  };

  // Stats calculation
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === "completed").length;
  const inProgressGoals = goals.filter((g) => g.status === "in_progress" || g.status === "pending").length;
  const completionRate = totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 p-6 md:p-8 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/[0.06] pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Target className="h-8 w-8 text-violet-400" /> Goal Navigator
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Define, track, and execute custom objectives using modular AI agent frameworks.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg shadow-violet-500/25 transition-all duration-200 self-start md:self-auto"
        >
          <Plus className="h-4 w-4" /> {isAdding ? "Cancel" : "Add Goal"}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Target className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Goals</p>
            <h3 className="text-2xl font-bold text-white mt-1">{totalGoals}</h3>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Flame className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active</p>
            <h3 className="text-2xl font-bold text-white mt-1">{inProgressGoals}</h3>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Completed</p>
            <h3 className="text-2xl font-bold text-white mt-1">{completedGoals}</h3>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-fuchsia-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Success Rate</p>
            <h3 className="text-2xl font-bold text-white mt-1">{completionRate}%</h3>
          </div>
        </div>
      </div>

      {/* Goal creation Form */}
      {isAdding && (
        <form onSubmit={handleAddGoal} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 mb-8 space-y-4">
          <h2 className="text-lg font-bold text-white">Create New Goal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">GOAL TITLE *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Publish ML Research paper"
                className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">CATEGORY</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">DESCRIPTION</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail the target outcomes and metrics..."
              rows={3}
              className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">PRIORITY</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">DUE DATE</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">INITIAL PROGRESS ({progress}%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full h-8 accent-violet-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium py-2 px-4 rounded-xl text-sm transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              className="bg-violet-600 hover:bg-violet-500 text-white font-medium py-2 px-4 rounded-xl text-sm transition-colors"
            >
              Save Goal
            </button>
          </div>
        </form>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Goals List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white mb-2">My Objectives</h2>
          {loading ? (
            <div className="text-slate-400 text-sm py-8 text-center">Synchronizing Goal parameters...</div>
          ) : goals.length === 0 ? (
            <div className="bg-white/[0.01] border border-dashed border-white/[0.08] rounded-2xl p-12 text-center">
              <Target className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No goals declared yet. Click 'Add Goal' to initialize.</p>
            </div>
          ) : (
            goals.map((g) => (
              <div
                key={g.id}
                className={`bg-white/[0.02] border transition-all duration-200 rounded-2xl p-5 hover:border-white/[0.12] ${
                  g.status === "completed" ? "border-emerald-500/20 bg-emerald-500/[0.01]" : "border-white/[0.06]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleComplete(g)}
                      className={`mt-1 h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                        g.status === "completed"
                          ? "border-emerald-500 bg-emerald-500 text-slate-950"
                          : "border-slate-600 hover:border-violet-500"
                      }`}
                    >
                      {g.status === "completed" && <CheckCircle2 className="h-3 w-3 stroke-[3]" />}
                    </button>
                    <div>
                      <h3
                        className={`font-semibold text-white ${
                          g.status === "completed" ? "line-through text-slate-500" : ""
                        }`}
                      >
                        {g.title}
                      </h3>
                      {g.description && <p className="text-slate-400 text-sm mt-1">{g.description}</p>}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/[0.06] border border-white/[0.04] text-slate-300 px-2 py-0.5 rounded-md">
                          {g.category}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            g.priority === "high"
                              ? "bg-red-500/10 border border-red-500/20 text-red-400"
                              : g.priority === "medium"
                              ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                              : "bg-slate-500/10 border border-slate-500/20 text-slate-400"
                          }`}
                        >
                          {g.priority}
                        </span>
                        {g.due_date && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Due {g.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => getAiRoadmap(g.title)}
                      className="p-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 transition-colors"
                      title="Generate AI Roadmap"
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(g.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Progress</span>
                    <span className="font-semibold text-slate-300">{g.progress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={g.progress}
                    onChange={(e) => handleUpdateProgress(g.id, Number(e.target.value))}
                    className="w-full accent-violet-500 h-1.5 rounded-lg bg-slate-900 appearance-none cursor-pointer"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* AI Goal Copilot */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 self-start space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-bold text-white">AI Goal Planner</h2>
          </div>
          <p className="text-xs text-slate-400">
            Click the AI icon (<Sparkles className="h-3 w-3 inline text-violet-400" />) next to any goal to generate an automated action plan using Saarthi OS agents.
          </p>

          {generatingAi ? (
            <div className="py-6 text-center text-xs text-slate-500 animate-pulse">
              Analyzing parameters & compiling action roadmap...
            </div>
          ) : aiSuggestions.length > 0 ? (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400">Action Plan</h3>
              <ul className="space-y-2">
                {aiSuggestions.map((s, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2 text-slate-300 bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl">
                    <ArrowUpRight className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center py-6 border border-dashed border-white/[0.06] rounded-xl">
              No plan generated yet. Select a goal to brainstorm with Saarthi AI.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
