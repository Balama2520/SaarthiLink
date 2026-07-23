# 23 — Testing Strategy

## Philosophy
Testing is not an afterthought. It is the only thing that allows us to move fast without breaking the system. We prioritize confidence over 100% code coverage.

## 1. Backend Testing (Pytest)
- **Unit Tests**: Test the Service Layer in isolation. Mock the Repository Layer. Mock the AI Gateway.
- **Integration Tests**: Test the API routes against a test database (SQLite in-memory or a dedicated PostgreSQL test DB). Do not mock the database. Do mock external AI providers.
- **Fixture Strategy**: Use `conftest.py` to provide reusable fixtures (`test_db`, `test_client`, `mock_user`).

## 2. Frontend Testing
- **Component Tests (Vitest + React Testing Library)**: Test reusable UI components (`Button`, `GoalCard`). Ensure they render correctly and fire events.
- **State Tests**: Unit test Zustand stores and custom hooks.

## 3. End-to-End (E2E) Testing (Playwright)
E2E tests ensure the critical user journeys actually work in a real browser against a real backend.
- **Journey 1**: User registration -> Login -> Create a Goal -> View Dashboard.
- **Journey 2**: Open Chat -> Send Message -> Receive Response.
- **Journey 3**: Workspace -> Upload Document -> See extraction success.

## 4. AI Testing (Evals)
Testing non-deterministic LLMs requires a different approach.
- We maintain a suite of 50 "golden prompts" (e.g., "Plan a 3-week study guide for AWS").
- On major prompt or model changes, we run the suite and manually review the outputs, or use an LLM-as-a-judge to score the outputs for formatting, tone, and accuracy.

## 5. CI/CD Pipeline
- **Pull Requests**: Must pass Prettier/Black formatting, TypeScript compilation, and all Unit/Integration tests before merging.
- **Main Branch**: Runs E2E tests nightly.
