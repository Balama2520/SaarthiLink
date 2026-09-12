# Saarthi V1 Production Hardening — Implementation Tasks

| Field | Value |
|---|---|
| **Spec** | [spec.md](file:///c:/Users/91809/OneDrive/Desktop/Saarthi/.trae/specs/saarthi-v1-production-hardening/spec.md) |
| **Baseline** | 83 pytest pass, 0 fail (2026-09-08) |
| **Acceptance Criteria Covered** | FR-01 … FR-34 (34 total) |

---

## Legend

- **Status**: `pending` → `in_progress` → `completed` (every completed item has Completion Evidence below)
- **TR**: Test Requirement per task. `rule` = binary pass; `rubric` = scored.
- **Priority**: high / medium / low.

---

## Task 1: Declare pdfplumber + supabase dependencies (FR-01)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-01 |

- Verify `pdfplumber>=0.10.0` line in requirements.txt.
- Verify `supabase>=2.0.0` line in requirements.txt.
- Confirm no `ModuleNotFoundError` when imports resolved in real env (sandbox restrictions noted).

### TR-1.1 [rule]
- **Pass condition**: `requirements.txt` contains both package declarations on separate lines.
- **Evidence**: grep output from file read.

### TR-1.2 [rule]
- **Pass condition**: `pip install -r requirements.txt` succeeds in non-sandboxed Python 3.11+ env OR developer-confirmed installable on the target host.
- **Evidence**: install log OR documented "expected to work given standard wheels available".

---

## Task 2: Supabase Storage permanent resume location (FR-02)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-02 |

- Audit `storage_service.py` uploads bytes to private bucket with `supabase://<bucket>/<key>` reference stored in `Resume.file_path`.
- Confirm resume pipeline never writes to disk (all BytesIO / in-memory).
- Confirm no code path relies on legacy `backend/uploads/` for resume pipeline.
- Clean (document) stale `backend/uploads/` as non-resume legacy workspace-file directory (if still used by file_service.py, mark out-of-scope for resumes).

### TR-2.1 [rule]
- **Pass condition**: In `api/resume.py::upload_resume`, Stage 3b calls `get_storage_service().upload_resume(...)` and stores returned `.reference` into `db_resume.file_path`.
- **Evidence**: file read lines.

### TR-2.2 [rule]
- **Pass condition**: `resume_pipeline.py::extract_text` uses only `io.BytesIO(file_bytes)` (no tempfile, no `open(..., 'wb')`).
- **Evidence**: file read lines.

---

## Task 3: Frontend logout → backend /auth/logout call (FR-03)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-03 |

- Confirm `useAppStore.ts::logout()` calls `api.logout(refreshToken)` before `clearAuth()`.
- Confirm `api.ts::logout` hits `POST /api/auth/logout` with `{ refresh_token }` body.

### TR-3.1 [rule]
- **Pass condition**: Zustand `logout()` function body performs the backend call before clearing local state.
- **Evidence**: Read useAppStore.ts lines 42-49.

### TR-3.2 [rule]
- **Pass condition**: Security test `test_logout_then_refresh_fails_with_401` PASSES.
- **Evidence**: pytest output line.

---

## Task 4: Gemini 2.5 Flash default + 45s timeout + 3 retries + JSON prompt (FR-04)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-04 |

- Confirm `GEMINI_MODEL = "gemini-2.5-flash"` in `config.py`.
- Confirm `httpx.AsyncClient(timeout=45.0)` in `gemini.py`.
- Confirm retry loop `range(1, MAX_RETRIES + 1)` where `MAX_RETRIES = 3` + backoff `1.5 ** attempt + jitter`.
- Confirm resume prompt asks for STRICT JSON output.

### TR-4.1 [rule]
- **Pass condition**: `config.py` line sets the gemini model string exactly.
- **Evidence**: file read line.

### TR-4.2 [rule]
- **Pass condition**: `gemini.py` retry loop runs up to 3 times with 45s timeout and exponential backoff.
- **Evidence**: file read lines.

### TR-4.3 [rule]
- **Pass condition**: Resume analysis prompt in `resume_pipeline.py` asks for STRICT JSON and caps input to ≤ 6000 chars.
- **Evidence**: file read lines.

---

## Task 5: Security tests — 11 passing covering refresh/logout/isolation/admin/redis (FR-05)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-05 |

### TR-5.1 [rule]
- **Pass condition**: `pytest tests/test_security.py -v` reports ≥ 11 passed, 0 failed.
- **Evidence**: pytest output block.

---

## Task 6: IDOR audit across all user-resource modules (FR-06)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-06 (rubric, threshold ≥ 2) |

Modules to audit (each endpoint that touches user-owned rows):
- career.py, interview.py, roadmap.py, toolkit.py, projects.py, research.py
- goals.py, sessions.py, resume.py, profile.py, gradhub.py, jobs.py, notes.py
- admin.py (already gated by username allow-list)

### TR-6.1 [rubric 0-2, ≥2]
- **Dimension**: User scoping correctness.
- **Anchors**: 2 = 13/13 modules confirmed scope by current_user.id on every resource endpoint; 1 = ≤2 gaps; 0 = ≥3 gaps.
- **Pass threshold**: ≥ 2
- **Evidence source**: Per-module grep output for `.filter(… == current_user.id)` or service/repository call passing `current_user.id`.

---

## Task 7: Frontend loading / error / empty states on 6 pages (FR-07)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-07 (rubric, threshold ≥2) |

Pages: Dashboard, Goals, Workspaces, JobFinder, ResumeAnalyzer, Profile.

### TR-7.1 [rubric 0-2, ≥2]
- **Dimension**: 3-state coverage across 6 pages (loading/skeleton · error display · empty/no-data CTA).
- **Anchors**: 2 = 6/6 pages have all 3 states clearly visible in source; 1 = 4/6; 0 = ≤3.
- **Pass threshold**: ≥2
- **Evidence source**: Per-page file reads showing loading state, error setter+display, and empty/fallback UI block.

---

## Task 8: .env.example completeness + CORS deny-all default (FR-08)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-08 |

### TR-8.1 [rule]
- **Pass condition**: Every env key read by `config.py` (attribute names of Settings class) has a matching entry in `backend/.env.example` AND (where applicable) root `.env.example`.
- **Evidence**: side-by-side attribute list vs env file keys.

### TR-8.2 [rule]
- **Pass condition**: `ALLOWED_ORIGINS` default = `""` (empty). When blank, main.py skips CORS middleware (browser default same-origin-only).
- **Evidence**: config.py validator + main.py lines 112-134.

---

## Task 9: Alembic migrations PostgreSQL-compatible (FR-09)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-09 |

Audit 5 migrations under `backend/alembic/versions/*.py` for SQLite-only constructs:
- 558e39301e77_initial_ai_os_schema
- 06e519b97e2b_add_job_ecosystem_phase1
- 124d080d546c_extend_user_profile
- b9f484181401_add_resume_versioning_and_status_batch
- 6297327ece39_add_ondelete_cascade_and_refreshtoken

### TR-9.1 [rule]
- **Pass condition**: No migration uses SQLite-only DDL (e.g., `autoincrement='auto'`, SQLite pragma-only behavior, deprecated dialect-specific constructs without PG fallback); OR where `Base.metadata.create_all()` is used, it is SQLAlchemy DB-agnostic.
- **Evidence**: per-migration file read audit.

### TR-9.2 [rule]
- **Pass condition**: `alembic upgrade head` against real Postgres exits 0 (environment allowing). Where blocked by sandbox, a static audit confirming PG-compatible code paths counts as pass with note.
- **Evidence**: real run output OR documented static-audit pass.

---

## Task 10: Regression suite ≥ 80 passing tests (FR-10)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-10 |

### TR-10.1 [rule]
- **Pass condition**: Final `pytest tests/` exit summary reports ≥ 80 passed, 0 failed.
- **Evidence**: last pytest log block.

---

## Task 11: 34 declared features verified with evidence (FR-11)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-11 |

Feature list:
1. Auth: register/login/refresh/logout + JWT 24h
2. Profile: create/read/update + completeness score
3. Goals: CRUD + AI engine health
4. Career Dashboard: summary + skill gap + learning plan + missions
5. Resume: upload + pdfplumber extract + 5 MB cap + 6000 char AI limit + versioning + re-analyze + sync profile
6. Supabase Storage: private bucket upload (`supabase://` ref) + optional fallback
7. AI Gateway: Gemini primary 2.5 flash + 45s + 3 retries + Ollama fallback
8. Career Copilot: streaming chat + sessions + memory context
9. Interview Coach: question generator + evaluator
10. Learning Roadmaps: generate per persona + step advance
11. Workspaces: chat + file upload + summaries
12. Admin Panel: admin-username allow-list, 401/403 gating
13. Security: refresh token revoke on logout, user isolation per row, Redis-degrade graceful
14. Rate Limit: 120/min default, 429 with request_id
15. CORS: deny-all default; origin whitelist via env
16. Health: 5-component endpoint (api/db/redis/ai/storage)
17. DB Layer: Alembic 5 migrations + CASCADE FKs via migration 6297327ece39
18. Cache Invalidation: profile+resume update clears career cache
19. Workflow Engine: start/advance/complete + outbox events
20. Outbox Worker: async polling (5 s) + marks processed/failed
21. Memory Engine: weighted retrieve + keyword relevance boost
22. Jobs Ecosystem: match + seed dedup hash
23. GradHub: GitHub review + LinkedIn optimize
24. Higher Studies: professors + universities finder
25. Research: paper analyzer + compass + gap + matrix
26. Projects (SkillForge): generator
27. Notes: AI-generated from content
28. Toolkit: salary decode + star bullets + company decode + keywords + network + global path + coding arena
29. UI: ErrorBoundary, tab navigation, modal guest name
30. Frontend: Zustand persistence + logout backend-first + 401 auto refresh
31. Logging: structured JSON + request tracing id (X-Request-ID header)
32. Error: 500 middleware → JSON + request_id, no stack leak; resume AI fail → status=failed
33. Docker: backend + frontend Dockerfiles present
34. Docs: deployment runbook + rollback playbook (FR-27, FR-32, FR-33, FR-34 guides)

### TR-11.1 [rule]
- **Pass condition**: Every item 1-34 explicitly tagged `[PASS]` with an evidence artifact path (file + line or test name or log line).
- **Evidence**: dedicated checklist section in tasks.md OR review.md.

---

## Task 12: Security hardening pass — SECRET_KEY validator + headers + no "*" CORS (FR-12)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-12 |

### TR-12.1 [rule]
- **Pass condition**: `config.py` SECRET_KEY validator (a) rejects empty in prod, (b) rejects known weak exact matches, (c) rejects weak substrings, (d) rejects <32 chars in prod, (e) rejects <3/4 char classes in prod.
- **Evidence**: function body read lines 54-141.

### TR-12.2 [rule]
- **Pass condition**: Security headers present on every response via middleware: X-Content-Type-Options=nosniff, X-Frame-Options=DENY, X-XSS-Protection, Referrer-Policy, HSTS in non-DEBUG.
- **Evidence**: main.py middleware block lines 99-110.

---

## Task 13: Rate limiting ON by default (FR-13)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | medium |
| **Maps AC** | FR-13 |

### TR-13.1 [rule]
- **Pass condition**: Defaults: RATE_LIMIT_ENABLED=True, RATE_LIMIT_REQUESTS_PER_MINUTE=120, RATE_LIMIT_WINDOW_SECONDS=60. Tracing middleware applies limiter on `/api/*` path prefix; 429 JSON response includes `request_id`.
- **Evidence**: config.py defaults + main.py tracing middleware lines 64-79.

---

## Task 14: Unified error handling — no stack leak + graceful AI fail (FR-14)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-14 |

### TR-14.1 [rule]
- **Pass condition**: Tracing middleware `except Exception` block returns generic 500 JSON `{"detail":"Internal Server Error","request_id":…}` and logs the real exception server-side only.
- **Evidence**: main.py lines 92-97.

### TR-14.2 [rule]
- **Pass condition**: Resume upload Stage 3 (DB persist) runs before Stage 4 (AI). On AI exception, `parsing_status = "failed"` is committed with response message "AI analysis temporarily unavailable; retry".
- **Evidence**: api/resume.py upload flow lines 85-180.

---

## Task 15: Rate limit tests (≥ 2) (FR-15)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | medium |
| **Maps AC** | FR-15 |

### TR-15.1 [rule]
- **Pass condition**: `pytest -k rate` or equivalent finds ≥ 2 tests passing that assert rate limit under-limit passes and over-limit returns 429. If no such tests exist yet, add them in `tests/test_rate_limit.py` (or append to `test_main.py`).
- **Evidence**: pytest output for those test names.

---

## Task 16: Admin audit matrix — guest 401 / user 403 / admin 200 (FR-16)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-16 |

### TR-16.1 [rule]
- **Pass condition**: `TestAdminAuthMatrix` 3 tests all PASS.
- **Evidence**: test_security.py 3 output lines.

---

## Task 17: PostgreSQL indexes on FK columns (≥ 4) (FR-17)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | medium |
| **Maps AC** | FR-17 |

### TR-17.1 [rule]
- **Pass condition**: `models.py` declares ≥4 `index=True` on FK columns (user_id, resume_id, session_id, goal_id) OR migrations create them.
- **Evidence**: `grep index=True backend/app/models/models.py` count ≥ 4.

---

## Task 18: DB connection pool production settings (FR-18)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-18 |

### TR-18.1 [rule]
- **Pass condition**: `create_engine(...)` or `sessionmaker(...)` in `database/connection.py` explicitly sets `pool_size ≥ 5`, `max_overflow ≥ 10`, `pool_pre_ping=True` (or poolclass for SQLite). If missing, add them.
- **Evidence**: file read of database/connection.py after any edits.

---

## Task 19: Backend memory leak audit (FR-19)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | medium |
| **Maps AC** | FR-19 (rubric ≥2) |

### TR-19.1 [rubric 0-2, ≥2]
- **Dimension**: No session-scoped memory leaks in long-running workers.
- **Anchors**: 2 = only `@lru_cache` on `get_settings()` (pure config getter) + no global dict mutation; 1 = ≤1 non-urgent concern (e.g. cache intentional). 0 = ≥2 leak patterns.
- **Pass threshold**: ≥2
- **Evidence source**: grep for `global [a-z]` + `= {}` at module scope + `lru_cache` outside getters.

---

## Task 20: Frontend bundle secret leak audit (FR-20)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-20 |

### TR-20.1 [rule]
- **Pass condition**: After frontend build, running `grep -iR "service_role\|SECRET_KEY\|GEMINI_API_KEY" frontend/dist/assets/` returns 0 matches.
- **Evidence**: grep output post-build.

---

## Task 21: Temporary file cleanup (FR-21)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | medium |
| **Maps AC** | FR-21 |

### TR-21.1 [rule]
- **Pass condition**: Resume pipeline (resume_pipeline.py + api/resume.py) contains zero `open(..., 'w')` / `tempfile` calls for file bytes. All processing through `io.BytesIO`.
- **Evidence**: grep for `open(\|tempfile\|NamedTemporary` in pipeline files returns resume-path zero matches.

### TR-21.2 [rule]
- **Pass condition**: If `backend/uploads/` directory exists with stale files, they are NOT referenced in the resume upload flow (document which OTHER legacy feature still uses uploads/ — e.g., `file_service.py` workspace-files only — and confirm resume flow avoids it).
- **Evidence**: grep "uploads/" in resume_pipeline.py, storage_service.py = 0 lines.

---

## Task 22: Test idempotency (FR-22)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | medium |
| **Maps AC** | FR-22 |

### TR-22.1 [rule]
- **Pass condition**: Running `pytest tests/` twice consecutively against same SQLite file yields 0 failures both runs (no duplicate username collision, no sequence-pk conflicts, no stale cache).
- **Evidence**: two back-to-back pytest summary lines (≥80 pass each).

---

## Task 23: CORS production safety (FR-23)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-23 |

### TR-23.1 [rule]
- **Pass condition**: main.py CORS block (a) strips + splits origins, (b) only adds middleware if non-empty list, (c) empty list triggers warning log, (d) never substitutes a `"*"` fallback when env contains junk/empty.
- **Evidence**: main.py lines 112-134 static read.

---

## Task 24: Backend Docker build (FR-24)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | medium |
| **Maps AC** | FR-24 |

### TR-24.1 [rule]
- **Pass condition**: `backend/Dockerfile` has no `COPY` of `.env` / secrets; installs requirements via pip cleanly; uses a non-dev base (slim or alpine variant) OR multi-stage.
- **Evidence**: Dockerfile read.

---

## Task 25: Frontend Docker build / SPA fallback (FR-25)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | medium |
| **Maps AC** | FR-25 |

### TR-25.1 [rule]
- **Pass condition**: `frontend/Dockerfile` builds (multi-stage preferred) + `frontend/nginx.conf` has `try_files $uri $uri/ /index.html;` SPA fallback (or equivalent for deploy target Netlify).
- **Evidence**: Dockerfile + nginx.conf OR netlify.toml with redirect rules.

---

## Task 26: Secrets rotation safety — env-only (FR-26)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-26 |

### TR-26.1 [rule]
- **Pass condition**: Repo-wide grep for suspicious substrings (skipping .env files) returns 0 hits for actual-looking keys. All sensitive values read via os.getenv / pydantic-settings.
- **Evidence**: `grep -R "sk-\|service_role\|BEGIN.*PRIVATE\|eyJ0eXAiOiJKV1QiLC" backend/ frontend/ --include="*.py" --include="*.ts" --include="*.tsx"` output = 0 matches.

---

## Task 27: Pre-production checklist ordered steps (FR-27)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-27 |

### TR-27.1 [rule]
- **Pass condition**: A single runbook doc contains the 7-step ordered checklist.
- **Evidence**: file exists with numbered steps matching the exact order spec'd.

---

## Task 28: Final pytest ≥ 80 passing, 0 failures (FR-28)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-28 |

### TR-28.1 [rule]
- **Pass condition**: Very last pytest execution of the hardening pass shows the summary line with ≥ 80 passed, 0 failed.
- **Evidence**: bottom of final pytest log.

---

## Task 29: Final frontend lint exit 0 + build exit 0 (FR-29)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-29 |

### TR-29.1 [rule]
- **Pass condition**: `cd frontend && npm run lint` exits 0 AND `npm run build` exits 0, producing `frontend/dist/`.
- **Evidence**: both command exit code lines + dist exists.

---

## Task 30: 34/34 declared features final [PASS] (FR-30)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-30 |

### TR-30.1 [rule]
- **Pass condition**: Final review.md / tasks.md shows a table/list of 34 features and each entry is tagged `[PASS]` with evidence.
- **Evidence**: review.md section "34 Feature Verification".

---

## Task 31: Health + Live + Ready 3 endpoints (FR-31)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-31 |

### TR-31.1 [rule]
- **Pass condition**: `/api/health` → 200 + 5-component object. `/api/live` → 200 `{"live":true}`. `/api/ready` → 200 or 503 based on DB reachable + storage/AI configured. All 3 route handlers exist in main.py.
- **Evidence**: endpoint handlers in source + test_main assertions (or add tests if missing).

---

## Task 32: Deployment guide 4-target coverage (FR-32)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-32 |

### TR-32.1 [rule]
- **Pass condition**: Runbook doc covers Supabase (PG + Storage bucket), Backend host deploy (Docker + env block), Frontend (Netlify build + VITE_API_BASE_URL), Cloudflare (2 CNAME records + SSL + HSTS + CORS origin update).
- **Evidence**: runbook has 4 explicit sections.

---

## Task 33: Production operational tips (≥ 10) (FR-33)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | low |
| **Maps AC** | FR-33 (rubric ≥2) |

### TR-33.1 [rubric 0-2, ≥2]
- **Dimension**: Actionable, specific ops tips, not generic filler.
- **Anchors**: 2 = ≥10 concrete tips (monitoring, backups, key rotation, cache warm, fallback, rate limits, CORS, onboarding, DB vacuum, log drain, etc.); 1 = 5–9 tips; 0 = ≤4.
- **Pass threshold**: ≥2
- **Evidence source**: tips document line count + specificity check.

---

## Task 34: Supabase-specific guide (4 sub-steps) (FR-34)

| Field | Value |
|---|---|
| **Status** | pending |
| **Priority** | high |
| **Maps AC** | FR-34 |

Sub-steps required:
- (a) Bucket creation: `resumes` name + Private ACL toggle OFF for Public
- (b) Alembic migration run against pooler: set only DATABASE_URL+SECRET_KEY+DEBUG env, `alembic upgrade head`
- (c) Connection string: `?pgbouncer=true` suffix, port 6543, psycopg driver
- (d) Policies: service_role default write; signed URLs or backend proxy for reads (never expose service_role to browser)

### TR-34.1 [rule]
- **Pass condition**: Standalone Supabase doc covers all 4 sub-steps (a)…(d) explicitly.
- **Evidence**: document section headers or numbered items.
