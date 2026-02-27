from langgraph.graph import StateGraph, END
from agents.state import TicketState
from agents.ticket_creation.nodes import analysis_node, priority_node

def create_ticket_creation_graph() -> StateGraph:
    """
    Creates the subgraph for ticket creation.
    Flow: analysis -> priority -> END
    """
    builder = StateGraph(TicketState)
    
    # Add nodes
    builder.add_node("analysis", analysis_node)
    builder.add_node("priority", priority_node)
    
    # Add edges
    builder.set_entry_point("analysis")
    builder.add_edge("analysis", "priority")
    builder.add_edge("priority", END)
    
    return builder.compile()

# Provide a compiled version for easy import
ticket_creation_graph = create_ticket_creation_graph()
