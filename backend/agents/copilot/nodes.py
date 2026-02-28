from typing import Any, Dict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from agents.state import TicketState
from agents.copilot.schemas import InsightOutput

# Initialize Gemini 2.5 Flash
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
insight_llm = llm.with_structured_output(InsightOutput)


def context_aggregator_node(state: TicketState) -> Dict[str, Any]:
    """
    Builds context for the insight generator directly from the ticket state.
    Avoids internal HTTP tool calls (which require auth tokens and add latency).
    """
    ticket_id = state.get("ticket_id", "")
    description = state.get("description", "")
    issue_type = state.get("issue_type", "general")
    department = state.get("department", "general")

    context_str = (
        f"Ticket ID: {ticket_id}\n"
        f"Issue Type: {issue_type}\n"
        f"Department: {department}\n"
        f"Description: {description}"
    )
    return {"context": context_str}


def insight_generator_node(state: TicketState) -> Dict[str, Any]:
    """
    Generates insights and a recommended action for the agent based on ticket context.
    """
    description = state.get("description", "")
    context = state.get("context", "")

    messages = [
        SystemMessage(content=(
            "You are an AI Copilot assisting a civic agency agent. "
            "Examine the complaint and context provided, then respond with:\n"
            "- recommended_action: EXACTLY 3–6 numbered action steps, one per line, "
            "formatted as '1. <step>', '2. <step>', etc. "
            "Each step must be a concrete, specific action the agent should take. "
            "Do NOT write any introduction, summary, or trailing sentence — ONLY the numbered list.\n"
            "- effort_estimate: a short time estimate (e.g., '2–4 hours', '1 day', 'Low effort').\n"
            "- risk_level: exactly one of 'low', 'medium', or 'high'."
        )),
        HumanMessage(content=f"Complaint: {description}\n\nContext:\n{context}")
    ]

    result: InsightOutput = insight_llm.invoke(messages)

    return {
        "recommended_action": result.recommended_action,
        "effort_estimate": result.effort_estimate,
        "risk_level": result.risk_level,
    }

