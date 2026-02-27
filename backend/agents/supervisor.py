import os
from typing import Any, Dict

from agents.state import TicketState
from agents.ticket_creation.graph import ticket_creation_graph
from agents.copilot.graph import copilot_graph
from agents.citizen_assistant.graph import citizen_assistant_graph
from agents.resolution.graph import resolution_graph

# Only enable LangSmith tracing if an API key is actually configured
if os.getenv("LANGSMITH_API_KEY"):
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
else:
    os.environ["LANGCHAIN_TRACING_V2"] = "false"

def _get_config(state: TicketState) -> Dict[str, Any]:
    """Helper to generate standard configuration for subgraph invocations."""
    ticket_id = state.get("ticket_id")
    # Including both the literal string requested and the LangGraph standard 'configurable' spec
    return {
        "thread_id": ticket_id, 
        "configurable": {"thread_id": ticket_id}
    }

def run_ticket_creation(state: TicketState) -> Dict[str, Any]:
    """Invokes the ticket creation routing and priority subgraph."""
    config = _get_config(state)
    return ticket_creation_graph.invoke(state, config=config)

def run_copilot(state: TicketState) -> Dict[str, Any]:
    """Invokes the agent copilot generation subgraph."""
    config = _get_config(state)
    return copilot_graph.invoke(state, config=config)

def run_citizen_assistant(state: TicketState) -> Dict[str, Any]:
    """Invokes the citizen assistant automated response subgraph."""
    config = _get_config(state)
    return citizen_assistant_graph.invoke(state, config=config)

def run_resolution(state: TicketState) -> Dict[str, Any]:
    """Invokes the resolution validation subgraph."""
    config = _get_config(state)
    return resolution_graph.invoke(state, config=config)
