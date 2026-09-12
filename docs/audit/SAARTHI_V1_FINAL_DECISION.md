# Saarthi V1 Final Decision Sheet

**Date:** 2026-09-07  
**Purpose:** Final owner decision before implementation planning  
**Source of truth:** `docs/audit/SAARTHI_V1_CURRENT_STATE_AUDIT.md`  
**Implementation performed for this document:** None

## 1. Current State

Saarthi is a partially verified V1 career operating system with a real React/Vite frontend, FastAPI/SQLAlchemy backend, SQLite local development database, PostgreSQL Docker target, optional Redis, an outbox worker, and a working Gemini path through the existing AI Gateway.

The active product surface is 14 hash tabs: Dashboard, Profile, Resume, Goals, Jobs, Copilot, Interview, Roadmaps, AI Chat, Workspaces, Graduate Hub, Growth Lab, Toolkit, and Admin. Historical documentation overstates the current surface by describing additional pages that are not mounted by the current `App.tsx`.

Current decision: **do not release as a fully certified V1 yet**. The main blockers are incomplete release-gate testing, non-deterministic backend test execution, incomplete ownership/persistence coverage, resume AI failure behavior during provider 503, empty jobs data, and unresolved scope/deployment decisions.

## 2. Current Architecture

```text
Browser
  -> React 19 + Vite + TypeScript
  -> App.tsx manual hash navigation
  -> Sidebar + Zustand state
  -> pages/components
  -> services/api.ts fetch client
  -> FastAPI :2520 middleware and routers
  -> dependencies -> services -> repositories -> SQLAlchemy models
  -> SQLite locally / PostgreSQL in Docker
  -> Redis cache/memory when available
  -> EventOutbox worker
  -> AI Gateway -> Gemini or Ollama
```

Resume flow: frontend multipart upload -> `/api/resume/upload` -> validation -> pdfplumber/pypdf/DOCX extraction -> AI analysis -> parsed JSON/version/ATS persistence -> explicit profile sync.

## 3. Current Technology Stack

| Area | Current decision state |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 6, Tailwind/custom CSS |
| State | Zustand 5; TanStack Query used selectively |
| Routing | Manual hash routing; no React Router |
| Backend | FastAPI, Python, SQLAlchemy |
| Local database | SQLite |
| Deployment database | PostgreSQL 15 through Docker Compose |
| Cache/memory | Redis 7 in Compose; optional locally |
| AI | Existing Gemini HTTP streaming provider, Ollama fallback |
| Auth | bcrypt, JWT access tokens, DB refresh tokens |
| Documents | pdfplumber, pypdf/PyPDF2, python-docx |
| Testing | pytest/pytest-asyncio/TestClient; frontend ESLint/build |
| Deployment | Docker Compose, Netlify frontend, Nginx image |

Keep the current architecture. Do not add a router, state library, framework, or replacement AI system.

## 4. All 34 Features: Decision Status

| # | Feature | Decision | Reason |
|---:|---|---|---|
| 1 | Authentication | KEEP IN V1 / NEED FIX | Core flow exists; complete refresh-retry gate remains |
| 2 | Dashboard | KEEP IN V1 / NEED FIX | Active and useful; action/persistence coverage incomplete |
| 3 | User Profile | KEEP IN V1 / NEED FIX | Core career data surface |
| 4 | Profile Completeness | KEEP IN V1 / NEED FIX | Useful derived readiness feature; derivation needs tests |
| 5 | User Skills | KEEP IN V1 / NEED FIX | Needed by resume/career matching; standalone workflow incomplete |
| 6 | Resume Upload | KEEP IN V1 / NEED FIX | Core feature; provider failure currently interrupts completion |
| 7 | Resume Analysis | KEEP IN V1 / NEED FIX | Core AI value; response/error contract needs hardening |
| 8 | ATS Analysis | KEEP IN V1 / NEED FIX | Core resume value; requires reliable structured output |
| 9 | Resume Versioning | KEEP IN V1 / NEED FIX | Existing model/code; real persistence sequence needs proof |
| 10 | Profile Sync | KEEP IN V1 / NEED FIX | Important explicit workflow; needs successful end-to-end test |
| 11 | Job Board | KEEP IN V1 / DATA DECISION | Keep only if V1 accepts seeded/ingested data; current DB is empty |
| 12 | Job Recommendations | KEEP IN V1 / DATA DECISION | Depends on jobs and profile quality |
| 13 | Saved Jobs | KEEP IN V1 / DATA DECISION | Cannot be meaningfully certified without jobs |
| 14 | Goals | KEEP IN V1 / NEED FIX | Strong core workflow; browser CRUD/tree coverage incomplete |
| 15 | Career Copilot | KEEP IN V1 / NEED FIX | Valuable but mixes deterministic fallback and AI behavior |
| 16 | Career Roadmap Engine | KEEP IN V1 / NEED FIX | Keep schema-compliant fallback and persistence requirements |
| 17 | Skill Gap Analysis | KEEP IN V1 | Real Gemini-backed output verified |
| 18 | Job Strategy | DEFER unless a complete V1 workflow is defined | Current implementation/scope is unclear |
| 19 | AI Chat | KEEP IN V1 / NEED FIX | Real gateway works; stream/history/retry gates incomplete |
| 20 | Memory | DEFER or make explicitly best-effort | Redis unavailable and complete retrieval behavior is unverified |
| 21 | Learning Roadmaps | KEEP IN V1 / NEED FIX | Real Gemini route works; browser persistence incomplete |
| 22 | Interview Coach | KEEP IN V1 / NEED FIX | Real evaluation exists; full session lifecycle incomplete |
| 23 | Skill Forge | DEFER standalone branding; KEEP backend capability if needed | Current surface is a Growth Lab action, not a standalone page |
| 24 | Research Hub | DEFER | Backend fragment exists; no current standalone frontend workflow |
| 25 | Experiment Studio | DEFER / REMOVE FROM V1 SCOPE | No reachable current workflow |
| 26 | Graduate Hub | KEEP IN V1 / NEED FIX | Active page/models; browser CRUD not fully proven |
| 27 | Admissions Navigator | DEFER / REMOVE FROM V1 SCOPE | Historical model/service artifacts, no current route/page |
| 28 | Study Notes | DEFER standalone page; KEEP minimal notes if product-approved | Current notes surface is embedded, not a complete standalone product |
| 29 | AI Workspaces | KEEP IN V1 / NEED FIX | Active and ownership-aware; persistence/document flow incomplete |
| 30 | Admin Panel | KEEP IN V1 / NEED FIX | Backend guard exists; deployment admin provisioning and browser flow remain |
| 31 | Personas | KEEP IN V1 as recommendations | Current behavior is recommendation-only; do not imply access enforcement |
| 32 | Daily Mission | KEEP IN V1 / NEED FIX | Active dashboard feature; full tick/persistence gate incomplete |
| 33 | Career Health | KEEP IN V1 / NEED FIX | Useful, but derivation and persistence require explicit tests |
| 34 | Career Toolkit | KEEP IN V1 / NEED FIX | Keep only tools with stable API/error contracts and actual V1 value |

### Scope decision

The recommended V1 product is the current 14-tab surface plus the explicitly selected features above. Historical Admissions, Experiment Studio, standalone Research, standalone Notes, and standalone SkillForge should not be treated as current V1 until the owner explicitly restores them to scope.

## 5. Keep, Defer, Remove, Need Fix

### KEEP IN V1

Authentication, Dashboard, Profile, Profile Completeness, Skills, Resume, Goals, Career Copilot, Roadmaps, AI Chat, Interview Coach, Graduate Hub, Workspaces, Personas, Daily Mission, Career Health, and selected Toolkit tools.

### DEFER

Memory as a required dependency, Job Strategy as an undefined workflow, standalone Research, Admissions, Experiment Studio, standalone Notes, standalone SkillForge page, and any historical feature not mounted by the current App.

### REMOVE, only after approval

Dead `/api/upload-file` frontend wrapper, unused `axios` dependency, inactive OpenAI/Anthropic artifacts, and obsolete audit claims that contradict the current product. Removal must follow a dependency/use audit.

### NEED FIX before release

Test harness determinism, resume AI failure handling, complete refresh retry behavior, ownership coverage, persistence verification, admin provisioning documentation, response contracts, AI health semantics, migration authority, and jobs data policy.

## 6. Security Decisions

1. Keep JWT and DB-backed refresh tokens for V1.
2. Keep backend authorization enforcement; frontend visibility is not security.
3. Keep `ADMIN_USERNAMES` only if the owner accepts configuration-backed admin identity. Otherwise decide on a persisted role before implementation.
4. Require a strong production `SECRET_KEY`; never use the development default.
5. Configure exact CORS origins; do not use wildcard origins in production.
6. Decide whether Web Storage bearer tokens are acceptable for V1 or whether a secure cookie model is required later. Do not change auth architecture without approval.
7. Add explicit ownership tests for every user-owned resource before release.
8. Decide whether passwords longer than bcrypt's 72-byte limit should be rejected rather than truncated.

## 7. Database Decisions

1. Choose Alembic as the production schema authority, or explicitly approve `create_all()` for a defined local/test-only role. Do not leave both implicit.
2. Validate SQLite-to-PostgreSQL migration parity before deployment.
3. Keep `user_id` ownership filters and cascade relationships, but test them across every user-owned table.
4. Decide which model tables are active V1 versus legacy/planned.
5. Add persistence gates for profile, goals, resume versions, roadmaps, sessions/messages, workspaces/documents, GradHub, and saved jobs.
6. Decide whether database records should be created before AI analysis so provider failure can be retried without losing the uploaded input.

## 8. AI Decisions

1. Keep the current AI Gateway and Gemini/Ollama provider abstraction.
2. Treat Gemini as the primary configured provider when `GEMINI_API_KEY` exists; this path is already verified.
3. Define the expected behavior for Gemini 503/rate limits: retry, fallback, queued job, or user retry.
4. Add bounded retry/backoff and a provider-aware health contract before production.
5. Standardize structured response schemas and malformed-output handling across AI features.
6. Decide whether Ollama is a real production fallback or merely optional local development support.
7. Separate live AI smoke tests from deterministic unit/integration tests.

## 9. Resume and Storage Decisions

1. Keep PDF/DOCX/TXT support and the existing extraction fallback chain pending broader fixture testing.
2. Decide whether resume uploads persist before AI analysis or remain transactional.
3. Define retry behavior after provider failure.
4. Decide whether Docker volume storage is acceptable for production resumes or object storage is required.
5. Add a retention/deletion policy, content validation, and malware-scanning requirements before production handling of user files.

## 10. Testing Decisions

1. Pytest collection must be deterministic and side-effect free.
2. Live Gemini tests must be explicitly marked and separated from the default regression gate.
3. No release claim may use the current interrupted suite as a pass count.
4. Add release gates for authentication, admin authorization, two-user isolation, persistence, resume pipeline, roadmap fallback, and AI provider failure.
5. Keep frontend lint/build gates; both currently pass.
6. Browser E2E should cover the current 14 tabs and only approved V1 features.

## 11. Deployment Requirements

Before release:

- Configure a strong `SECRET_KEY`.
- Configure exact `ALLOWED_ORIGINS`.
- Configure `ADMIN_USERNAMES` and test the configured admin browser flow.
- Configure `GEMINI_API_KEY` securely on the backend only.
- Decide and document `DATABASE_URL` target and run Alembic migrations.
- Decide whether Redis is required or best-effort.
- Configure persistent upload/Chroma storage and backups.
- Verify Docker migration startup against PostgreSQL, not only SQLite.
- Update health semantics to reflect the actual configured AI provider.
- Confirm Netlify API proxy/origin behavior for `/api`.

## 12. Production Infrastructure Requirements

Required or explicitly waived by owner:

- PostgreSQL 15-compatible managed database.
- Redis 7-compatible service if cache/rate/memory behavior is required.
- Persistent object/file storage or an approved Docker volume policy.
- Secret manager for JWT, Gemini, database, and deployment values.
- TLS termination and exact frontend/backend origin configuration.
- Centralized logs and request IDs.
- Monitoring for API, database, Redis, AI provider latency/errors, outbox backlog, and upload failures.
- Backup/restore procedure for database and user files.
- Single-worker or distributed-lock policy for the outbox worker.

## 13. Exact Changes Required Before Release

These are decisions and implementation requirements, not changes performed here:

1. Make backend tests deterministic; prevent live AI/network activity during collection.
2. Produce a complete backend regression summary with no interruption.
3. Complete two-user isolation tests for profile, resume, roadmap, chat, workspace documents, saved jobs, and career data.
4. Complete browser persistence tests for approved V1 workflows.
5. Define and verify Gemini 503/retry/fallback behavior.
6. Make resume analysis recoverable after provider failure.
7. Configure and verify Admin identity in deployment.
8. Choose one schema authority and validate PostgreSQL migrations.
9. Decide whether jobs data is required for V1; seed/ingest only if approved.
10. Reconcile the official V1 scope and remove unsupported historical PASS claims.

## 14. Changes Explicitly Not Allowed

- No React Router introduction.
- No replacement state-management library.
- No replacement AI gateway/provider architecture.
- No frontend redesign or duplicate pages.
- No framework migration.
- No broad database rewrite.
- No fake jobs, fake AI output, or mocked production success.
- No weakening auth, ownership checks, rate limiting, validation, or lint rules.
- No deleting tests or changing assertions only to obtain green results.
- No deployment or schema migration during the decision phase.

## 15. Recommended Implementation Order

1. Establish the approved V1 scope and classify historical features.
2. Stabilize deterministic test collection and separate live AI smoke tests.
3. Lock down deployment configuration: secret, origins, admin identity, database, Redis, storage.
4. Complete authorization and two-user ownership regression coverage.
5. Complete authentication refresh/retry and browser persistence gates.
6. Harden Gemini failure/retry/fallback behavior.
7. Harden resume persistence and retry behavior.
8. Complete approved core browser workflows: profile, goals, workspace, chat, roadmap, GradHub, toolkit.
9. Decide jobs data policy and verify the approved empty/data-backed behavior.
10. Run final frontend/backend/browser/security regression and update certification reports.

## 16. Risks and Dependencies

- Gemini availability, quota, and 503 behavior affect resume, chat, roadmap, interview, and toolkit workflows.
- Ollama is unavailable in the observed environment, so it cannot currently be relied on as fallback.
- PostgreSQL/Redis deployment behavior is not equivalent to local SQLite/no-Redis development.
- Admin authorization depends on correct deployment configuration.
- Historical documentation conflicts with current route inventory and can cause accidental scope expansion.
- Import-time app setup and test-side effects make regression results unreliable.
- Local file storage and missing cleanup/scan policy create operational and security exposure.
- Outbox worker behavior may require coordination when scaling beyond one backend process.

## Final Decision

**SAARTHI V1: BLOCKED pending the approved release plan.**

### P0 — Must fix

- None observed at P0 severity in the current audit.

### P1 — Must fix before release

- Make pytest collection and full regression deterministic and side-effect free.
- Complete and pass authorization/ownership isolation gates for all user-owned resources.
- Decide and correctly configure Admin identity/authorization for deployment.
- Choose one database schema authority and validate PostgreSQL migrations.
- Resolve the approved V1 scope/documentation contradiction.

### P2 — Should fix

- Add Gemini retry/backoff/circuit-breaker and provider-aware health behavior.
- Make resume AI failure recoverable and define persistence timing.
- Standardize AI/API response schemas and malformed-output handling.
- Complete browser persistence/action coverage for approved V1 workflows.
- Decide jobs data policy and improve upload security/storage lifecycle.
- Clarify persona enforcement and guest write boundaries.

### P3 — Optional

- Remove unused `axios`, inactive provider artifacts, and dead `/api/upload-file` wrapper after approval.
- Reduce deprecation warnings and align local Python with deployment Python.
- Consolidate historical audit/documentation artifacts after scope approval.

**No implementation was performed. This document is the final decision sheet for owner review before any approved implementation phase.**