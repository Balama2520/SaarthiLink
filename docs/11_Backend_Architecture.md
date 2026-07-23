# 11 — Backend Architecture

## Stack

| Component       | Technology              |
|-----------------|-------------------------|
| Web Framework   | FastAPI                 |
| ORM             | SQLAlchemy 2.x          |
| Migrations      | Alembic                 |
| Validation      | Pydantic v2             |
| Auth            | JWT (python-jose)       |
| Password Hash   | bcrypt (passlib)        |
| HTTP Client     | httpx (async)           |
| Task Queue      | Celery + Redis (future) |
| Testing         | pytest + pytest-asyncio |

---

## Layered Architecture

```
HTTP Request
     │
     ▼
┌──────────────────────────────────┐
│       API Layer (routes/)        │  ← Thin: parse request, validate, call service
│  Only knows about HTTP concerns  │
└─────────────────┬────────────────┘
                  │
                  ▼
┌──────────────────────────────────┐
│     Service Layer (services/)    │  ← Thick: all business logic lives here
│  Orchestrates repos, AI, memory  │
└─────────────────┬────────────────┘
                  │
                  ▼
┌──────────────────────────────────┐
│  Repository Layer (repositories/)│  ← DB queries ONLY. No business logic.
│  Returns domain models           │
└─────────────────┬────────────────┘
                  │
                  ▼
┌──────────────────────────────────┐
│         Database (SQLAlchemy)    │
└──────────────────────────────────┘
```

---

## Current State Assessment

| File/Module                     | Status    | Action                                        |
|---------------------------------|-----------|-----------------------------------------------|
| `app/main.py`                   | REFACTOR  | Remove static file serving, add lifespan      |
| `app/config.py`                 | REFACTOR  | Update SYSTEM_PROMPT to be OS-oriented        |
| `app/database/connection.py`    | KEEP      | Clean, works with both SQLite and Postgres     |
| `app/models/models.py`          | REFACTOR  | Split into separate domain model files         |
| `app/db_models/` (empty)        | DELETE    | Remove empty directory                         |
| `app/auth/auth.py`              | KEEP      | JWT logic works correctly                      |
| `app/services/auth_service.py`  | KEEP      | bcrypt hashing works                           |
| `app/services/ai_service.py`    | DELETE    | Functionality absorbed by `app/ai/llm.py`      |
| `app/services/file_service.py`  | KEEP      | File upload and text extraction works          |
| `app/services/resume_service.py`| MOVE      | → Career module service                        |
| `app/services/memory_service.py`| MERGE     | Merge with `memory_json_service.py` into one   |
| `app/services/voice_service.py` | KEEP      | Low priority, works                            |
| `app/ai/llm.py`                 | REFACTOR  | Add provider abstraction class                 |
| `app/rag/rag.py`                | KEEP      | RAG works, rename to knowledge_engine later    |
| `app/memory/redis_client.py`    | KEEP      | Redis connection works, add fallback           |
| `app/agents/graph.py`           | REFACTOR  | Expand to proper agent system                  |
| `app/utils/logging.py`          | KEEP      | Keep, add structured JSON logging              |
| `app/utils/validators.py`       | KEEP      | Minimal, extend as needed                      |

---

## Target Backend Folder Structure

```
backend/app/
├── main.py                     # FastAPI app init + lifespan
├── config.py                   # Settings via pydantic-settings
├── api/                        # Route handlers (thin layer)
│   ├── router.py               # Master router
│   ├── auth.py                 # Auth endpoints
│   ├── goals.py                # Goal CRUD endpoints
│   ├── chat.py                 # Chat/session endpoints
│   ├── workspace.py            # Workspace endpoints
│   ├── notes.py                # Notes endpoints
│   ├── admin.py                # Admin endpoints
│   └── career/                 # Career module API namespace
│       ├── __init__.py
│       ├── resume.py
│       ├── jobs.py
│       ├── interview.py
│       ├── roadmap.py
│       ├── gradhub.py
│       └── higher_studies.py
├── services/                   # Business logic (thick layer)
│   ├── goal_service.py
│   ├── chat_service.py
│   ├── workspace_service.py
│   ├── auth_service.py
│   ├── file_service.py
│   └── career/
│       └── resume_service.py
├── repositories/               # Database queries ONLY
│   ├── goal_repository.py
│   ├── user_repository.py
│   └── session_repository.py
├── models/                     # SQLAlchemy ORM models (split by domain)
│   ├── user.py
│   ├── goal.py
│   ├── chat.py
│   ├── workspace.py
│   └── career.py
├── schemas/                    # Pydantic request/response schemas (NEW)
│   ├── goal.py
│   ├── auth.py
│   └── chat.py
├── ai/                         # AI Gateway
│   ├── gateway.py              # Main entry point
│   ├── providers/
│   │   ├── base.py
│   │   ├── ollama.py
│   │   └── gemini.py
│   └── prompt_engine.py
├── agents/                     # Agent definitions
│   ├── base_agent.py
│   └── planner_agent.py
├── memory/                     # Memory services
│   ├── redis_client.py
│   ├── conversation_memory.py
│   └── goal_memory.py
├── rag/                        # Knowledge engine (RAG)
│   └── knowledge_engine.py
├── auth/                       # Auth middleware
│   └── auth.py
├── database/                   # DB connection
│   └── connection.py
├── workers/                    # Background jobs (future)
│   └── scheduler.py
└── utils/
    ├── logging.py
    └── validators.py
```

---

## API Design Conventions

1. All endpoints prefixed with `/api`
2. Career endpoints grouped under `/api/career/`
3. Resources use plural nouns: `/api/goals/`, `/api/sessions/`
4. Actions use verbs only for non-CRUD: `/api/goals/{id}/plan`
5. HTTP status codes strictly followed:
   - `200` OK (GET)
   - `201` Created (POST)
   - `204` No Content (DELETE)
   - `400` Bad Request (validation fail)
   - `401` Unauthorized (no/bad token)
   - `403` Forbidden (insufficient permissions)
   - `404` Not Found
   - `429` Too Many Requests
   - `500` Internal Server Error
6. All responses follow standard envelope: `{ data, error, meta }`

---

## Dependency Injection Pattern

```python
# ✅ Correct — injectable, testable
def get_goal_service(db: Session = Depends(get_db)) -> GoalService:
    return GoalService(GoalRepository(db))

@router.get("/goals/")
def list_goals(
    current_user: User = Depends(get_current_user),
    service: GoalService = Depends(get_goal_service)
):
    return service.get_user_goals(current_user.id)
```

```python
# ❌ Wrong — imports DB inside route handler
@router.get("/goals/")
def list_goals(db: Session = Depends(get_db)):
    goals = db.query(Goal).filter(Goal.user_id == ...).all()  # business logic in route
    return goals
```
