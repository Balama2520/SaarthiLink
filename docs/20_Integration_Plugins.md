# 20 — Integration Plugins

## Vision
Saarthi AI OS is a closed ecosystem by default for security, but extensible via a strict Plugin Architecture. Plugins allow Saarthi to interact with external tools on behalf of the user, primarily to sync Goal progress or retrieve data.

## Plugin Types

1. **Data Source Plugins (Read Only)**
   - Sync data into Saarthi Workspace/Memory.
   - Example: Notion importer, Google Drive sync, GitHub issues fetcher.

2. **Action Plugins (Read/Write)**
   - Allow Saarthi Agents to take action externally.
   - Example: Google Calendar (schedule events), Linear/Jira (create tasks), Gmail (draft emails).

## Architecture

Plugins are registered in the Tool Registry (see `17_Intelligence_Engine.md`).

```python
class BasePlugin(ABC):
    @property
    @abstractmethod
    def manifest(self) -> dict:
        """Returns JSON schema of available tools."""
        pass

    @abstractmethod
    async def execute_tool(self, tool_name: str, kwargs: dict) -> dict:
        """Executes the external integration."""
        pass
```

## Security & OAuth
- Users must explicitly authenticate with external services via OAuth2.
- OAuth tokens are stored encrypted in the PostgreSQL database.
- A plugin cannot be invoked unless the user has actively enabled it in Settings.
- When an AI agent decides to use a mutating plugin tool (e.g., `send_email`), the backend must queue the action as "pending_approval" and prompt the frontend for user confirmation.
