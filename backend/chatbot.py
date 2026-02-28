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
