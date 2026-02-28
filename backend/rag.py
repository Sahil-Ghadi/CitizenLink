"""
rag.py — RAG utility for CitizenLink
Loads kb_chunks from Firestore and performs cosine-similarity search.
"""
import numpy as np
from firebase_admin_init import db


# ── Module-level cache so chunks are loaded once per process ───────────────────
_KB_CACHE: list[dict] | None = None


def load_kb_chunks(force_reload: bool = False) -> list[dict]:
    """Load all embedded chunks from Firestore (cached in memory)."""
    global _KB_CACHE
    if _KB_CACHE is None or force_reload:
        docs = db.collection("kb_chunks").stream()
        _KB_CACHE = [doc.to_dict() for doc in docs]
    return _KB_CACHE


def cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


def search_kb(
    query_embedding: list[float],
    top_k: int = 4,
    threshold: float = 0.70,
) -> list[dict]:
    """
    Return up to top_k chunks whose cosine similarity exceeds threshold.
    Each returned dict has keys: text, score.
    """
    chunks = load_kb_chunks()
    scored = []
    for chunk in chunks:
        emb = chunk.get("embedding")
        if not emb:
            continue
        score = cosine_similarity(query_embedding, emb)
        if score >= threshold:
            scored.append({"text": chunk["text"], "score": score})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]
