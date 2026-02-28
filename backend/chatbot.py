"""
CitizenLink AI Chat Engine
Gemini 2.5 Flash via LangGraph — stateless, context-injected per request.

Each /ask call builds a system prompt from ticket metadata + existing messages,
then runs a single LLM turn (no persistent memory needed since the ticket
messages ARE the memory).
"""
from __future__ import annotations

import os
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

# ── LLM ───────────────────────────────────────────────────────────────────────
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0.4,
)


def build_system_prompt(ticket: dict, messages: list[dict]) -> str:
    """
    Build a rich system prompt that gives the AI full context of the ticket
    and all existing agent/AI messages so it can answer citizen questions clearly.
    """
    lines = [
        "You are a helpful civic assistant for CitizenLink, an Indian municipal services platform.",
        "A citizen is asking you questions about their complaint ticket.",
        "Use the ticket details and the official updates below to answer clearly and empathetically.",
        "Be concise. Speak in plain English — no markdown, no bullet points prefixed with *, no code blocks.",
        "",
        "=== TICKET DETAILS ===",
        f"ID        : {ticket.get('id', '—')}",
        f"Title     : {ticket.get('title', '—')}",
        f"Category  : {ticket.get('category', '—')}",
        f"Department: {ticket.get('department', '—')}",
        f"Status    : {ticket.get('status', '—')}",
        f"Severity  : {ticket.get('severity', '—')}",
        f"Location  : {ticket.get('location_address', '—')}",
        f"Filed at  : {ticket.get('created_at', '—')}",
        f"Description: {ticket.get('description', '—')}",
    ]

    if messages:
        lines.append("")
        lines.append("=== OFFICIAL UPDATES ON THIS TICKET ===")
        for i, msg in enumerate(messages, 1):
            sender = "CitizenLink AI" if msg.get("from") == "llm" else msg.get("sender_name", "Agent")
            lines.append(f"[Update {i} — {sender} — {msg.get('sent_at', '')}]")
            lines.append(msg.get("text", "").strip())
            lines.append("")
    else:
        lines.append("")
        lines.append("There are no official updates on this ticket yet.")

    lines += [
        "",
        "Answer the citizen's question based on the above context.",
        "If the answer is not in the context, say so honestly and suggest they wait for an agent update.",
        "Do NOT make up information. Keep response under 150 words.",
    ]

    return "\n".join(lines)


def get_ai_reply(question: str, ticket: dict, messages: list[dict]) -> str:
    """
    Run a single Gemini turn with ticket context injected in the system prompt.

    Args:
        question : The citizen's question text.
        ticket   : Full ticket dict from Firestore.
        messages : List of existing messages on the ticket.

    Returns:
        Plain-text AI answer.
    """
    system_prompt = build_system_prompt(ticket, messages)
    result = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=question),
    ])
    return result.content.strip()


def summarize_for_escalation(ticket: dict, messages: list[dict]) -> str:
    """
    Generate a concise escalation briefing for a human agent.
    Covers: what the issue is, current state, citizen feedback, and recommended action.

    Returns:
        3–5 sentence plain-text summary an agent can read in seconds.
    """
    msg_block = ""
    if messages:
        lines = []
        for m in messages:
            sender = "AI" if m.get("from") == "llm" else ("System" if m.get("from") == "system" else m.get("sender_name", "Unknown"))
            lines.append(f"[{sender}] {m.get('text', '').strip()}")
        msg_block = "\n".join(lines)
    else:
        msg_block = "(No messages yet)"

    prompt = f"""You are a municipal operations assistant. Write a concise escalation briefing for a human agent.

TICKET:
- ID: {ticket.get('id')}
- Title: {ticket.get('title')}
- Category: {ticket.get('category')} / {ticket.get('department')}
- Status: {ticket.get('status')}
- Severity: {ticket.get('severity')}
- Priority Score: {ticket.get('priority_score')}
- Location: {ticket.get('location_address', 'Not specified')}
- Filed: {ticket.get('created_at')}
- Reopened: {'Yes — ' + ticket.get('reopen_reason', '') if ticket.get('status') == 'reopened' else 'No'}
- Escalation Reason: {ticket.get('escalation_reason', 'Not specified')}
- Description: {ticket.get('description', 'None')}

MESSAGES ON TICKET:
{msg_block}

Write 3–5 plain-text sentences (no markdown, no bullets) that capture:
1. What the issue is and where
2. Current status and how long it's been open
3. What the citizen has reported / any updates
4. Why it was escalated
5. What the agent should do next
"""
    result = llm.invoke([HumanMessage(content=prompt)])
    return result.content.strip()

