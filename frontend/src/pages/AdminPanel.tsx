import { useState, useEffect } from "react";
import {
  ShieldAlert, ShieldCheck, Loader2, RefreshCw,
  Users, Briefcase, Database, Bot, FileText,
  Sparkles, Activity, Play, CheckCircle2, AlertCircle
} from "lucide-react";
import { api } from "../services/api";
import { JsonResult } from "../components/ui/JsonResult";

interface AdminStats {
  total_users?: number;
  total_sessions?: number;
  total_projects?: number;
  total_applications?: number;
  total_jobs?: number;
  total_discovery_profiles?: number;
  total_feature_feedbacks?: number;
  total_contact_requests?: number;
  total_opportunity_signals?: number;
  total_company_profiles?: number;
  sheets_status?: {
    status?: string;
    detail?: string;
    spreadsheet_id_configured?: boolean;
    tabs_expected?: number;
  };
  ai_status?: {
    gemini_configured?: boolean;
    hf_configured?: boolean;
    primary_provider?: string;
    secondary_provider?: string;
  };
  recent_users?: Array<{ id: number; username: string }>;
  recent_contact_requests?: Array<{
    id: string;
    name: string;
    email: string;
    role_type: string;
    reason: string;
    message: string;
    created_at?: string;
  }>;
  recent_discovery_profiles?: Array<{
    id: string;
    user_type: string;
    status: string;
    created_at?: string;
  }>;
  recent_opportunity_signals?: Array<{
    id: string;
    company: string;
    role: string;
    public_job_url?: string;
    validation_status: string;
    created_at?: string;
  }>;
}

export default function AdminPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "discovery" | "sheets" | "ai">("overview");
  const [showJson, setShowJson] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setDenied(false);
    setError(false);
    try {
      const data = await api.getAdminStats();
      setStats(data as AdminStats);
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : "";
      if (message.includes("admin") || message.includes("forbidden") || message.includes("permission") || message.includes("auth") || message.includes("unauthorized")) {
        setDenied(true);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRunPipeline = async () => {
    setRunningPipeline(true);
    setPipelineResult(null);
    try {
      const res = await api.runSeedingPipeline(true);
      setPipelineResult(`Dry run complete: Processed ${res.total_staging_jobs} staging jobs (${res.accepted_jobs} accepted).`);
    } catch (err) {
      setPipelineResult(`Pipeline error: ${err instanceof Error ? err.message : 'Failed to trigger pipeline'}`);
    } finally {
      setRunningPipeline(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-background px-4 py-8 sm:px-6 lg:px-10 text-foreground custom-scrollbar">
      <div className="mx-auto mb-8 max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground font-display">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            Saarthi Control Center & Admin Panel
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowJson(!showJson)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {showJson ? "Structured View" : "View Raw JSON"}
            </button>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
            </button>
          </div>
        </div>
        <p className="ml-12 mt-1.5 text-sm text-muted-foreground">
          Platform-wide telemetry, Google Sheets seeding status, AI gateway health, and discovery signal metrics.
        </p>
      </div>

      <div className="mx-auto max-w-5xl space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
            </div>
          </div>
        ) : denied ? (
          <div className="glass-card flex flex-col items-center gap-3 p-12 text-center rounded-2xl">
            <ShieldAlert className="h-8 w-8 text-amber-400" />
            <p className="text-base font-bold text-foreground">Admin Access Required</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Your logged-in account username is not listed in `ADMIN_USERNAMES`. Please sign in with an administrative account.
            </p>
          </div>
        ) : error ? (
          <div className="glass-card flex flex-col items-center gap-3 p-12 text-center rounded-2xl">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <p className="text-base font-bold text-foreground">Failed to Load Admin Telemetry</p>
            <p className="max-w-md text-xs text-muted-foreground">The stats service did not respond. Check backend server logs.</p>
          </div>
        ) : showJson ? (
          <div className="glass-card p-6 rounded-2xl">
            <JsonResult data={stats} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-border/80 pb-3">
              {[
                { id: "overview", label: "System Overview", icon: Activity },
                { id: "discovery", label: "Discovery Signals", icon: Sparkles },
                { id: "sheets", label: "14-Tab Sheets Engine", icon: Database },
                { id: "ai", label: "AI Gateway Health", icon: Bot },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-semibold uppercase">Total Users</span>
                      <Users className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="text-3xl font-extrabold text-foreground font-display">{stats?.total_users ?? 0}</div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-semibold uppercase">AI Sessions</span>
                      <Bot className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="text-3xl font-extrabold text-foreground font-display">{stats?.total_sessions ?? 0}</div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-semibold uppercase">Active Jobs</span>
                      <Briefcase className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="text-3xl font-extrabold text-foreground font-display">{stats?.total_jobs ?? 0}</div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-semibold uppercase">Applications</span>
                      <FileText className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="text-3xl font-extrabold text-foreground font-display">{stats?.total_applications ?? 0}</div>
                  </div>
                </div>

                {stats?.recent_users && stats.recent_users.length > 0 && (
                  <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-3">
                    <h3 className="text-sm font-bold text-foreground">Recent User Registrations</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {stats.recent_users.map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/30 text-xs font-medium">
                          <span className="text-foreground font-bold">{u.username}</span>
                          <span className="text-muted-foreground">ID: #{u.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Discovery Signals Tab */}
            {activeTab === "discovery" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">Discovery Profiles</div>
                    <div className="text-2xl font-extrabold text-foreground font-display">{stats?.total_discovery_profiles ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">Feature Feedback Submissions</div>
                    <div className="text-2xl font-extrabold text-foreground font-display">{stats?.total_feature_feedbacks ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">Contact Requests</div>
                    <div className="text-2xl font-extrabold text-foreground font-display">{stats?.total_contact_requests ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">Opportunity Signals</div>
                    <div className="text-2xl font-extrabold text-foreground font-display">{stats?.total_opportunity_signals ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">Registered Companies</div>
                    <div className="text-2xl font-extrabold text-foreground font-display">{stats?.total_company_profiles ?? 0}</div>
                  </div>
                </div>

                {/* User Contact Requests & Messages List */}
                {stats?.recent_contact_requests && stats.recent_contact_requests.length > 0 && (
                  <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span>📩 User Messages & Direct Inquiries</span>
                        <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {stats.recent_contact_requests.length} Messages
                        </span>
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {stats.recent_contact_requests.map((c) => (
                        <div key={c.id} className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                            <div className="flex items-center gap-2 font-bold text-foreground">
                              <span>{c.name}</span>
                              <span className="text-muted-foreground font-normal">({c.email})</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="rounded-md bg-primary/10 border border-primary/30 px-2 py-0.5 font-semibold text-primary">
                                {c.role_type}
                              </span>
                              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-muted-foreground">
                                {c.reason}
                              </span>
                            </div>
                          </div>
                          <p className="text-muted-foreground whitespace-pre-wrap">{c.message}</p>
                          {c.created_at && (
                            <div className="text-[10px] text-muted-foreground/70 text-right">
                              Submitted: {new Date(c.created_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* User Discovery Submissions & Opportunity Signals */}
                {stats?.recent_opportunity_signals && stats.recent_opportunity_signals.length > 0 && (
                  <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4">
                    <h3 className="text-sm font-bold text-foreground">Community Opportunity Signals</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {stats.recent_opportunity_signals.map((o) => (
                        <div key={o.id} className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
                          <div className="flex items-center justify-between font-bold text-foreground">
                            <span>{o.company}</span>
                            <span className="text-[10px] text-emerald-400 font-mono">{o.validation_status}</span>
                          </div>
                          <div className="text-muted-foreground">{o.role}</div>
                          {o.public_job_url && (
                            <a
                              href={o.public_job_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary underline truncate block"
                            >
                              {o.public_job_url}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sheets Engine Tab */}
            {activeTab === "sheets" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Google Sheets Control Center</h3>
                      <p className="text-xs text-muted-foreground">Status of 14-tab live integration engine.</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                      stats?.sheets_status?.status === "configured"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}>
                      {stats?.sheets_status?.status?.toUpperCase() ?? "CONFIG_REQUIRED"}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Spreadsheet ID:</span>
                      <span className="font-mono text-foreground">{stats?.sheets_status?.spreadsheet_id_configured ? "Configured (Hidden)" : "Not Set"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected Tabs:</span>
                      <span className="text-foreground">{stats?.sheets_status?.tabs_expected ?? 14} Tabs (01_SOURCES ... 14_API_CONFIG)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Detail:</span>
                      <span className="text-muted-foreground">{stats?.sheets_status?.detail ?? "Env vars required for live spreadsheet sync."}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-3">
                    <button
                      onClick={handleRunPipeline}
                      disabled={runningPipeline}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                    >
                      {runningPipeline ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      <span>Trigger Dry Run Seeding Pipeline</span>
                    </button>
                    {pipelineResult && (
                      <div className="p-3.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground">
                        {pipelineResult}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* AI Gateway Tab */}
            {activeTab === "ai" && (
              <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4">
                <h3 className="text-base font-bold text-foreground">AI Gateway & Provider Diagnostics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between font-bold">
                      <span>Google Gemini Provider</span>
                      {stats?.ai_status?.gemini_configured ? (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Unconfigured</span>
                      )}
                    </div>
                    <p className="text-muted-foreground">Primary production provider for resume parsing & career coaching.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between font-bold">
                      <span>Hugging Face Brain Adapter</span>
                      {stats?.ai_status?.hf_configured ? (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Config Required</span>
                      )}
                    </div>
                    <p className="text-muted-foreground">Secondary adapter for deep domain reasoning & fallback scoring.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
