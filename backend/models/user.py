from pydantic import BaseModel
from typing import Optional


class VerifyTokenRequest(BaseModel):
    id_token: str
    role: str = "citizen"


class CitizenProfile(BaseModel):
    uid: str
    email: str
    display_name: str
    photo_url: Optional[str] = None
    role: str = "citizen"
    phone: Optional[str] = None
    pin_code: Optional[str] = None
    verified: bool = False
    total_reported: int = 0
    active: int = 0
    resolved: int = 0
    created_at: Optional[str] = None


class AgentProfile(BaseModel):
    uid: str
    email: str
    display_name: str
    photo_url: Optional[str] = None
    role: str = "agent"
    department: Optional[str] = None
    designation: Optional[str] = None
    agent_code: Optional[str] = None
    assigned_today: int = 0
    resolved_today: int = 0
    created_at: Optional[str] = None


class UserProfile(BaseModel):
    uid: str
    email: str
    display_name: str
    photo_url: Optional[str] = None
    role: str
    phone: Optional[str] = None
    created_at: Optional[str] = None
