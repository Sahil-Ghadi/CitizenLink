from typing import Annotated, TypedDict, Optional
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages


class TicketState(TypedDict):
    """
    Global state schema for the CitizenPortal AI orchestration layer.
    """
    ticket_id: str
    citizen_id: Optional[str]
    agent_id: Optional[str]
    description: str
    image_url: Optional[str]
    issue_type: Optional[str]
    severity: Optional[str]
    department: Optional[str]
    priority_score: Optional[int]
    status: Optional[str]
    ai_summary: Optional[str]
    recommended_action: Optional[str]
    reply_draft: Optional[str]
    
    # Copilot specific state
    context: Optional[str]
    effort_estimate: Optional[str]
    risk_level: Optional[str]
    
    # Citizen Assistant specific state
    response_text: Optional[str]
    confidence_score: Optional[float]
    
    # Resolution Validator specific state
    resolution_valid: Optional[bool]
    reason: Optional[str]
    
    # State for LangGraph messages, uses add_messages reducer
    messages: Annotated[list[AnyMessage], add_messages]
    
    resolution_note: Optional[str]
    proof_url: Optional[str]
    requires_human: Optional[bool]
