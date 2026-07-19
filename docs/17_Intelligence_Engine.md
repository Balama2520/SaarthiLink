# 17 — Intelligence Engine

## Concept

The Intelligence Engine sits above the AI Gateway. While the AI Gateway handles the "how" of talking to an LLM (API keys, streaming, fallbacks), the Intelligence Engine handles the "what" (Routing, Tool Calling, and Reasoning logic).

---

## Architecture Components

```
Intelligence Engine
├── Intent Router         # Determines if the user wants to chat, plan, or execute a tool
├── Tool Registry         # Available functions the AI can call (e.g., search_web, create_goal)
├── Reasoning Loop        # ReAct (Reason + Act) loop for complex tasks
└── Evaluator             # (Future) Checks if the output meets the user's implicit standards
```

---

## 1. Intent Router

Not every message needs a complex ReAct loop. The Intent Router is a fast, cheap classifier (e.g., `phi3` or `gemini-1.5-flash`) that categorizes the user's message.

**Categories:**
1. `CONVERSATIONAL`: General chat, advice. Routed to standard LLM stream.
2. `GOAL_OPERATION`: "Create a goal to learn Rust", "Mark my task done". Routed to structured extraction / tool calling.
3. `KNOWLEDGE_RETRIEVAL`: "Summarize my uploaded resume". Routed to RAG pipeline.

---

## 2. Tool Calling (Function Calling)

To act as an OS, Saarthi must interact with its own database and external services on behalf of the user.

**Core Tools (MVP):**
- `create_goal(title, category, priority)`
- `update_progress(goal_id, increment)`
- `search_workspace(query, workspace_id)`

**Implementation Standard:**
- Use standard JSON schema for tool definitions.
- For local models (Ollama), use strict JSON mode or grammar enforcement to guarantee valid tool outputs.
- Never allow a tool to mutate data without implicit user intent. Destructive actions (delete) require explicit frontend confirmation.

---

## 3. The ReAct Loop

For complex requests (e.g., "Plan my job hunt for the next 3 weeks and update my resume"), a single LLM pass isn't enough.

**Workflow:**
1. **Thought**: What do I need to do? (I need to read the resume, create a goal, generate milestones)
2. **Action**: `read_document(resume_id)`
3. **Observation**: [Content of resume]
4. **Thought**: Now I can create the goal.
5. **Action**: `create_goal(...)`
6. **Final Answer**: Return summary to user.

*Note: For V1, we will keep the ReAct loop simple or avoid it in favor of deterministic pipelines to minimize latency and token costs.*
