# SAARTHI AI — CONTEXT RECOVERY PROCEDURE

**Product**: Saarthi AI — Guiding Intelligence • Connected Action  
**Target Audience**: AI Agents, Engineers, CTOs, and Maintenance Sessions  

---

## 1. Quick Context Recovery (Read Order)

If context is lost or a new development session begins, **READ THESE FILES IN EXACT ORDER BEFORE MAKING ANY CODE CHANGES**:

1. [docs/SAARTHI_MASTER_CONTEXT.md](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/docs/SAARTHI_MASTER_CONTEXT.md) — Master file map, subsystem ownership, security rules, and router table.
2. [docs/SAARTHI_FILE_INDEX.json](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/docs/SAARTHI_FILE_INDEX.json) — Machine-readable file index for automated tooling.
3. [docs/FINAL_PRODUCTION_AUDIT.md](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/docs/FINAL_PRODUCTION_AUDIT.md) — Verification baseline and sub-system security audit.
4. [docs/FINAL_LAUNCH_READINESS.md](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/docs/FINAL_LAUNCH_READINESS.md) — Launch readiness certification and subsystem status matrix.
5. [docs/ARCHITECTURE.md](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/docs/ARCHITECTURE.md) — High-level architecture and AI Gateway routing diagrams.
6. [docs/DEPLOYMENT.md](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/docs/DEPLOYMENT.md) — 13-step production launch runbook.
7. [README.md](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/README.md) — Project overview and tagline.

---

## 2. Canonical File Finder Guide

| Subsystem / Concern | Canonical File Path | Entrypoint / Function |
|---|---|---|
| **Backend Main App Entrypoint** | `backend/app/main.py` | `app` (FastAPI instance), `/health` |
| **Frontend SPA Router** | `frontend/src/App.tsx` | `App()` (React component) |
| **Frontend API Client** | `frontend/src/services/api.ts` | Axios instance with auth interceptor |
| **Database Connection & Base** | `backend/app/database/connection.py` | `SessionLocal`, `Base` |
| **ORM Schemas / Models** | `backend/app/models/models.py` | `User`, `Job`, `FeatureFeedback`, etc. |
| **Alembic Migration Head** | `backend/alembic/versions/d065b80bd055_add_feedback_events_analytics_columns.py` | Migration revision `d065b80bd055` |
| **AI Gateway & Provider Router** | `backend/app/ai/gateway.py` | `AIGateway.generate_response_stream()` |
| **Intelligence Relevance Engine** | `backend/app/services/intelligence_service.py` | `IntelligenceService.analyze_job_relevance()` |
| **14-Tab Google Sheets Seeding** | `backend/app/services/sheets_service.py` | `GoogleSheetsService.status()` |
| **Discovery & Contact Service** | `backend/app/services/discovery_service.py` | `DiscoveryService.submit_discovery_flow()` |
| **Authentication & JWT** | `backend/app/core/security.py` | `create_access_token()`, `verify_password()` |

---

## 3. Engineering Safety Directives

- **Rule 1**: NEVER modify code before checking the canonical file map.
- **Rule 2**: NEVER delete existing features or replace working architecture.
- **Rule 3**: NEVER print, expose, or log secret values (`GEMINI_API_KEY`, `SECRET_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`).
- **Rule 4**: ALWAYS run verification test commands after making any file modification:
  - Backend: `.\.venv\Scripts\python.exe -m pytest -q`
  - E2E Candidate Flow: `.\.venv\Scripts\python.exe backend/e2e_candidate_flow.py`
  - Frontend Build: `npm --prefix frontend run build`
