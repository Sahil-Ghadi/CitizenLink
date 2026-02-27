from fastapi import APIRouter, HTTPException, Header
from firebase_admin import auth as firebase_auth
from firebase_admin_init import db
from models.user import VerifyTokenRequest, UserProfile
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["auth"])


def verify_id_token(id_token: str) -> dict:
    """Verify Firebase ID token and return decoded token."""
    try:
        decoded = firebase_auth.verify_id_token(id_token)
        return decoded
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid ID token")
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Expired ID token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")


@router.post("/verify", response_model=UserProfile)
async def verify_and_upsert_user(body: VerifyTokenRequest):
    """
    Verify a Firebase ID token, upsert the user in Firestore, and return their profile.
    Called right after Google sign-in on the frontend.
    """
    decoded = verify_id_token(body.id_token)
    uid = decoded["uid"]
    email = decoded.get("email", "")
    display_name = decoded.get("name", email.split("@")[0])
    photo_url = decoded.get("picture")
    role = body.role

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    now = datetime.now(timezone.utc).isoformat()

    if user_doc.exists:
        existing = user_doc.to_dict()
        final_role = existing.get("role", "citizen")
        if role == "agent":
            final_role = "agent"
        user_ref.update({"last_login": now, "display_name": display_name, "photo_url": photo_url})
        profile = {**existing, "role": final_role, "display_name": display_name, "photo_url": photo_url}
    else:
        profile = {
            "uid": uid, "email": email, "display_name": display_name,
            "photo_url": photo_url, "role": role,
            "phone": None, "pin_code": None, "department": None,
            "verified": False, "total_reported": 0, "active": 0, "resolved": 0,
            "created_at": now, "last_login": now,
        }
        user_ref.set(profile)

    return UserProfile(
        uid=uid, email=email, display_name=profile["display_name"],
        photo_url=profile.get("photo_url"), role=profile["role"],
        created_at=profile.get("created_at"), phone=profile.get("phone"),
    )


@router.get("/me", response_model=UserProfile)
async def get_me(uid: str):
    """Fetch user profile from Firestore by UID."""
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    data = user_doc.to_dict()
    return UserProfile(
        uid=data["uid"], email=data["email"], display_name=data["display_name"],
        photo_url=data.get("photo_url"), role=data.get("role", "citizen"),
        created_at=data.get("created_at"), phone=data.get("phone"),
    )


class ProfileUpdateRequest(BaseModel):
    uid: str
    display_name: Optional[str] = None
    phone: Optional[str] = None
    pin_code: Optional[str] = None
    department: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None


@router.patch("/profile")
async def update_profile(body: ProfileUpdateRequest, authorization: str = Header(...)):
    """Update user profile after onboarding. Requires Firebase ID token in Authorization header."""
    id_token = authorization.replace("Bearer ", "")
    decoded = verify_id_token(id_token)

    if decoded["uid"] != body.uid:
        raise HTTPException(status_code=403, detail="Cannot update another user's profile")

    user_ref = db.collection("users").document(body.uid)
    update_data = {k: v for k, v in body.model_dump().items() if v is not None and k != "uid"}
    update_data["onboarding_completed"] = True

    user_ref.update(update_data)
    return {"success": True, "updated": list(update_data.keys())}
