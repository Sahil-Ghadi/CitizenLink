from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TicketCreate(BaseModel):
    title: str
    description: str
    category: str
    department: str
    severity: str  # emergency | high | medium | low
    location_address: str
    latitude: float
    longitude: float
    ongoing: bool = True
    start_date: Optional[str] = None
    additional_info: Optional[str] = None
    photo_urls: List[str] = []


class TicketResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    department: str
    severity: str
    status: str
    location_address: str
    latitude: float
    longitude: float
    citizen_uid: str
    citizen_name: str
    citizen_email: str
    photo_urls: List[str]
    created_at: str
    updated_at: str
    priority_score: int
    ai_summary: Optional[str] = None


class AnalyzeImageResponse(BaseModel):
    title: str
    description: str
    category: str
    department: str
    severity: str
    confidence: str
    photo_url: str  # Cloudinary URL after upload
