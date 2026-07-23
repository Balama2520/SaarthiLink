# 04 — AI Architecture

## The AI Gateway

The AI Gateway is the **only** way to invoke AI in Saarthi. No module, route, or service should import an LLM client directly.

### Why?

- If OpenAI changes their API, we change **one file**, not 50.
- We can route cheaper models for simple tasks, expensive models only when needed.
- We can add new providers (Anthropic, Mistral, local) without touching product code.
- We can track costs, latency, and failures in one place.

---

## Current State (MVP)

```python
# backend/app/ai/llm.py
# ✅ Already has: Ollama → Gemini fallback
# ✅ Already has: Personality-based prompt selection
# ❌ Missing: Provider abstraction class
# ❌ Missing: Cost tracking
# ❌ Missing: Tool calling support
# ❌ Missing: Goal-aware prompting
```

---

## Target AI Gateway Architecture

```
AIGateway
├── providers/
│   ├── base.py           # Abstract AIProvider class
│   ├── ollama.py         # Ollama implementation
│   ├── gemini.py         # Gemini implementation
│   ├── openai.py         # OpenAI implementation (future)
│   └── anthropic.py      # Anthropic implementation (future)
├── router.py             # Selects provider based on rules
├── prompt_engine.py      # Builds prompts from context + goal
├── cost_estimator.py     # Tracks token usage and cost
└── gateway.py            # Main entry point for all AI calls
```

---

## Provider Abstraction (Target Interface)

```python
from abc import ABC, abstractmethod
from typing import AsyncGenerator

class AIProvider(ABC):
    @abstractmethod
    async def stream(
        self,
        messages: list[dict],
        system_prompt: str,
        model: str,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream tokens from the provider."""
        ...

    @abstractmethod
    async def complete(
        self,
        messages: list[dict],
        system_prompt: str,
        model: str,
        **kwargs
    ) -> str:
        """Return complete response as string."""
        ...
```

---

## Prompt Engine

Prompts are **never hardcoded in routes**. They are built by the Prompt Engine.

```python
class PromptEngine:
    def build(
        self,
        agent_type: str,       # "career", "research", "learning"
        goal_context: dict,    # Active goal metadata
        memory_context: str,   # Relevant long-term memory
        workspace_context: str # Active document summaries
    ) -> str:
        ...
```

---

## Supported Providers (Roadmap)

| Provider   | Status       | Use Case                          |
|------------|--------------|-----------------------------------|
| Ollama     | ✅ Active    | Local, free, private              |
| Gemini     | ✅ Fallback  | Free tier with API key            |
| OpenAI     | 🔜 Planned   | GPT-4o for complex reasoning      |
| Anthropic  | 🔜 Planned   | Claude for long documents         |
| Mistral    | 🔜 Planned   | Cost-effective European option    |

---

## Model Routing Rules

| Task Type                  | Model              | Provider |
|----------------------------|--------------------|----------|
| Simple Q&A                 | phi3 / gemma       | Ollama   |
| Resume analysis            | phi3 / mistral     | Ollama   |
| Complex planning           | llama3.1           | Ollama   |
| PDF analysis (long)        | gemini-1.5-flash   | Gemini   |
| Vision tasks               | llava              | Ollama   |
| Fallback (Ollama offline)  | gemini-1.5-flash   | Gemini   |

---

## AI Personality System (Current → Target)

**Current**: Static dictionary in `llm.py`  
**Target**: Goal-aware prompts generated dynamically

```python
# Target: Prompt built from goal context
system_prompt = prompt_engine.build(
    agent_type="career",
    goal_context={"title": "Get a job at Google", "milestones": [...]},
    memory_context=user_memory.get_relevant(query),
    workspace_context=workspace.get_summary()
)
```

---

## Security

- API keys are NEVER passed to frontend
- All model calls originate from backend
- Rate limiting applied at API Gateway layer
- Provider errors never expose keys in user-facing messages
