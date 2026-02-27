from pydantic import BaseModel, Field

class AssistantOutput(BaseModel):
    """Structured output for the citizen assistant node."""
    response_text: str = Field(description="The automated response text sent to the citizen.")
    confidence_score: float = Field(description="Confidence score of the AI response as a float from 0.0 to 1.0.")
    requires_human: bool = Field(description="Boolean flag indicating if a human agent must take over.")
