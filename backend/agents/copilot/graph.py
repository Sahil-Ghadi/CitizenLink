from langgraph.graph import StateGraph, END
from agents.state import TicketState
from agents.copilot.nodes import context_aggregator_node, insight_generator_node

def create_copilot_graph() -> StateGraph:
    """
    Creates the subgraph for the agent copilot.
    Flow: context -> insight -> END
    """
    builder = StateGraph(TicketState)

    builder.add_node("context", context_aggregator_node)
    builder.add_node("insight", insight_generator_node)

    builder.set_entry_point("context")
    builder.add_edge("context", "insight")
    builder.add_edge("insight", END)

    return builder.compile()

# Provide a compiled version for easy import
copilot_graph = create_copilot_graph()
