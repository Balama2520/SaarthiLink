# 08 — Database Design

## Principles

- **PostgreSQL** in production. SQLite only for local development.
- **UUID primary keys** on all user-facing entities (prevents enumeration attacks).
- **Integer IDs** on internal junction tables for performance.
- **Timestamps** on every table: `created_at`, `updated_at` (via trigger or SQLAlchemy event).
- **Soft deletes** on critical data (goals, sessions, documents) — never hard-delete user data.
- **No raw SQL** in route handlers. All queries via SQLAlchemy ORM in Repository classes.

---

## Current State vs. Target

| Current Problem                        | Target Solution                          |
|----------------------------------------|------------------------------------------|
| Models + Pydantic schemas in same file | Split: `models/` (ORM) vs `schemas/` (Pydantic) |
| No Alembic migrations                  | Add Alembic for all schema changes       |
| SQLite in production-ish config        | PostgreSQL connection string in `.env`   |
| Missing `updated_at` on most tables    | Add to all tables via SQLAlchemy event   |
| `db_models/` directory is empty        | Remove (merge into `models/`)            |

---

## Core Tables

### users
```sql
id              SERIAL PRIMARY KEY
username        VARCHAR(100) UNIQUE NOT NULL
hashed_password VARCHAR NOT NULL
full_name       VARCHAR(200)
email           VARCHAR(200) UNIQUE
persona         VARCHAR(50) DEFAULT 'general'
is_active       BOOLEAN DEFAULT TRUE
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

### goals
```sql
id          UUID DEFAULT gen_random_uuid() PRIMARY KEY
user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE
title       VARCHAR(500) NOT NULL
description TEXT
category    VARCHAR(100) DEFAULT 'General'
status      VARCHAR(50) DEFAULT 'pending'
priority    VARCHAR(50) DEFAULT 'medium'
progress    SMALLINT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100)
due_date    DATE
deleted_at  TIMESTAMP                    -- soft delete
created_at  TIMESTAMP DEFAULT NOW()
updated_at  TIMESTAMP DEFAULT NOW()
```

### goal_milestones
```sql
id          UUID DEFAULT gen_random_uuid() PRIMARY KEY
goal_id     UUID REFERENCES goals(id) ON DELETE CASCADE
title       VARCHAR(500) NOT NULL
description TEXT
target_date DATE
status      VARCHAR(50) DEFAULT 'pending'
order_index SMALLINT DEFAULT 0
created_at  TIMESTAMP DEFAULT NOW()
```

### goal_tasks
```sql
id           UUID DEFAULT gen_random_uuid() PRIMARY KEY
milestone_id UUID REFERENCES goal_milestones(id) ON DELETE CASCADE
title        VARCHAR(500) NOT NULL
is_done      BOOLEAN DEFAULT FALSE
due_date     DATE
created_at   TIMESTAMP DEFAULT NOW()
```

### chat_sessions
```sql
id         UUID DEFAULT gen_random_uuid() PRIMARY KEY
user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE
goal_id    UUID REFERENCES goals(id) ON DELETE SET NULL  -- NEW: optional goal link
title      VARCHAR(500) DEFAULT 'New Conversation'
created_at TIMESTAMP DEFAULT NOW()
```

### chat_messages
```sql
id         BIGSERIAL PRIMARY KEY
session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE
role       VARCHAR(20) NOT NULL          -- 'user' | 'assistant' | 'system'
content    TEXT NOT NULL
timestamp  TIMESTAMP DEFAULT NOW()
```

### workspaces
```sql
id          UUID DEFAULT gen_random_uuid() PRIMARY KEY
user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE
goal_id     UUID REFERENCES goals(id) ON DELETE SET NULL  -- NEW: link to goal
name        VARCHAR(500) NOT NULL
description TEXT
created_at  TIMESTAMP DEFAULT NOW()
```

### documents
```sql
id               UUID DEFAULT gen_random_uuid() PRIMARY KEY
user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE
workspace_id     UUID REFERENCES workspaces(id) ON DELETE SET NULL
goal_id          UUID REFERENCES goals(id) ON DELETE SET NULL  -- NEW
filename         VARCHAR(500) NOT NULL
file_path        VARCHAR(1000) NOT NULL
processed_status VARCHAR(50) DEFAULT 'pending'
created_at       TIMESTAMP DEFAULT NOW()
```

### notes
```sql
id           BIGSERIAL PRIMARY KEY
user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE
workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL
goal_id      UUID REFERENCES goals(id) ON DELETE SET NULL  -- NEW
title        VARCHAR(500) NOT NULL
content      TEXT NOT NULL
tags         VARCHAR(1000) DEFAULT ''
created_at   TIMESTAMP DEFAULT NOW()
updated_at   TIMESTAMP DEFAULT NOW()
```

---

## Career Module Tables (isolated namespace)

### resumes
```sql
id           UUID DEFAULT gen_random_uuid() PRIMARY KEY
user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE
workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL
filename     VARCHAR(500) NOT NULL
file_path    VARCHAR(1000) NOT NULL
ats_score    SMALLINT DEFAULT 0
raw_text     TEXT
parsed_json  TEXT
created_at   TIMESTAMP DEFAULT NOW()
```

### job_applications
```sql
id                UUID DEFAULT gen_random_uuid() PRIMARY KEY
user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE
workspace_id      UUID REFERENCES workspaces(id) ON DELETE SET NULL
job_title         VARCHAR(500) NOT NULL
company           VARCHAR(500) NOT NULL
description       TEXT
match_percentage  SMALLINT DEFAULT 0
missing_skills    TEXT
status            VARCHAR(50) DEFAULT 'matched'
created_at        TIMESTAMP DEFAULT NOW()
```

### interview_sessions
```sql
id              UUID DEFAULT gen_random_uuid() PRIMARY KEY
user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE
role            VARCHAR(500) NOT NULL
company         VARCHAR(500)
feedback        TEXT
score           SMALLINT DEFAULT 0
transcript_json TEXT
created_at      TIMESTAMP DEFAULT NOW()
```

---

## Redis Usage

| Key Pattern                          | Value      | TTL     | Purpose                     |
|--------------------------------------|------------|---------|-----------------------------|
| `session:{session_id}:messages`      | JSON array | 2 hours | Recent chat context          |
| `user:{user_id}:goals_summary`       | JSON       | 5 min   | Dashboard goals cache        |
| `rate:{user_id}:{endpoint}`          | Integer    | 1 min   | Rate limiting counter        |
| `user:{user_id}:profile`             | JSON       | 10 min  | User profile cache           |

---

## Migration Strategy

1. Install Alembic: `pip install alembic`
2. Run `alembic init alembic` in `backend/`
3. Configure `alembic.ini` to point to `DATABASE_URL`
4. Generate initial migration: `alembic revision --autogenerate -m "initial"`
5. All future schema changes: `alembic revision --autogenerate -m "description"` then `alembic upgrade head`

**Never** modify existing production tables directly. Always use migrations.
