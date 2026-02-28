from pydantic import BaseModel, Field

class InsightOutput(BaseModel):
    """Structured output for the insight generator node."""
    recommended_action: str = Field(
        description=(
            "A numbered list of 3–6 concrete action steps the human agent should follow to resolve this ticket. "
            "Format EXACTLY as:\n1. <step one>\n2. <step two>\n3. <step three>\n"
            "Each step on its own line, starting with the number and a period. "
            "No introduction sentence, no conclusion, no prose — ONLY the numbered list."
        )
    )
    effort_estimate: str = Field(description="Estimate of the effort required to resolve the issue (e.g., '2 hours', '1 day').")
    risk_level: str = Field(description="Risk assessment of the ticket (e.g., 'low', 'medium', 'high').")

class ReplyOutput(BaseModel):
    """Structured output for the reply generator node."""
    reply_draft: str = Field(description="A drafted empathetic and professional reply to the citizen.")
