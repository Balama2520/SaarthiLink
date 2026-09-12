# 03 — System Architecture

## Overview

Saarthi AI is architected as a layered, modular system. Each layer has a single responsibility and communicates via well-defined contracts. No layer depends on implementation details of another.

---

## Architecture Layers

```
┌─────────────────────────────────────────────┐
│                  FRONTEND                   │
│   React 19 · TypeScript · Vite · Tailwind  │
│   Feature-first folder structure            │
└────────────────────┬────────────────────────┘
                     │ HTTP / WebSocket
┌────────────────────▼────────────────────────┐
│               API GATEWAY                   │
│   FastAPI · JWT Auth · Rate Limiting        │
│   Input validation · CORS · Logging         │
└────────────────────┬────────────────────────┘
                     │ Service calls
┌────────────────────▼────────────────────────┐
│              BACKEND CORE                   │
│   Domain Services · Repository Pattern     │
│   Business Logic · Event Handlers          │
└─────┬──────────┬──────────┬────────────────┘
      │          │          │
┌─────▼──┐  ┌───▼────┐  ┌──▼──────┐
│  GOAL  │  │MEMORY  │  │KNOWLEDGE│
│ ENGINE │  │ENGINE  │  │ENGINE   │
└─────┬──┘  └───┬────┘  └──┬──────┘
      │          │          │
┌─────▼──────────▼──────────▼──────┐
│            AI GATEWAY             │
│  Provider Router · Prompt Engine  │
│  Fallback · Cost Estimation       │
│  Ollama | Gemini | OpenAI | Claude│
└───────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│            AGENT SYSTEM                     │
│  Planner · Research · Career · Learning     │
│  Each agent: own prompt, tools, memory      │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│          AUTOMATION ENGINE                  │
│  Background Jobs · Notifications            │
│  Reminders · Scheduled Tasks               │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│              DATABASE LAYER                 │
│  PostgreSQL (primary) · Redis (cache)       │
│  Qdrant (vectors) · R2 (files)             │
└─────────────────────────────────────────────┘
```

---

## Directory Structure (Target)

```
saarthi/
├── frontend/
│   └── src/
│       ├── app/                    # Router, providers, global setup
│       ├── components/             # Shared UI primitives only
│       │   └── ui/                 # shadcn/ui components
│       ├── layouts/                # Page layout shells
│       ├── hooks/                  # Custom React hooks
│       ├── services/               # API clients
│       ├── stores/                 # Zustand global state
│       └── features/               # Feature-first modules
│           ├── home/
│           ├── goals/
│           ├── chat/
│           ├── workspace/
│           ├── career/             # All career tools
│           ├── research/
│           ├── learning/
│           └── settings/
├── backend/
│   └── app/
│       ├── api/                    # HTTP route handlers (thin layer)
│       ├── services/               # Business logic (thick layer)
│       ├── repositories/           # Database queries ONLY
│       ├── models/                 # SQLAlchemy models
│       ├── schemas/                # Pydantic schemas (separate from models)
│       ├── ai/                     # AI Gateway + LLM clients
│       ├── agents/                 # Agent definitions
│       ├── memory/                 # Memory service layer
│       ├── rag/                    # RAG / knowledge engine
│       ├── auth/                   # Auth middleware + JWT
│       ├── database/               # DB engine and session
│       ├── workers/                # Background job definitions
│       └── utils/                  # Pure utility functions
└── docs/                           # Architecture documentation (this)
```

---

## Design Principles

| Principle              | Application                                            |
|------------------------|--------------------------------------------------------|
| Single Responsibility  | Each module does one thing                             |
| Open/Closed            | Add new providers without modifying AI Gateway core    |
| Dependency Inversion   | Services depend on abstractions, not implementations   |
| Feature Isolation      | Career changes cannot break Research module            |
| Provider Agnosticism   | AI calls never reference a specific provider directly  |
| Fail Gracefully        | Ollama offline → automatic Gemini fallback             |

---

## Communication Contracts

- **Frontend → Backend**: REST over HTTP + WebSocket for streaming
- **Backend → AI Gateway**: Internal Python async call
- **AI Gateway → Providers**: HTTP (Ollama REST, Gemini API, OpenAI API)
- **Backend → Database**: SQLAlchemy ORM (no raw SQL in routes)
- **Backend → Cache**: Redis client via `memory/redis_client.py`
- **Backend → Vector DB**: ChromaDB (MVP) → Qdrant (production)
