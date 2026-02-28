"""
CitizenLink — AI Chat Router (citizen-facing)
Endpoints:
  GET  /chat/{ticket_id}/history  — fetch persisted Q&A history
  POST /chat/{ticket_id}/ask      — ask a question; saves Q&A to Firestore
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException
from firebase_admin_init import db
from firebase_admin import auth as firebase_auth

from chatbot import get_ai_reply

router = APIRouter(prefix="/chat", tags=["chat"])


# ── Auth helper ────────────────────────────────────────────────────────────────
def _verify_token(authorization: str) -> dict:
    id_token = authorization.replace("Bearer ", "")
    try:
        return firebase_auth.verify_id_token(id_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ── GET history ────────────────────────────────────────────────────────────────
@router.get("/{ticket_id}/history")
async def get_chat_history(ticket_id: str, authorization: str = Header(...)):
    """
    Return the persisted citizen AI chat history for a ticket.
    Stored in tickets/{ticket_id}.ai_chat[] as an ordered list.
    """
    _verify_token(authorization)

    doc = db.collection("tickets").document(ticket_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Ticket not found")

    data = doc.to_dict()
    return {"history": data.get("ai_chat", []) or []}


# ── POST ask ──────────────────────────────────────────────────────────────────
@router.post("/{ticket_id}/ask")
async def ask_about_ticket(
    ticket_id: str,
    body: dict,
    authorization: str = Header(...),
):
    """
    Citizen asks a question about their ticket.
    Gemini answers with full ticket context + existing agent/AI messages.
    The Q&A pair is appended to tickets/{ticket_id}.ai_chat[] in Firestore.

    body: { question: str }
    Returns: { id, question, answer, asked_at }
    """
    _verify_token(authorization)

    question = (body.get("question") or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    # Fetch ticket from Firestore
    doc_ref = db.collection("tickets").document(ticket_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket_data = doc.to_dict()
    messages = ticket_data.get("messages", []) or []

    # Get AI answer
    try:
        answer = get_ai_reply(
            question=question,
            ticket=ticket_data,
            messages=messages,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI reply failed: {str(e)}")

    # Persist Q&A to Firestore
    now = datetime.now(timezone.utc).isoformat()
    qa_entry = {
        "id": str(uuid.uuid4()),
        "question": question,
        "answer": answer,
        "asked_at": now,
    }

    existing_chat = ticket_data.get("ai_chat", []) or []
    existing_chat.append(qa_entry)
    doc_ref.update({"ai_chat": existing_chat, "updated_at": now})

    return qa_entry
