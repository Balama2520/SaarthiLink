import logging
from typing import TypedDict, Sequence

from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.graph import StateGraph, END

logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    messages: Sequence[BaseMessage]
    next_agent: str


def router_node(state: AgentState):
    """
    Analyzes the user's latest message and decides which agent should handle it.
    """
    last_message = state["messages"][-1].content.lower()

    # Simple keyword-based routing for MVP (In production, use an LLM classifier)
    if any(keyword in last_message for keyword in ["resume", "ats", "cv"]):
        return {"next_agent": "career"}
    elif any(keyword in last_message for keyword in ["interview", "mock", "question"]):
        return {"next_agent": "interview"}
    elif any(
        keyword in last_message for keyword in ["learn", "roadmap", "study", "guide"]
    ):
        return {"next_agent": "learning"}
    else:
        return {"next_agent": "default"}


async def execute_agent_node(state: AgentState):
    """
    We don't actually block here. In our architecture, the FastAPI endpoint
    will use the `next_agent` value determined by the graph to instantiate
    our custom `generate_response_stream_async` generator, preserving SSE streaming.
    """
    return state


# Build the Graph
workflow = StateGraph(AgentState)

workflow.add_node("router", router_node)
workflow.add_node("execute_agent", execute_agent_node)

workflow.set_entry_point("router")
workflow.add_edge("router", "execute_agent")
workflow.add_edge("execute_agent", END)

app = workflow.compile()


async def determine_agent(message: str) -> str:
    """
    Runs the LangGraph workflow to autonomously select the appropriate AI agent.
    """
    inputs = {"messages": [HumanMessage(content=message)], "next_agent": "default"}
    try:
        # LangGraph invoke
        result = app.invoke(inputs)
        return result.get("next_agent", "default")
    except Exception as e:
        logger.error(f"LangGraph routing error: {e}")
        return "default"
