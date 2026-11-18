import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Flame,
  GraduationCap,
  LoaderCircle,
  Map,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Target,
  UserRound,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { useProfileCompleteness } from "../hooks/useProfile";
import { PublicAdSlot } from "../components/PublicAdSlot";
import { NativeAdSlot } from "../components/NativeAdSlot";
import { GearRecommendCard } from "../components/GearRecommendCard";

interface DashboardProps {
  username: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

interface MissionStatus {
  date: string | null;
  dsa: number;
  git: number;
  linkedin: number;
  jobs: number;
  course: number;
  interview: number;
  streak: number;
  guest?: boolean;
}

interface CareerSummary {
  headline: string;
  focus_areas: string[];
  next_actions: string[];
  next_best_action?: {
    action: string;
    why: string;
    estimated_time?: string;
    target_tab?: string;
    target_role?: string;
  };
  stats: {
    applications: number;
    interviews: number;
    ats_score: number;
    goals_in_progress: number;
  };
  activity: Array<{
    id: string;
    type: "application" | "interview";
    title: string;
    created_at: string;
  }>;
}

interface DashboardGoal {
  id: string;
  title: string;
  status: string;
  category?: string;
  progress?: number;
}

const careerTabs = new Set([
  "profile",
  "resume",
  "jobs",
  "interview",
  "roadmaps",
  "goals",
  "workspaces",
  "copilot",
]);

const missionItems = [
  {
    key: "dsa",
    title: "Solve practice problems",
    detail: "Log up to two problems you completed today.",
    target: 2,
    button: "Log problem",
    count: (mission: MissionStatus) => mission.dsa,
  },
  {
    key: "git",
    title: "Make a GitHub contribution",
    detail: "Record a commit or meaningful repository update.",
    target: 1,
    button: "Log contribution",
    count: (mission: MissionStatus) => mission.git,
  },
  {
    key: "linkedin",
    title: "Build a professional connection",
    detail: "Record a post, comment, or thoughtful connection.",
    target: 1,
    button: "Log activity",
    count: (mission: MissionStatus) => mission.linkedin,
  },
  {
    key: "jobs",
    title: "Take a step toward an opportunity",
    detail: "Log up to three applications or recruiter outreaches.",
    target: 3,
    button: "Log application",
    count: (mission: MissionStatus) => mission.jobs,
  },
  {
    key: "course",
    title: "Learn something useful",
    detail: "Record a lesson or course session you completed.",
    target: 1,
    button: "Log learning",
    count: (mission: MissionStatus) => mission.course,
  },
  {
    key: "interview",
    title: "Practise an interview",
    detail: "Record a mock interview practice session.",
    target: 1,
    button: "Log practice",
    count: (mission: MissionStatus) => mission.interview,
  },
] as const;

const quickActions = [
  {
    tab: "resume",
    title: "Improve your resume",
    description: "Review your resume against a target role.",
    icon: FileText,
  },
  {
    tab: "jobs",
    title: "Find opportunities",
    description: "Explore roles that fit your direction.",
    icon: BriefcaseBusiness,
  },
  {
    tab: "interview",
    title: "Practise interviews",
    description: "Build confidence with a mock round.",
    icon: MessageSquareText,
  },
  {
    tab: "roadmaps",
    title: "Explore a learning path",
    description: "Turn a skill gap into a practical plan.",
    icon: Map,
  },
] as const;

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function LoadingLine({ className = "" }: { className?: string }) {
  return <div className={`h-4 animate-pulse rounded bg-muted ${className}`} />;
}

function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2 text-sm text-foreground">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <span>{message}</span>
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex w-fit items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </button>
    </div>
  );
}

export default function Dashboard({ username, setActiveTab }: DashboardProps) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const persona = useAppStore((state) => state.persona);
  const queryClient = useQueryClient();
  const profileQuery = useProfileCompleteness();
  const summaryQuery = useQuery<CareerSummary>({
    queryKey: ["careerDashboard"],
    queryFn: api.getCareerDashboard,
    retry: 1,
  });
  const missionQuery = useQuery<MissionStatus>({
    queryKey: ["missionStatus"],
    queryFn: api.getMissionStatus,
    retry: 1,
  });
  const goalsQuery = useQuery<DashboardGoal[]>({
    queryKey: ["goals"],
    queryFn: api.getGoals,
    enabled: isAuthenticated,
    retry: 1,
  });

  const missionMutation = useMutation({
    mutationFn: (taskType: string) => api.tickMissionTask(taskType),
    onSuccess: (response) => {
      queryClient.setQueryData(["missionStatus"], response.mission);
    },
  });

  const summary = summaryQuery.data;
  const mission = missionQuery.data;
  const goals = goalsQuery.data ?? [];
  const activeGoals = goals.filter((goal) => goal.status !== "completed");
  const missionDone = mission
    ? missionItems.filter((item) => item.count(mission) >= item.target).length
    : 0;
  const missionProgress = mission ? Math.round((missionDone / missionItems.length) * 100) : 0;
  const firstName = username?.split(/[.@\s]/)[0] || "there";
  const greeting = new Intl.DateTimeFormat(undefined, { hour: "numeric", hour12: false }).format(new Date());
  const hour = Number(greeting);
  const greetingText = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const action = summary?.next_best_action;
  const actionTab = action?.target_tab && careerTabs.has(action.target_tab)
    ? action.target_tab
    : "copilot";

  const handleMissionLog = (taskType: string) => {
    if (!isAuthenticated || missionMutation.isPending) return;
    missionMutation.mutate(taskType);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold text-primary">
              {username?.[0]?.toUpperCase() || "S"}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{greetingText}</p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {firstName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Make steady progress toward your next career goal. Start with one useful action today.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {persona && (
                  <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
                    {persona.replace(/_/g, " ")} path
                  </span>
                )}
                {action?.target_role && action.target_role !== "General" && (
                  <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                    Goal: {action.target_role}
                  </span>
                )}
                {!isAuthenticated && (
                  <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                    Guest preview
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("goals")}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto lg:self-auto"
          >
            <Target className="h-4 w-4" />
            {activeGoals.length ? "Review my goals" : "Choose a career goal"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
          <Panel className="relative overflow-hidden border-primary/20">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />
            <div className="relative space-y-5">
              <SectionHeading
                eyebrow="Your next step"
                title={summaryQuery.isError ? "We couldn't load your recommendation" : "One action to move forward"}
                action={
                  <span className="hidden items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Saarthi guidance
                  </span>
                }
              />

              {summaryQuery.isLoading ? (
                <div className="space-y-3">
                  <LoadingLine className="h-6 w-4/5" />
                  <LoadingLine className="w-full" />
                  <LoadingLine className="w-2/3" />
                </div>
              ) : summaryQuery.isError ? (
                <ErrorNotice
                  message="Your career summary is temporarily unavailable. Your profile and saved data have not been changed."
                  onRetry={() => void summaryQuery.refetch()}
                />
              ) : action ? (
                <div className="rounded-xl border border-border bg-background/70 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold leading-relaxed text-foreground">{action.action}</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{action.why}</p>
                      {action.estimated_time && (
                        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          About {action.estimated_time}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab(actionTab)}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {isAuthenticated ? "Take this step" : "Get started"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                  Add a career goal to get a useful next step here.
                  <button
                    type="button"
                    onClick={() => setActiveTab("goals")}
                    className="ml-2 font-semibold text-primary hover:underline"
                  >
                    Set a goal
                  </button>
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-start justify-between gap-4">
              <SectionHeading eyebrow="Profile" title="Career profile" />
              <UserRound className="mt-1 h-5 w-5 text-muted-foreground" />
            </div>
            {!isAuthenticated ? (
              <div className="mt-5 space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Sign in to save your profile and see personalized progress.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Create your profile <ArrowRight className="ml-1 inline h-4 w-4" />
                </button>
              </div>
            ) : profileQuery.isLoading ? (
              <div className="mt-5 space-y-3">
                <LoadingLine className="h-8 w-20" />
                <LoadingLine className="w-full" />
              </div>
            ) : profileQuery.isError ? (
              <div className="mt-5">
                <ErrorNotice
                  message="Profile progress could not be loaded."
                  onRetry={() => void profileQuery.refetch()}
                />
              </div>
            ) : profileQuery.data ? (
              <>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <span className="font-display text-3xl font-semibold text-foreground">
                    {profileQuery.data.overall_percentage}%
                  </span>
                  <span className="pb-1 text-xs text-muted-foreground">profile completion</span>
                </div>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="Career profile completion"
                  aria-valuenow={profileQuery.data.overall_percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, profileQuery.data.overall_percentage))}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className="mt-4 flex w-full items-start gap-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{profileQuery.data.suggestions?.[0] || "Review your profile details."}</span>
                </button>
              </>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">Profile progress is not available yet.</p>
            )}
          </Panel>
        </div>

        <section aria-label="Career overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Applications",
              value: summary?.stats.applications,
              icon: BriefcaseBusiness,
              tab: "jobs",
              hint: "View opportunities",
            },
            {
              label: "Interview practice",
              value: summary?.stats.interviews,
              icon: MessageSquareText,
              tab: "interview",
              hint: "Practise a round",
            },
            {
              label: "Resume score",
              value: summary?.stats.ats_score ? `${summary.stats.ats_score}%` : "Not scored",
              icon: FileText,
              tab: "resume",
              hint: summary?.stats.ats_score ? "Review resume" : "Add a resume",
            },
            {
              label: "Active goals",
              value: summary?.stats.goals_in_progress,
              icon: Target,
              tab: "goals",
              hint: "Review goals",
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setActiveTab(item.tab)}
              className="group flex min-h-32 flex-col justify-between rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30 hover:bg-card/80"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                <item.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <div>
                <p className="font-display text-2xl font-semibold text-foreground">
                  {summaryQuery.isLoading || summaryQuery.isError ? "—" : item.value ?? "—"}
                </p>
                <p className="mt-1 text-xs font-medium text-primary">{item.hint}</p>
              </div>
            </button>
          ))}
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.9fr)]">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <SectionHeading
                eyebrow="Small steps count"
                title="Today's activity"
              />
              {mission && !missionQuery.isError && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  <Flame className="h-4 w-4 text-primary" />
                  <span><strong className="text-foreground">{mission.streak}</strong> day streak</span>
                </div>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Log an activity after you complete it. These entries are self-reported, not independently verified.
            </p>

            {!isAuthenticated ? (
              <div className="mt-5 rounded-xl border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">Sign in to save your daily activity.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className="mt-3 text-sm font-semibold text-primary hover:underline"
                >
                  Sign in or create an account <ArrowRight className="ml-1 inline h-4 w-4" />
                </button>
              </div>
            ) : missionQuery.isLoading ? (
              <div className="mt-5 space-y-3">
                {missionItems.slice(0, 4).map((item) => (
                  <LoadingLine key={item.key} className="h-16 w-full" />
                ))}
              </div>
            ) : missionQuery.isError ? (
              <div className="mt-5">
                <ErrorNotice
                  message="Today's activity could not be loaded."
                  onRetry={() => void missionQuery.refetch()}
                />
              </div>
            ) : mission ? (
              <>
                <div className="mt-5 rounded-xl bg-background p-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-foreground">Daily activity logged</span>
                    <span className="font-semibold text-primary">{missionDone} of {missionItems.length}</span>
                  </div>
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label="Daily activity logged"
                    aria-valuenow={missionProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500"
                      style={{ width: `${missionProgress}%` }}
                    />
                  </div>
                </div>
                {missionMutation.isError && (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    Could not save that activity. Please try again.
                  </p>
                )}
                <ul className="mt-4 space-y-2">
                  {missionItems.map((item) => {
                    const count = item.count(mission);
                    const complete = count >= item.target;
                    return (
                      <li
                        key={item.key}
                        className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            complete ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}>
                            {complete ? <Check className="h-4 w-4" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{item.title}</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleMissionLog(item.key)}
                          disabled={complete || missionMutation.isPending}
                          aria-label={`${item.button}: ${item.title}`}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-default disabled:opacity-60 sm:min-w-32"
                        >
                          {missionMutation.isPending && missionMutation.variables === item.key ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : complete ? (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          ) : null}
                          {complete ? "Logged" : item.button}
                          {!complete && !missionMutation.isPending && <ArrowUpRight className="h-3.5 w-3.5" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">Activity is not available yet.</p>
            )}
          </Panel>

          <div className="space-y-6">
            <Panel>
              <SectionHeading
                eyebrow="Career tools"
                title="Pick up where you are"
                action={
                  <button
                    type="button"
                    onClick={() => setActiveTab("discover")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Explore
                  </button>
                }
              />
              <div className="mt-4 space-y-2">
                {quickActions.map((item) => (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => setActiveTab(item.tab)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-3 text-left transition-colors hover:border-border hover:bg-background"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{item.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{item.description}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                ))}
              </div>
            </Panel>

            <Panel>
              <SectionHeading
                eyebrow="Keep momentum"
                title="Your goals"
                action={
                  <button
                    type="button"
                    onClick={() => setActiveTab("goals")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View all
                  </button>
                }
              />
              {!isAuthenticated ? (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Sign in to create goals and keep your progress in one place.
                </p>
              ) : goalsQuery.isLoading ? (
                <div className="mt-4 space-y-3">
                  <LoadingLine className="h-12 w-full" />
                  <LoadingLine className="h-12 w-full" />
                </div>
              ) : goalsQuery.isError ? (
                <div className="mt-4">
                  <ErrorNotice
                    message="Your goals could not be loaded."
                    onRetry={() => void goalsQuery.refetch()}
                  />
                </div>
              ) : activeGoals.length ? (
                <ul className="mt-4 space-y-2">
                  {activeGoals.slice(0, 3).map((goal) => (
                    <li key={goal.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTab("goals")}
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-primary/30"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Target className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{goal.title}</span>
                          <span className="mt-0.5 block text-xs capitalize text-muted-foreground">
                            {goal.category || goal.status.replace(/_/g, " ")}
                          </span>
                        </span>
                        {typeof goal.progress === "number" && (
                          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                            {Math.min(100, Math.max(0, goal.progress))}%
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-4">
                  <p className="text-sm text-muted-foreground">
                    No active goals yet. Choose one outcome to make your next steps more focused.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("goals")}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    Create your first goal <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </Panel>
          </div>
        </div>

        <Panel>
          <SectionHeading
            eyebrow="Your journey"
            title="Recent activity"
            action={
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                Applications and interview practice
              </span>
            }
          />
          {summaryQuery.isLoading ? (
            <div className="mt-4 space-y-3">
              <LoadingLine className="w-full" />
              <LoadingLine className="w-4/5" />
            </div>
          ) : summaryQuery.isError ? (
            <p className="mt-4 text-sm text-muted-foreground">Recent activity is unavailable until your summary loads.</p>
          ) : summary?.activity?.length ? (
            <ul className="mt-4 divide-y divide-border">
              {summary.activity.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {item.type === "application"
                      ? <BriefcaseBusiness className="h-3.5 w-3.5" />
                      : <MessageSquareText className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{item.title}</p>
                    <time className="mt-1 block text-xs text-muted-foreground" dateTime={item.created_at}>
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">
                Your saved applications and interview practice will appear here.
              </p>
            </div>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <GearRecommendCard
            variant="general"
            dismissKey="dashboard-gear"
            tip="Useful tools to support your learning and job search. Purchases may support Saarthi at no extra cost to you."
          />
          <PublicAdSlot />
        </div>
        <NativeAdSlot />
      </div>
    </div>
  );
}
