# Saarthi V1 — Master Feature Scope

**Status:** Locked product definition  
**Rule:** Do not mix V1, V2, old experiments, or long-term vision in the same build.  
**Last updated:** 2026-08-26

Saarthi V1 is the first complete **Career Operating System**.

The goal is not the maximum number of AI features. The goal is one connected system where a user can:

> Create their career identity → build their profile → manage resume → understand skills → discover jobs → set goals → prepare → learn → research → use AI assistance → track career progress.

Everything must run through the user's existing career data.

---

## One-sentence definition

**Saarthi V1 is an integrated AI-powered Career Operating System that combines a user's profile, resume, skills, goals, jobs, learning, interview preparation, research tools, memory, and Career Intelligence into one personalized platform for managing and improving their career.**

Long-term mission (not V1 work):

> Saarthi should know where the user is, understand where they want to go, identify the gap, and continuously help them take the next best action.

---

## Product architecture (connected, not isolated tools)

```text
                         SAARTHI V1
                             │
                    Career Identity
                             │
          ┌──────────────────┼──────────────────┐
          ↓                  ↓                  ↓
       Profile             Resume             Skills
          └──────────────────┼──────────────────┘
                             ↓
                           Goals
                             ↓
                           Memory
                             ↓
                    Career Intelligence
                             ↓
          ┌──────────────────┼──────────────────┐
          ↓                  ↓                  ↓
        Jobs             Learning           Interview
                             ↓
                       Career Progress
```

---

## What ships in V1

Primary navigation stays small on purpose. The dashboard is the career home, not a dump of every module.

| Area | V1 surface | Notes |
|---|---|---|
| Auth | Register, login, guest, access + refresh tokens, logout, data isolation | Refresh-token live flow — fix required (500 error) |
| Dashboard | Daily mission, intelligence brief, priority goals, quick actions | Central navigation point |
| Profile | Personal, education, career, preferences, portfolio, completeness | Source of career identity |
| Resume | Upload PDF/DOCX, analysis, ATS, versions, profile sync | PDF extraction broken on test fixture |
| Skills | `UserSkill` + normalization | Single source of truth |
| Goals | Create, update, delete, hierarchical goals | Career/learning/project categories only |
| Jobs | Browse, filter, match, save | Uses profile, skills, preferences |
| Learning | Skill roadmaps | AI generation blocked until AI is configured |
| Interview | Questions + evaluation | Live AI evaluation blocked until AI is configured |

These remain V1. They must not be rebuilt as disconnected apps, duplicate profile/skill/resume systems, or V2 agents.

---

## Full V1 Feature Map

"In scope" does not mean "production certified". See status column.

### Foundation

| # | Feature | Description | Status |
|---|---|---|---|
| 1 | Authentication | Register, login, guest, access + refresh tokens, logout, data isolation, admin | ✅ Register/Login pass. ⚠️ Refresh 500 — fix required |
| 2 | Dashboard | Career home: daily mission, intelligence brief, priority goals, quick actions | ✅ Renders. AI-backed data blocked |
| 3 | User Profile | Personal, education, career, job preferences, portfolio, resume metadata | ✅ Endpoint verified |
| 4 | Profile Completeness | Career readiness %, ATS readiness %, job matching %, suggestions | ✅ Backend logic exists |
| 5 | User Skills | `UserSkill` as single source of truth, skill normalization | ✅ Backend logic exists |

### Resume

| # | Feature | Description | Status |
|---|---|---|---|
| 6 | Resume Upload | PDF + DOCX, validation, size limits | ⚠️ PDF extraction returns 0 chars on test fixture |
| 7 | Resume Analysis | Extraction → ATS eval → skill extraction → structured data | ⚠️ Blocked by parser |
| 8 | ATS Analysis | Structure, skills, keywords, section scores, strengths, suggestions | ⚠️ Blocked by parser |
| 9 | Resume Versioning | Version history, metadata (size, version, parse status) | ✅ Backend logic exists |
| 10 | Profile Sync | Resume data → profile suggestions, user-data-wins rule | ✅ Service implemented |

### Career Discovery

| # | Feature | Description | Status |
|---|---|---|---|
| 11 | Job Board | Browse, search, filter, recommendations, save | ✅ Endpoints present |
| 12 | Job Recommendations | Profile + skills + location + preferences → match | ✅ Logic present, AI-dependent for full scoring |
| 13 | Saved Jobs | Save, review later | ✅ Implemented |
| 14 | Goals | Create, update, delete, hierarchical parent/child goals | ✅ Fully verified |

### Career Intelligence (Copilot)

| # | Feature | Description | Status |
|---|---|---|---|
| 15 | Career Copilot | Orchestrates profile + resume + skills + goals + memory + jobs → AI | ⏸️ AI blocked |
| 16 | Career Roadmap Engine | Level → milestones → skills → projects → certifications → timeline | ⏸️ AI blocked |
| 17 | Skill Gap Analysis | Target role → required vs user skills → gap → priority + difficulty + time | ⏸️ AI blocked |
| 18 | Job Strategy | Job → profile → match analysis → resume readiness → next actions | ⏸️ AI blocked |
| 19 | AI Chat | Career-context-aware conversation (not generic ChatGPT) | ⏸️ AI blocked |
| 20 | Memory | Persistent career context across sessions | ✅ Architecture exists |

### Preparation

| # | Feature | Description | Status |
|---|---|---|---|
| 21 | Learning Roadmaps | Target career → knowledge sequence → projects → readiness | ⏸️ AI blocked |
| 22 | Interview Coach | Technical, behavioral, project, resume Q&A + evaluation + speech | ⏸️ AI evaluation blocked |
| 23 | Skill Forge | Learn → practice → build → demonstrate → portfolio | ⏸️ AI blocked |

### Academic / Research Persona Modules

| # | Feature | Description | Status |
|---|---|---|---|
| 24 | Research Hub | Academic + technical research, paper analysis | ✅ Service exists (AI features blocked) |
| 25 | Experiment Studio | Hypothesis → method → results → observations | ✅ Service exists |
| 26 | Graduate Hub | Degree tracking, certifications, placements, GitHub/LinkedIn | ✅ Page exists |
| 27 | Admissions Navigator | MS abroad admissions workspace | ✅ Page exists |
| 28 | Study Notes | AI-generated notes per topic → study → development | ✅ Service exists (AI blocked) |
| 29 | AI Workspaces | Persistent workspace: conversations + items + linked resources | ✅ Page exists |

### System

| # | Feature | Description | Status |
|---|---|---|---|
| 30 | Admin Panel | System administration, monitoring (ops only, not user-facing) | ✅ Route exists, auth hardened |
| 31 | Personas | undergrad / mtech / phd / ms_abroad / professional / guest | ✅ Implemented in Sidebar + store |
| 32 | Daily Mission | Dashboard task list for small daily career actions | ✅ UI exists |
| 33 | Career Health | Multi-dimensional career readiness beyond profile % | ✅ Foundation in Career Intelligence Dashboard |

---

## Frontend ↔ V1 Feature Mapping

| Tab (route) | Page file | V1 Features inside |
|---|---|---|
| `dashboard` | `Dashboard.tsx` | Dashboard, Daily Mission, Career Health |
| `profile` | `Profile.tsx` | User Profile, Profile Completeness |
| `resume` | `ResumeAnalyzer.tsx` | Resume Upload, ATS Analysis, Versioning, Profile Sync |
| `goals` | `Goals.tsx` | Goal Navigator |
| `jobs` | `JobFinder.tsx` | Job Board, Recommendations, Saved Jobs |
| `copilot` | `CareerCopilot.tsx` | Career Roadmap, Skill Gap, Job Strategy |
| `interview` | `InterviewCoach.tsx` | Interview Coach |
| `roadmaps` | `LearningRoadmaps.tsx` | Learning Roadmaps |
| `chat` | `ChatCoach.tsx` | AI OS Chat, Memory |
| `workspaces` | `Workspaces.tsx` | AI Workspaces |
| `growthlab` | `GrowthLab.tsx` | Skill Forge + Research Hub + Study Notes (combined) |
| `gradhub` | `GraduateHub.tsx` | Graduate Hub + Admissions Navigator |
| `toolkit` | `CareerToolkit.tsx` | Career Toolkit utilities |
| `admin` | `AdminPanel.tsx` | Admin Panel |

---

## Backend ↔ V1 Feature Mapping

| Service file | V1 Feature |
|---|---|
| `auth_service.py` | Authentication |
| `profile_sync_service.py` | Profile Sync |
| `resume_service.py` | Resume Upload + Analysis |
| `career_service.py` | Career Intelligence, Career Health |
| `career_copilot_service.py` | Copilot, Roadmap, Skill Gap, Job Strategy |
| `jobs_service.py` | Job Board, Recommendations, Saved Jobs |
| `goal_service.py` | Goal Navigator |
| `interview_service.py` | Interview Coach |
| `roadmap_service.py` | Learning Roadmaps |
| `research_service.py` | Research Hub |
| `experiment_service.py` | Experiment Studio |
| `gradhub_service.py` | Graduate Hub |
| `higher_studies_service.py` | Admissions Navigator |
| `note_service.py` | Study Notes |
| `workspace_service.py` | AI Workspaces |
| `project_service.py` | Skill Forge |
| `ai_service.py` | AI Gateway |
| `voice_service.py` | Interview speech input |

---

## Personas

Same Saarthi core. Different relevance weighting.

```text
undergrad    → skills, projects, placements, jobs, learning
mtech        → research, experiments, skills, jobs, graduate career
phd          → research, papers, experiments, academic career
ms_abroad    → admissions, universities, applications, career
professional → jobs, resume, interview, career progression
guest        → limited view, sign-in prompt for personal features
```

---

## Explicitly V2 — do not build now

- Deep role-specific Resume Coach rewriting
- AI weekly learning planner
- Adaptive AI daily missions
- Automatic weekly career report
- Advanced interview coach
- Proactive career agent that nags / auto-applies

---

## Frozen V1 architecture

Do **not** introduce:

- React Router
- a new state-management system
- a new database architecture
- duplicate profile, skill, or resume systems
- separate AI orchestration frameworks
- autonomous job applications
- a massive UI redesign
- new V2 modules
- random AI agents
- unnecessary microservices

Existing shell: hash + Zustand tabs, FastAPI `/api` routers, current schema.

---

## Certification vs existence

**"Exists in V1" does not mean "production verified."**

```text
BUILD              ✅  Code exists across all modules
INTEGRATION        ✅  Services wired, routers connected
ARCHITECTURE       ✅  Frozen — no new systems
DOCUMENTATION      ✅  This file is the source of truth
BACKEND AUDIT      ✅  All 12 bugs fixed, 70/70 tests pass
FRONTEND AUDIT     ✅  RC1 PASS — lint clean, build clean
FRONTEND E2E       🔄  Shell verified; full signed-in flows partial
BACKEND E2E        🔄  Auth/Profile pass; 3 blockers open
SECURITY           ✅  Rate limiting, 24h JWT, refresh tokens, cascade deletes, prompt injection defense
PERFORMANCE        ✅  Redis caching, telemetry, ~45-120ms API
AI CONFIG          ⏸️  No Ollama, no Gemini key — all AI features blocked
AI E2E             ⏳  Pending AI config
FINAL REGRESSION   ⏳  Pending AI E2E
RC1 / RELEASE      ⏳  Pending
```

## Open blockers before release

| # | Blocker | Severity | Location |
|---|---|---|---|
| B-1 | `/api/auth/refresh` returns 500 in live run | P1 | `auth_service.py` / `user_repository.py` |
| B-2 | PDF resume extraction returns 0 chars | P1 | `engine/resume_pipeline.py` |
| B-3 | No AI provider configured (Ollama offline, no Gemini key) | P1 | `app/ai/gateway.py` + `.env` |

## What comes next (working order)

1. **Fix B-1** — Refresh token 500: investigate `user_repository.get_refresh_token` + datetime timezone comparison
2. **Fix B-2** — PDF extraction: test `pdfplumber` / `pypdf` against real user PDFs, compare extractors
3. **Fix B-3** — AI provider: add `GEMINI_API_KEY` to `.env` (fastest path to unblocking all AI features)
4. **AI E2E** — Copilot → Roadmap → Skill Gap → Job Strategy → Chat
5. **Final regression** — all 14 nav modules
6. **Tag `v1.0.0` and release**

---

## Brand

The product name is **Saarthi**. Not SaarthiLink. Not "frontend". Not "the app".

