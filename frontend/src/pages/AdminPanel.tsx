import { useState, useEffect } from "react";
import { ShieldAlert, Users, MessageSquare, Briefcase, FolderGit2, Activity, Server, AlertCircle } from "lucide-react";
import { api } from "../services/api";

interface AdminStats {
  total_users: number;
  total_chat_sessions: number;
  total_projects: number;
  total_applications: number;
  active_models: string[];
  recent_users: { id: number; email: string; username: string }[];
}

export default function AdminPanel() {
  const isGuest = !localStorage.getItem("access_token");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (isGuest) {
        setError("Sign in as an admin to view this panel");
        setLoading(false);
        return;
      }
      try {
        const data = await api.getAdminStats();
        setStats(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message || "Failed to load admin stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isGuest]);

  if (loading) {
    return (
      <div className="flex-1 bg-slate-950 flex items-center justify-center font-sans">
        <Activity className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center font-sans text-red-400">
        <AlertCircle className="w-12 h-12 mb-4 text-red-400" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 overflow-y-auto px-8 py-10 font-sans text-slate-100">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2.5 text-white">
          <ShieldAlert className="w-8 h-8 text-rose-400" /> System Admin Panel
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Monitor Saarthi AI usage, active models, and overall platform metrics.
        </p>
      </div>

      {stats && (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 flex items-center gap-4 shadow-lg shadow-black/20">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-300">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Total Users</p>
                <p className="text-2xl font-bold text-white">{stats.total_users}</p>
              </div>
            </div>
            
            <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 flex items-center gap-4 shadow-lg shadow-black/20">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-300">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Chat Sessions</p>
                <p className="text-2xl font-bold text-white">{stats.total_chat_sessions}</p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 flex items-center gap-4 shadow-lg shadow-black/20">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-300">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Projects Generated</p>
                <p className="text-2xl font-bold text-white">{stats.total_projects}</p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 flex items-center gap-4 shadow-lg shadow-black/20">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-300">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Job Applications</p>
                <p className="text-2xl font-bold text-white">{stats.total_applications}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Models */}
            <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-rose-400" /> Active AI Models
              </h3>
              <ul className="space-y-3">
                {stats.active_models.map((model, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 bg-slate-800/80 border border-white/10 rounded-xl">
                    <span className="text-sm text-slate-200 font-medium">{model}</span>
                    <span className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span> Online
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recent Users */}
            <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-400" /> Recent Registrations
              </h3>
              <div className="space-y-3">
                {stats.recent_users.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-3 bg-slate-900/80 border border-white/10 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center text-xs font-bold uppercase">
                      {user.username[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{user.username}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}