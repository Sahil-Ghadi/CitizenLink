"""
ingest_pdf.py — One-time script to chunk rag.pdf, generate embeddings,
and store them in Firestore collection `kb_chunks`.

Run once (or whenever the PDF changes):
    python ingest_pdf.py

Requirements: pymupdf, google-generativeai, firebase-admin, python-dotenv
"""
import os
import uuid
import fitz          # PyMuPDF
import google.generativeai as genai
from dotenv import load_dotenv
from firebase_admin_init import db   # reuses existing Firebase init

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

PDF_PATH = "rag.pdf"
CHUNK_SIZE = 400      # characters per chunk
CHUNK_OVERLAP = 80    # characters of overlap between consecutive chunks
COLLECTION = "kb_chunks"


def extract_text(path: str) -> str:
    doc = fitz.open(path)
    pages = []
    for page in doc:
        text = page.get_text("text").strip()
        if text:
            pages.append(text)
    return "\n\n".join(pages)


def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += size - overlap
    return chunks


def embed_text(text: str) -> list[float]:
    result = genai.embed_content(
        model="models/gemini-embedding-001",
        content=text,
        task_type="retrieval_document",
    )
    return result["embedding"]


def main():
    print(f"📄 Reading PDF: {PDF_PATH}")
    full_text = extract_text(PDF_PATH)
    chunks = chunk_text(full_text)
    print(f"   → {len(full_text)} chars, {len(chunks)} chunks")

    # Clear existing chunks
    existing = db.collection(COLLECTION).stream()
    for doc in existing:
        doc.reference.delete()
    print(f"🗑️  Cleared existing {COLLECTION} documents")

    print(f"🔢 Generating embeddings and storing in Firestore...")
    for i, chunk in enumerate(chunks):
        embedding = embed_text(chunk)
        chunk_id = str(uuid.uuid4())
        db.collection(COLLECTION).document(chunk_id).set({
            "chunk_id": chunk_id,
            "text": chunk,
            "embedding": embedding,
            "source": PDF_PATH,
            "index": i,
        })
        print(f"   [{i+1}/{len(chunks)}] stored chunk ({len(chunk)} chars)")

    print(f"\n✅ Done! {len(chunks)} chunks stored in Firestore `{COLLECTION}`")


if __name__ == "__main__":
    main()
