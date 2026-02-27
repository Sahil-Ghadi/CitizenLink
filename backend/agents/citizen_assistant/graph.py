from langgraph.graph import StateGraph, END
from agents.state import TicketState
from agents.citizen_assistant.nodes import context_loader_node, assistant_node

def create_citizen_assistant_graph() -> StateGraph:
    """
    Creates the subgraph for the citizen assistant.
    Flow: context -> assistant -> END
    """
    builder = StateGraph(TicketState)
    
    builder.add_node("context", context_loader_node)
    builder.add_node("assistant", assistant_node)
    
    builder.set_entry_point("context")
    builder.add_edge("context", "assistant")
    builder.add_edge("assistant", END)
    
    return builder.compile()

citizen_assistant_graph = create_citizen_assistant_graph()
