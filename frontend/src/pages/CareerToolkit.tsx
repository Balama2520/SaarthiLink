import { useState, useEffect, useCallback } from "react";
import {
  Wrench, GitBranch, Link2, ListChecks, KeyRound, Code2,
  DollarSign, Globe2, Rss, Loader2, Sparkles, Copy, Download, Check,
} from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../services/api";
import { useToast } from "../hooks/useToast";
import { JsonResult } from "../components/ui/JsonResult";

type FieldType = "text" | "textarea" | "select";

interface ToolField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string;
}

interface ToolConfig {
  id: string;
  label: string;
  icon: typeof Wrench;
  description: string;
  fields: ToolField[];
  submitLabel: string;
  run: (values: Record<string, string>) => Promise<unknown>;
  autoLoad?: boolean;
}

const TOOLS: ToolConfig[] = [
  {
    id: "github",
    label: "GitHub Review",
    icon: GitBranch,
    description: "Get feedback on your GitHub profile for a specific target role.",
    fields: [
      { id: "profileText", label: "Profile summary / pinned repos", type: "textarea", placeholder: "Paste your GitHub bio, pinned repo descriptions, or README highlights" },
      { id: "targetRole", label: "Target role", type: "text", placeholder: "e.g. Backend Engineer" },
    ],
    submitLabel: "Review profile",
    run: (v) => api.githubReview(v.profileText, v.targetRole),
  },
  {
    id: "linkedin",
    label: "LinkedIn Optimizer",
    icon: Link2,
    description: "Sharpen your LinkedIn headline and about section for your target role.",
    fields: [
      { id: "profileText", label: "Current headline / about section", type: "textarea", placeholder: "Paste your current LinkedIn headline and summary" },
      { id: "targetRole", label: "Target role", type: "text", placeholder: "e.g. Data Analyst" },
    ],
    submitLabel: "Optimize profile",
    run: (v) => api.linkedinOptimize(v.profileText, v.targetRole),
  },
  {
    id: "star",
    label: "STAR Bullets",
    icon: ListChecks,
    description: "Turn a project or experience into resume-ready STAR-format bullet points.",
    fields: [
      { id: "projectOrExp", label: "Project or experience title", type: "text", placeholder: "e.g. Final year capstone project" },
      { id: "description", label: "What you did", type: "textarea", placeholder: "Describe the situation, your actions, and the outcome" },
    ],
    submitLabel: "Generate bullets",
    run: (v) => api.generateStarBullets(v.projectOrExp, v.description),
  },
  {
    id: "keywords",
    label: "Keyword Optimizer",
    icon: KeyRound,
    description: "Check your resume against a job title for missing ATS keywords.",
    fields: [
      { id: "resumeText", label: "Resume text", type: "textarea", placeholder: "Paste the relevant section of your resume" },
      { id: "jobTitle", label: "Job title", type: "text", placeholder: "e.g. Product Manager" },
    ],
    submitLabel: "Check keywords",
    run: (v) => api.optimizeKeywords(v.resumeText, v.jobTitle),
  },
  {
    id: "arena",
    label: "Coding Arena",
    icon: Code2,
    description: "Get a hint, a review, or a full solution walkthrough for a coding problem.",
    fields: [
      { id: "problemTitle", label: "Problem title", type: "text", placeholder: "e.g. Two Sum" },
      { id: "language", label: "Language", type: "select", options: [
        { value: "python", label: "Python" }, { value: "javascript", label: "JavaScript" },
        { value: "java", label: "Java" }, { value: "cpp", label: "C++" },
      ], defaultValue: "python" },
      { id: "mode", label: "Mode", type: "select", options: [
        { value: "hint", label: "Hint" }, { value: "review", label: "Review my code" }, { value: "solve", label: "Full solution" },
      ], defaultValue: "hint" },
      { id: "userCode", label: "Your code (optional for hint/solve)", type: "textarea", placeholder: "Paste your current attempt" },
    ],
    submitLabel: "Run",
    run: (v) => api.codingArena(v.problemTitle, v.language, v.userCode, v.mode),
  },
  {
    id: "salary",
    label: "Salary Insight",
    icon: DollarSign,
    description: "See a realistic compensation range for a role and location.",
    fields: [
      { id: "role", label: "Role", type: "text", placeholder: "e.g. Frontend Developer" },
      { id: "location", label: "Location", type: "text", placeholder: "e.g. Hyderabad, India" },
    ],
    submitLabel: "Get insight",
    run: (v) => api.getSalaryInsight(v.role, v.location),
  },
  {
    id: "global",
    label: "Global Path",
    icon: Globe2,
    description: "Understand the career/immigration path for working in a specific country.",
    fields: [
      { id: "country", label: "Country", type: "text", placeholder: "e.g. Germany" },
    ],
    submitLabel: "Explore path",
    run: (v) => api.getGlobalPath(v.country),
  },
  {
    id: "feed",
    label: "Opportunity Feed",
    icon: Rss,
    description: "A live feed of relevant opportunities, refreshed automatically.",
    fields: [],
    submitLabel: "Refresh feed",
    run: () => api.getOpportunityFeed(),
    autoLoad: true,
  },
];

export default function CareerToolkit() {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState(TOOLS[0].id);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, unknown>>({});

  const tool = TOOLS.find((t) => t.id === activeId)!;

  const setField = (toolId: string, fieldId: string, val: string) => {
    setValues((prev) => ({ ...prev, [toolId]: { ...prev[toolId], [fieldId]: val } }));
  };

  const runTool = useCallback(async (t: ToolConfig) => {
    setLoading((prev) => ({ ...prev, [t.id]: true }));
    try {
      const fieldValues = values[t.id] || {};
      const result = await t.run(fieldValues);
      setResults((prev) => ({ ...prev, [t.id]: result }));
    } catch {
      toast(`Couldn't run ${t.label} right now.`, "error");
    } finally {
      setLoading((prev) => ({ ...prev, [t.id]: false }));
    }
  }, [values, toast]);

  useEffect(() => {
    if (tool.autoLoad && results[tool.id] === undefined && !loading[tool.id]) {
      const timer = window.setTimeout(() => { void runTool(tool); }, 0);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runTool(tool);
  };

  const isBusy = Boolean(loading[tool.id]);
  const result = results[tool.id];
  const currentValues = values[tool.id] || {};
  const canSubmit = tool.fields
    .filter((f) => f.type !== "select")
    .every((f) => (currentValues[f.id] || "").trim().length > 0 || f.label.includes("optional"));

  const [copied, setCopied] = useState(false);

  const handleCopyResult = (resData: unknown) => {
    const textToCopy = typeof resData === "string" ? resData : JSON.stringify(resData, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast("Result copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadResult = (resData: unknown, toolName: string) => {
    const textContent = typeof resData === "string" ? resData : JSON.stringify(resData, null, 2);
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${toolName.toLowerCase().replace(/\s+/g, "_")}_output.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Result file downloaded!", "success");
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background px-4 py-8 sm:px-6 lg:px-10 text-foreground custom-scrollbar">
      <div className="mx-auto mb-8 max-w-6xl">
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <Wrench className="h-4 w-4 text-primary" />
          </div>
          Career Toolkit
        </h1>
        <p className="ml-11 mt-1.5 text-sm text-muted-foreground">
          Focused single-shot AI tools for the specific things you need done right now.
        </p>
      </div>

      <div className="mx-auto max-w-6xl md:flex md:gap-6">
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 md:mb-0 md:w-56 md:shrink-0 md:flex-col md:overflow-visible">
          {TOOLS.map((t) => {
            const isActive = t.id === activeId;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors md:w-full ${
                  isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" /> <span className="whitespace-nowrap">{t.label}</span>
              </button>
            );
          })}
        </div>

        <motion.div key={tool.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 flex-1 space-y-5">
          <div className="glass-card p-5">
            <p className="mb-1 text-sm font-medium text-foreground">{tool.label}</p>
            <p className="mb-4 text-xs text-muted-foreground">{tool.description}</p>

            {tool.fields.length > 0 && (
              <form onSubmit={handleSubmit} className="space-y-3">
                {tool.fields.map((f) => (
                  <div key={f.id}>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</label>
                    {f.type === "textarea" ? (
                      <textarea
                        rows={4}
                        value={currentValues[f.id] ?? ""}
                        onChange={(e) => setField(tool.id, f.id, e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                    ) : f.type === "select" ? (
                      <select
                        value={currentValues[f.id] ?? f.defaultValue ?? ""}
                        onChange={(e) => setField(tool.id, f.id, e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <input
                        value={currentValues[f.id] ?? ""}
                        onChange={(e) => setField(tool.id, f.id, e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                    )}
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={isBusy || !canSubmit}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
                >
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isBusy ? "Working…" : tool.submitLabel}
                </button>
              </form>
            )}

            {tool.autoLoad && (
              <button
                onClick={() => void runTool(tool)}
                disabled={isBusy}
                className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rss className="h-4 w-4" />} {tool.submitLabel}
              </button>
            )}
          </div>

          {isBusy && !result ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
          ) : result !== undefined ? (
            <div className="glass-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Result</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyResult(result)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadResult(result, tool.label)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
              <JsonResult data={result} />
            </div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
