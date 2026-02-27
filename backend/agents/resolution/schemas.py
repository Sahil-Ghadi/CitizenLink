from pydantic import BaseModel, Field

class ValidationOutput(BaseModel):
    """Structured output for the resolution validator node."""
    resolution_valid: bool = Field(description="Whether the resolution is valid based on the presence of a resolution note and proof URL.")
    reason: str = Field(description="Explanation of why the resolution is valid or not.")
