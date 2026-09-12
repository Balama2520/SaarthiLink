# Database Audit Report

## Schema Overview
The database uses SQLAlchemy ORM mapping to SQLite (intended for Postgres in production).

## Findings

### 1. Inconsistent Primary Key Types
- **Observation**: The `User` and `ChatMessage` models use `Integer` primary keys with `autoincrement`. Most other models (e.g., `AIWorkspace`, `Resume`, `Project`) use `String` primary keys populated by `uuid.uuid4()`.
- **Impact**: Foreign Key joins and conceptual consistency is slightly fragmented.
- **Risk**: Low, but represents technical debt.

### 2. Missing DB-Level Cascade Deletes (CRITICAL)
- **Observation**: Relationships in the `User` model (e.g., `resumes`, `sessions`, `goals`) define SQLAlchemy-level cascades (`cascade="all, delete-orphan"`). However, the actual Foreign Key definitions in the child tables (e.g., `user_id = Column(Integer, ForeignKey("users.id"))`) do **NOT** define `ondelete="CASCADE"`. 
- **Impact**: If a user is deleted via raw SQL or if SQLAlchemy's session handling fails to load all children into memory before deletion, it will throw an IntegrityError (Foreign Key Constraint Violation) or leave orphaned records.
- **Recommendation**: Add `ondelete="CASCADE"` to all ForeignKeys referencing `users.id` (similar to how it is properly done in `JobSkill` referencing `jobs.id`).

### 3. JSON Columns without Constraints
- **Observation**: Many fields (e.g., `preferred_domains_json`, `soft_skills_json`, `parsed_json`) use `Text` columns to store stringified JSON.
- **Impact**: SQLite lacks native JSON validation constraints. If deployed to PostgreSQL in the future, these should be migrated to `JSONB` for native querying and validation.

### 4. Duplicate Detection Hash
- **Observation**: The `Job` model uses `dedup_hash = Column(String(64), unique=True)`.
- **Impact**: Excellent optimization for preventing duplicate job seedings.

## CTO Recommendations
1. **[Priority: HIGH]** Refactor all Foreign Keys mapping to `users.id` to include `ondelete="CASCADE"`. This must be fixed in Version 1.
2. **[Priority: LOW]** Document the UUID vs Integer PK decision in `docs/DECISIONS.md`.
