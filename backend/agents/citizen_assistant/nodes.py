from typing import Any, Dict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from agents.state import TicketState
from agents.tools.ticket_tools import get_ticket
from agents.citizen_assistant.schemas import AssistantOutput

# Initialize Gemini 2.5 Flash
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
assistant_llm = llm.with_structured_output(AssistantOutput)


def context_loader_node(state: TicketState) -> Dict[str, Any]:
    """
    Loads ticket context using the tool.
    """
    ticket_id = state.get("ticket_id")
    ticket_data = get_ticket.invoke({"ticket_id": ticket_id})
    return {"context": str(ticket_data)}

def assistant_node(state: TicketState) -> Dict[str, Any]:
    """
    Generates an automated response for the citizen.
    """
    context = state.get("context", "")
    # Getting the latest message or description
    message_history = "\n".join([m.content for m in state.get("messages", [])]) if state.get("messages") else state.get("description", "")
    
    messages = [
        SystemMessage(content=(
            "You are an AI Citizen Assistant. Respond to the user's latest message "
            "based on the ticket context. Produce the response text, determine your confidence, "
            "and decide if human intervention is necessary."
        )),
        HumanMessage(content=f"Ticket Context: {context}\n\nUser Message/History:\n{message_history}")
    ]
    
    result: AssistantOutput = assistant_llm.invoke(messages)
    
    update: Dict[str, Any] = {
        "response_text": result.response_text,
        "confidence_score": result.confidence_score,
        "messages": [AIMessage(content=result.response_text)]
    }
    
    if result.requires_human:
        update["requires_human"] = True
        
    return update
