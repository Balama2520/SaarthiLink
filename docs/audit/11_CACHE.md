# Cache Audit Report

## Overview
Saarthi uses two Redis client implementations: a synchronous one (`redis_client.py`) and an async one (`cache.py`). The career copilot module uses the synchronous client for module-level caching.

---

## Findings

### 1. Two Separate Redis Clients (MEDIUM RISK)
- **Location**: `app/memory/redis_client.py` and `app/core/cache.py`
- **Observation**: Two independent Redis connection pools exist simultaneously:
  - `redis_client.py`: Synchronous `redis.Redis` with 3600s TTL for career module caches.
  - `cache.py`: Async `redis.asyncio` for general purpose caching.
- **Impact**: Inconsistent behavior (sync vs async), two separate connection pools wasting resources, potential race conditions on overlapping cache keys.
- **Recommendation**: Consolidate to a single async Redis client (`app/core/cache.py` pattern). Update `career_copilot_service.py` to use it.

### 2. Cache TTL — Career Modules (MEASURED)
- **Roadmap, Skill Gap, Job Strategy**: TTL = **3600 seconds (1 hour)**
  - Source: `career_copilot_service.py` line 79
- **Chat Sessions**: TTL = **3600 seconds (1 hour)**
  - Source: `redis_client.py` line 25

### 3. Cache Invalidation on Profile Update (MEDIUM RISK)
- **Location**: `career_copilot_service.py` line 81–84
- **Observation**: `invalidate_cache()` only invalidates `roadmap`, `skill_gap`, and `job_strategy`. However, if the user updates their profile or uploads a new resume, the cache is **not automatically invalidated**.
- **Impact**: After a resume upload or profile update, the career copilot will serve stale data for up to 1 hour unless the user manually clicks "Regenerate".
- **Recommendation**: Call `invalidate_cache(user_id)` in the profile update endpoint and the resume parsing completion endpoint.

### 4. Redis Graceful Degradation (GOOD)
- **Observation**: Both Redis clients properly handle `Redis not available` by setting `self.client = None` and returning `None` from all cache operations. The application falls back to re-computing data.
- **Status**: Positive finding — the application does not crash if Redis is unavailable.

### 5. Cache Key Naming (GOOD)
- **Observation**: Cache keys follow a consistent namespace: `career:{module}:{user_id}` (e.g., `career:roadmap:42`).
- **Status**: Positive finding.

### 6. No Cache Stampede Protection (LOW RISK)
- **Observation**: When a cache miss occurs for multiple concurrent requests, all of them will simultaneously trigger expensive AI calls.
- **Recommendation**: Implement a `probabilistic early expiration` or a distributed lock (Redis `SETNX`) to prevent stampedes. Low priority for V1.

## CTO Recommendations
1. **[MEDIUM]** Consolidate to a single async Redis client.
2. **[MEDIUM]** Auto-invalidate career caches on profile update and resume upload.
3. **[LOW]** Document cache stampede risk as a known V2 issue.
