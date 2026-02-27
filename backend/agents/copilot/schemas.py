from pydantic import BaseModel, Field

class InsightOutput(BaseModel):
    """Structured output for the insight generator node."""
    recommended_action: str = Field(description="Step-by-step recommendation for the human agent.")
    effort_estimate: str = Field(description="Estimate of the effort required to resolve the issue (e.g., '2 hours', '1 day').")
    risk_level: str = Field(description="Risk assessment of the ticket (e.g., 'low', 'medium', 'high').")

class ReplyOutput(BaseModel):
    """Structured output for the reply generator node."""
    reply_draft: str = Field(description="A drafted empathetic and professional reply to the citizen.")
