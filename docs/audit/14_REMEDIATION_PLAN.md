# Remediation Plan

> Generated: 2026-08-07 | Priority Order: P0 → P1 → P2 → P3  
> **Last Verified: 2026-08-18 | All 12 bugs FIXED — Zero remaining open items.**

---

## Status Summary

| Severity | Total | Fixed | Open |
|---|---|---|---|
| CRITICAL (P0) | 1 | ✅ 1 | 0 |
| HIGH (P1) | 6 | ✅ 6 | 0 |
| MEDIUM (P2) | 3 | ✅ 3 | 0 |
| LOW (P3) | 2 | ✅ 2 | 0 |
| **TOTAL** | **12** | **12** | **0** |

---

## P0 — Already Fixed

### ✅ BUG-001: `get_db` ImportError in `services.py`
- **Fix**: Changed `from app.core.dependencies.database import get_db` to `from app.database.connection import get_db`.
- **Verified**: All 56 tests now pass.

---

## P1 — All Fixed ✅

### ✅ BUG-002: AI JSON Response Not Validated
- **Fix**: `app/schemas/ai_responses.py` created with `RoadmapResponse`, `SkillGapResponse`, `JobStrategyInsights`, `JobStrategyResponse`. All three copilot methods validate LLM output via Pydantic and return structured errors on failure.

### ✅ BUG-003: Missing `ondelete="CASCADE"` on User FKs
- **Fix**: All `ForeignKey("users.id")` in `models.py` now include `ondelete="CASCADE"`. Alembic migration `6297327ece39` applied, covering all 20+ tables. `RefreshToken` table also created.

### ✅ BUG-004: `window.prompt()` in ChatCoach
- **Fix**: Replaced with in-component modal using `showNameModal`, `guestNameInput`, `pendingMessage` state. Styled overlay dialog with proper form handling.

### ✅ BUG-005: No React Error Boundaries
- **Fix**: `frontend/src/components/ErrorBoundary.tsx` created. Root `App.tsx` now wraps both the outermost div and inner `<main>` workspace with nested `<ErrorBoundary>` components. Dev-only stack trace included.

### ✅ BUG-006: Rate Limiting Disabled by Default
- **Fix**: `RATE_LIMIT_ENABLED` reads from env and defaults to `true`. `.env.example` documents this with explanation.

### ✅ BUG-007: CORS Wildcard Default
- **Fix**: `ALLOWED_ORIGINS` defaults to `""` (empty — blocks all). `.env.example` documents the correct production value with a warning comment.

---

## P2 — All Fixed ✅

### ✅ BUG-008: Stale Cache After Profile/Resume Update
- **Fix**: `CareerCopilotService(db).invalidate_cache(current_user.id)` called at end of `update_profile()` (profile.py:148) and after resume commit (resume.py:107).

### ✅ BUG-009: Prompt Injection via User Fields
- **Fix** (two layers): Data layer wraps all user content in `[USER CONTEXT BEGIN/END]` delimiters. Prompt layer (`central_context.md`) has an explicit SECURITY POLICY section instructing the model to treat those blocks as untrusted data only.

### ✅ BUG-010: JWT 7-Day Expiry + No Revocation
- **Fix**: `ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24` (24h). Full refresh token system implemented with `RefreshToken` model, `/auth/refresh` and `/auth/logout` endpoints, and Alembic migration.

---

## P3 — All Fixed ✅

### ✅ BUG-011: VERSION Mismatch
- **Fix**: `VERSION: str = "1.0.0"` set in `app/core/config.py`.

### ✅ BUG-012: Install `pytest-asyncio`
- **Fix**: `backend/requirements-dev.txt` created with `pytest-asyncio==0.26.0`. Also added to `requirements.txt`.

---

## Technical Debt Remediation (Post-Bug-Fixes)

| ID | Description | Effort |
|---|---|---|
| TD-001 | Consolidate dual Redis clients | 2h |
| TD-002 | Move profile logic to service layer | 3h |
| TD-003 | Centralize `_strip_markdown_json()` utility | 1h |
| TD-012 | Fix VERSION string | 5min |

---

## Total Effort — All Completed

| Priority | Total Hours | Status |
|---|---|---|
| P0 (Critical) | ~0.1 hours | ✅ DONE |
| P1 (Before Production) | ~11.5 hours | ✅ DONE |
| P2 (Before V1 Launch) | ~9 hours | ✅ DONE |
| P3 (Polish) | ~0.5 hours | ✅ DONE |
| Technical Debt (partial) | ~3 hours | ✅ Partially done |
| **TOTAL** | **~24 hours** | **✅ ALL BUGS CLOSED** |
