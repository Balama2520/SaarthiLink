# Saarthi V1 — Production Architecture

> **Target state (Phase 6):** Always-on, laptop-independent, multi-tenant single-instance deployment. No architectural redesign — the frozen React/Vite + FastAPI stack is preserved and wired to the mandated providers.
>
> **Chosen deployment targets (this audit session, operator input):**
> - Backend always-on host: **Render** (Dockerfile autodetect, Always ON paid instance)
> - Backend public URL: Render auto-assigned `https://<RENDER_SERVICE_NAME>.onrender.com` (platform subdomain, no custom domain purchased yet)
> - Frontend public URL: Netlify auto-assigned `https://<NETLIFY_SITE_NAME>.netlify.app` (platform subdomain, no custom domain purchased yet)
> - Admin whitelist (ADMIN_USERNAMES): `saarthiadmin` (exact username; must match the registered user's exact handle in-app)
> - Supabase: **Created from scratch in Phase 1 of runbook** (not assumed pre-existing)
> - Cloudflare: Deferred until a custom production domain is purchased (Phase 8 boundary)

---

## 1. Topology Diagram (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ OPTIONAL (deferred until domain purchase):  CLOUDFLARE DNS ZONE                              │
│   <future-domain>.com          CNAME     →  <SITE>.netlify.app   (Netlify frontend)          │
│   api.<future-domain>.com      CNAME     →  <SVC>.onrender.com   (Render backend)            │
│   SSL: Always Use HTTPS / HSTS max-age=31536000 / TLS 1.2+ min                               │
└───────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                                │
                                                │ (Until domain purchase, users hit platform URLs directly)
                                                ▼
                      ┌─────────────────────────────────────────────────────────────────┐
                      │  PLATFORM-PROVIDED PUBLIC URLs (used immediately in Phase 8)    │
                      │                                                                  │
                      │  FRONTEND:  https://<NETLIFY_SITE>.netlify.app                  │
                      │  BACKEND:   https://<RENDER_SVC>.onrender.com                    │
                      └────────────┬──────────────────────────────────┬───────────────────┘
                                   │ HTTPS                          │ HTTPS
          ┌────────────────────────▼──────────────┐          ┌──────▼────────────────────────────────────────────┐
          │   NETLIFY (FRONTEND CDN)              │          │   RENDER (BACKEND, always-on Docker)            │
          │                                        │          │                                                  │
          │  Build command:  cd frontend &&        │          │  Dockerfile at backend/Dockerfile                │
          │                  npm run build         │          │  uvicorn workers=2, 0.0.0.0, PORT from Render   │
          │  Publish:  frontend/dist/              │◄────────►│  Health: GET /api/health                        │
          │  SPA redirect  /* → /index.html 200    │  CORS    │  Lifespan: OutboxWorker, Cache init             │
          │  Env: VITE_API_BASE_URL=               │ only     │  Env: ALLOWED_ORIGINS=<netlify-url>            │
          │      https://<RENDER_SVC>.onrender.com │ allowed  │       ADMIN_USERNAMES=saarthiadmin              │
          └────────────────────────────────────────┘          └────────┬─────────────┬────────────┬──────────────┘
                                                                       │ DB access    │ Storage    │ Cache opt.
                                                                       ▼              ▼            ▼
                                                     ┌───────────────────────────────────────────────────────┐
                                                     │            SUPABASE PROJECT (new in Phase 1)            │
                                                     │                                                       │
                                                     │  ┌──────────────────────┐ ┌────────────────────────┐ │
                                                     │  │ PostgreSQL 15+       │ │ Storage Bucket         │ │
                                                     │  │ pooler port 6543     │ │ Name: resumes          │ │
                                                     │  │ Alembic-managed      │ │ ACL: Private (NOT pub)│ │
                                                     │  │ schema: 40+ tables   │ │ Object: user-<id>/    │ │
                                                     │  │                       │ │   <resume_id>.<ext>   │ │
                                                     │  └──────────────────────┘ └────────────────────────┘ │
                                                     └───────────────────────────────────────────────────────┘
                                                                              │
                                                                              ▼
                                                          ┌───────────────────────────────────────┐
                                                          │  GOOGLE GEMINI API (backend-only)     │
                                                          │  Key in env:  GEMINI_API_KEY          │
                                                          │  Default model:  gemini-2.5-flash      │
                                                          │  Retry: 3 × 1.5^backoff, 45s timeout  │
                                                          │  NEVER forwarded to browser           │
                                                          └───────────────────────────────────────┘
```
          │  Build command:         │                          │   Dockerfile → uvicorn workers        │
          │   cd frontend &&        │   HTTPS only             │   Health:  GET /api/health            │
          │   npm run build         │◄────────────────────────►│   API prefix:  /api/*                  │
          │  Publish: dist/         │   ALLOWED_ORIGINS:       │   Workers: OutboxWorker (5s poll)     │
          │  SPA redirect: 200 /*   │   saarthi.example.com    │   Workers: MemoryWorker (asyncio)       │
          │  Env: VITE_API_BASE_URL │                          │   Env: see backend/.env.example        │
          └───────────┬─────────────┘                          └───────┬──────────────┬─────────────────┘
                      │                                               │              │
                      │                               Supabase PG   │              │  Upstash Redis
                      │                               (port 6543    │              │  (rediss://, TLS)
                      │                                pooling,     │              │  OPTIONAL — never
                      │                                Supabase     │              │  crashes core;
                      │                                Storage)     │              │  degrades to DB
                      │                                  │          │              │  fallback in
                      │                                  │          │              │  memory engine
                      │                                  │          │              │
                      ▼                                  ▼          ▼              ▼
                 ┌─────────────────────────────────────────────────────────────────────────────┐
                 │                           SUPABASE (DATA PLANE)                              │
                 │                                                                             │
                 │  ┌────────────────────────┐  ┌──────────────────────────┐  ┌─────────────┐ │
                 │  │  PostgreSQL (port 5432 │  │  Supabase Storage        │  │  (Edge Nodes │ │
                 │  │  via pooler 6543)      │  │  S3-compatible bucket    │  │   are there  │ │
                 │  │                         │  │  name: resumes           │  │   for CDN)   │ │
                 │  │  Schema owned by       │  │  ACL: private; read via  │  └─────────────┘ │
                 │  │   `postgres` user       │  │   service_role signed URL│                  │
                 │  │  Alembic migration      │  │  Path pattern:           │                  │
                 │  │  versioning: head       │  │   resumes/user-<uid>/    │                  │
                 │  │                         │  │     <resume_id>.<ext>    │                  │
                 │  │  Tables (40+): users,   │  │  Reference stored in DB │                  │
                 │  │   refresh_tokens,       │  │   as opaque URI:         │                  │
                 │  │   resumes, goals,       │  │   supabase://resumes/    │                  │
                 │  │   chat_sessions,        │  │   <object_key>           │                  │
                 │  │   user_profiles, jobs,  │  │                          │                  │
                 │  │   companies, user_skills│  │  Temporary in-memory     │                  │
                 │  │   saved_jobs, workspaces│  │  processing ONLY —       │                  │
                 │  │   learning_roadmaps, …  │  │  zero writes to backend/ │                  │
                 │  │                         │  │  uploads/ (compliant)    │                  │
                 │  │  RLS (optional future)  │  │                          │                  │
                 │  └────────────────────────┘  └──────────────────────────┘                  │
                 └─────────────────────────────────────────────────────────────────────────────┘
                                                                  │
                                                                  │
                                                      ┌───────────▼──────────────┐
                                                      │   GOOGLE GEMINI API       │
                                                      │   (backend AI GATEWAY only)│
                                                      │                            │
                                                      │  • Key: GEMINI_API_KEY env │
                                                      │  • NEVER sent to browser   │
                                                      │  • Timeout: 45s per req     │
                                                      │  • Retries: 3, exp backoff │
                                                      │     on 429/500/502/503 +    │
                                                      │     network errors         │
                                                      │  • Model: gemini-2.5-flash  │
                                                      │    (config / .env override)│
                                                      │  • Fallback: Ollama (local)│
                                                      │    when key missing        │
                                                      └──────────────────────────┘
```

---

## 2. Layer-by-layer Responsibilities

### 2.1 Client Tier (Browser)
- React 18 SPA, bundled by Vite, served from Netlify CDN edge caches.
- State management: Zustand `useAppStore` (persists JWT access token + refresh token via `lib/auth.ts` storage strategy).
- Fetch layer: `src/services/api.ts` — single source of truth, owns Bearer header, wraps the single-flight refresh promise, uses `originalFetch` (no recursion) for logout.
- **Rule compliance (Gemini key server-side)**: Frontend has zero code paths touching Google APIs directly. ✅

### 2.2 Edge / CDN Tier (Cloudflare + Netlify)
- **Cloudflare** owns the DNS zone for the public production domain:
  - `saarthi.example.com`  →  CNAME  →  site-id.netlify.app
  - `api.saarthi.example.com`  →  A/CNAME  →  backend host IP / hostname
  - Rules: Always Use HTTPS, Automatic HTTPS Rewrites, HSTS `max-age=31536000; includeSubDomains` (backend also emits STS header at main.py:108–109 for double enforcement).
  - SSL/TLS encryption mode: **Full** → promote to **Strict** once origin certs are confirmed to be real/non-expiring (Cloudflare rules).
- **Netlify** runs the Vite build at `frontend/package.json` deploy hooks and statically hosts `frontend/dist/*`; SPA fallback `/*  →  /index.html 200`; environment variable `VITE_API_BASE_URL` is set in Netlify site settings only (never in repo).

### 2.3 Application Tier (Backend — uvicorn/FastAPI)
Source: [main.py](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/backend/app/main.py), Dockerfile: [backend/Dockerfile](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/backend/Dockerfile)

- **Container**: single-process uvicorn `backend.app.main:app --host 0.0.0.0 --port 8000 --workers 2` — scale workers proportionally to host CPU.
- **Lifespan**: connects Redis (optional — failure sets `cache.redis_client = None`), spawns the async OutboxWorker `OutboxWorker(db_factory, poll_interval=5.0)`.
- **Middleware stack (top to bottom, request flows DOWN, response UP)**:
  1. Request Tracing (request_id UUID + structured JSON log with X-Request-ID response header).
  2. Rate Limiter (token bucket per client IP, keyed from x-forwarded-for → 429 when drained).
  3. Security Headers (nosniff, DENY frame, XSS-Protection, Referrer strict-origin-when-cross-origin, HSTS in prod).
  4. CORSMiddleware (ADDED ONLY when ALLOWED_ORIGINS parses to ≥1 non-empty origin — otherwise skipped; never `*`).
- **API router prefix**: settings.API_PREFIX (default `/api`). Health router at `/api/health`.
- **Workers (always-on)**:
  - `OutboxWorker` — polls event_outbox table every 5 s; rows with status=pending are handed to registered handlers, marked processed/failed (5 unit tests pass, no-op when empty).
  - `MemoryWorker` (optional) — scheduled periodic summarisation of chat sessions → Memory rows; runs even when Redis is None (uses DB).
- **AI Gateway abstraction**: `app/ai/gateway.py` → providers (Gemini primary, Ollama fallback) with retry.py (3 retries exp 1.5^backoff, jitter 429/500/502/503 + network errors) + 45 s per-request timeout. Falls back gracefully when no providers are reachable.

### 2.4 Data Tier (Supabase)
- **PostgreSQL (Supabase managed)**: Sole source of truth for all relational data. DATABASE_URL in env points to Supabase Postgres pooler (port 6543 for transaction pooling, 5432 for session). Alembic owns schema evolution; Supabase UI SQL console MUST NOT be used for hand-written ALTERs in production (use migrations only).
- **Storage (Supabase managed, bucket `resumes`)**:
  - ACL: private bucket (not public-rendering). Signed URLs issued server-side for downloads when a user requests their own resume blob.
  - Key pattern: `resumes/user-{user_id}/{resume_id}.{pdf|docx|txt}` — consistent, easy to lifecycle-manage.
  - Reference stored in `Resume.file_path`: opaque URI `supabase://resumes/{object_key}` so the DB is never tied to a single CDN hostname.
  - Upload flow: resume_pipeline validates → extracts raw_text ≤ 6000 chars → DB INSERT with pending status → storage_service uploads the file bytes in try/except; any storage error LOGS WARNING and leaves the Resume row recoverable (user can retry from UI).
- **Temporary file storage on backend**: FORBIDDEN per NFR-Data-Storage. `storage_service.upload_resume()` accepts `bytes: BytesIO` directly from the FastAPI `UploadFile.file` read; never calls `shutil.copy(..., backend/uploads/)`. (Historical `backend/uploads/` directory from dev is documented in the runbook as DO-NOT-USE and will be deleted in a cleanup PR.)

### 2.5 Cache Tier (Upstash Redis — strictly optional)
- When env `REDIS_URL` is set: cache layer connects for short-lived cache entries (session hot paths, rate-limit buckets, LRU-style working memory rows).
- When env `REDIS_URL` is wrong/blank or Upstash is down:
  - `cache.connect()` sets `cache.redis_client = None` (no crash — verified in 2 tests).
  - `/api/health` reports `redis.status ∈ {unavailable, error}` but overall status still 200 (degraded if not DEBUG).
  - All persistence paths fall back to direct DB access. Core application never fails.
- **Rule compliance (Redis optional)**: Verified in test_security.py TestRedisUnavailable — 2/2 PASS. ✅

### 2.6 AI Tier (Gemini via backend AI Gateway)
- `GEMINI_API_KEY` is read by Pydantic Settings (config.py:86) from backend process env; never logged in full (structured JSON logger masks value); never serialized in any Pydantic response schema.
- Model default: `gemini-2.5-flash` unified between config.py:88, gemini.py:39 fallback, .env.example:21 (previously inconsistent 3.6-flash → fixed in Phase 2 Task 4).
- Request shaping: 45s per-call httpx timeout; 3 retries with exponential backoff (1.5^attempt) for 429, 500, 502, 503 and socket errors; jitter added; circuit-breaker pattern implemented in ai/retry.py.
- Graceful degradation: any resume upload where AI fails → sets parsing_status="failed" on the existing Resume row (row was persisted FIRST, before analysis per AC-9:72); HTTP response is 200 with `parsing_status=failed` populated (no 500) — user may retry.

---

## 3. Authentication & Authorization Flows

### 3.1 End-user Login (happy path)
```
Browser                               Backend                              Supabase PG
  │  POST /api/auth/register            │                                      │
  │  {username, password, full_name,    │ bcrypt.hash(pwd) → INSERT users row  │
  │   persona, email}                   │─────────────────────────────────────►│
  │◄────────201 {access_token, user,    │◄──────────────────────────────────────│
  │          refresh_token, expires}    │ SELECT users WHERE ...               │
  │                                      │                                      │
  │ GET /api/profile/me                  │ require_authenticated_user → verify │
  │ Authorization: Bearer <access>      │ JWT signature (HS256, SECRET_KEY)   │
  │                                      │ SELECT user_profiles WHERE         │
  │                                      │ user_id = sub                       │
  │◄────────200 JSON profile────────────│─────────────────────────────────────►│
  │                                      │                                      │
```

- `access_token` = short-lived JWT (HS256, SECRET_KEY signed) — 30 min default.
- `refresh_token` = opaque 32-byte URL-safe token stored in `refresh_tokens` table with user_id FK + 30-day expiry. Backend rotates the access token on `/auth/refresh` while REUSING (not regenerating) the stored refresh token. Frontend api.ts runs single-flight refresh when any call returns 401 — re-queues the original failed call transparently.

### 3.2 Logout (server-side invalidation per AC-6)
```
Browser                               Backend                              Supabase PG
  │  api.logout(refreshToken)            │                                      │
  │  POST /api/auth/logout               │ DELETE refresh_tokens WHERE        │
  │  { refresh_token: "…" }              │   token = provided_value            │
  │  (uses originalFetch, non-recursive) │─────────────────────────────────────►│
  │◄────200 ok (even if token unknown)   │◄────────DELETE returns any rc───────│
  │  Then client clearAuth() always.     │                                      │
  │  access/refresh tokens wiped from    │                                      │
  │  localStorage or sessionStorage.     │                                      │
```

Verified: 2 tests in TestLogoutInvalidation cover both success and nonexistent-token cases. ✅

### 3.3 Admin Gate (AC-8 matrix)
- Backend dependency `require_admin_user` → reads settings.ADMIN_USERNAMES (comma-separated env) → compares to current_user.username.
- Enforced on `api/admin.py` `/stats` router.
- Evidence: 3/3 tests pass — guest 401, non-admin 403, admin whitelist 200. ✅

### 3.4 Resource ownership — IDOR defense (AC-7)
Pattern across **all 14 resource-owning API modules** (Task 6 audit, Score 2):
```python
@router.get("/resume/{resume_id}")
def get_one(
    resume_id: str,
    current_user: User = Depends(require_authenticated_user),
    repo: ResumeRepository = Depends(get_resume_repo),
):
    resume = repo.query(
        Resume.id == resume_id,
        Resume.user_id == current_user.id   # ← ALWAYS scoped
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Not found")  # ← 404 (not 403) prevents existence leaks
    return resume
```

Always returns **404** on cross-user attempts (not 403) — avoids leaking that another user's resource exists. Verified with 3 UserIsolation tests (resume, goal, session message). ✅

---

## 4. Backend Environment Variables (source of truth)

Source: [backend/.env.example](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/backend/.env.example)
All secrets are loaded via Pydantic Settings; `.env` files NEVER committed (`.gitignore` already covers `**/.env`, `**/.env.local`).

| Variable | Required? | Purpose | Production value |
|---|---|---|---|
| `DEBUG` | Yes | "False" in production; triggers SECRET_KEY validation + HSTS header | False |
| `SECRET_KEY` | YES (hard-fail if missing in DEBUG=False) | JWT HS256 signing key — ≥ 64 chars, generated once | (provided by operator) |
| `APP_NAME`, `VERSION` | No | Displayed in `/api/health` and OpenAPI | Saarthi AI |
| `API_PREFIX` | No | Leading slash prefix for all routers | `/api` |
| `ALLOWED_ORIGINS` | YES (multi-tenant production) | Comma-separated frontend URLs used by CORSMiddleware | `https://saarthi.example.com` |
| `RATE_LIMIT_ENABLED` | No | Toggle per-IP token bucket in request_tracing_middleware | True |
| `DATABASE_URL` | YES | Supabase Postgres pooler URL with `psycopg` driver, port 6543 | (Supabase dashboard) |
| `REDIS_URL` | No | Upstash `rediss://user:pass@host:port` — missing = degrade gracefully | (Upstash dashboard / empty) |
| `SUPABASE_URL` | YES (storage) | `https://<project-ref>.supabase.co` | (Supabase → Project Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | YES (storage) | Service-role key (NOT anon key, needs bucket write) | (Supabase → Project Settings → API) |
| `STORAGE_BUCKET` | No | Bucket name for resume files | `resumes` (default, match bucket creation) |
| `GEMINI_API_KEY` | YES (AI) | Gemini API key — server process only | (Google AI Studio / Google Cloud) |
| `GEMINI_MODEL` | No | Override default gemini-2.5-flash | `gemini-2.5-flash` |
| `OLLAMA_URL` | No | Local dev/testing fallback URL | empty |
| `ADMIN_USERNAMES` | Yes (admin panel) | Comma-separated list of usernames to treat as admin (case sensitive, exact match) | e.g. `saarthi_admin,operations1` |

---

## 5. Resilience / Failure Modes

| Failure mode | Mitigation | Where implemented |
|---|---|---|
| Laptop is OFF → app down | Backend on always-on host, frontend on Netlify CDN. Zero local paths at runtime. | Deployment topology. |
| Upstash Redis is DOWN | `cache.redis_client = None` path; all DB reads work; health degraded but 200; 2 tests verify. | [cache.py](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/backend/app/core/cache.py) + health handler |
| Gemini rate limit (429) or transient 5xx | AI retry layer: 3 attempts exp backoff (1.5^n) + jitter; hard 45s timeout; on final failure: user-visible "AI temp unavailable" toast or parsing_status=failed in resume. | [ai/retry.py](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/backend/app/ai/retry.py) |
| Gemini key missing / disabled | Provider falls back silently to Ollama; resume upload still persists DB row (parsing_status=failed → user can retry later with key populated). | [ai/gateway.py](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/backend/app/ai/gateway.py) provider selection |
| Supabase Storage transient 5xx | DB INSERT happens FIRST (before upload); storage failure logged WARNING; Resume row never lost; `file_path` stays empty; user re-uploads. | [api/resume.py](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/backend/app/api/resume.py) try/except 101–123 |
| DB postgres restart | SQLAlchemy engine pool_pre_ping + pool_recycle; reconnects transparently after failover. | [database/connection.py](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/backend/app/database/connection.py) |
| Unhandled exception in request | Tracing middleware outer try/except returns 500 JSON with request_id; stacktrace sent to structured logger only (never response body). | [main.py:92–97](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/backend/app/main.py#L92-L97) |
| SECRET_KEY weak or default in production | Settings instantiation raises ValueError BEFORE uvicorn can accept traffic — hard fail. | [config.py SECRET_KEY validator](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/backend/app/core/config.py) |
| ALLOWED_ORIGINS misconfigured empty | CORS middleware NOT added (safer than [""]); browser blocks → operator reads warning log and sets real frontend URL. | [main.py:112–134](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/backend/app/main.py#L112-L134) |

---

## 6. Repository & CI/CD

- GitHub hosts the monorepo. `.github/workflows/` contains two files already present:
  - `ci.yml` — on push: backend pytest, frontend lint, frontend build. Gate.
  - `ci-cd.yml` — on tag: runs CI then triggers Netlify deploy + backend deploy (exact steps TBD per Phase 8 host selection).
- Protected branches: `main` required checks = CI green + no secrets leaks.
- **Secrets on GitHub**: never paste secrets into Workflow yaml; use GitHub Repository / Environment Secrets with environment scopes (staging vs prod).

---

## 7. Deployment Fidelity Rubric (AC-18) — current score

- Score **1 / 2** before Phase 8 execution: deployment components wired, Dockerfiles + netlify.toml + env templates documented; DNS not yet pointed; live URLs / laptop-off smoke test pending credential receipt (Phase 8 boundary).
- After successful Phase 8 with valid inputs: Score 2 is achievable.
# 2026-09-09 live-audit addendum

The architecture remains **not production-ready** until the frontend-to-backend routing boundary is configured in the deployment environment. `frontend/src/services/api.ts` reads the public `VITE_API_BASE_URL` build variable and otherwise falls back to same-origin `/api` for local/reverse-proxy deployments. Set it in Netlify to the HTTPS FastAPI origin; Vite's proxy is development-only. The live health endpoint also reported object storage as unconfigured, so resume bytes cannot be considered durable production data.
