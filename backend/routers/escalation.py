"""
CitizenLink — Escalation Router
Exposes REST endpoints for the escalation workflow:
  GET  /escalation/scan                   — scan all active tickets and escalate SLA breaches
  GET  /escalation/summary/{ticket_id}    — AI-generated escalation briefing
  POST /escalation/{ticket_id}/acknowledge — agent acknowledges escalation
  POST /escalation/{ticket_id}/reassign   — reassign ticket to another agent
  POST /escalation/{ticket_id}/force-resolve — force-resolve with a note
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException, BackgroundTasks
from firebase_admin_init import db
from firebase_admin import auth as firebase_auth

from escalation import scan_and_escalate_all, should_escalate, escalate_ticket
from chatbot import summarize_for_escalation

router = APIRouter(prefix="/escalation", tags=["escalation"])


# ── Auth helper ───────────────────────────────────────────────────────────────
def _verify_agent(authorization: str) -> dict:
    id_token = authorization.replace("Bearer ", "")
    try:
        return firebase_auth.verify_id_token(id_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def _get_ticket_or_404(ticket_id: str) -> tuple:
    doc_ref = db.collection("tickets").document(ticket_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return doc_ref, doc.to_dict()


# ── GET /escalation/scan ──────────────────────────────────────────────────────
@router.get("/scan")
async def scan_tickets(authorization: str = Header(...)):
    """
    Scan all active tickets and escalate any that breach SLA or other thresholds.
    Returns list of ticket IDs that were escalated in this run.
    """
    _verify_agent(authorization)
    escalated = scan_and_escalate_all()
    return {
        "scanned": True,
        "escalated_count": len(escalated),
        "escalated_ticket_ids": escalated,
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }


# ── GET /escalation/summary/{ticket_id} ──────────────────────────────────────
@router.get("/summary/{ticket_id}")
async def get_escalation_summary(ticket_id: str, authorization: str = Header(...)):
    """
    Generate an AI-powered briefing for the escalated ticket.
    Gemini reads ticket details + all messages and returns a 3-5 sentence summary.
    """
    _verify_agent(authorization)
    _, ticket = _get_ticket_or_404(ticket_id)
    messages = ticket.get("messages", []) or []

    try:
        summary = summarize_for_escalation(ticket=ticket, messages=messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")

    return {"ticket_id": ticket_id, "summary": summary}


# ── POST /escalation/{ticket_id}/acknowledge ──────────────────────────────────
@router.post("/{ticket_id}/acknowledge")
async def acknowledge_escalation(ticket_id: str, authorization: str = Header(...)):
    """
    Agent acknowledges the escalation. Clears the active escalation alert
    but keeps audit fields (escalated_at, reason) intact for tracking.
    """
    decoded = _verify_agent(authorization)
    doc_ref, ticket = _get_ticket_or_404(ticket_id)

    if not ticket.get("escalated"):
        raise HTTPException(status_code=400, detail="Ticket is not currently escalated")

    now = datetime.now(timezone.utc).isoformat()
    doc_ref.update({
        "escalation_acknowledged":    True,
        "escalation_acknowledged_by": decoded["uid"],
        "escalation_acknowledged_at": now,
        "updated_at":                 now,
    })
    return {"success": True, "acknowledged_at": now}


# ── POST /escalation/{ticket_id}/reassign ─────────────────────────────────────
@router.post("/{ticket_id}/reassign")
async def reassign_ticket(ticket_id: str, body: dict, authorization: str = Header(...)):
    """
    Reassign an escalated ticket to a different/senior agent.
    body: { agent_uid: str, agent_name: str, note?: str }
    """
    decoded = _verify_agent(authorization)
    doc_ref, ticket = _get_ticket_or_404(ticket_id)

    new_agent_uid  = body.get("agent_uid", "").strip()
    new_agent_name = body.get("agent_name", "").strip()
    if not new_agent_uid or not new_agent_name:
        raise HTTPException(status_code=400, detail="agent_uid and agent_name are required")

    now = datetime.now(timezone.utc).isoformat()
    note = (body.get("note") or "").strip() or f"Reassigned by escalation workflow."

    system_msg = {
        "id": str(uuid.uuid4()),
        "from": "system",
        "sender_uid": decoded["uid"],
        "sender_name": "System",
        "text": f"🔀 Ticket reassigned to {new_agent_name}.\nNote: {note}",
        "sent_at": now,
    }
    existing = ticket.get("messages", []) or []
    existing.append(system_msg)

    doc_ref.update({
        "agent_uid":                  new_agent_uid,
        "agent_name":                 new_agent_name,
        "reassigned_at":              now,
        "escalation_acknowledged":    True,
        "escalation_acknowledged_by": decoded["uid"],
        "escalation_acknowledged_at": now,
        "messages":                   existing,
        "updated_at":                 now,
    })
    return {"success": True, "reassigned_to": new_agent_name}


# ── POST /escalation/{ticket_id}/force-resolve ────────────────────────────────
@router.post("/{ticket_id}/force-resolve")
async def force_resolve_ticket(ticket_id: str, body: dict, authorization: str = Header(...)):
    """
    Agent force-resolves an escalated ticket (e.g., physical inspection confirmed resolved).
    body: { note: str }
    """
    decoded = _verify_agent(authorization)
    doc_ref, ticket = _get_ticket_or_404(ticket_id)

    note = (body.get("note") or "").strip()
    if not note:
        raise HTTPException(status_code=400, detail="A resolution note is required for force-resolve")

    now = datetime.now(timezone.utc).isoformat()
    system_msg = {
        "id": str(uuid.uuid4()),
        "from": "system",
        "sender_uid": decoded["uid"],
        "sender_name": "Agent",
        "text": f"✅ Ticket force-resolved by agent.\nNote: {note}",
        "sent_at": now,
    }
    existing = ticket.get("messages", []) or []
    existing.append(system_msg)

    doc_ref.update({
        "status":                     "resolved",
        "resolution_note":            note,
        "resolved_at":                now,
        "escalation_acknowledged":    True,
        "escalation_acknowledged_by": decoded["uid"],
        "escalation_acknowledged_at": now,
        "messages":                   existing,
        "updated_at":                 now,
    })
    return {"success": True, "status": "resolved"}
