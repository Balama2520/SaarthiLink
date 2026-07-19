# 16 — Memory Architecture

## Philosophy

Memory is the differentiator between a "stateless chatbot" and a "personal AI OS." Saarthi must remember what the user cares about, what they are working on (Goals), and their preferences, without requiring the user to repeat themselves.

---

## Memory Types

Saarthi uses a multi-tiered memory architecture:

1. **Short-Term Memory (Context Window)**
   - **Scope**: Current chat session.
   - **Storage**: Redis (`session:{session_id}:messages`).
   - **Eviction**: TTL of 2 hours after last activity.
   - **Mechanism**: Sliding window (last N messages) + summarization when context gets too long.

2. **Goal Memory (Medium-Term)**
   - **Scope**: Specific to an active Goal (e.g., "Get a job at Google").
   - **Storage**: PostgreSQL (structured milestones/tasks) + Vector DB (unstructured notes/insights).
   - **Mechanism**: Automatically retrieved and injected into the prompt whenever the user is discussing or working on that Goal.

3. **Core Memory (Long-Term / User Profile)**
   - **Scope**: Global user traits (name, background, communication style, dietary restrictions, tech stack).
   - **Storage**: PostgreSQL (`user_profiles` or JSON blob).
   - **Mechanism**: Updated by a background extraction process. Always injected into the System Prompt.

4. **Workspace Memory (RAG)**
   - **Scope**: Explicit documents and notes uploaded by the user.
   - **Storage**: Vector DB (ChromaDB → Qdrant).
   - **Mechanism**: Semantic search based on user queries within a specific Workspace context.

---

## The Memory Extraction Pipeline

Instead of polluting the main AI request with memory extraction tasks, Saarthi uses an asynchronous pipeline:

```
[User Message] ──> [AI Response]
       │
   (async queue)
       │
       ▼
┌──────────────┐
│ Memory Agent │ ──> Detects facts, preferences, goal updates
└──────┬───────┘
       │
       ├─> Update Core Memory (if personal fact)
       ├─> Update Goal State (if progress made)
       └─> Store in Vector DB (if general knowledge)
```

---

## Vector DB Schema (Qdrant Target)

Collections should be isolated by user to ensure privacy and fast querying.

- **Collection**: `user_memories_{user_id}`
- **Payload Schema**:
  ```json
  {
    "type": "conversation_snippet | document_chunk | note",
    "goal_id": "UUID (optional)",
    "workspace_id": "UUID (optional)",
    "timestamp": "ISO-8601",
    "source": "chat | manual_entry | file_upload"
  }
  ```

---

## Prompt Injection Strategy

When building the prompt in `PromptEngine`, memory is assembled dynamically:

```text
[SYSTEM PROMPT]
You are Saarthi.

[CORE MEMORY]
User is a 3rd-year CS student. Strong in Python. Struggles with System Design.

[GOAL CONTEXT] (If active)
Current Goal: "Prepare for FAANG Interviews"
Progress: 45%
Next Milestone: "Complete Graph Algorithms"

[RAG KNOWLEDGE] (If query triggers search)
<Relevant document snippets>

[CHAT HISTORY]
<Recent messages>
```

---

## Privacy & Control

- Users must have a UI to view all explicit "Core Memories" extracted by the system.
- Users must be able to edit or delete any memory.
- If a user deletes a memory, it must be hard-deleted from both PostgreSQL and the Vector DB immediately.
