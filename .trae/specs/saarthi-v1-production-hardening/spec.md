# Saarthi V1 Production Hardening — Specification

| Field | Value |
|---|---|
| **Project** | Saarthi AI Career OS v1.0.0 |
| **Audience** | CTO, Founder, DevOps, Deployment Engineer |
| **Baseline Tests** | 83 passed (pytest `tests/` 2026-09-08) |
| **Primary Provider** | Google Gemini 2.5 Flash (server-side only) |
| **Persistence** | Supabase PostgreSQL (Alembic) + Supabase Storage (resumes) |
| **Cache** | Redis (optional; graceful degrade when absent) |

---

## 1. Problem

Saarthi V1 has been feature-freeze-audited at 8.1/10 production readiness
(PRODUCTION_READINESS.md). Baseline 83 backend tests pass; frontend lint+build
passes. This spec converts the remaining technical debt and deployment gaps
into a deterministic 34-acceptance-criterion hardening pass so the project can
be shipped to real users with zero known critical defects and a reproducible
from-scratch deploy.

## 2. Users & Goals

| Actor | Goal |
|---|---|
| **Founder/CTO** | Push-button from-scratch deploy; 34/34 features verified with evidence; no P0/P1 bugs on launch day |
| **Deployment Engineer** | One runbook, one env block, one alembic `upgrade head`, one docker build → done |
| **End User** | No 500s, no state corruption, no auth bypass, files persist across restarts, mobile works |
| **Security Auditor** | No IDOR, refresh tokens properly revoked, CORS locked, weak SECRET_KEY rejected in prod |

## 3. Non-Goals (explicitly out of scope)

- No new user-facing features beyond what V1 declares.
- No rewrite of the AI gateway / graph agents in this pass.
- No new Supabase RLS policies; service_role key is the backend's authorized writer.
- No frontend unit-test suite (flagged as post-MVP technical debt only).
- No multi-tenant SaaS billing / stripe integration.

---

## 4. Functional Requirements (FR)

Every FR below is typed as either **rule** (objective pass/fail with evidence)
or **rubric** (evaluative with scale + threshold).

| # | Requirement | Type | Details & Evidence Source |
|---|---|---|---|
| FR-01 | `pdfplumber>=0.10.0` and `supabase>=2.0.0` listed in `backend/requirements.txt` | rule | `grep` requirements.txt; install succeeds |
| FR-02 | Supabase Storage is the permanent location for resume bytes; `Resume.file_path` stores `supabase://<bucket>/<key>`; nothing writes permanent files to `backend/uploads/` | rule | grep `file_path`; resume upload trace through storage_service.py |
| FR-03 | Frontend logout calls `POST /api/auth/logout` with refresh token BEFORE clearing local auth state | rule | `useAppStore.ts` logout + `api.ts` logout |
| FR-04 | `GEMINI_MODEL` default = `"gemini-2.5-flash"`; AI calls carry `timeout≥45s` + `3 retries` with exponential backoff; resume analysis prompt requires STRICT JSON output | rule | `config.py` + `gemini.py` + `resume_pipeline.py` |
| FR-05 | At least 11 security tests pass: refresh flow (3), logout invalidation (2), user isolation (3), admin auth matrix (3), Redis unavailable degradation (2) | rule | `pytest tests/test_security.py -v` output |
| FR-06 | IDOR audit: every user-owned resource endpoint scopes queries by `current_user.id`. Scope = career, interview, roadmap, projects, research, toolkit, goals, sessions, resume, profile, gradhub, jobs, notes, admin | rubric | 0-2 scale: 2 = every module passes; 1 = ≤2 module gaps; 0 = ≥3 gaps. **Threshold ≥2** |
| FR-07 | Frontend pages (Dashboard, Goals, Workspaces, JobFinder, ResumeAnalyzer, Profile) each have 3 states: (a) loading/skeleton, (b) error display, (c) empty/no-data CTA | rubric | 0-2 scale: 2 = 6/6 pages have all states; 1 = 4/6 have all; 0 = ≤3. **Threshold ≥2** |
| FR-08 | `.env.example` (root + backend) declares every env key the app reads; `ALLOWED_ORIGINS` defaults to empty (deny-all); CORS middleware is skipped when blank (FastAPI same-origin default) | rule | Diff env-keys read by config.py vs listed in both .env.example files |
| FR-09 | Alembic migrations 001–005 apply cleanly against PostgreSQL via `alembic upgrade head` with the pooled `DATABASE_URL`; no SQLite-isms in migration code | rule | `alembic upgrade head` against Postgres = exit 0 OR migration-source audit confirms no SQLite-only constructs |
| FR-10 | Backend regression suite: `pytest tests/` must record ≥ 80 passing tests (≥ previous baseline) | rule | Final pytest summary line |
| FR-11 | 34 declared features verified with evidence. Each feature tagged: [PASS] + artifact path / test name | rule | `tasks.md` 34-feature checklist section with all PASS |
| FR-12 | Security hardening checks: (a) `SECRET_KEY` prod validator rejects weak/short keys; (b) CORS never uses `"*"` in production path; (c) security headers present (nosniff, X-Frame DENY, HSTS in prod); (d) rate-limit middleware runs on `/api/*` | rule | Static grep + middleware order in main.py |
| FR-13 | Rate limiting: `RATE_LIMIT_ENABLED=true` by default; `requests_per_minute=120`, window=60s; 429 JSON returned with `request_id` on breach | rule | `config.py` defaults + `rate_limit.py` behavior |
| FR-14 | Unified error handling: (a) unhandled exceptions caught by tracing middleware → 500 JSON with `request_id`, no stack leak; (b) AI failures return graceful 502 / "AI unavailable" message, never crash the upload; (c) resume upload persists DB row BEFORE AI analysis; parsing_status="failed" on AI error | rule | main.py middleware + resume.py upload flow + resume_pipeline.py |
| FR-15 | Rate-limit module covered by at least 2 unit tests (over-limit returns 429; under-limit passes) | rule | `pytest -k rate` |
| FR-16 | Admin endpoints gated by username allow-list: guest 401, normal user 403, admin 200 — all three verified by existing tests | rule | `test_security.py::TestAdminAuthMatrix` |
| FR-17 | PostgreSQL performance: at least 4 table indexes created by migrations for high-cardinality FK columns (user_id, resume_id, session_id, goal_id) | rule | `grep "Index\|index=True" models.py` OR migrations contain index creates ≥ 4 |
| FR-18 | DB connection pool: `pool_size`, `max_overflow`, `pool_pre_ping` configured for production with sensible defaults (≥5 pool, ≥10 overflow, pre_ping=True) | rule | `database/connection.py` pool kwargs |
| FR-19 | Backend memory safety: no global dict accumulators; `lru_cache` only on pure config getters; no session-scale memory leaks on long-lived uvicorn workers | rubric | 0-2 scale: 2 = no leaks identified; 1 = ≤1 minor; 0 = ≥2 leaks. **Threshold ≥2** |
| FR-20 | Frontend bundle safety: no `SUPABASE_SERVICE_ROLE_KEY`, no `SECRET_KEY` appear in `dist/` build output; Vite env-var prefix policy respected (all backend-only vars unprefixed `VITE_`) | rule | `grep` dist/assets/ for secret substrings after build |
| FR-21 | Temporary file cleanup: resume processing never writes to filesystem (BytesIO only); stale `backend/uploads/` files, if any, have no code dependency and can be deleted | rule | resume_pipeline.py file handling grep + uploads/ dir dependency audit |
| FR-22 | Test idempotency: running `pytest tests/` twice in a row with same SQLite file produces no failures (unique test usernames per run via `_register_login` randomization or unique suffix) | rule | Two consecutive pytest runs both exit 0 |
| FR-23 | CORS production safety: (a) middleware only added when `_allowed_origins` list non-empty; (b) empty-list path logs warning; (c) origins list is stripped + split on commas with no `"*"` fallback when ALLOWED_ORIGINS contains junk | rule | main.py lines 112-134 behavior |
| FR-24 | Backend Docker build: `backend/Dockerfile` produces a working image with multi-stage or slim base; no secrets embedded in image layers; `requirements.txt` installed cleanly | rule | Docker build succeeds OR Dockerfile is syntactically valid + layer-safe |
| FR-25 | Frontend Docker build: `frontend/Dockerfile` uses multi-stage (node build → nginx serve) or equivalent; `nginx.conf` sets SPA fallback for `/` | rule | Frontend Dockerfile + nginx.conf audit OR Vite build succeeds (dist/) |
| FR-26 | Secrets rotation safety: every sensitive value (SECRET_KEY, GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, REDIS_URL, ADMIN_USERNAMES) is read from env, never hardcoded. No secrets in .env.example beyond empty placeholders. | rule | `grep -R "sk-" / "service_role" / "BEGIN.*PRIVATE"` across repo excludes .env files |
| FR-27 | Pre-production checklist exists and is ordered: (1) env validate, (2) alembic head, (3) backend smoke, (4) frontend build+deploy, (5) DNS+SSL, (6) E2E 10-step smoke, (7) laptop-off smoke | rule | Deployment guide / runbook presence + step order |
| FR-28 | Final pytest result ≥ 80 tests passing with 0 failures | rule | Last pytest run summary |
| FR-29 | Final frontend build: `npm run build` produces `frontend/dist/` with no errors; `npm run lint` exits 0 | rule | Final lint + build exit codes |
| FR-30 | 34-declared-features final checklist: 34/34 [PASS] entries | rule | Final section in review.md OR tasks.md |
| FR-31 | Health endpoint completeness: `/api/health` returns status + components (api, database, redis, ai_gateway, storage). Also add `/api/live` (always 200) + `/api/ready` (db+ai+storage checks). | rule | 3 endpoint handlers exist in main.py and return correct status codes |
| FR-32 | Deployment guide exists: step-by-step for Supabase PG+Storage, backend host, Netlify frontend, Cloudflare DNS. Includes env block, migration run, rollback playbook | rule | Runbook doc with all 4 targets covered |
| FR-33 | Production tips doc exists: 10+ operational tips (monitoring, backups, key rotation, cache warm, AI fallback, rate limits, CORS whitelist, user onboarding, DB vacuum, log drain) | rubric | 0-2: 2 = ≥10 concrete actionable tips; 1 = 5–9; 0 = ≤4. **Threshold ≥2** |
| FR-34 | Supabase-specific guide: bucket creation steps, private ACL, alembic migration against pooler, connection string format with `?pgbouncer=true` | rule | Guide covers all 4 sub-steps |

---

## 5. Non-Functional Requirements (NFR)

| # | Requirement | Type |
|---|---|---|
| NFR-01 | Deterministic repeatable deploy. Second engineer following the runbook gets the same 34/34 pass. | rule |
| NFR-02 | Zero-downtime rollback capability for backend image, frontend deploy, DB migrations (documented). | rule |
| NFR-03 | No `.pyc` write failures prevent test execution (tests must pass even with sandbox restrictions). | rule |
| NFR-04 | Lighthouse "Performance" ≥ 80 on the landing SPA first paint. | rubric (scale 0-2, threshold ≥1) |

---

## 6. Constraints, Dependencies, Assumptions

### Constraints
- **No DB manual ALTERs.** All schema changes owned by Alembic only.
- **No secret commits.** `.env` never tracked; `.env.example` always placeholders.
- **No breaking API changes.** `/api/auth/*`, `/api/resume/*`, `/api/profile`, `/api/goals/*`, `/api/sessions/*` contracts preserved.

### Dependencies
- Python ≥ 3.11; Node ≥ 20 LTS; PostgreSQL ≥ 15 (Supabase).
- Supabase project with `resumes` bucket (private ACL).
- Google AI Studio key for Gemini 2.5 Flash (primary AI provider).
- (Optional) Upstash Redis URL for caching + memory layer.

### Assumptions
- Operator has access to Cloudflare, Netlify, a backend Docker host, and Supabase dashboard.
- SECRET_KEY will be generated with `secrets.token_urlsafe(64)` (64+ chars, ≥3 char classes).

---

## 7. Acceptance Criteria Summary (AC)

All FR-01 through FR-34 are the Acceptance Criteria. AC type = the rule/rubric
already declared on each FR row. The pass condition for rubric ACs is the
threshold already stated per item.

Success exit of this hardening pass = 34/34 ACs met with evidence, independently
reviewed, and review.md records a single final `pass`.
