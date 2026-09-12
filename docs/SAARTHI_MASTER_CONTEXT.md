# Saarthi AI — Master Repository Context

**Product**: Saarthi AI  
**Tagline**: Guiding Intelligence • Connected Action  
**Document Purpose**: Machine-Readable Permanent Repository Context & Recovery Reference  
**Generated Date**: September 12, 2026  
**Repository Root**: `c:/Users/91809/OneDrive/Desktop/Saarthi`  

---

## 1. Repository Root

| File/Directory | Purpose | Status |
|---|---|---|
| `backend/` | Python FastAPI backend codebase, alembic migrations, tests, and workers | ACTIVE |
| `frontend/` | React + TypeScript + Vite SPA frontend application | ACTIVE |
| `docs/` | Comprehensive technical architecture, deployment, audit, and launch readiness docs | ACTIVE |
| `README.md` | Primary project overview, core philosophy, and quick-start guide | ACTIVE |
| `docker-compose.yml` | Multi-container Docker compose orchestrator definition | ACTIVE |
| `.env.example` | Template configuration environment variables (zero secrets) | ACTIVE |
| `netlify.toml` | Frontend deployment configuration for Netlify hosting | ACTIVE |
| `.gitignore` | Git exclusions (prevents tracking `.env`, `saarthi.db`, `node_modules`, `.venv`) | ACTIVE |

---

## 2. Backend File Map

| Exact Path | Purpose | Depends On | Used By | Modification Risk |
|---|---|---|---|---|
| `backend/app/main.py` | FastAPI application entrypoint, middleware, health endpoints (`/health`, `/live`, `/ready`) | `config.py`, `database/connection.py`, `api/router.py` | Uvicorn / Gunicorn | HIGH |
| `backend/app/core/config.py` | Central Settings class (Pydantic BaseSettings), env loader, secret validator | `pydantic_settings` | Whole backend | HIGH |
| `backend/app/core/security.py` | Password hashing (bcrypt) and JWT encode/decode functions | `jose`, `passlib`, `config.py` | `auth_service.py`, `auth.py` | HIGH |
| `backend/app/core/dependencies/auth.py` | Auth dependencies (`get_current_user`, `require_authenticated_user`, `require_admin_user`) | `security.py`, `auth_service.py` | API Routers | HIGH |
| `backend/app/database/connection.py` | SQLAlchemy engine creation, session factory (`SessionLocal`), and `Base` ORM declarative class | `config.py`, `sqlalchemy` | Models & Repositories | HIGH |
| `backend/app/models/models.py` | Master ORM schema definitions (User, Job, DiscoveryProfile, Feedback, Contact, Opportunity) | `connection.py` | Whole backend | HIGH |
| `backend/app/ai/gateway.py` | AIGateway router managing model routing and fallback execution | `ai/router.py`, `config.py` | `ai_service.py`, `career_copilot_service.py` | HIGH |
| `backend/app/ai/providers/gemini.py` | Gemini Cloud API provider adapter (HTTP SSE streaming via `httpx`) | `config.py`, `httpx` | `ai/router.py` | MEDIUM |
| `backend/app/ai/providers/huggingface.py` | Hugging Face Saarthi Brain Space provider adapter | `config.py`, `httpx` | `ai/router.py` | MEDIUM |
| `backend/app/ai/providers/ollama.py` | Ollama local model provider adapter | `config.py`, `httpx` | `ai/router.py` | LOW |
| `backend/app/services/intelligence_service.py` | Candidate-Job relevance engine strictly separating FACT, INFERENCE, and AI_SUGGESTION | `models.py` | `api/jobs.py`, `e2e_candidate_flow.py` | HIGH |
| `backend/app/services/sheets_service.py` | 14-Tab Google Sheets Job Seeding Control Center ingestion & sync service | `google-api-python-client`, `config.py` | `api/seeding.py`, `api/admin.py` | HIGH |
| `backend/app/services/discovery_service.py` | Business logic for multi-step career discovery, feedback, contact, and opportunity signals | `discovery_repository.py` | `api/discovery.py`, `api/feedback.py`, `api/contact.py`, `api/opportunities.py` | MEDIUM |
| `backend/app/repositories/discovery_repository.py` | Database persistence for consent, intent, challenges, feature feedback, contact, & signals | `models.py`, `connection.py` | `discovery_service.py` | MEDIUM |
| `backend/alembic/versions/d065b80bd055_add_feedback_events_analytics_columns.py` | Current Alembic database migration head adding analytics columns to feedback events | `alembic` | Alembic engine | HIGH |

---

## 3. Frontend File Map

| Exact Path | Purpose | Depends On | Used By | Modification Risk |
|---|---|---|---|---|
| `frontend/src/main.tsx` | React app mount entrypoint rendering `App` component into DOM root | React, `App.tsx` | `index.html` | HIGH |
| `frontend/src/App.tsx` | Master SPA router defining page routes and layout shell | `react-router-dom`, Page Components | `main.tsx` | HIGH |
| `frontend/src/services/api.ts` | Axios API client instance with Bearer token interceptor and endpoint wrappers | `axios` | Frontend Pages | HIGH |
| `frontend/src/pages/LandingPage.tsx` | Public landing page presenting Saarthi AI value proposition, candidate & company CTAs | `BrandMark.tsx`, UI components | `App.tsx` (`/`) | LOW |
| `frontend/src/pages/DiscoverPage.tsx` | Multi-step career discovery wizard capturing intents, challenges, and feature feedback | `api.ts`, Lucide icons | `App.tsx` (`/discover`) | MEDIUM |
| `frontend/src/pages/JobFinder.tsx` | Search, filter, and view job listings with AI relevance scoring | `api.ts` | `App.tsx` (`/jobs`) | MEDIUM |
| `frontend/src/pages/CareerCopilot.tsx` | Chat interface interacting with Saarthi AI Gateway | `api.ts` | `App.tsx` (`/copilot`) | MEDIUM |
| `frontend/src/pages/AdminPanel.tsx` | Operational telemetry command center displaying user, job, discovery, and provider stats | `api.ts` | `App.tsx` (`/admin`) | MEDIUM |
| `frontend/src/pages/AboutPage.tsx` | Platform mission, architecture description, and leadership information | Static React | `App.tsx` (`/about`) | LOW |
| `frontend/src/pages/ContactPage.tsx` | Official contact form submitting messages to `saarthi.ai.team@gmail.com` | `api.ts` | `App.tsx` (`/contact`) | LOW |
| `frontend/src/pages/PrivacyPage.tsx` | Truthful privacy policy disclosing data collection and AI processing terms | Static React | `App.tsx` (`/privacy`) | LOW |
| `frontend/src/pages/TermsPage.tsx` | Terms of service explicitly stating AI guidance disclaimers | Static React | `App.tsx` (`/terms`) | LOW |

---

## 4. Database & ORM Architecture

- **ORM Engine**: SQLAlchemy 2.x using `declarative_base()` with standard naming conventions.
- **Session Management**: `SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)` in `backend/app/database/connection.py`.
- **Database Path Isolation**: Configured default `DATABASE_URL` in `app/core/config.py` uses `sqlite:///<absolute_path_to_backend>/saarthi.db`.
- **Production Migration Graph**:
  - Alembic configuration: `backend/alembic.ini` and `backend/alembic/env.py`.
  - Migration script directory: `backend/alembic/versions/`.
  - Current Head: `d065b80bd055_add_feedback_events_analytics_columns.py`.
- **Primary Schema Models** (`backend/app/models/models.py`):
  - `User`, `UserDiscoveryProfile`, `UserIntent`, `CareerChallenge`, `FeatureFeedback`, `ProductFeedback`, `OpportunitySignal`, `CompanyProfile`, `ContactRequest`, `FeedbackEvent`, `Job`, `Goal`, `Project`, `ChatSession`, `ChatMessage`.

---

## 5. API Router Map

| Router File | Prefix | Important Endpoints | Auth Required | Purpose |
|---|---|---|---|---|
| `backend/app/api/auth.py` | `/api/auth` | `/register`, `/login`, `/refresh`, `/me` | Public / Token | Authentication & User Token management |
| `backend/app/api/jobs.py` | `/api/jobs` | `GET /`, `GET /search`, `GET /recommended`, `POST /save` | Optional / Required | Job search, filtering, and personalized recommendations |
| `backend/app/api/discovery.py` | `/api/discovery` | `GET /options`, `POST /submit` | Public | Multi-step persona intent logging & problem discovery |
| `backend/app/api/feedback.py` | `/api/feedback` | `GET /features`, `POST /feature`, `POST /product` | Public | Ingestion of 34-feature usefulness ratings & product feedback |
| `backend/app/api/opportunities.py` | `/api/opportunities` | `POST /` | Public | Public job opportunity signal submission pipeline |
| `backend/app/api/contact.py` | `/api/contact` | `POST /`, `GET /info` | Public | Inbound user contact requests to `saarthi.ai.team@gmail.com` |
| `backend/app/api/admin.py` | `/api/admin` | `GET /stats` | Admin Required | Internal telemetry, job metrics, and provider health dashboard |
| `backend/app/api/seeding.py` | `/api/seeding` | `POST /run`, `GET /status` | Admin Required | Google Sheets 14-tab Job Seeding manual trigger & status |
| `backend/app/api/goals.py` | `/api/goals` | `GET /`, `POST /` | Required | Candidate goal setting and step decomposition |
| `backend/app/api/profile.py` | `/api/profile` | `GET /`, `PATCH /`, `GET /completeness` | Required | Candidate profile management & completeness scoring |

---

## 6. Service Layer Map

| Service | Exact File | Entry Points | Dependencies | Status |
|---|---|---|---|---|
| **IntelligenceService** | `backend/app/services/intelligence_service.py` | `analyze_job_relevance()` | None (pure logic) | **PRODUCTION READY** |
| **AIGateway** | `backend/app/ai/gateway.py` | `generate_response_stream()` | `AIRouter`, `config.py` | **CODE READY / CONFIG REQUIRED** |
| **GeminiProvider** | `backend/app/ai/providers/gemini.py` | `generate_stream()` | `httpx`, `config.py` | **CONFIG REQUIRED** |
| **HuggingFaceSaarthiBrain** | `backend/app/ai/providers/huggingface.py` | `health_check()`, `generate()` | `httpx`, `config.py` | **CONFIG REQUIRED** |
| **GoogleSheetsService** | `backend/app/services/sheets_service.py` | `status()`, `run_seeding_pipeline()` | `google-api-python-client` | **CONFIG REQUIRED** |
| **DiscoveryService** | `backend/app/services/discovery_service.py` | `submit_discovery_flow()`, `submit_contact_request()` | `DiscoveryRepository` | **PRODUCTION READY** |
| **AuthService** | `backend/app/services/auth_service.py` | `authenticate_user()`, `create_user()` | `UserRepository`, `security.py` | **PRODUCTION READY** |
| **JobsService** | `backend/app/services/jobs_service.py` | `list_jobs()`, `get_recommended_jobs()` | `JobsRepository` | **PRODUCTION READY** |

---

## 7. AI Architecture

$$\text{Client} \longrightarrow \text{FastAPI Backend} \longrightarrow \text{AIGateway} \longrightarrow \begin{cases} \text{Gemini (Cloud Primary)} \\ \text{Hugging Face Saarthi Brain (Cloud Secondary)} \\ \text{Ollama (Local Fallback)} \end{cases}$$

- **Fact / Inference / Suggestion Boundary**: Implemented in `IntelligenceService.analyze_job_relevance()`.
  - `FACT`: Direct string comparison between job requirements and user profile skills.
  - `INFERENCE`: Mathematical match percentage and skill gap determination.
  - `AI_SUGGESTION`: Actionable learning advice.
- **Provider Files**:
  - Provider Router: `backend/app/ai/router.py`
  - Gemini Adapter: `backend/app/ai/providers/gemini.py`
  - Hugging Face Adapter: `backend/app/ai/providers/huggingface.py`
  - Ollama Adapter: `backend/app/ai/providers/ollama.py`

---

## 8. Google Sheets 14-Tab System

Canonical 14 Tabs defined in `backend/app/services/sheets_service.py`:
`01_SOURCES`, `02_COMPANIES`, `03_ROLE_RULES`, `04_LOCATION_RULES`, `05_SKILLS`, `06_INCLUDE_RULES`, `07_EXCLUDE_RULES`, `08_SEED_CONFIG`, `09_JOBS_STAGING`, `10_SEED_RUNS`, `11_SYNC_LOGS`, `12_SOURCE_ERRORS`, `13_DASHBOARD`, `14_API_CONFIG`.

### HTTP Status Code Handling & Retry Protocol
- `200 / 201`: `SYNCED`
- `400`: `FAILED_VALIDATION` (no retry)
- `401 / 403`: `CRITICAL_AUTH_FAILURE` (immediate abort, no retry)
- `409`: `DUPLICATE_BACKEND` (continue batch)
- `429`: `RATE_LIMITED` (Retry-After parse, exponential backoff, max 3 retries)
- `50x`: `SERVER_ERROR` (exponential backoff retry, max 3 attempts)
- **Dry-Run Safety**: Barrier in `SeedingPipeline.sync_jobs_to_backend()` prevents dry-run executions from writing production database rows.

---

## 9. Authentication & Authorization

- **Canonical Security Implementation**: `backend/app/core/security.py` (Bcrypt password hashing & HS256 JWT tokens).
- **Dependencies**: `backend/app/core/dependencies/auth.py`
  - `get_current_user`: Returns authenticated `User` or `GuestUser` fallback.
  - `require_authenticated_user`: Enforces valid JWT token (raises 401 if unauthenticated).
  - `require_admin_user`: Checks username against `ADMIN_USERNAMES` configuration (raises 403 if unauthorized).

---

## 10. Security Implementation

- **CORS Middleware**: `backend/app/main.py` using `settings.ALLOWED_ORIGINS`.
- **Security Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`, HSTS in production.
- **Request Tracing**: Middleware assigning `X-Request-ID` UUID header to every incoming HTTP request.
- **Secret Validation**: `validate_secret_key` in `backend/app/core/config.py` enforces key length (≥32 chars) and character diversity when `DEBUG=false`.

---

## 11. Frontend Route Map

| Route | Component | Exact File | Auth Required | Purpose |
|---|---|---|---|---|
| `/` | `LandingPage` | `frontend/src/pages/LandingPage.tsx` | No | Public landing page presenting platform value & CTAs |
| `/discover` | `DiscoverPage` | `frontend/src/pages/DiscoverPage.tsx` | No | Multi-step persona discovery & feature feedback wizard |
| `/jobs` | `JobFinder` | `frontend/src/pages/JobFinder.tsx` | No | Job search, filtering, and AI relevance scoring view |
| `/copilot` | `CareerCopilot` | `frontend/src/pages/CareerCopilot.tsx` | No | AI Career Copilot chat assistant |
| `/admin` | `AdminPanel` | `frontend/src/pages/AdminPanel.tsx` | Yes (Admin) | Operational telemetry command center |
| `/about` | `AboutPage` | `frontend/src/pages/AboutPage.tsx` | No | Platform overview & technical architecture description |
| `/contact` | `ContactPage` | `frontend/src/pages/ContactPage.tsx` | No | Contact request form sending to `saarthi.ai.team@gmail.com` |
| `/privacy` | `PrivacyPage` | `frontend/src/pages/PrivacyPage.tsx` | No | Data handling and privacy policy disclosures |
| `/terms` | `TermsPage` | `frontend/src/pages/TermsPage.tsx` | No | Platform terms of service and AI guidance disclaimers |
| `/auth` | `AuthPage` | `frontend/src/pages/AuthPage.tsx` | No | User login and registration form |
| `/profile` | `Profile` | `frontend/src/pages/Profile.tsx` | Yes | Candidate profile management & resume upload |

---

## 12. Environment Configuration Matrix

| Variable | Used By | Required? | Environment | Secret? | Purpose |
|---|---|---|---|---|---|
| `DEBUG` | `config.py` | Yes | Dev/Prod | No | Enables debug logging & dev security relaxations |
| `SECRET_KEY` | `security.py` | Yes | Dev/Prod | **YES** | Signing key for JWT bearer tokens |
| `DATABASE_URL` | `connection.py` | Yes | Dev/Prod | **YES** | Database connection string (`sqlite` or `postgresql`) |
| `ALLOWED_ORIGINS` | `main.py` | Yes | Dev/Prod | No | Comma-separated list of authorized CORS origins |
| `GEMINI_API_KEY` | `providers/gemini.py` | Optional | Dev/Prod | **YES** | Google Gemini API key (`AIzaSy...`) |
| `GEMINI_MODEL` | `providers/gemini.py` | Optional | Dev/Prod | No | Gemini model identifier (`gemini-2.5-flash`) |
| `HF_SPACE_ID` | `providers/huggingface.py` | Optional | Dev/Prod | No | Hugging Face space identifier (`Owner/Space`) |
| `HF_API_TOKEN` | `providers/huggingface.py` | Optional | Dev/Prod | **YES** | Hugging Face API token for private spaces |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | `sheets_service.py` | Optional | Dev/Prod | No | 14-tab Job Control Center spreadsheet ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `sheets_service.py` | Optional | Dev/Prod | **YES** | Google Cloud service account key JSON |
| `SAARTHI_CONTACT_EMAIL` | `config.py` | Yes | Dev/Prod | No | Target contact email (`saarthi.ai.team@gmail.com`) |

---

## 13. Canonical Ownership Map

| Subsystem | Canonical Implementation File | Status |
|---|---|---|
| **Authentication** | `backend/app/core/security.py` | **CANONICAL** |
| **Authorization** | `backend/app/core/dependencies/auth.py` | **CANONICAL** |
| **Database Connection** | `backend/app/database/connection.py` | **CANONICAL** |
| **ORM Models** | `backend/app/models/models.py` | **CANONICAL** |
| **Alembic Migrations** | `backend/alembic/versions/d065b80bd055_add_feedback_events_analytics_columns.py` | **CANONICAL** |
| **AI Gateway** | `backend/app/ai/gateway.py` | **CANONICAL** |
| **Gemini Provider** | `backend/app/ai/providers/gemini.py` | **CANONICAL** |
| **Hugging Face Provider** | `backend/app/ai/providers/huggingface.py` | **CANONICAL** |
| **Google Sheets Engine** | `backend/app/services/sheets_service.py` | **CANONICAL** |
| **Intelligence Engine** | `backend/app/services/intelligence_service.py` | **CANONICAL** |
| **Discovery Subsystem** | `backend/app/services/discovery_service.py` | **CANONICAL** |
| **Frontend Router** | `frontend/src/App.tsx` | **CANONICAL** |
| **Frontend API Client** | `frontend/src/services/api.ts` | **CANONICAL** |

---

## 14. Critical Files Risk Classification

### DO NOT MODIFY CASUALLY (HIGH RISK)
- `backend/app/main.py`: App routing, middleware, CORS, and health endpoints.
- `backend/app/core/config.py`: Central Pydantic settings & validation.
- `backend/app/core/security.py`: Password hashing & JWT logic.
- `backend/app/models/models.py`: Database schema definitions.
- `backend/app/database/connection.py`: DB engine & session management.

### SAFE / LOW RISK
- `docs/*.md`: Documentation files.
- `frontend/src/pages/AboutPage.tsx`: Static presentation component.
- `frontend/src/pages/PrivacyPage.tsx`: Static privacy terms component.

---

## 15. Verification Commands

- **Backend Pytest Suite**: `.\.venv\Scripts\python.exe -m pytest -q` (Target: `190 / 190` PASS)
- **Candidate E2E Flow**: `.\.venv\Scripts\python.exe backend/e2e_candidate_flow.py` (Target: `26 / 26` PASS)
- **Frontend Build**: `npm --prefix frontend run build` (Target: `0` build errors)
- **Alembic Head Verification**: `.\.venv\Scripts\python.exe -m alembic current` (Target: `d065b80bd055 (head)`)
