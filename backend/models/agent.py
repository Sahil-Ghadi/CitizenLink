from pydantic import BaseModel
from typing import Optional


# ── Ticket Creation (Triage) ─────────────────────────────────────────────────

class AnalyzeTicketRequest(BaseModel):
    ticket_id: str
    description: str
    image_url: Optional[str] = None


class AnalyzeTicketResponse(BaseModel):
    ticket_id: str
    issue_type: str
    severity: str
    department: str
    ai_summary: str
    priority_score: int


# ── Agent Copilot ────────────────────────────────────────────────────────────

class CopilotRequest(BaseModel):
    ticket_id: str
    description: str
    issue_type: Optional[str] = "general"
    department: Optional[str] = "general"


class CopilotResponse(BaseModel):
    recommended_action: str
    effort_estimate: str
    risk_level: str


# ── Citizen Assistant ────────────────────────────────────────────────────────

class CitizenAssistantRequest(BaseModel):
    ticket_id: str
    description: str


class CitizenAssistantResponse(BaseModel):
    response_text: str
    confidence_score: float
    requires_human: bool


# ── Resolution Validator ─────────────────────────────────────────────────────

class ValidateResolutionRequest(BaseModel):
    ticket_id: str
    resolution_note: str
    proof_url: Optional[str] = None


class ValidateResolutionResponse(BaseModel):
    resolution_valid: bool
    reason: str
