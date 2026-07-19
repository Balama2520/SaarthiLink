const API_BASE = "/api";

function getHeaders(extraHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Authentication
  async register(username: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Registration failed");
    }
    return res.json();
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
      const errorData = await res.json();
      throw new Error(errorData.detail || "Login failed");
    }
    return res.json();
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
    return res.json();
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
      const token = localStorage.getItem("access_token");
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

  // Resume Upload / RAG
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/upload-file`, {
      method: "POST",
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error("File upload failed");
    return res.json();
  },

  // Resume Analyzer (Saves file metadata and runs deep parse)
  async analyzeResume(file: File, targetRole?: string) {
    const formData = new FormData();
    formData.append("file", file);
    if (targetRole) {
      formData.append("target_role", targetRole);
    }

    const res = await fetch(`${API_BASE}/resume/analyze`, {
      method: "POST",
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || "Resume analysis failed");
    }
    return res.json();
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

  // Jobs
  async matchJob(resumeText: string, jobDescription: string, companyName: string, jobTitle: string) {
    const res = await fetch(`${API_BASE}/jobs/match`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        resume_text: resumeText,
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
    return res.json();
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
    return res.json();
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
      const token = localStorage.getItem("access_token");
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
    return res.json();
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
    return res.json();
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

  async deletePlacement(id: string) {
    const res = await fetch(`${API_BASE}/gradhub/placements/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete placement entry");
    return res.json();
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

  async get(url: string, params?: Record<string, any>) {
    let finalUrl = `${API_BASE}${url}`;
    if (params) {
        const queryParams = new URLSearchParams(params).toString();
        finalUrl += `?${queryParams}`;
    }
    const res = await fetch(finalUrl, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("GET request failed");
    return { data: await res.json() };
  },

  async post(url: string, data?: any) {
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
  async createGoal(goal: any) {
    const res = await fetch(`${API_BASE}/goals/`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(goal),
    });
    if (!res.ok) throw new Error("Failed to create goal");
    return res.json();
  },
  async updateGoal(goalId: string, goal: any) {
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
    return res.json();
  },
};
