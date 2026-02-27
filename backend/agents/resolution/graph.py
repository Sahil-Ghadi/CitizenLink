from langgraph.graph import StateGraph, END
from agents.state import TicketState
from agents.resolution.nodes import validation_node

def create_resolution_graph() -> StateGraph:
    """
    Creates the subgraph for resolution validation.
    Flow: validate -> END
    """
    builder = StateGraph(TicketState)
    
    builder.add_node("validate", validation_node)
    
    builder.set_entry_point("validate")
    builder.add_edge("validate", END)
    
    return builder.compile()

resolution_graph = create_resolution_graph()
