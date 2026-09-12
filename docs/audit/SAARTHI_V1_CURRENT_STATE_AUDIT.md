# Saarthi V1 Current-State Observation Audit

**Date:** 2026-09-07  
**Mode:** Observation only. No production source, configuration, schema, UI, deployment, or database changes were made in this phase.  
**Verdict:** BLOCKED for full V1 certification.

## 1. Executive Summary

Saarthi currently consists of a React 19/Vite frontend, manual hash navigation, Zustand state, a FastAPI backend, SQLAlchemy models/repositories/services, an AI Gateway, optional Redis, an outbox worker, local SQLite development persistence, and PostgreSQL/Redis Docker deployment configuration.

The current implementation is smaller than several historical audits claim. `frontend/src/App.tsx` mounts 14 tabs: Dashboard, Profile, Resume, Goals, Jobs, Copilot, Interview, Roadmaps, AI Chat, Workspaces, Graduate Hub, Growth Lab, Toolkit, and Admin. Admissions, Experiment Studio, standalone Research Hub, standalone Notes, and standalone SkillForge are not current App routes.

Real foundations exist: auth registration/login/refresh/logout, ownership filters for several resources, Gemini through Saarthi's gateway, resume extraction stages, route-level error boundaries, and passing frontend lint/build. Full certification remains blocked by incomplete browser workflow coverage, a test harness that performs requests/AI work during collection and is interrupted without a pytest summary, resume analysis failure during Gemini 503 plus unavailable Ollama fallback, empty jobs data, incomplete persistence workflows, and deployment/configuration decisions that remain unresolved.

## 2. Current Architecture

```text
Browser
  -> React 19 + Vite + TypeScript
  -> App.tsx manual hash router
  -> Sidebar + Zustand useAppStore (auth display, activeTab, persona)
  -> pages/components
  -> services/api.ts (fetch, Bearer auth, 401 refresh/retry, streaming)
  -> FastAPI :2520 middleware (request IDs, rate limit, security headers, CORS)
  -> routers -> dependencies -> services -> repositories -> SQLAlchemy models
  -> SQLite locally / PostgreSQL in Docker
  -> Redis cache/memory when available; DB fallback
  -> EventOutbox worker
  -> AI Gateway -> AIRouter -> Gemini or Ollama
```

Resume path:

```text
ResumeAnalyzer -> api.analyzeResume -> POST /api/resume/upload
-> ResumeIntelligencePipeline -> extension/size validation
-> pdfplumber -> pypdf/PyPDF2 -> raw-byte fallback
-> AIGateway ATS prompt -> parsed_json/raw_text/version/score in resumes
-> explicit /api/resume/{id}/sync -> ProfileSyncService
```

AI path:

```text
page/tool -> api.ts -> FastAPI route/service -> AIGateway
-> GeminiProvider when GEMINI_API_KEY is loaded -> Ollama fallback on exception
-> provider chunks -> feature-specific JSON parsing/persistence
```

## 3. Technology Stack

| Technology | Actual version/config | Purpose | Status |
|---|---|---|---|
| React | `^19.2.6` | UI | Active |
| Vite | `^8.0.12` | Dev/build | Active; build passes |
| TypeScript | `~6.0.2` | Frontend types | Active |
| Tailwind/custom CSS | Tailwind `^4.3.1` | Styling | Active |
| Zustand | `^5.0.14` | App state/persistence | Active |
| TanStack Query | `^5.101.4` | Selective data fetching | Active selectively |
| FastAPI | `>=0.109.0` | API | Active |
| Python | Docker 3.11; local interpreter 3.14 observed | Runtime | Version mismatch risk |
| SQLAlchemy | `>=2.0.25` | ORM | Active; deprecation warning |
| SQLite | `sqlite:///./saarthi.db` default | Local DB | Active |
| PostgreSQL | Compose `postgres:15-alpine` | Deployment DB | Configured, not live-tested |
| Redis | `redis>=5.0.1`, Compose Redis 7 | Cache/memory/rate support | Optional/unavailable locally |
| Gemini | Google HTTP streaming API, `gemini-3.8-flash` | AI primary when configured | Saarthi gateway verified |
| Ollama | Remote HTTP API | AI fallback | Unavailable locally |
| PDF/DOCX | pdfplumber, pypdf/PyPDF2, python-docx | Resume extraction | Implemented |
| Auth | bcrypt, python-jose JWT, DB refresh tokens | Auth | Active |
| Tests | pytest, pytest-asyncio, TestClient | Backend tests | Harness incomplete |
| Deployment | Docker Compose, Netlify, Nginx | Hosting | Configured, not deployed here |

`axios` is declared but the active client uses `fetch`. OpenAI/Anthropic provider files exist but are not wired by the active router. Chroma/LangChain/LangGraph/Celery dependencies exist but are not uniformly exercised by current V1 routes.

## 4. Frontend Findings

### Active pages

`Dashboard`, `Profile`, `ResumeAnalyzer`, `Goals`, `JobFinder`, `CareerCopilot`, `InterviewCoach`, `LearningRoadmaps`, `ChatCoach`, `Workspaces`, `GraduateHub`, `GrowthLab`, `CareerToolkit`, `AdminPanel`.

### Observations

- Manual hash routing and active-tab synchronization are real; React Router is absent.
- Sidebar has 14 items. Personas change recommendation dots and persist through Zustand storage, but do not enforce page access or hide sections.
- Auth is a full-screen modal with guest access, local/session token persistence, and visible loading/error states.
- Error boundaries and Suspense loading exist.
- Pages use real API wrappers for profile, resume, goals, jobs, Copilot, chat, roadmaps, workspace, GradHub, toolkit, and admin.
- Jobs render a real empty state; Growth Lab opportunity data is static backend data.
- `api.uploadFile()` calls `/api/upload-file`, but no matching current backend route is registered: likely dead/legacy integration.
- The fetch 401 refresh path retries requests but has no clear concurrency lock/queue; simultaneous expiry can create multiple refresh attempts.
- Streaming consumes raw chunks, not a shared SSE/event protocol.
- Existing frontend-local deep audit claims pages not mounted by current App.tsx. `docs/audit/FRONTEND_V1_DEEP_AUDIT.md` is **NOT FOUND**; `frontend/docs/audit/FRONTEND_V1_DEEP_AUDIT.md` exists.

## 5. Backend Findings

Registered API groups: auth, resume, roadmap, jobs, interview, goals, profile, career/legacy mission, workspace, GradHub, notes, research, projects, admin, toolkit, sessions, chat, health, telemetry.

- `get_current_user()` returns a synthetic `GuestUser` without a token. Guest support is intentional for some reads/AI-local flows but creates a broad review surface for writes.
- Most persisted resource queries include `user_id` ownership filters; goals, workspace, sessions, resumes, profile, and GradHub show explicit ownership patterns.
- Many endpoints return untyped dictionaries instead of Pydantic response models.
- `main.py` calls `Base.metadata.create_all()` at import time while Docker also runs Alembic. Two schema authorities coexist.
- Health checks the database and Redis and probes only Ollama under the `ai_gateway` label; a healthy Gemini path can still be reported as Ollama offline.
- Middleware returns generic 500 JSON after logging exceptions; AI waits can still make test execution appear hung.
- Outbox worker starts during app lifespan and polls every five seconds; multi-replica duplication controls are not evident.

## 6. Database and Migrations

Central models include User, RefreshToken, UserProfile, UserSkill, Resume, Goal, ChatSession/ChatMessage, AIWorkspace, Document, Job/JobApplication, LearningRoadmap, InterviewSession, DegreeTracker, CertificationPlanner, PlacementTracker, DailyMission, Note, Memory, EventOutbox, research/thesis/experiment/publication/higher-education entities, and supporting records.

Ownership is generally through `user_id` foreign keys and SQLAlchemy relationships; User-side cascades are common. Goals are self-referential with child cascade. Workspace children include resumes/documents/applications. Chat messages cascade from sessions.

Five Alembic revisions exist. Docker runs `alembic upgrade head`; direct local startup also calls `create_all()`. `alembic.ini` contains a placeholder URL and relies on `env.py`/settings. SQLite and PostgreSQL behavior differ for pooling/concurrency. Many models have no complete current route/page workflow and may be planned or legacy persistence.

## 7. Authentication, Authorization, Isolation

JWT access tokens default to 24 hours; refresh tokens are DB-backed and 30 days; logout deletes the refresh token. Browser registration, token storage, reload restoration, and logout clearing were previously observed. Valid refresh returned 200 with a new access token; invalid refresh returned 401.

Admin authorization is configuration-backed through `ADMIN_USERNAMES`; there is no User role column, permission table, or admin claim. Live HTTP behavior after the current guard: guest `401`, normal user `403`, configured username `200`. Deployment must configure this value. The configured-admin browser UI was not exercised.

Two-user API checks previously returned 404 for cross-user goal, goal-tree, workspace-delete, and session-message access; User B lists did not contain User A records. Full profile/resume/roadmap/saved-job/document isolation remains unverified.

Security observations: Web Storage bearer tokens are XSS-sensitive; bcrypt truncates passwords above 72 bytes rather than rejecting; CORS is configuration-dependent and permits all methods/headers for allowed origins; upload validation is extension-oriented and lacks visible malware/content-signature scanning.

## 8. AI Architecture

Gemini is verified through Saarthi's gateway: `/api/chat` returned `SAARTHI AI WORKS`, and backend logs recorded `Gemini request: model=gemini-3.8-flash`. Real structured responses were observed for skill gap, learning plan, roadmap, interview evaluation, Company Decoder, and SkillForge.

Gateway weaknesses:

- Provider selection is implicit: Gemini if a key exists, otherwise Ollama; fallback only follows raised provider exceptions.
- A Gemini HTTP 503 caused Ollama fallback; with Ollama unavailable, resume analysis returned controlled 502 and did not persist a resume.
- No shared retry/backoff/circuit breaker is evident.
- JSON parsing differs by feature: toolkit can return raw text under `result`, while resume/roadmap/goal paths validate more strictly.
- Partial streamed output followed by provider failure can produce incomplete output before fallback.
- AI output persistence is inconsistent; chat persists messages, many generated outputs are transient.

## 9. Resume Pipeline

Allowed extensions: PDF/DOCX/TXT; maximum 5 MB. PDF extraction order is pdfplumber, pypdf/PyPDF2, raw-byte decode. DOCX uses python-docx. Parsed JSON, raw text, version, status, and ATS score are intended to persist; sync is explicit.

A real PDF trace reached `Stage 2: Text extraction completed`, proving the historical zero-character issue was not reproduced on that fixture. Gemini then returned 503, Ollama fallback failed, Stage 3 reported invalid JSON, and API returned 502; no resume history record was created. Current blocker is AI failure resilience, not demonstrated extraction failure.

## 10. Previous Findings vs Current State

| Finding | Current observation | Severity |
|---|---|---|
| B-1 refresh 500 | Valid refresh 200; invalid refresh 401 | Observed resolved |
| B-2 PDF zero chars | Real fixture reached completed extraction | Not reproduced; broader fixtures untested |
| B-3 fallback | Gemini works; Gemini 503 -> Ollama unavailable -> controlled failure | P2 resilience |
| Admin authorization | Guest 401, normal 403, configured admin 200 | Current policy works when configured |
| Redis startup | Backend continues without Redis | Operational warning |
| Roadmap fallback | Schema-compliant milestones fallback focused-tested | Observed resolved |

## 11. Exact 34-Feature Matrix

| # | Feature | Frontend/backend/database/AI observation | Status | Severity/notes |
|---:|---|---|---|---|
| 1 | Authentication | Routes, JWT, refresh, browser lifecycle partial | PARTIALLY VERIFIED | Full forced retry untested |
| 2 | Dashboard | Active page and mission/profile/goals calls | PARTIALLY VERIFIED | Full action audit incomplete |
| 3 | User Profile | Active GET/PATCH page and model | PARTIALLY VERIFIED | Full field matrix incomplete |
| 4 | Profile Completeness | Endpoint/UI derived score | PARTIALLY VERIFIED | Full derivation not proven |
| 5 | User Skills | Model/sync support; no full standalone workflow | NOT TESTED | |
| 6 | Resume Upload | Active multipart pipeline | PARTIALLY VERIFIED | AI stage failed on provider 503 |
| 7 | Resume Analysis | AI prompt/parser exists | PARTIALLY VERIFIED | No completed real analysis in trace |
| 8 | ATS Analysis | Included in resume analysis schema | NOT TESTED | |
| 9 | Resume Versioning | Version logic/tests exist | NOT TESTED | Successful real sequence incomplete |
| 10 | Profile Sync | Explicit route/service | NOT TESTED | No successful current resume record |
| 11 | Job Board | Active page/API, empty DB | DATA-BLOCKED | No jobs |
| 12 | Job Recommendations | Active endpoint, empty DB | DATA-BLOCKED | No jobs |
| 13 | Saved Jobs | Wrappers/API, no job to save | DATA-BLOCKED | No jobs |
| 14 | Goals | CRUD/tree API and UI; ownership checks | PARTIALLY VERIFIED | Browser CRUD incomplete |
| 15 | Career Copilot | Active page; real skill/plan outputs | PARTIALLY VERIFIED | Full persistence incomplete |
| 16 | Career Roadmap Engine | Route/service/fallback | PARTIALLY VERIFIED | Browser persistence incomplete |
| 17 | Skill Gap Analysis | Real Gemini structured response | VERIFIED | Browser rendering separate |
| 18 | Job Strategy | No complete workflow evidence | NOT TESTED | Scope unclear |
| 19 | AI Chat | Auth/local streaming/session routes | PARTIALLY VERIFIED | Browser history incomplete |
| 20 | Memory | Redis/Memory helpers | NOT TESTED | Redis unavailable |
| 21 | Learning Roadmaps | Active page and real Gemini route | PARTIALLY VERIFIED | Completion persistence incomplete |
| 22 | Interview Coach | Active page and real Gemini evaluation | PARTIALLY VERIFIED | Browser transcript incomplete |
| 23 | Skill Forge | Projects route and Growth Lab action | PARTIALLY VERIFIED | No standalone page |
| 24 | Research Hub | Backend analyze route; no current standalone page | NOT TESTED | |
| 25 | Experiment Studio | Models/docs but no current reachable workflow | NOT IMPLEMENTED | Historical scope drift |
| 26 | Graduate Hub | Active page/APIs/models | NOT TESTED | Browser CRUD incomplete |
| 27 | Admissions Navigator | Models/services but no current route/page | NOT IMPLEMENTED | Historical scope drift |
| 28 | Study Notes | Notes API/Growth Lab surface | PARTIALLY VERIFIED | No standalone page/full CRUD |
| 29 | AI Workspaces | Active page/API; ownership checks | PARTIALLY VERIFIED | Browser persistence incomplete |
| 30 | Admin Panel | Config-backed API guard | PARTIALLY VERIFIED | Configured-admin browser flow incomplete |
| 31 | Personas | Selector/recommendation persistence | PARTIALLY VERIFIED | Recommendation only, no enforcement |
| 32 | Daily Mission | Dashboard/API tick | PARTIALLY VERIFIED | Full persistence incomplete |
| 33 | Career Health | UI metrics/source fields | NOT TESTED | Derived behavior not fully audited |
| 34 | Career Toolkit | Multiple tools; Company Decoder real Gemini | PARTIALLY VERIFIED | Remaining tools incomplete |

**Current counts:** VERIFIED 1, PARTIALLY VERIFIED 19, DATA-BLOCKED 3, BLOCKED 0, NOT TESTED 9, AI-BLOCKED 0, NOT IMPLEMENTED 2. These are observation classifications, not certification passes.

## 12. Route / Sidebar Matrix

| Hash | Page | Auth/API observation | Persona observation |
|---|---|---|---|
| `#/dashboard` | Dashboard | Guest/auth summary and mission | Recommendation only |
| `#/profile` | Profile | Protected API with guest error | All visible |
| `#/resume` | ResumeAnalyzer | Protected upload/analysis | All visible |
| `#/goals` | Goals | Protected CRUD/tree/AI plan | All visible |
| `#/jobs` | JobFinder | Mixed API; empty data | All visible |
| `#/copilot` | CareerCopilot | Career APIs/AI | All visible |
| `#/interview` | InterviewCoach | Protected AI | All visible |
| `#/roadmaps` | LearningRoadmaps | Protected AI | All visible |
| `#/chat` | ChatCoach | Auth/local streaming | All visible |
| `#/workspaces` | Workspaces | Protected CRUD/chat | All visible |
| `#/gradhub` | GraduateHub | Degree/cert/placement APIs | All visible |
| `#/growthlab` | GrowthLab | SkillForge/research/notes surfaces | All visible |
| `#/toolkit` | CareerToolkit | Multiple AI tools | All visible |
| `#/admin` | AdminPanel | Backend config-backed guard | Sidebar is not role-filtered |

No current App route exists for Admissions, Experiments, standalone Research, standalone Notes, or standalone SkillForge.

## 13. Testing and Deployment

- `pytest --collect-only -q`: invalid as a clean collection result; application requests and Gemini activity occurred, ending with `no tests collected` after interruption. Test collection has side effects.
- `pytest -q`: reaches live Gemini chat and ends in `KeyboardInterrupt` without a pytest summary. No complete pass count is valid.
- `npm run lint`: successful exit with no ESLint errors.
- `npm run build`: successful; Vite 8, 2247 modules, approximately 3.47–3.96 seconds in observed runs.
- `/api/health`: API/database `ok`; Redis unavailable; health probes Ollama only and reports Gemini as fallback.
- Docker Compose: backend, frontend/Nginx, PostgreSQL 15, Redis 7, upload and Chroma volumes.
- Docker backend command runs Alembic then Uvicorn; local direct Uvicorn also runs `create_all()` at import.
- Netlify builds `frontend` with `npm ci && npm run build`, publishes `dist`, and applies SPA redirects/security headers.

## 14. Keep/Fix/Improve/Remove/Replace/Decision Matrix

| Decision | Current implementation | Observation/recommendation | Priority |
|---|---|---|---|
| KEEP | Manual hash routing/Zustand | Matches frozen architecture and works | Low |
| KEEP | Gemini/Ollama gateway abstraction | Real Gemini works; test failure modes | Low |
| KEEP | Ownership filters | Cross-user goal/workspace/session checks observed | Medium |
| FIX | Test collection/full suite | Side effects and interruption prevent reliable gates | P1 |
| FIX | Resume provider failure | Gemini 503 causes controlled but incomplete upload | P2 |
| FIX | AI health semantics | Ollama-only probe mislabels gateway state | P2 |
| FIX | Admin provisioning documentation | Config-backed policy requires deployment username | P1 |
| IMPROVE | Response schemas | Many untyped dictionaries/inconsistent AI parsing | P2 |
| IMPROVE | Persona policy | Currently recommendation-only; decide enforcement | P2 decision |
| IMPROVE | Upload security/storage | No evident content scanning/object storage lifecycle | P2 |
| REMOVE | Dead `/api/upload-file` wrapper | No matching current backend route | P3, after approval |
| REMOVE | Unused axios/OpenAI/Anthropic artifacts | Remove only after dependency/use audit | P3 |
| REPLACE | Dual `create_all()` + Alembic authority | Choose one deployment schema authority | P1 |
| NOT SURE / DECISION | Historical unmounted features/docs | Restore, archive, or formally de-scope | P1 |

## 15. Top Ten Recommended Changes, Not Implemented

1. Isolate deterministic tests from live Gemini smoke tests and remove collection-time side effects.
2. Add explicit admin authorization tests for guest, normal, and configured admin.
3. Decide whether admin identity remains config-backed or becomes a persisted role.
4. Add bounded retry/backoff/circuit-breaker behavior for Gemini 503/rate-limit failures.
5. Make resume provider failures retryable without losing user intent, subject to product decision.
6. Add stable Pydantic response contracts to AI/toolkit/career/workspace APIs.
7. Make health report gateway/provider status rather than only Ollama.
8. Choose Alembic or `create_all()` as schema authority; do not operate both implicitly.
9. Reconcile 14 active tabs with historical 17–19-page V1 documentation.
10. Remove, restore, or formally de-scope dead wrappers and unmounted features.

## 16. Decisions Required

- Is Admin configuration-backed or a database role?
- Are Admissions, Experiments, Research, Study Notes, and standalone SkillForge V1 or deferred?
- Are personas recommendations only or access policy?
- Is an empty jobs board acceptable for V1?
- What Gemini retry/SLA is required during provider 503?
- Should resume files persist before AI analysis?
- Is Redis required or best-effort?
- Is local/Docker volume storage acceptable for production resumes?
- Which checks are release gates when external AI is rate-limited?

**Observation phase complete. No production implementation, refactor, deployment, or bug fix was performed.**