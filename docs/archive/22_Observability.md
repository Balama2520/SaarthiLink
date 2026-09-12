# 22 — Observability

## Goal
You cannot improve what you cannot measure. Saarthi AI must have full visibility into system health, AI performance, and user errors.

## 1. Structured Logging
All backend logs must be output in JSON format so they can be parsed by external log aggregators (e.g., Datadog, ELK, or basic CloudWatch).

**Schema:**
```json
{
  "timestamp": "2026-07-19T10:00:00Z",
  "level": "INFO",
  "module": "app.ai.llm",
  "message": "AI Request Completed",
  "context": {
    "user_id": "123",
    "goal_id": "abc-456",
    "provider": "ollama",
    "model": "phi3",
    "latency_ms": 1205,
    "tokens": 450
  }
}
```

## 2. Distributed Tracing
Because requests pass through multiple layers (API -> Service -> PromptEngine -> AIGateway -> Ollama), we must use a Trace ID to track the lifecycle of a request.
- The Frontend generates a `X-Request-ID` header.
- The Backend logger injects this ID into every log line associated with that request.

## 3. Metrics to Track
- **API Health**: Request volume, 4xx/5xx error rates, response latency (P50, P95, P99).
- **AI Health**: Provider fallback rate (how often does Ollama fail?), average generation latency, token usage per provider.
- **Product Health**: Goals created per day, task completion rate, session length.

## 4. Alerts
- **P0**: Backend API down or PostgreSQL unreachable. (Immediate page).
- **P1**: Primary AI provider (Ollama) offline, fallback engaged. (Email/Slack alert).
- **P2**: High rate of 500 errors in a specific module (e.g., Resume parser failing).
