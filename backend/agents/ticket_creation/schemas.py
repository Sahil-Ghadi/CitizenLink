from typing import Literal
from pydantic import BaseModel, Field

class AnalysisOutput(BaseModel):
    """Structured output for the ticket analysis node."""
    issue_type: str = Field(description="The categorization of the issue (e.g., 'plumbing', 'electrical', 'road_repair', etc.)")
    severity: Literal["low", "medium", "high", "emergency"] = Field(description="The severity level of the issue.")
    department: str = Field(description="The department responsible for handling this type of issue.")
    ai_summary: str = Field(description="A brief AI-generated summary of the problem.")
