"""
test_triage.py — fully simulate the triage logic for a test query.
Run: venv\Scripts\python test_triage.py
"""
import os, json
from dotenv import load_dotenv
load_dotenv()

import google.generativeai as genai
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
from rag import search_kb

title       = "Documents required for marriage certificate"
category    = "Civil Services"
description = ""
query = f"{title}. {description}".strip()

print(f"Query: {query}")
embed = genai.embed_content(model="models/gemini-embedding-001", content=query, task_type="retrieval_query")
matches = search_kb(embed["embedding"], top_k=4, threshold=0.60)
print(f"\nMatches found: {len(matches)}")
for m in matches:
    print(f"  [{m['score']:.4f}] {m['text'][:100]!r}")

if not matches:
    print("→ ROUTE: human (no KB match)")
else:
    context = "\n\n".join(f"[Match {i+1} — relevance {m['score']:.2f}]\n{m['text']}" for i, m in enumerate(matches))
    prompt = f"""You are a helpful civic assistant for CitizenLink.

The citizen has asked:
Title: {title}
Category: {category}
Description: {description}

Relevant answers from our official knowledge base:
---
{context}
---

Instructions:
- If the knowledge base above contains information that directly or partially answers this citizen's question, set can_resolve to true and write a clear, friendly, complete response.
- For informational/FAQ questions (documents required, procedures, eligibility, timelines, fees, etc.) — if the knowledge base covers the topic even partially, RESOLVE IT.
- Only set can_resolve to false if physical inspection, emergency response, or no relevant info at all.
- Confidence: for FAQ queries with direct matches, set 0.80+.

Respond ONLY with valid JSON (no markdown, no code fences):
{{"can_resolve": true or false, "confidence": 0.0-1.0, "response": "citizen-facing answer or empty string"}}"""

    model = genai.GenerativeModel("gemini-2.5-flash")
    raw = model.generate_content(prompt).text.strip()
    print(f"\nRaw LLM output:\n{raw[:500]}")
    try:
        result = json.loads(raw)
        print(f"\ncan_resolve: {result.get('can_resolve')}")
        print(f"confidence:  {result.get('confidence')}")
        print(f"response:    {result.get('response', '')[:200]}")
        routed = "LLM auto-resolve ✅" if result.get("can_resolve") and float(result.get("confidence", 0)) >= 0.60 else "human agent ❌"
        print(f"\n→ ROUTE: {routed}")
    except Exception as e:
        print(f"JSON parse error: {e}")
