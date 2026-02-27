from typing import Any, Dict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from agents.state import TicketState
from agents.ticket_creation.schemas import AnalysisOutput

# Initialize Gemini 2.5 Flash
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)

# Bind the structured output schema
analyzer_llm = llm.with_structured_output(AnalysisOutput)

def analysis_node(state: TicketState) -> Dict[str, Any]:
    """
    Analyzes the complaint using vision/text to extract structured properties.
    """
    description = state.get("description", "")
    image_url = state.get("image_url")
    
    # Constructing the message dynamically based on whether there's an image
    messages = [
        SystemMessage(content=(
            "You are an expert AI triage assistant for a civic complaint system (CitizenPortal). "
            "Analyze the complaint provided by the user and classify its issue type, severity, "
            "responsible department, and provide a concise summary."
        ))
    ]
    
    if image_url:
        messages.append(HumanMessage(content=[
            {"type": "text", "text": f"Complaint description: {description}"},
            {"type": "image_url", "image_url": {"url": image_url}}
        ]))
    else:
        messages.append(HumanMessage(content=f"Complaint description: {description}"))
        
    result: AnalysisOutput = analyzer_llm.invoke(messages)
    
    return {
        "issue_type": result.issue_type,
        "severity": result.severity,
        "department": result.department,
        "ai_summary": result.ai_summary
    }

def priority_node(state: TicketState) -> Dict[str, Any]:
    """
    Deterministic logic to map severity to priority score and flag emergencies.
    """
    severity = state.get("severity")
    
    # Map severity to priority score
    priority_mapping = {
        "low": 10,
        "medium": 50,
        "high": 80,
        "emergency": 100
    }
    
    priority_score = priority_mapping.get(severity, 10) # default to low
    
    update = {"priority_score": priority_score}
    
    if severity == "emergency":
        update["requires_human"] = True
        
    return update
