# 18 — Agent Framework

## Vision

Saarthi is not a single monolith AI; it is an orchestrator of specialized Agents. An Agent is a scoped instance of the Intelligence Engine with a specific system prompt, a specific set of tools, and access to a specific slice of Memory.

---

## The Base Agent

All agents inherit from a common interface.

```python
class BaseAgent(ABC):
    name: str
    description: str
    tools: list[Tool]
    
    @abstractmethod
    async def execute(self, state: AgentState) -> AgentState:
        pass
```

---

## Core Agents

### 1. The Planner Agent
- **Trigger**: User creates a new Goal.
- **Responsibility**: Breaks down a high-level goal into actionable milestones and weekly tasks.
- **Tools**: `create_milestone`, `create_task`.
- **Personality**: Structured, realistic, project-manager.

### 2. The Career Agent
- **Trigger**: User interacts with the Career Module (e.g., Resume Analyzer).
- **Responsibility**: Provides ATS scoring, job matching, and interview prep.
- **Tools**: `parse_resume`, `match_jd`, `generate_interview_questions`.
- **Personality**: Professional, direct, encouraging coach.

### 3. The Research Agent
- **Trigger**: User uploads academic papers to a Workspace.
- **Responsibility**: Summarizes literature, extracts methodology, tracks citations.
- **Tools**: `query_workspace`, `extract_citations`.
- **Personality**: Academic, precise, citation-focused.

### 4. The Reflection Agent (Cron)
- **Trigger**: Runs every Sunday evening in the background.
- **Responsibility**: Reviews the user's progress log for the week and generates a summary/nudge.
- **Tools**: `read_progress_log`, `send_notification`.
- **Personality**: Empathetic, motivating.

---

## Agent Handoff

Agents can route tasks to one another. If the user is chatting with the Career Agent and says "I need to learn React for this job", the Career Agent can emit an intent that triggers the Planner Agent to create a "Learn React" goal in the background, returning control back to the Career Agent for the conversational response.

---

## State Management

We use a graph-based state machine (e.g., LangGraph pattern) to manage multi-agent workflows. The `AgentState` contains:
- `messages`: The conversation history
- `active_goal_id`: Current context
- `extracted_entities`: JSON data extracted during the flow
- `next_agent`: The node to route to next
