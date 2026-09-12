"""
Full schema migration for Saarthi AI.
Adds all columns that the ORM models define but SQLite DB is missing.
Safe to run multiple times.
"""
from app.database.connection import engine
from sqlalchemy import text, inspect

insp = inspect(engine)

def get_cols(table):
    return {c["name"] for c in insp.get_columns(table)}

def migrate(table, additions):
    """additions = {col_name: "TYPE DEFAULT ..."}"""
    cols = get_cols(table)
    missing = {k: v for k, v in additions.items() if k not in cols}
    if not missing:
        print(f"  {table}: up to date")
        return
    with engine.connect() as conn:
        for col, typedef in missing.items():
            sql = f"ALTER TABLE {table} ADD COLUMN {col} {typedef}"
            conn.execute(text(sql))
            print(f"  {table}: + {col}")
        conn.commit()

# ── users ─────────────────────────────────────────────────────────────────────
migrate("users", {
    "persona":      "VARCHAR DEFAULT 'undergrad'",
    "full_name":    "VARCHAR",
    "email":        "VARCHAR",
    "target_role":  "VARCHAR",
})

# ── goals ─────────────────────────────────────────────────────────────────────
migrate("goals", {
    "parent_id":    "VARCHAR",
    "type":         "VARCHAR DEFAULT 'GOAL'",
    "health_score": "FLOAT DEFAULT 1.0",
    "is_ai_managed":"BOOLEAN DEFAULT 0",
    "reasoning":    "TEXT",
    "confidence":   "FLOAT DEFAULT 1.0",
    "source":       "VARCHAR",
})

# ── notes ─────────────────────────────────────────────────────────────────────
migrate("notes", {
    "updated_at":   "DATETIME",
    "is_pinned":    "BOOLEAN DEFAULT 0",
    "source_topic": "VARCHAR",
})

# ── resumes ───────────────────────────────────────────────────────────────────
migrate("resumes", {
    "workspace_id":  "VARCHAR",
    "file_size":     "INTEGER DEFAULT 0",
    "version":       "INTEGER DEFAULT 1",
    "parsing_status": "VARCHAR DEFAULT 'pending'",
    "ats_score":     "INTEGER DEFAULT 0",
    "raw_text":      "TEXT",
    "parsed_json":   "TEXT",
    "target_role":   "VARCHAR",
    "updated_at":    "DATETIME",
})

# ── workspaces ────────────────────────────────────────────────────────────────
migrate("workspaces", {
    "description":  "TEXT",
    "updated_at":   "DATETIME",
})

# ── chat_sessions ─────────────────────────────────────────────────────────────
migrate("chat_sessions", {
    "title":        "VARCHAR DEFAULT 'Conversation'",
    "updated_at":   "DATETIME",
})

# Re-create all tables (no-ops on existing, adds brand-new tables)
from app import models
models.Base.metadata.create_all(bind=engine)

print("\nMigration complete!")
