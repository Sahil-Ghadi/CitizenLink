import os
import json
import uuid
import base64
from datetime import datetime, timezone
from io import BytesIO

import cloudinary
import cloudinary.uploader
import google.generativeai as genai
from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from firebase_admin_init import db
from models.ticket import TicketCreate, TicketResponse, AnalyzeImageResponse
from firebase_admin import auth as firebase_auth
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

# Configure clients
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

router = APIRouter(prefix="/tickets", tags=["tickets"])

CATEGORIES = [
    "Water Supply", "Street Lighting", "Sanitation", "Roads",
    "Parks & Gardens", "Noise Pollution", "Building Violations",
    "Public Health", "Drainage & Flooding", "Traffic & Signals",
    "Electricity", "Public Safety", "Other"
]

DEPT_MAP = {
    "Water Supply": "Water & Sewage",
    "Street Lighting": "Electrical",
    "Sanitation": "Sanitation",
    "Roads": "Roads & Transport",
    "Parks & Gardens": "Parks & Gardens",
    "Noise Pollution": "Environment",
    "Building Violations": "Building & Planning",
    "Public Health": "Public Health",
    "Drainage & Flooding": "Water & Sewage",
    "Traffic & Signals": "Roads & Transport",
    "Electricity": "Electrical",
    "Public Safety": "Public Safety",
    "Other": "Other",
}

GEMINI_PROMPT = """Analyze this image of a civic/public infrastructure issue in India.
Return a JSON object with EXACTLY these fields:
{
  "title": "Short descriptive title (max 10 words)",
  "description": "Detailed description of the issue as seen in the image (2-3 sentences, written in first person as if the citizen is reporting it)",
  "category": "ONE of: Water Supply, Street Lighting, Sanitation, Roads, Parks & Gardens, Noise Pollution, Building Violations, Public Health, Drainage & Flooding, Traffic & Signals, Electricity, Public Safety, Other",
  "severity": "ONE of: low, medium, high, emergency",
  "confidence": "ONE of: low, medium, high"
}

Severity guidelines:
- emergency: immediate danger to life (gas leak, flooding, downed power line)
- high: serious safety risk (large pothole, broken streetlight on busy road)
- medium: quality of life issue (overflowing garbage, park damage)
- low: minor inconvenience (faded road markings, minor cracks)

Return ONLY valid JSON, no markdown, no explanation."""


def verify_token(authorization: str) -> dict:
    id_token = authorization.replace("Bearer ", "")
    try:
        return firebase_auth.verify_id_token(id_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def compute_priority(severity: str) -> int:
    base = {"emergency": 95, "high": 75, "medium": 50, "low": 25}.get(severity, 50)
    # Add some variance; more factors added later
    return base


@router.post("/upload")
async def upload_image(
    image: UploadFile = File(...),
    authorization: str = Header(...),
):
    """Upload a single image to Cloudinary. Returns the secure URL."""
    verify_token(authorization)
    img_bytes = await image.read()
    try:
        result = cloudinary.uploader.upload(
            BytesIO(img_bytes),
            folder="citizenlink/tickets",
            resource_type="image",
            transformation=[{"quality": "auto", "fetch_format": "auto"}],
        )
        return {"url": result["secure_url"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/analyze", response_model=AnalyzeImageResponse)
async def analyze_image(
    image: UploadFile = File(...),
    authorization: str = Header(...),
):
    """
    Upload an image → run Gemini vision OCR → upload to Cloudinary → return extracted fields.
    """
    verify_token(authorization)

    # Read image bytes
    img_bytes = await image.read()

    # Upload to Cloudinary first (so we have the URL regardless of Gemini)
    try:
        upload_result = cloudinary.uploader.upload(
            BytesIO(img_bytes),
            folder="citizenlink/tickets",
            resource_type="image",
            transformation=[{"quality": "auto", "fetch_format": "auto"}],
        )
        photo_url = upload_result["secure_url"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {str(e)}")

    # Run Gemini vision analysis
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")

        # Convert to PIL Image then back to bytes for Gemini
        img = Image.open(BytesIO(img_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")
        buf = BytesIO()
        img.save(buf, format="JPEG")
        img_data = base64.b64encode(buf.getvalue()).decode()

        response = model.generate_content([
            {"mime_type": "image/jpeg", "data": img_data},
            GEMINI_PROMPT,
        ])

        raw = response.text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        ai_data = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback if Gemini returns non-JSON
        ai_data = {
            "title": "Civic issue reported",
            "description": "Issue detected in uploaded photo.",
            "category": "Other",
            "severity": "medium",
            "confidence": "low",
        }
    except Exception as e:
        ai_data = {
            "title": "Civic issue reported",
            "description": "Issue detected in uploaded photo.",
            "category": "Other",
            "severity": "medium",
            "confidence": "low",
        }

    category = ai_data.get("category", "Other")
    department = DEPT_MAP.get(category, "Public Works")

    return AnalyzeImageResponse(
        title=ai_data.get("title", ""),
        description=ai_data.get("description", ""),
        category=category,
        department=department,
        severity=ai_data.get("severity", "medium"),
        confidence=ai_data.get("confidence", "medium"),
        photo_url=photo_url,
    )


@router.post("/create", response_model=TicketResponse)
async def create_ticket(
    body: TicketCreate,
    authorization: str = Header(...),
):
    """Create a new ticket in Firestore."""
    decoded = verify_token(authorization)
    uid = decoded["uid"]

    # Fetch user profile for citizen name
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    user_data = user_doc.to_dict()

    now = datetime.now(timezone.utc).isoformat()
    ticket_id = f"PS-{datetime.now(timezone.utc).strftime('%Y')}-{str(uuid.uuid4().int)[:5].zfill(5)}"
    priority = compute_priority(body.severity)

    ai_summary = (
        f"{body.severity.title()} severity {body.category.lower()} issue reported at "
        f"{body.location_address}. {body.description[:100]}..."
        if len(body.description) > 100 else body.description
    )

    ticket_data = {
        "id": ticket_id,
        "title": body.title,
        "description": body.description,
        "category": body.category,
        "department": body.department,
        "severity": body.severity,
        "status": "submitted",
        "location_address": body.location_address,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "ongoing": body.ongoing,
        "start_date": body.start_date,
        "additional_info": body.additional_info,
        "photo_urls": body.photo_urls,
        "citizen_uid": uid,
        "citizen_name": user_data.get("display_name", ""),
        "citizen_email": user_data.get("email", ""),
        "citizen_verified": user_data.get("verified", False),
        "created_at": now,
        "updated_at": now,
        "priority_score": priority,
        "ai_summary": ai_summary,
        "agent_uid": None,
        "agent_name": None,
        "rating": None,
        "messages": [],
    }

    db.collection("tickets").document(ticket_id).set(ticket_data)

    # Increment citizen's total_reported and active count
    db.collection("users").document(uid).update({
        "total_reported": user_data.get("total_reported", 0) + 1,
        "active": user_data.get("active", 0) + 1,
    })

    return TicketResponse(
        id=ticket_id,
        title=ticket_data["title"],
        description=ticket_data["description"],
        category=ticket_data["category"],
        department=ticket_data["department"],
        severity=ticket_data["severity"],
        status=ticket_data["status"],
        location_address=ticket_data["location_address"],
        latitude=ticket_data["latitude"],
        longitude=ticket_data["longitude"],
        citizen_uid=uid,
        citizen_name=ticket_data["citizen_name"],
        citizen_email=ticket_data["citizen_email"],
        photo_urls=ticket_data["photo_urls"],
        created_at=now,
        updated_at=now,
        priority_score=priority,
        ai_summary=ai_summary,
    )


@router.get("/my")
async def get_my_tickets(authorization: str = Header(...)):
    """Get all tickets created by the authenticated citizen."""
    decoded = verify_token(authorization)
    uid = decoded["uid"]

    # Using only .where() avoids needing a composite index.
    # We sort in Python after fetching.
    docs = db.collection("tickets").where("citizen_uid", "==", uid).stream()
    result = [doc.to_dict() for doc in docs]
    result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return result


@router.get("/search/similar")
async def search_similar_tickets(
    issue_type: str,
    department: str,
    authorization: str = Header(...),
):
    """Return up to 5 resolved tickets matching the given department, used by the agent copilot tool."""
    verify_token(authorization)
    docs = (
        db.collection("tickets")
        .where("department", "==", department)
        .where("status", "==", "resolved")
        .stream()
    )
    tickets_list = [doc.to_dict() for doc in docs]
    # Secondary filter on issue_type (category) in Python to avoid composite index
    filtered = [
        t for t in tickets_list
        if t.get("category", "").lower() == issue_type.lower()
    ][:5]
    return {"tickets": filtered}


@router.get("/all")
async def get_all_tickets(authorization: str = Header(...)):
    """Get all tickets from Firestore — for the agent queue/dashboard. Sorted by priority_score desc."""
    verify_token(authorization)
    docs = db.collection("tickets").stream()
    result = [doc.to_dict() for doc in docs]
    result.sort(key=lambda x: x.get("priority_score", 0), reverse=True)
    return result



@router.patch("/{ticket_id}/resolve")
async def resolve_ticket(ticket_id: str, authorization: str = Header(...), body: dict = None):
    """
    Mark a ticket as resolved. Called by the agent after completing the resolution flow.
    Updates Firestore and adjusts citizen stats.
    """
    decoded = verify_token(authorization)
    agent_uid = decoded["uid"]

    # Fetch the ticket to verify it exists and get citizen_uid
    doc_ref = db.collection("tickets").document(ticket_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket_data = doc.to_dict()
    citizen_uid = ticket_data.get("citizen_uid")

    # Fetch agent display name
    agent_doc = db.collection("users").document(agent_uid).get()
    agent_name = agent_doc.to_dict().get("display_name", "Agent") if agent_doc.exists else "Agent"

    now = datetime.now(timezone.utc).isoformat()
    payload = body or {}

    update_data = {
        "status": "resolved",
        "updated_at": now,
        "resolved_at": now,
        "agent_uid": agent_uid,
        "agent_name": agent_name,
        "resolution_note": payload.get("resolution_note", ""),
        "proof_url": payload.get("proof_url", ""),
        "resolution_type": payload.get("resolution_type", ""),
    }
    doc_ref.update(update_data)

    # Update citizen stats: active -1, resolved +1
    if citizen_uid:
        citizen_ref = db.collection("users").document(citizen_uid)
        citizen_doc = citizen_ref.get()
        if citizen_doc.exists:
            cd = citizen_doc.to_dict()
            citizen_ref.update({
                "active": max(0, cd.get("active", 1) - 1),
                "resolved": cd.get("resolved", 0) + 1,
            })

    return {"success": True, "ticket_id": ticket_id, "status": "resolved"}


@router.get("/{ticket_id}")
async def get_ticket_by_id(ticket_id: str, authorization: str = Header(...)):
    """Fetch a single ticket by its ID. Used internally by agent tools."""
    verify_token(authorization)
    doc = db.collection("tickets").document(ticket_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return doc.to_dict()
