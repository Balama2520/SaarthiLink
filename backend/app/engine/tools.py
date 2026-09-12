import logging
from typing import Dict, Any, Callable

logger = logging.getLogger(__name__)

class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Callable] = {}
        
    def register(self, name: str, func: Callable):
        self.tools[name] = func
        
    def execute(self, name: str, args: Dict[str, Any]) -> Any:
        if name not in self.tools:
            raise ValueError(f"Tool {name} not found in registry")
        
        logger.info(f"Executing tool {name} with args {args}")
        try:
            return self.tools[name](**args)
        except Exception as e:
            logger.error(f"Error executing tool {name}: {str(e)}")
            return {"error": str(e)}

tool_registry = ToolRegistry()

# Example Tool implementations
def fetch_job_details(job_id: str) -> Dict[str, Any]:
    # Mock implementation
    return {"job_id": job_id, "title": "Software Engineer", "requirements": ["Python", "React"]}

def update_goal_status(goal_id: str, new_status: str) -> Dict[str, Any]:
    # In a real scenario, this would use DB session to update the goal
    return {"goal_id": goal_id, "status": new_status, "success": True}

tool_registry.register("fetch_job_details", fetch_job_details)
tool_registry.register("update_goal_status", update_goal_status)
