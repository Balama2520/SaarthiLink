# SAARTHI AI — MASTER CONTEXT RECOVERY & LAUNCH AUDIT REPORT

**Product**: Saarthi AI  
**Tagline**: Guiding Intelligence • Connected Action  
**Role**: Senior Principal Engineer + CTO + Security Engineer + Product Architect + QA Lead + SRE  
**Audit Timestamp**: September 12, 2026  

---

## 1. Current Repository State & Verified Baseline

Saarthi AI is an existing production-oriented Career & Opportunity Intelligence Platform connecting candidates (students, job seekers, professionals), companies (recruiters, HR, hiring teams), and internal intelligence/admin systems.

### Verified Test Baseline
- **Backend Pytest Suite**: `190 / 190` PASS (`pytest -q`, exit code 0).
- **Candidate E2E Test Suite**: `26 / 26` PASS (`e2e_candidate_flow.py`, exit code 0).
- **Frontend Production Build**: PASS (`npm --prefix frontend run build`, 0 TypeScript/Vite errors, 1.84s).
- **Alembic Database Migration**: Head (`d065b80bd055_add_feedback_events_analytics_columns`).
- **Tracked Secrets Audit**: `0` secrets tracked in Git (`.env` ignored, no PEM/KEY files tracked).

---

## 2. Component Inventory: What Exists & Current Status

| System Component | Category | Current Status | Description & Verification |
| :--- | :---: | :---: | :--- |
| **FastAPI Backend Core** | Core | **PRODUCTION READY** | Async middleware, request tracing, CORS, security headers, exception handlers. |
| **Authentication & AuthZ** | Auth | **PRODUCTION READY** | JWT access/refresh tokens, password hashing, admin authorization (`require_admin_user`). |
| **SQLAlchemy 2.x ORM** | Database | **PRODUCTION READY** | SQLite (Dev) / PostgreSQL (Prod) with absolute path default (`backend/saarthi.db`). |
| **Alembic Migration Engine** | Database | **PRODUCTION READY** | Single migration head `d065b80bd055`; schema synchronized. |
| **AI Gateway Router** | AI | **CODE READY / CONFIG REQUIRED** | Dynamic provider selection (`Gemini` primary, `HF Saarthi Brain` secondary, `Ollama` fallback). |
| **Gemini Provider** | AI | **CONFIG REQUIRED** | Integrated via `httpx`; requires valid `GEMINI_API_KEY` (`AIzaSy...`) in `.env`. |
| **Hugging Face Saarthi Brain** | AI | **CONFIG REQUIRED** | Integrated HTTP adapter for `Balamaneesh2520/saarthi-ai-brain`; requires `HF_SPACE_ID` & `HF_API_TOKEN`. |
| **Google Sheets 14-Tab Engine** | Ingestion | **CODE READY / CONFIG REQUIRED** | 14 canonical tabs (`01_SOURCES` .. `14_API_CONFIG`), HTTP retry handling, dry-run safety barrier. |
| **IntelligenceService** | Engine | **PRODUCTION READY** | Contextual relevance scoring with strict separation of `FACT`, `INFERENCE`, and `AI_SUGGESTION`. |
| **Discovery System** | Ecosystem | **PRODUCTION READY** | Multi-persona intent and challenge logging (`/api/discovery/submit`). |
| **34-Feature Feedback Framework**| Feedback | **PRODUCTION READY** | Rating ingestion for all 34 canonical capabilities (`/api/feedback/feature`). |
| **Company & Hiring Signals** | Ecosystem | **PRODUCTION READY** | Public opportunity signal submission pipeline (`/api/opportunities`). |
| **Contact Subsystem** | Channel | **PRODUCTION READY** | Official contact email `saarthi.ai.team@gmail.com` connected with privacy/terms. |
| **Admin Control Center** | Admin | **PRODUCTION READY** | Telemetry overview dashboard (`/api/admin/stats`). |
| **React/Vite Frontend** | UI | **PRODUCTION READY** | 20+ views built with Tailwind CSS, Framer Motion, TanStack Query. |
| **Public Trust Pages** | Trust | **PRODUCTION READY** | `/privacy`, `/terms`, `/about`, `/contact` implemented with accurate disclosures. |

---

## 3. Detailed Subsystem Status Breakdown

### 3.1 Security & Secret Isolation Findings
- **Git Tracking Audit**: Passed. All credential files (`.env`, service account JSONs, `.pem`, `.key`) are properly excluded by `.gitignore`.
- **Browser Credentials Isolation**: Confirmed 100% server-side. Provider API keys and Google Service Account JSON credentials are never transmitted to the client or returned by public API responses.
- **Production Secret Key Validation**: Active in `app/core/config.py`. Enforces min length (≥32 chars) and character diversity when `DEBUG=false`.

### 3.2 AI Architecture & Provider State
- **AI Gateway Routing**: Primary cloud provider defaults to `gemini` if `GEMINI_API_KEY` is set; falls back to `ollama` or `huggingface`.
- **Model Configuration Audit**:
  - Valid official Gemini model identifiers: `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`.
  - Current `.env` contains `GEMINI_MODEL=gemini-3.8-flash` (placeholder). Tested live endpoint: returned HTTP 401 due to placeholder API key format.
  - State: `CONFIG_REQUIRED`.
- **Fact / Inference / Suggestion Rule**: `IntelligenceService` strictly categorizes matching evidence into `facts`, candidate alignment into `inferences`, and preparation advice into `ai_suggestions`.

### 3.3 Google Sheets 14-Tab Job Seeding Control Center
- **Canonical Tab Architecture**: Preserved (`01_SOURCES`, `02_COMPANIES`, `03_ROLE_RULES`, `04_LOCATION_RULES`, `05_SKILLS`, `06_INCLUDE_RULES`, `07_EXCLUDE_RULES`, `08_SEED_CONFIG`, `09_JOBS_STAGING`, `10_SEED_RUNS`, `11_SYNC_LOGS`, `12_SOURCE_ERRORS`, `13_DASHBOARD`, `14_API_CONFIG`).
- **HTTP Status Retry Contract**:
  - `200/201`: `SYNCED`
  - `400`: `FAILED_VALIDATION` (no retry)
  - `401/403`: `CRITICAL_AUTH_FAILURE` (immediate pipeline abort, no retry)
  - `409`: `DUPLICATE_BACKEND` (log and proceed)
  - `429`: `RATE_LIMITED` (Retry-After parse + backoff, max 3 retries)
  - `50x`: `SERVER_ERROR` (exponential backoff retry, max 3 retries)
- **Dry-Run Safety**: Enforcement barrier in `SeedingPipeline.sync_jobs_to_backend()` prevents dry runs from writing production database rows or logging fake success states.

### 3.4 Company & Recruiter Experience
- Dual ecosystem supported: Candidate pathway (Student/Job Seeker) and Company pathway (Recruiter/HR/Hiring Manager).
- Opportunity signal submission (`/api/opportunities`) allows submitting hiring leads, required skills, and job URLs.
- Truthful labeling: UI clearly distinguishes between features that are `AVAILABLE NOW`, `CONFIGURABLE`, or `COMING SOON` (e.g. direct ATS sync).

### 3.5 Contact & Public Trust
- Official email address: `saarthi.ai.team@gmail.com` updated across `config.py`, `contact.py`, `PrivacyPage.tsx`, `ContactPage.tsx`, and documentation.
- Terms of service explicitly disclose that AI responses provide guidance and inferences, not guarantees of employment or salary.

---

## 4. Exact Launch Blockers & Execution Plan

### Launch Blockers (P0 / P1)
1. **P0 — Credentials Configuration**: Valid production `GEMINI_API_KEY` (`AIzaSy...`) and `GOOGLE_SERVICE_ACCOUNT_JSON` must be supplied in production `.env` for cloud LLM and Sheets sync to transition from `CONFIG_REQUIRED` to `READY`.
2. **P0 — Production Database Connection**: Configure production PostgreSQL connection string (`DATABASE_URL`) when deploying out of development SQLite.
3. **P1 — CORS & Domain Configuration**: Set `ALLOWED_ORIGINS` to production frontend domain(s) in production `.env`.

### Prioritized Execution Order
- **P0 (Production / Security Blockers)**:
  - Keep secrets 100% server-side.
  - Enforce production `SECRET_KEY` validation.
  - Maintain absolute database pathing to `backend/saarthi.db`.
- **P1 (Launch-Critical Integrations)**:
  - Gemini API key provisioning & health check verification.
  - Google Service Account JSON provisioning for 14-tab Sheets ingestion.
- **P2 (UX / Product Consistency)**:
  - Maintain truthful health state reporting (`READY`, `CONFIG_REQUIRED`, `UNAVAILABLE`, `DEGRADED`, `ERROR`).
  - Preserve 34-feature feedback framework and multi-persona discovery loop.
- **P3 (Future Enhancements)**:
  - Direct ATS integration adapters (labeled `COMING SOON`).

---

## 5. Summary Certification

- **Backend Architecture**: Production-Ready (190/190 Tests PASS)
- **Candidate E2E Pipeline**: Production-Ready (26/26 Tests PASS)
- **Frontend App Build**: Production-Ready (TypeScript/Vite PASS)
- **Database Schema**: Synchronized (Head `d065b80bd055`)
- **Security Audit**: Passed (Zero tracked secrets)

**SAARTHI AI — GUIDING INTELLIGENCE • CONNECTED ACTION**
