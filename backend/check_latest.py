"""
check_latest.py
"""
from firebase_admin_init import db

docs = list(db.collection("tickets").order_by("created_at", direction="DESCENDING").limit(2).stream())
for doc in docs:
    t = doc.to_dict()
    print(f"Ticket: {t.get('title')}")
    print(f"  status: {t.get('status')}")
    print(f"  triage_status: {t.get('triage_status')}")
    print(f"  triage_confidence: {t.get('triage_confidence')}")
    print(f"  messages: {len(t.get('messages', []))}")
    print("---")
