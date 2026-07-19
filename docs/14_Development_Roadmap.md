# 14 — Development Roadmap

## Status Legend

| Symbol | Meaning      |
|--------|--------------|
| ✅     | Completed    |
| 🔄     | In Progress  |
| 🔜     | Next Up      |
| 🗓️    | Planned      |
| ❌     | Blocked      |

---

## Phase 1 — Foundation ✅ (Complete)

**Goal**: Working app that compiles, boots, has auth and Goals as a first-class concept.

- [x] FastAPI backend running
- [x] React + TypeScript + Vite frontend running
- [x] JWT Authentication (register, login, token)
- [x] SQLite database with SQLAlchemy models
- [x] Ollama → Gemini AI fallback working
- [x] Basic chat with session persistence
- [x] AI Workspaces (document upload, RAG)
- [x] Goal model added to database
- [x] `/api/goals` CRUD API endpoints
- [x] Goals.tsx page (create, list, progress, delete)
- [x] Dashboard shows active goals widget
- [x] Sidebar rebranded: "Saarthi OS / AI Operating System"
- [x] TypeScript build: zero errors
- [x] All 15 architecture docs created

---

## Phase 2 — Goal Engine 🔜 (Next)

**Goal**: Goals become the central hub. Everything links to a goal.

- [ ] Add `goal_milestones` table + Alembic migration
- [ ] Add `goal_tasks` table + Alembic migration
- [ ] `/api/goals/{id}/milestones` CRUD
- [ ] `/api/goals/{id}/milestones/{mid}/tasks` CRUD
- [ ] AI Plan generation: `POST /api/goals/{id}/plan`
- [ ] GoalDetail.tsx page with milestones and tasks
- [ ] Progress auto-calculation from task completion
- [ ] Link chat sessions to goals (`goal_id` on sessions)
- [ ] Link workspaces to goals (`goal_id` on workspaces)
- [ ] Dashboard: show top 3 active goals with milestones

---

## Phase 3 — Architecture Refactor 🗓️

**Goal**: Clean folder structure. No business logic in routes.

- [ ] Split `models/models.py` into domain model files
- [ ] Create `schemas/` folder for Pydantic schemas
- [ ] Create `repositories/` layer for all DB queries
- [ ] Move Career routes to `/api/career/` namespace
- [ ] Move Career pages to `features/career/`
- [ ] Move Research pages to `features/research/`
- [ ] Move Learning pages to `features/learning/`
- [ ] Replace `api.ts` monolith with feature-scoped API files
- [ ] Add Zustand stores (`auth.store.ts`, `ui.store.ts`, `goals.store.ts`)
- [ ] Remove `PersonaContext.tsx` (replaced by Zustand + goal onboarding)
- [ ] Add React Router v7 (replace `activeTab` string routing)

---

## Phase 4 — AI Gateway 🗓️

**Goal**: All AI calls go through one abstraction. Add provider choice per request.

- [ ] Create `AIProvider` abstract base class
- [ ] Implement `OllamaProvider`
- [ ] Implement `GeminiProvider`
- [ ] Create `AIGateway` router class
- [ ] Create `PromptEngine` for goal-aware prompts
- [ ] Add model selection UI in Chat settings
- [ ] Add cost estimation (token counting)
- [ ] Add response caching for repeated queries (Redis)

---

## Phase 5 — Memory System 🗓️

**Goal**: AI that remembers users and their goals across sessions.

- [ ] Design memory schema (conversation, goal, user profile)
- [ ] Implement `ConversationMemory` service
- [ ] Implement `GoalMemory` service (linked to each goal)
- [ ] Implement `UserProfileMemory` service
- [ ] Inject relevant memory into AI Gateway on every call
- [ ] Memory management UI (view, delete, search memories)
- [ ] Long-term memory via vector embeddings (ChromaDB → Qdrant)

---

## Phase 6 — Agent System 🗓️

**Goal**: Specialized AI agents for different domains.

- [ ] Design `BaseAgent` class with prompt, tools, memory
- [ ] Implement `PlannerAgent` (breaks goals into milestones)
- [ ] Implement `CareerAgent` (resume, interview, jobs)
- [ ] Implement `LearningAgent` (roadmaps, resources)
- [ ] Implement `ResearchAgent` (papers, literature, thesis)
- [ ] Agent selector UI in Chat (user picks the agent)
- [ ] Agent handoff (pass context between agents)

---

## Phase 7 — Automation Engine 🗓️

**Goal**: Background jobs for reminders, habit tracking, and nudges.

- [ ] Add Celery + Redis for background jobs
- [ ] Goal reminder notifications (daily/weekly)
- [ ] Progress check-in prompts (AI-generated nudge)
- [ ] Milestone deadline alerts
- [ ] Daily mission resets at midnight
- [ ] Email notifications (optional, user-controlled)
- [ ] Calendar integration (Google Calendar API)

---

## Phase 8 — Production Infrastructure 🗓️

**Goal**: Move from SQLite to PostgreSQL. Deployable to cloud.

- [ ] Switch DATABASE_URL to PostgreSQL
- [ ] Add Alembic migrations for all tables
- [ ] Add Redis for session cache + rate limiting
- [ ] Switch ChromaDB to Qdrant for vector storage
- [ ] Add Cloudflare R2 for file storage (replace local uploads/)
- [ ] Add rate limiting middleware (per user per endpoint)
- [ ] Add structured logging (JSON format, log levels)
- [ ] Dockerfile + docker-compose for all services
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Environment-based config (.env.local, .env.production)

---

## Phase 9 — Testing 🗓️

**Goal**: Confidence to refactor and ship without breaking things.

- [ ] Unit tests for all service layer methods
- [ ] Integration tests for all API endpoints
- [ ] Frontend component tests (Vitest + React Testing Library)
- [ ] E2E tests (Playwright) for critical user flows:
  - Register → Create Goal → Generate Plan
  - Chat with goal context
  - Upload document → Ask question
- [ ] CI runs all tests on every PR

---

## Non-Negotiable Standards

These apply from day one and never change:

- TypeScript build must be zero-error before any merge
- No business logic in route handlers
- No direct LLM calls outside AI Gateway
- No API keys in frontend code
- All DB schema changes via Alembic (no manual edits)
- Every new feature maps to a Goal in `docs/02_Product_Requirements.md`
