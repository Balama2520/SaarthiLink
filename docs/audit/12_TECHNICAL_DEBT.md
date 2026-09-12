# Technical Debt Audit Report

## Overview
All technical debt items discovered across all audit blocks are consolidated here. Each item is classified by severity and category.

---

## Debt Items

### TD-001: Dual Redis Client Implementations
- **Category**: Architecture
- **Severity**: Medium
- **Location**: `app/memory/redis_client.py`, `app/core/cache.py`
- **Problem**: Two different Redis client implementations (sync and async) exist and are used in different parts of the app.
- **Fix**: Consolidate to single async client in `app/core/cache.py`. Update `CareerCopilotService` to use the async client.
- **Effort**: 2 hours

### TD-002: Business Logic in Router Layer
- **Category**: Architecture
- **Severity**: Medium
- **Location**: `app/api/profile.py` — `_build_profile_response()`, `get_or_create_profile()`
- **Problem**: Data transformation and entity creation logic lives in the router file, not in a service.
- **Fix**: Move to `app/services/profile_service.py` or `app/services/career_service.py`.
- **Effort**: 3 hours

### TD-003: `_strip_markdown_json()` Utility Duplication
- **Category**: Code Quality
- **Severity**: Low
- **Location**: `app/services/career_copilot_service.py` line 20
- **Problem**: JSON stripping utility is defined locally per file. Likely duplicated elsewhere.
- **Fix**: Create `app/core/utils/ai_utils.py` and centralize AI response parsing helpers.
- **Effort**: 1 hour

### TD-004: `window.prompt()` in ChatCoach
- **Category**: UX / Frontend
- **Severity**: High
- **Location**: `frontend/src/pages/ChatCoach.tsx` line 81
- **Problem**: Native browser dialog used for collecting user input. Breaks design, blocked in iframes.
- **Fix**: Replace with an in-component modal or inline form.
- **Effort**: 2 hours

### TD-005: No React Error Boundaries
- **Category**: Frontend Reliability
- **Severity**: High
- **Location**: Missing from all pages and `App.tsx`
- **Problem**: Any uncaught JS error in a component crashes the entire React tree.
- **Fix**: Add a generic `<ErrorBoundary>` wrapper component and apply to all top-level pages.
- **Effort**: 2 hours

### TD-006: Guest Auth State via localStorage Direct Read
- **Category**: Frontend Architecture
- **Severity**: Medium
- **Location**: `ChatCoach.tsx` line 29
- **Problem**: Auth state computed per-render from `localStorage` instead of reactive Zustand store.
- **Fix**: Use `useAppStore` hook consistently for auth state.
- **Effort**: 1 hour

### TD-007: `DecisionEngine` Incomplete LLM Path
- **Category**: Backend / Dead Code
- **Severity**: Low
- **Location**: `app/engine/decision.py` line 34 (commented-out code)
- **Problem**: The LLM evaluation path is disabled but not removed or documented.
- **Fix**: Either activate the path or add a comment explaining it is reserved for V2 development.
- **Effort**: 30 minutes

### TD-008: No AI Response Pydantic Validation
- **Category**: AI Reliability
- **Severity**: High
- **Location**: `app/services/career_copilot_service.py` lines 67–71
- **Problem**: Raw JSON from LLM is parsed with `json.loads()` without schema validation. Missing keys cause `KeyError` at runtime.
- **Fix**: Define `RoadmapResponse`, `SkillGapResponse`, `JobStrategyResponse` Pydantic models. Validate after parsing.
- **Effort**: 4 hours

### TD-009: No db-level `ondelete="CASCADE"` on User FK References
- **Category**: Database
- **Severity**: High
- **Location**: Most tables with `ForeignKey("users.id")` in `models.py`
- **Problem**: Cascade deletes rely solely on SQLAlchemy ORM session, not the database layer. Raw SQL deletes or ORM failures create orphaned records or IntegrityErrors.
- **Fix**: Add `ondelete="CASCADE"` to FK definitions + generate an Alembic migration.
- **Effort**: 2 hours + migration

### TD-010: Rate Limiting Disabled by Default
- **Category**: Security / Operations
- **Severity**: High
- **Location**: `app/core/config.py` line 33
- **Problem**: `RATE_LIMIT_ENABLED` defaults to `false`, exposing AI endpoints to abuse.
- **Fix**: Set default to `true` or enforce it on AI routes unconditionally.
- **Effort**: 1 hour

### TD-011: CORS Wildcard Default
- **Category**: Security
- **Severity**: High
- **Location**: `app/core/config.py` line 30
- **Problem**: `ALLOWED_ORIGINS` defaults to `"*"`.
- **Fix**: Update `.env.example` with the correct frontend domain. Document required production value.
- **Effort**: 30 minutes

### TD-012: `VERSION` String in Config Mismatch
- **Category**: Documentation
- **Severity**: Low
- **Location**: `app/core/config.py` line 12
- **Problem**: `VERSION: str = "2.1.0"` — Version string is set to 2.1.0 inside the V1 codebase during the V1 Production Freeze.
- **Fix**: Align the version string with the actual release version of V1.
- **Effort**: 5 minutes

## Summary

| Severity | Count |
|---|---|
| High | 5 |
| Medium | 4 |
| Low | 3 |
| **Total** | **12** |
