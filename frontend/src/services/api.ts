import { AUTH_EXPIRED_EVENT, authHeader, getAuthPersistence, getToken, getRefreshToken, setAuth, getStoredUsername, clearAuth } from "../lib/auth";

// A deployed static frontend cannot rely on Vite's development-only `/api`
// proxy. Netlify must set this public, HTTPS API origin at build time. The
// relative fallback keeps same-origin/reverse-proxy deployments and local Vite
// development working without embedding a localhost production URL.
function resolveApiBase(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!envUrl) return "/api";
  const clean = envUrl.replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}
const API_BASE = resolveApiBase();

function getHeaders(extraHeaders: Record<string, string> = {}) {
  return { ...extraHeaders, ...authHeader() };
}

const originalFetch = window.fetch;

let refreshPromise: Promise<string | null> | null = null;

function expireSession(): void {
  clearAuth();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

async function performTokenRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    expireSession();
    return null;
  }

  try {
    const refreshRes = await originalFetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (refreshRes.ok) {
      const data = await parseJsonSafe(refreshRes);
      if (data && data.access_token) {
        const username = getStoredUsername() || "User";
        setAuth(
          username,
          data.access_token,
          data.refresh_token,
          getAuthPersistence() ?? "local"
        );
        return data.access_token as string;
      }
      expireSession();
      window.location.hash = "#/dashboard";
      return null;
    } else {
      expireSession();
      window.location.hash = "#/dashboard";
      return null;
    }
  } catch {
    expireSession();
    window.location.hash = "#/dashboard";
    return null;
  }
}

// Intercept fetch to automatically refresh token on 401 with single in-flight coordination
const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let res = await originalFetch(input, init);

  const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url || "";
  const isAuthEndpoint = urlString.includes("/auth/login") || urlString.includes("/auth/refresh") || urlString.includes("/auth/register");

  if (res.status === 401 && !isAuthEndpoint) {
    if (!refreshPromise) {
      refreshPromise = performTokenRefresh().finally(() => {
        refreshPromise = null;
      });
    }

    const newAccessToken = await refreshPromise;
    if (newAccessToken) {
      const newInit = { ...init };
      newInit.headers = {
        ...newInit.headers,
        ...authHeader(),
      };
      res = await originalFetch(input, newInit);
    }
  }
  return res;
};

// DELETE endpoints commonly return 204 No Content (empty body) on success.
// Calling res.json() unconditionally on that response throws a JSON-parse
// error even though the request succeeded — which every caller's try/catch
// then treats as a failed delete, rolling back an optimistic UI update that
// was actually correct. This reads the body only when there is one.
async function parseJsonSafe(res: Response) {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { detail: `HTTP ${res.status}: ${res.statusText || "Unexpected server response"}` };
  }
}

export const api = {
  // Public operational status. This endpoint contains no credentials and is
  // used to label integrations as configured/unavailable rather than "ready".
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error("Failed to load service status");
    return parseJsonSafe(res);
  },

  // Authentication
  async register(username: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const errorData = await parseJsonSafe(res);
      throw new Error(errorData?.detail || `Registration failed (HTTP ${res.status})`);
    }
    return parseJsonSafe(res);
  },

  async login(username: string, password: string) {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });
    if (!res.ok) {
      const errorData = await parseJsonSafe(res);
      throw new Error(errorData?.detail || `Login failed (HTTP ${res.status})`);
    }
    return parseJsonSafe(res);
  },

  async logout(refreshToken: string) {
    try {
      const res = await originalFetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Sessions
  async getSessions() {
    const res = await fetch(`${API_BASE}/sessions/`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load sessions");
    return res.json();
  },

  async createSession(title: string = "New Conversation") {
    const res = await fetch(`${API_BASE}/sessions/`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to create session");
    return res.json();
  },

  async deleteSession(sessionId: string) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete session");
    return parseJsonSafe(res);
  },

  async getSessionMessages(sessionId: string) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load messages");
    return res.json();
  },

  // Chat
  async chatStream(
    message: string,
    sessionId: string,
    personality: string = "default",
    model: string = "phi3",
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: unknown) => void
  ) {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message,
          session_id: sessionId,
          personality,
          model,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Chat failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Response body is not readable");

      const decoder = new TextDecoder("utf-8");
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        onChunk(chunk);
      }
      onDone();
    } catch (err) {
      onError(err);
    }
  },

  async chatLocal(
    message: string,
    localProfile: Record<string, unknown> | null,
    localHistory: Array<{ role: string; content: string }> = [],
    model: string = "phi3",
    personality: string = "default",
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: unknown) => void
  ) {
    try {
      const res = await fetch(`${API_BASE}/chat/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, model, personality, local_profile: localProfile, local_history: localHistory }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Local chat failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Response body is not readable");

      const decoder = new TextDecoder("utf-8");
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        onChunk(chunk);
      }
      onDone();
    } catch (err) {
      onError(err);
    }
  },

  // Resume Analyzer (Saves file metadata and runs deep parse)
  async analyzeResume(file: File, targetRole?: string) {
    const formData = new FormData();
    formData.append("file", file);
    if (targetRole) {
      formData.append("target_role", targetRole);
    }

    const res = await fetch(`${API_BASE}/resume/upload`, {
      method: "POST",
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      throw new Error(data?.detail || `Resume analysis failed (HTTP ${res.status})`);
    }
    return parseJsonSafe(res);
  },

  async syncResumeProfile(resumeId: string, accepted: boolean = true) {
    const res = await fetch(`${API_BASE}/resume/${resumeId}/sync`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ accepted }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.detail || "Resume profile sync failed");
    }
    return res.json();
  },

  async reanalyzeResume(resumeId: string, targetRole?: string) {
    const formData = new FormData();
    if (targetRole) {
      formData.append("target_role", targetRole);
    }
    const res = await fetch(`${API_BASE}/resume/${resumeId}/reanalyze`, {
      method: "POST",
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.detail || "Resume re-analysis failed");
    }
    return res.json();
  },

  async getResumeHistory() {
    const res = await fetch(`${API_BASE}/resume/history`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load resume history");
    return res.json();
  },

  async getLatestResume() {
    const res = await fetch(`${API_BASE}/resume/latest`, {
      headers: getHeaders(),
    });
    if (res.status === 404) return null; // no resume yet — soft fail
    if (!res.ok) throw new Error("Failed to load latest resume");
    return parseJsonSafe(res);
  },

  async resumeJobPipeline(resumeId: string, jobId: string) {
    const res = await fetch(`${API_BASE}/resume/${resumeId}/job-pipeline`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ job_id: jobId }),
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      throw new Error(data?.detail || "Prep Kit generation failed");
    }
    return parseJsonSafe(res);
  },

  // Voice to text
  async voiceToText(audioBlob: Blob) {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    const res = await fetch(`${API_BASE}/chat/voice-to-text`, {
      method: "POST",
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to transcribe audio");
    return res.json();
  },

  // Roadmap
  async generateRoadmap(targetRole: string, durationDays: number = 30) {
    const res = await fetch(`${API_BASE}/roadmap/generate`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ target_role: targetRole, duration_days: durationDays }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || "Roadmap generation failed");
    }
    return res.json();
  },

  async getSavedRoadmaps() {
    const res = await fetch(`${API_BASE}/roadmap/saved`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to load saved roadmaps");
    return res.json();
  },

  async updateRoadmapProgress(roadmapId: string, milestoneIndex: number, taskIndex: number, completed: boolean) {
    const res = await fetch(`${API_BASE}/roadmap/${roadmapId}/progress`, { method: "PATCH", headers: getHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ milestone_index: milestoneIndex, task_index: taskIndex, completed }) });
    if (!res.ok) throw new Error("Failed to save roadmap progress");
    return res.json();
  },

  // Jobs
  async getJobs(skip: number = 0, limit: number = 20) {
    const res = await fetch(`${API_BASE}/jobs?skip=${skip}&limit=${limit}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load jobs");
    return res.json();
  },

  async getJob(jobId: string) {
    const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(jobId)}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load job details");
    return res.json();
  },

  async searchJobs(q: string = "", location: string = "", experience: string = "", skip: number = 0, limit: number = 20, jobType: string = "", remoteType: string = "") {
    let url = `${API_BASE}/jobs/search?skip=${skip}&limit=${limit}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (location) url += `&location=${encodeURIComponent(location)}`;
    if (experience) url += `&experience=${encodeURIComponent(experience)}`;
    if (jobType) url += `&job_type=${encodeURIComponent(jobType)}`;
    if (remoteType) url += `&remote_type=${encodeURIComponent(remoteType)}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to search jobs");
    return res.json();
  },

  async getRecommendedJobs(skip: number = 0, limit: number = 20) {
    const res = await fetch(`${API_BASE}/jobs/recommended?skip=${skip}&limit=${limit}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load recommended jobs");
    return res.json();
  },

  // Profile
  async getProfile() {
    const res = await fetch(`${API_BASE}/profile`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load profile");
    return res.json();
  },

  async updateProfile(updates: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/profile`, {
      method: "PATCH",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || "Failed to update profile");
    }
    return res.json();
  },

  async getProfileCompleteness() {
    const res = await fetch(`${API_BASE}/profile/completeness`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load profile completeness");
    return res.json();
  },

  async saveJob(jobId: string) {
    const res = await fetch(`${API_BASE}/jobs/save`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ job_id: jobId }),
    });
    if (!res.ok) throw new Error("Failed to save job");
    return res.json();
  },

  async unsaveJob(jobId: string) {
    const res = await fetch(`${API_BASE}/jobs/saved/${jobId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to remove saved job");
    return res.json();
  },

  async getSavedJobs() {
    const res = await fetch(`${API_BASE}/jobs/saved`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load saved jobs");
    return res.json();
  },

  async trackJobApplication(jobId: string) {
    const res = await fetch(`${API_BASE}/jobs/apply`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ job_id: jobId }),
    });
    if (!res.ok) throw new Error("Failed to track application");
    return res.json();
  },

  async matchJob(resumeText: string | null, jobDescription: string, companyName: string, jobTitle: string) {
    const res = await fetch(`${API_BASE}/jobs/match`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        ...(resumeText ? { resume_text: resumeText } : {}), // omit key to trigger auto-fetch
        job_description: jobDescription,
        company_name: companyName,
        job_title: jobTitle,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || "Job matching failed");
    }
    return res.json();
  },

  // Interview
  async evaluateInterview(transcript: string, targetRole: string) {
    const res = await fetch(`${API_BASE}/interview/evaluate`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ transcript, target_role: targetRole }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || "Interview evaluation failed");
    }
    return res.json();
  },

  async createInterviewSession(role: string, company: string | null, difficulty: string) {
    const res = await fetch(`${API_BASE}/interview/session`, { method: "POST", headers: getHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ role, company, difficulty }) });
    if (!res.ok) throw new Error("Failed to create interview session");
    return res.json();
  },

  async answerInterviewSession(sessionId: string, answer: string, questionIndex: number) {
    const res = await fetch(`${API_BASE}/interview/session/${sessionId}/answer`, { method: "POST", headers: getHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ answer, question_index: questionIndex }) });
    if (!res.ok) throw new Error("Failed to save interview answer");
    return res.json();
  },

  // SkillForge Project Pipeline Generator
  async generateSkillForgePipeline(targetRole: string, currentSkills: string) {
    const res = await fetch(`${API_BASE}/projects/generate`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ target_role: targetRole, current_skills: currentSkills }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || "SkillForge pipeline generation failed");
    }
    return res.json();
  },

  // AI Research
  async analyzePaper(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/research/analyze`, {
      method: "POST",
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || "Paper analysis failed");
    }
    return res.json();
  },

  // Admin
  async getAdminStats() {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || "Failed to load admin stats");
    }
    return res.json();
  },

  async runSeedingPipeline(dryRun: boolean = true) {
    const res = await fetch(`${API_BASE}/admin/sheets/run-pipeline?dry_run=${dryRun}`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.detail || "Failed to run job-pipeline dry run");
    }
    return res.json();
  },

  // Notes
  async generateNote(topic: string, depth: string = "detailed") {
    const res = await fetch(`${API_BASE}/notes/generate`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ topic, depth }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || "Note generation failed");
    }
    return res.json();
  },

  async listNotes() {
    const res = await fetch(`${API_BASE}/notes/list`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  async deleteNote(noteId: number) {
    const res = await fetch(`${API_BASE}/notes/${noteId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete note");
    return parseJsonSafe(res);
  },

  // --- Workspaces (NotebookLM) ---
  async createWorkspace(name: string, description?: string) {
    const res = await fetch(`${API_BASE}/workspace/`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error("Failed to create workspace");
    return res.json();
  },

  async getWorkspaces() {
    const res = await fetch(`${API_BASE}/workspace/`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load workspaces");
    return res.json();
  },

  async deleteWorkspace(workspaceId: string) {
    const res = await fetch(`${API_BASE}/workspace/${workspaceId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete workspace");
    return parseJsonSafe(res);
  },

  async linkToWorkspace(workspaceId: string, itemType: string, itemId: string) {
    const res = await fetch(`${API_BASE}/workspace/${workspaceId}/link`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ item_type: itemType, item_id: itemId }),
    });
    if (!res.ok) throw new Error("Failed to link item to workspace");
    return res.json();
  },

  async getWorkspaceItems(workspaceId: string) {
    const res = await fetch(`${API_BASE}/workspace/${workspaceId}/items`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load workspace items");
    return res.json();
  },

  async getUnlinkedItems(workspaceId: string) {
    const res = await fetch(`${API_BASE}/workspace/${workspaceId}/unlinked`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load unlinked items");
    return res.json();
  },

  async chatWorkspace(
    workspaceId: string,
    message: string,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: unknown) => void
  ) {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/workspace/${workspaceId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Workspace chat failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Response body is not readable");

      const decoder = new TextDecoder("utf-8");
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        onChunk(chunk);
      }
      onDone();
    } catch (err) {
      onError(err);
    }
  },

  // --- Graduate Hub Trackers ---
  async addDegreeCourse(semester: number, courseName: string, credits: number, gpa?: string, status?: string) {
    const res = await fetch(`${API_BASE}/gradhub/degree`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ semester, course_name: courseName, credits, gpa, status }),
    });
    if (!res.ok) throw new Error("Failed to add course");
    return res.json();
  },

  async getDegreeCourses() {
    const res = await fetch(`${API_BASE}/gradhub/degree`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  async deleteDegreeCourse(id: string) {
    const res = await fetch(`${API_BASE}/gradhub/degree/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete course");
    return parseJsonSafe(res);
  },

  async addCert(name: string, provider: string, targetDate?: string, status?: string) {
    const res = await fetch(`${API_BASE}/gradhub/certs`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name, provider, target_date: targetDate, status }),
    });
    if (!res.ok) throw new Error("Failed to add certification");
    return res.json();
  },

  async getCerts() {
    const res = await fetch(`${API_BASE}/gradhub/certs`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  async deleteCert(id: string) {
    const res = await fetch(`${API_BASE}/gradhub/certs/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete certification");
    return parseJsonSafe(res);
  },

  async addPlacement(company: string, role: string, roundsJson?: string, packageAmt?: string, status?: string) {
    const res = await fetch(`${API_BASE}/gradhub/placements`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ company, role, rounds_json: roundsJson, package: packageAmt, status }),
    });
    if (!res.ok) throw new Error("Failed to add placement entry");
    return res.json();
  },

  async getPlacements() {
    const res = await fetch(`${API_BASE}/gradhub/placements`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  async updatePlacement(id: string, updates: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/gradhub/placements/${id}`, {
      method: "PATCH",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update placement entry");
    return res.json();
  },

  async deletePlacement(id: string) {
    const res = await fetch(`${API_BASE}/gradhub/placements/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete placement entry");
    return parseJsonSafe(res);
  },

  async githubReview(profileText: string, targetRole: string) {
    const res = await fetch(`${API_BASE}/gradhub/github-review`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ profile_text: profileText, target_role: targetRole }),
    });
    if (!res.ok) throw new Error("GitHub review failed");
    return res.json();
  },

  async linkedinOptimize(profileText: string, targetRole: string) {
    const res = await fetch(`${API_BASE}/gradhub/linkedin-optimize`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ profile_text: profileText, target_role: targetRole }),
    });
    if (!res.ok) throw new Error("LinkedIn optimization failed");
    return res.json();
  },

  // --- Extra Features & AI OS Modules ---
  async generateStarBullets(projectOrExp: string, description: string) {
    const res = await fetch(`${API_BASE}/resume/star-bullets`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ project_or_exp: projectOrExp, description }),
    });
    if (!res.ok) throw new Error("Failed to generate STAR bullets");
    return res.json();
  },

  async optimizeKeywords(resumeText: string, jobTitle: string) {
    const res = await fetch(`${API_BASE}/resume/keywords`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ resume_text: resumeText, job_title: jobTitle }),
    });
    if (!res.ok) throw new Error("Failed to optimize keywords");
    return res.json();
  },

  async decodeCompany(companyName: string) {
    const res = await fetch(`${API_BASE}/company/decode`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ company_name: companyName }),
    });
    if (!res.ok) throw new Error("Failed to decode company");
    return res.json();
  },

  async codingArena(problemTitle: string, language: string, userCode: string, mode: string) {
    const res = await fetch(`${API_BASE}/coding/arena`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ problem_title: problemTitle, language, user_code: userCode, mode }),
    });
    if (!res.ok) throw new Error("Coding Arena analysis failed");
    return res.json();
  },

  async buildNetworkOutreach(personType: string, company: string, userContext: string) {
    const res = await fetch(`${API_BASE}/network/builder`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ person_type: personType, company, user_context: userContext }),
    });
    if (!res.ok) throw new Error("Failed to build outreach template");
    return res.json();
  },

  async getMissionStatus() {
    const res = await fetch(`${API_BASE}/mission/status`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load mission status");
    return res.json();
  },

  async tickMissionTask(taskType: string) {
    const res = await fetch(`${API_BASE}/mission/tick`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ task_type: taskType }),
    });
    if (!res.ok) throw new Error("Failed to tick mission task");
    return res.json();
  },

  async getSalaryInsight(role: string, location: string) {
    const res = await fetch(`${API_BASE}/salary/insight`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ role, location }),
    });
    if (!res.ok) throw new Error("Failed to load salary insights");
    return res.json();
  },

  async getGlobalPath(country: string) {
    const res = await fetch(`${API_BASE}/global/path`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ country }),
    });
    if (!res.ok) throw new Error("Failed to load global path information");
    return res.json();
  },

  async getOpportunityFeed() {
    const res = await fetch(`${API_BASE}/opportunities/feed`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getCareerDashboard() {
    const res = await fetch(`${API_BASE}/career/dashboard`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load career dashboard");
    return res.json();
  },

  async streamCopilot(message: string, sessionId: string | null, onChunk: (chunk: string) => void): Promise<string | null> {
    const res = await fetch(`${API_BASE}/career/copilot/stream`, { method: "POST", headers: getHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ message, session_id: sessionId }) });
    if (!res.ok || !res.body) throw new Error("Copilot is unavailable");
    const reader = res.body.getReader(); const decoder = new TextDecoder();
    while (true) { const { done, value } = await reader.read(); if (done) break; onChunk(decoder.decode(value, { stream: true })); }
    return res.headers.get("X-Copilot-Session");
  },

  async saveCopilotInsight(title: string, content: string) {
    const res = await fetch(`${API_BASE}/career/copilot/insights`, { method: "POST", headers: getHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ title, content }) });
    if (!res.ok) throw new Error("Could not save insight");
    return res.json();
  },

  async analyzeSkillGaps(targetRole: string) {
    const res = await fetch(`${API_BASE}/career/skill-gap`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ target_role: targetRole }),
    });
    if (!res.ok) throw new Error("Failed to analyze skill gaps");
    return res.json();
  },

  async generateLearningPlan(targetRole: string, weeks: number = 4) {
    const res = await fetch(`${API_BASE}/career/learning-plan`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ target_role: targetRole, weeks }),
    });
    if (!res.ok) throw new Error("Failed to generate learning plan");
    return res.json();
  },

  async get(url: string, params?: Record<string, string | number | boolean>) {
    let finalUrl = `${API_BASE}${url}`;
    if (params) {
      const queryParams = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)])
      ).toString();
      finalUrl += `?${queryParams}`;
    }
    const res = await fetch(finalUrl, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("GET request failed");
    return { data: await res.json() };
  },

  async post(url: string, data?: unknown) {
    const res = await fetch(`${API_BASE}${url}`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) throw new Error("POST request failed");
    return { data: await res.json() };
  },

  // Goals
  async getGoals() {
    const res = await fetch(`${API_BASE}/goals/`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load goals");
    return res.json();
  },
  async createGoal(goal: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/goals/`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(goal),
    });
    if (!res.ok) throw new Error("Failed to create goal");
    return res.json();
  },
  async updateGoal(goalId: string, goal: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/goals/${goalId}`, {
      method: "PUT",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(goal),
    });
    if (!res.ok) throw new Error("Failed to update goal");
    return res.json();
  },
  async deleteGoal(goalId: string) {
    const res = await fetch(`${API_BASE}/goals/${goalId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete goal");
    return parseJsonSafe(res);
  },
  async getGoalTree(goalId: string) {
    const res = await fetch(`${API_BASE}/goals/${goalId}/tree`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch goal tree");
    return res.json();
  },
  async addMilestone(goalId: string, milestone: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/goals/${goalId}/milestones`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(milestone),
    });
    if (!res.ok) throw new Error("Failed to add milestone");
    return res.json();
  },
  async addTask(milestoneId: string, task: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/goals/milestones/${milestoneId}/tasks`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error("Failed to add task");
    return res.json();
  },
  async generateGoalPlan(goalId: string) {
    const res = await fetch(`${API_BASE}/goals/${goalId}/plan`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to generate plan");
    }
    return res.json();
  },
  // Discovery & Intelligence APIs
  async getDiscoveryOptions() {
    const res = await fetch(`${API_BASE}/discovery/options`);
    if (!res.ok) throw new Error("Failed to fetch discovery options");
    return res.json();
  },
  async submitDiscovery(payload: Record<string, unknown>) {
    const session_id = getSessionId();
    const res = await fetch(`${API_BASE}/discovery/submit`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json", "X-Session-ID": session_id }),
      body: JSON.stringify({ session_id, ...payload }),
    });
    if (!res.ok) throw new Error("Failed to submit discovery intelligence");
    return res.json();
  },
  async getFeedbackFeatures() {
    const res = await fetch(`${API_BASE}/feedback/features`);
    if (!res.ok) throw new Error("Failed to fetch features list");
    return res.json();
  },
  async submitFeatureRating(feature_id: number, rating: string, comment?: string, is_want_next?: boolean) {
    const session_id = getSessionId();
    const res = await fetch(`${API_BASE}/feedback/feature`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json", "X-Session-ID": session_id }),
      body: JSON.stringify({ feature_id, rating, comment, is_want_next }),
    });
    if (!res.ok) throw new Error("Failed to record feature rating");
    return res.json();
  },
  async submitProductFeedback(feedback: Record<string, unknown>) {
    const session_id = getSessionId();
    const res = await fetch(`${API_BASE}/feedback/product`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json", "X-Session-ID": session_id }),
      body: JSON.stringify(feedback),
    });
    if (!res.ok) throw new Error("Failed to submit product feedback");
    return res.json();
  },
  async submitContactForm(data: Record<string, unknown>) {
    const session_id = getSessionId();
    const res = await fetch(`${API_BASE}/contact`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json", "X-Session-ID": session_id }),
      body: JSON.stringify({ session_id, ...data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to submit contact form");
    }
    return res.json();
  },
  async getContactInfo() {
    const res = await fetch(`${API_BASE}/contact/info`);
    if (!res.ok) throw new Error("Failed to fetch contact info");
    return res.json();
  },
  async submitOpportunitySignal(opportunity: Record<string, unknown>) {
    const session_id = getSessionId();
    const res = await fetch(`${API_BASE}/opportunities`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json", "X-Session-ID": session_id }),
      body: JSON.stringify({ session_id, ...opportunity }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to submit opportunity signal");
    }
    return res.json();
  },
};

function getSessionId(): string {
  let id = localStorage.getItem("saarthi_session_id");
  if (!id) {
    id = "session_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    localStorage.setItem("saarthi_session_id", id);
  }
  return id;
}
