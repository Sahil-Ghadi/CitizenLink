"""
CitizenLink — Escalation Engine
Defines SLA windows, evaluates escalation triggers, and writes escalation
metadata back to Firestore.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from firebase_admin_init import db

# ── SLA windows (hours from status entry to breach) ───────────────────────────
# Format: {severity: {"submitted": h, "in_progress": h}}
SLA_WINDOWS: dict[str, dict[str, float]] = {
    "emergency": {"submitted": 1,  "in_progress": 4},
    "high":      {"submitted": 4,  "in_progress": 12},
    "medium":    {"submitted": 12, "in_progress": 24},
    "low":       {"submitted": 24, "in_progress": 48},
}

DEFAULT_SLA = {"submitted": 24, "in_progress": 48}


def _hours_since(iso: str) -> float:
    """Return hours elapsed since an ISO-8601 timestamp."""
    ts = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return (datetime.now(timezone.utc) - ts).total_seconds() / 3600


def check_sla_breach(ticket: dict) -> tuple[bool, str]:
    """
    Check whether a ticket has breached its SLA window.

    Returns:
        (breached: bool, reason: str)
    """
    severity = ticket.get("severity", "medium")
    status   = ticket.get("status", "submitted")
    windows  = SLA_WINDOWS.get(severity, DEFAULT_SLA)

    if status == "submitted":
        hours = _hours_since(ticket.get("created_at", datetime.now(timezone.utc).isoformat()))
        limit = windows["submitted"]
        if hours > limit:
            return True, f"SLA breach: ticket unassigned for {hours:.1f}h (limit {limit}h, severity={severity})"

    elif status == "in-progress":
        reference = ticket.get("status_changed_at") or ticket.get("created_at")
        if reference:
            hours = _hours_since(reference)
            limit = windows["in_progress"]
            if hours > limit:
                return True, f"SLA breach: ticket in-progress for {hours:.1f}h (limit {limit}h, severity={severity})"

    return False, ""


def should_escalate(ticket: dict) -> tuple[bool, str, int]:
    """
    Evaluate all escalation triggers for a ticket.

    Returns:
        (escalate: bool, reason: str, level: int)
        level 1 = SLA breach
        level 2 = citizen reopen / low rating
        level 3 = emergency unassigned or multiple reopens
    """
    status = ticket.get("status", "")

    # Already terminal — don't re-escalate
    if status in ("resolved", "auto-resolved", "rejected"):
        return False, "", 0

    reopen_count = ticket.get("reopen_count", 0) or 0

    # Level 3: repeated reopens or emergency unassigned
    if reopen_count >= 2:
        return True, f"Multiple reopens ({reopen_count}x) — citizen still unsatisfied", 3

    if ticket.get("severity") == "emergency" and not ticket.get("agent_uid"):
        hours = _hours_since(ticket.get("created_at", datetime.now(timezone.utc).isoformat()))
        if hours > 1:
            return True, f"Emergency ticket unassigned for {hours:.1f}h", 3

    # Level 2: citizen reopen
    if status == "reopened":
        reason = ticket.get("reopen_reason", "Citizen reported issue not resolved")
        return True, f"Citizen reopened ticket: {reason}", 2

    # Level 1: SLA breach
    breached, breach_reason = check_sla_breach(ticket)
    if breached:
        return True, breach_reason, 1

    return False, "", 0


def escalate_ticket(ticket_id: str, ticket: dict, reason: str, level: int) -> None:
    """
    Write escalation metadata to Firestore for a given ticket.
    Idempotent — won't downgrade if already at a higher level.
    """
    existing_level = ticket.get("escalation_level", 0) or 0
    if ticket.get("escalated") and existing_level >= level:
        return  # Don't overwrite a higher escalation

    now = datetime.now(timezone.utc).isoformat()
    db.collection("tickets").document(ticket_id).update({
        "escalated":                  True,
        "escalation_level":           level,
        "escalation_reason":          reason,
        "escalated_at":               now,
        "escalation_acknowledged":    False,
        "escalation_acknowledged_by": None,
        "escalation_acknowledged_at": None,
        "updated_at":                 now,
    })


def scan_and_escalate_all() -> list[str]:
    """
    Scan all active tickets and escalate any that breach thresholds.
    Returns list of ticket IDs that were escalated in this run.
    """
    active_statuses = {"submitted", "in-progress", "reopened"}
    docs = db.collection("tickets").stream()
    escalated_ids = []

    for doc in docs:
        data = doc.to_dict()
        if data.get("status") not in active_statuses:
            continue
        should, reason, level = should_escalate(data)
        if should:
            escalate_ticket(doc.id, data, reason, level)
            escalated_ids.append(doc.id)

    return escalated_ids
