# Architecture Audit Report

## Overview
Saarthi Version 1 follows a layered, service-oriented architecture (FastAPI backend + React/Vite frontend). The backend heavily relies on Dependency Injection to pass database sessions and repository instances to services.

## Backend Architecture
**Pattern**: Controller-Service-Repository
- **Controllers** (`app/api/`): Define endpoints, validation (Pydantic), and auth.
- **Services** (`app/services/`): Pure business logic.
- **Repositories** (`app/repositories/`): SQLAlchemy queries and database interactions.

**Findings**:
- **Single Responsibility**: Mostly adhered to. `CareerCopilotService` effectively acts as an orchestrator for the `CareerRepository` and `JobsRepository`.
- **Duplicate Logic**: Minimal, but there is some overlap in how JSON parsing is handled manually across different services instead of a centralized utility.
- **AI Integration**: The `AIGateway` acts as a solid abstraction over LLM calls, protecting business logic from direct LLM API dependency.

## Frontend Architecture
**Pattern**: React + Zustand + React Query
- **State Management**: Zustand handles global auth state (`useAppStore`), while React Query effectively manages server state (caching/fetching).
- **Styling**: Tailwind CSS + generic UI components (shadcn-like).

**Findings**:
- Global state and server state are cleanly separated.
- The `Sidebar.tsx` effectively controls global navigation through conditional rendering of active tabs instead of standard React Router paths for the main workspace view. This might limit deep-linking.

## Folder Organization
- Backend: Clean (`app/`, `tests/`, `scripts/`).
- Frontend: Clean (`src/pages/`, `src/components/`, `src/services/`).

## Technical Debt & Scalability
1. **Deep Linking**: Frontend tab-based navigation prevents sharing URLs to specific pages (e.g. `/dashboard/copilot`).
2. **JSON Parsing Duplication**: Various services strip markdown from LLM outputs manually.

## CTO Recommendations
- Move forward with the current backend layered architecture. It is highly scalable.
- Consider refactoring Frontend activeTab logic into React Router to support deep linking in the future.
