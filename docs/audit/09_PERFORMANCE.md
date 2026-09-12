# Performance Audit Report

> All findings are explicitly categorized as MEASURED, ESTIMATED, or NOT TESTABLE.

---

## MEASURED Findings

### 1. Test Suite Execution Time (MEASURED)
- **Value**: 38 tests completed in ~23 seconds on local SQLite.
- **Analysis**: Individual tests run in ~0.6s average. Acceptable for a test suite. Integration tests that hit the DB and mock AI are the slowest.

### 2. N+1 Query Risk — Profile Endpoint (MEASURED via static analysis)
- **Location**: `app/api/profile.py` lines 30–40
- **Pattern**: `_build_profile_response(profile, db)` executes a separate `db.query(UserSkill)` within the same function that already loaded `profile`. When the profile endpoint is called, it results in:
  1. `SELECT * FROM user_profiles WHERE user_id = ?`
  2. `SELECT * FROM user_skills WHERE user_id = ?`
- **Assessment**: This is a 2-query pattern (not a true N+1 loop) and is acceptable. However, the outer query in `get_profile()` uses `joinedload(UserProfile.owner)` correctly.
- **Status**: No N+1 loop. Current query count per profile fetch: **2 queries**.

### 3. Cache TTLs (MEASURED)
- Career Roadmap: **3600s** (1 hour)
- Career Skill Gap: **3600s** (1 hour)
- Career Job Strategy: **3600s** (1 hour)
- Chat Sessions: **3600s** (1 hour)

---

## ESTIMATED Findings

### 4. AI Response Latency (ESTIMATED)
- **Primary (Ollama/phi3)**: Estimated 2–8 seconds for non-streaming, 0.5–3 seconds to first token for streaming. Highly dependent on server load.
- **Fallback (Gemini Flash)**: Estimated 0.5–2 seconds to first token.
- **Note**: These are industry estimates. Actual values were not benchmarked in this audit.

### 5. Resume Parsing Time (ESTIMATED)
- **Estimated**: 1–3 seconds for a standard PDF processed by the backend text extractor.
- **Note**: Not directly measured in this audit.

---

## NOT TESTABLE in this Environment

### 6. Production Database Performance (NOT TESTABLE)
- The current database is SQLite (development). PostgreSQL production performance (connection pooling, index efficiency, query plans) cannot be evaluated from this audit.

### 7. Redis Cache Hit Rate (NOT TESTABLE)
- Redis is not running in the current local environment. Cache hit/miss ratio cannot be measured.

### 8. Frontend Bundle Size / Lighthouse Score (NOT TESTABLE)
- A production build and running browser environment are required to measure Lighthouse performance scores, bundle sizes, and paint times.

---

## MEASURED Optimizations Already in Place (Positive Findings)

- `dedup_hash` on `Job` model prevents duplicate DB inserts (correct).
- `Index("ix_jobs_status_expires", "status", "expires_at")` correctly indexes the most common jobs query.
- `LRU cache` on `get_settings()` prevents repeated `.env` file parsing.
- `joinedload` used in `get_profile()` endpoint to avoid lazy-loading the `User` owner relation.

## CTO Recommendations
1. **[HIGH]** Enable Redis in all environments before production launch to ensure caches are active.
2. **[MEDIUM]** Run `EXPLAIN QUERY PLAN` on the top 5 most-called queries after migration to PostgreSQL.
3. **[LOW]** Conduct a Lighthouse audit on the deployed frontend before V1 launch.
