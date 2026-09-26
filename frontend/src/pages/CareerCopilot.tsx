import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Compass, FileUp, GraduationCap, ListChecks, Send, Sparkles, Target } from "lucide-react";
import { api } from "../services/api";
import { useProfile } from "../hooks/useProfile";
import { useAppStore } from "../store/useAppStore";
import { CTOGuideBanner } from "../components/CTOGuideBanner";

interface SkillGap {
  target_role: string;
  headline: string;
  strengths: string[];
  gaps: string[];
  next_actions: string[];
  resume_ready: boolean;
  analysis_source?: "resume-grounded" | "rule-based";
  resume_skills?: string[];
  profile_stage?: string;
}

interface LearningPlan {
  target_role: string;
  weeks: number;
  plan: { week: number; theme: string; focus: string; actions: string[] }[];
}

export default function CareerCopilot() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const { data: profile } = useProfile();
  const { data: latestResume, isLoading: resumeLoading } = useQuery({
    queryKey: ["latestResume"],
    queryFn: api.getLatestResume,
    enabled: isAuthenticated,
  });
  const profileRole = (profile?.target_role as string | undefined) || "";
  const [role, setRole] = useState(() => sessionStorage.getItem("saarthi_copilot_role") || "");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotSessionId, setCopilotSessionId] = useState<string | null>(null);
  const targetRole = role.trim() || profileRole || "Software Engineer";
  const hasResume = Boolean(latestResume);

  const { data: summary } = useQuery({
    queryKey: ["careerDashboard"],
    queryFn: () => api.getCareerDashboard().catch(() => null),
  });

  const gapMutation = useMutation({
    mutationFn: () => api.analyzeSkillGaps(targetRole),
  });

  const planMutation = useMutation({
    mutationFn: () => api.generateLearningPlan(targetRole, 4),
  });

  const gap = gapMutation.data as SkillGap | undefined;
  const plan = planMutation.data as LearningPlan | undefined;

  const intro = useMemo(() => {
    if (profileRole) {
      return `Using your profile target: ${profileRole}. Saarthi compares that role to your skills, resume, and goals.`;
    }
    return "Set a target role on your profile, or enter one here. Copilot uses your existing career data — it is not a generic chat.";
  }, [profileRole]);

  const runAnalysis = () => {
    if (!hasResume) return;
    gapMutation.mutate();
    planMutation.mutate();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background px-4 py-8 sm:px-6 lg:px-10 custom-scrollbar">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Career Intelligence</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Career Copilot</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{intro}</p>
        </header>

        <CTOGuideBanner
          title="Career Copilot & Skill Gap Intelligence Guide"
          subtitle="AI assistant that evaluates your resume skills against target roles to generate custom gap briefs and 4-week execution plans."
          steps={[
            { title: "Target Role", desc: "Select or type your desired target role (e.g. Backend Engineer, Product Manager)." },
            { title: "Analyze Gaps", desc: "Click 'Analyze Skill Gaps' to calculate missing technical keywords." },
            { title: "Review Brief", desc: "Read your Intelligence Brief detailing core strengths and critical missing skills." },
            { title: "Build Action Plan", desc: "Use the 4-week learning plan to systematically close every skill gap." },
          ]}
          ctoTip="Uploading your resume first ensures Copilot grounds its recommendations on your actual experience rather than generic defaults!"
        />

        <section className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
          {[
            { step: "1", title: "Resume ATS", detail: "Upload real evidence", route: "#/resume" },
            { step: "2", title: "Career Copilot", detail: "Find role-specific gaps", route: "#/copilot" },
            { step: "3", title: "Roadmap & Goals", detail: "Turn gaps into action", route: "#/goals" },
          ].map((item, index) => {
            const active = index === 0 ? hasResume : index === 1 ? Boolean(gap) : Boolean(plan);
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => { window.location.hash = item.route; }}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${active ? "border-primary/40 bg-primary/10" : "border-border/70 bg-muted/20 hover:border-primary/30"}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{item.step}</span>
                <span>
                  <span className="block text-xs font-bold text-foreground">{item.title}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">{item.detail}</span>
                </span>
              </button>
            );
          })}
        </section>

        {!isAuthenticated && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            Guest mode can preview role-based gaps. Sign in so Copilot can use your resume, skills, and goals.
          </div>
        )}

        {isAuthenticated && !resumeLoading && !hasResume && (
          <section className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Resume required for personalized Copilot analysis</p>
              <p className="mt-1 text-xs text-muted-foreground">Upload your resume so Skill Gap and Roadmap use your actual experience and skills.</p>
            </div>
            <button type="button" onClick={() => { window.location.hash = "#/resume"; }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              <FileUp className="h-4 w-4" /> Upload Resume
            </button>
          </section>
        )}

        {summary && (
          <section className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Intelligence brief
            </h2>
            <p className="font-display text-xl font-semibold text-foreground">{summary.headline}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(summary.focus_areas || []).map((area: string) => (
                <span key={area} className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  {area}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-6">
          <label htmlFor="copilot-role" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Target role
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="copilot-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={profileRole || "e.g. Data Analyst"}
              className="flex-1 rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
            />
            <button
              type="button"
              onClick={runAnalysis}
              disabled={!hasResume || resumeLoading}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {hasResume ? "Analyze path" : "Upload resume first"}
            </button>
          </div>
        </section>

        {isAuthenticated && (
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles className="h-4 w-4 text-primary" /> Ask your Copilot</h2>
            <div className="flex gap-2">
              <input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void (async () => { if (!question.trim()) return; setAnswer(""); setCopilotLoading(true); try { const id = await api.streamCopilot(question, copilotSessionId, (chunk) => setAnswer((previous) => previous + chunk)); setCopilotSessionId(id); } finally { setCopilotLoading(false); } })(); }} placeholder="What should I focus on this week?" className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm" />
              <button type="button" disabled={copilotLoading || !question.trim()} onClick={() => void (async () => { setAnswer(""); setCopilotLoading(true); try { const id = await api.streamCopilot(question, copilotSessionId, (chunk) => setAnswer((previous) => previous + chunk)); setCopilotSessionId(id); } finally { setCopilotLoading(false); } })()} className="rounded-lg bg-primary px-3 text-primary-foreground"><Send className="h-4 w-4" /></button>
            </div>
            {(copilotLoading || answer) && <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap text-foreground">{answer || "Thinking…"}</div>}
            {answer && <button type="button" onClick={() => void api.saveCopilotInsight("Career Copilot insight", answer)} className="mt-3 text-xs font-semibold text-primary hover:underline">Save insight to Notes</button>}
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Target className="h-4 w-4 text-primary" /> Skill gap
            </h2>
            {gapMutation.isPending && <p className="text-sm text-muted-foreground">Comparing your skills to the role…</p>}
            {gapMutation.isError && <p className="text-sm text-destructive">Could not analyze skill gaps. Sign in and try again.</p>}
            {gap && (
              <div className="space-y-4">
                <p className="text-sm text-foreground">{gap.headline}</p>
                <p className="text-xs text-muted-foreground">
                  {gap.analysis_source === "resume-grounded"
                    ? "Grounded in your uploaded resume and saved skills."
                    : "Based on role guidance. Upload a parsed resume for personalized gaps."}
                </p>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Already strong</p>
                  <div className="flex flex-wrap gap-2">
                    {gap.strengths.map((s) => (
                      <span key={s} className="rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs text-foreground">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority gaps</p>
                  <ul className="space-y-1.5 text-sm text-foreground">
                    {gap.gaps.map((s) => (
                      <li key={s} className="flex gap-2"><GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next actions</p>
                  <ul className="space-y-1.5 text-sm text-foreground">
                    {gap.next_actions.map((s) => (
                      <li key={s} className="flex gap-2"><ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {!gap && !gapMutation.isPending && (
              <p className="text-sm text-muted-foreground">Run an analysis to see mastered skills, missing skills, and what to do next.</p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Compass className="h-4 w-4 text-primary" /> Career roadmap
            </h2>
            {planMutation.isPending && <p className="text-sm text-muted-foreground">Building a four-week plan…</p>}
            {planMutation.isError && <p className="text-sm text-destructive">Could not generate a plan.</p>}
            {plan?.plan?.length ? (
              <ol className="space-y-4">
                {plan.plan.map((week) => (
                  <li key={week.week} className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Week {week.week}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{week.theme}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{week.focus}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-foreground">
                      {week.actions.map((action) => <li key={action}>{action}</li>)}
                    </ul>
                  </li>
                ))}
              </ol>
            ) : (
              !planMutation.isPending && (
                <p className="text-sm text-muted-foreground">The roadmap engine sequences skills, projects, and interview prep from your current level to the target role.</p>
              )
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
