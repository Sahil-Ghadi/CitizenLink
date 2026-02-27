from fastapi import APIRouter, HTTPException, Header
from firebase_admin import auth as firebase_auth

from agents.supervisor import run_ticket_creation, run_copilot, run_citizen_assistant, run_resolution
from models.agent import (
    AnalyzeTicketRequest, AnalyzeTicketResponse,
    CopilotRequest, CopilotResponse,
    CitizenAssistantRequest, CitizenAssistantResponse,
    ValidateResolutionRequest, ValidateResolutionResponse,
)

router = APIRouter(prefix="/agents", tags=["agents"])


def verify_token(authorization: str) -> dict:
    id_token = authorization.replace("Bearer ", "")
    try:
        return firebase_auth.verify_id_token(id_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/analyze-ticket", response_model=AnalyzeTicketResponse)
async def analyze_ticket(body: AnalyzeTicketRequest, authorization: str = Header(...)):
    """
    Run the ticket_creation subgraph: classifies the complaint, assigns severity,
    department, AI summary, and a numeric priority score.
    """
    verify_token(authorization)
    state = {
        "ticket_id": body.ticket_id,
        "description": body.description,
        "image_url": body.image_url,
        "messages": [],
    }
    try:
        result = run_ticket_creation(state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    return AnalyzeTicketResponse(
        ticket_id=body.ticket_id,
        issue_type=result.get("issue_type", ""),
        severity=result.get("severity", "medium"),
        department=result.get("department", ""),
        ai_summary=result.get("ai_summary", ""),
        priority_score=result.get("priority_score", 50),
    )


@router.post("/copilot", response_model=CopilotResponse)
async def copilot(body: CopilotRequest, authorization: str = Header(...)):
    """
    Run the copilot subgraph: provides recommended action, effort estimate,
    risk level, and a drafted reply for the agent to send to the citizen.
    """
    verify_token(authorization)
    state = {
        "ticket_id": body.ticket_id,
        "description": body.description,
        "issue_type": body.issue_type,
        "department": body.department,
        "messages": [],
    }
    try:
        result = run_copilot(state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    return CopilotResponse(
        recommended_action=result.get("recommended_action", ""),
        effort_estimate=result.get("effort_estimate", ""),
        risk_level=result.get("risk_level", ""),
    )


@router.post("/citizen-assistant", response_model=CitizenAssistantResponse)
async def citizen_assistant(body: CitizenAssistantRequest, authorization: str = Header(...)):
    """
    Run the citizen_assistant subgraph: generates an automated response
    for the citizen with a confidence score and escalation flag.
    """
    verify_token(authorization)
    state = {
        "ticket_id": body.ticket_id,
        "description": body.description,
        "messages": [],
    }
    try:
        result = run_citizen_assistant(state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    return CitizenAssistantResponse(
        response_text=result.get("response_text", ""),
        confidence_score=result.get("confidence_score", 0.0),
        requires_human=result.get("requires_human", False),
    )


@router.post("/validate-resolution", response_model=ValidateResolutionResponse)
async def validate_resolution(body: ValidateResolutionRequest, authorization: str = Header(...)):
    """
    Run the resolution subgraph: validates a resolution note + proof URL
    before marking the ticket as resolved.
    """
    verify_token(authorization)
    state = {
        "ticket_id": body.ticket_id,
        "resolution_note": body.resolution_note,
        "proof_url": body.proof_url,
        "messages": [],
    }
    try:
        result = run_resolution(state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    return ValidateResolutionResponse(
        resolution_valid=result.get("resolution_valid", False),
        reason=result.get("reason", ""),
    )
