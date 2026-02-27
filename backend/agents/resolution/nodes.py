from typing import Any, Dict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from agents.state import TicketState
from agents.resolution.schemas import ValidationOutput

# Initialize Gemini 2.5 Flash
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
validator_llm = llm.with_structured_output(ValidationOutput)

def validation_node(state: TicketState) -> Dict[str, Any]:
    """
    Validates if the ticket resolution meets requirements (has note and proof).
    """
    resolution_note = state.get("resolution_note")
    proof_url = state.get("proof_url")
    
    messages = [
        SystemMessage(content=(
            "You are an AI Resolution Validator for a civic complaint system. "
            "A resolution is valid ONLY if both a resolution note and a proof URL are present and meaningful. "
            "Examine the provided inputs and determine validity."
        )),
        HumanMessage(content=f"Resolution Note: {resolution_note}\nProof URL: {proof_url}")
    ]
    
    result: ValidationOutput = validator_llm.invoke(messages)
    
    update: Dict[str, Any] = {
        "resolution_valid": result.resolution_valid,
        "reason": result.reason
    }
    
    if not result.resolution_valid:
        update["requires_human"] = True
        
    return update
