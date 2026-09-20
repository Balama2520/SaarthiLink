import os
import uuid
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Basic storage path
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_file(content: bytes, filename: str) -> str:
    """Save raw bytes to UPLOAD_DIR and index into RAG database."""
    fid = str(uuid.uuid4())
    ext = os.path.splitext(filename)[1]
    path = os.path.join(UPLOAD_DIR, f"{fid}{ext}")
    
    with open(path, "wb") as f:
        f.write(content)
    
    # Process text and index via RAG
    try:
        from app.rag import index_text_content

        text_content = content.decode("utf-8", errors="ignore")
        index_text_content(fid, filename, text_content)
    except Exception as e:
        logger.error(f"Failed to process text for file {filename}: {e}")
        
    return fid

def get_file_text(file_id: str) -> Optional[str]:
    """Retrieve text content from a saved file."""
    for f in os.listdir(UPLOAD_DIR):
        if f.startswith(file_id):
            path = os.path.join(UPLOAD_DIR, f)
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as file:
                    return file.read()
            except Exception as e:
                logger.error(f"Failed to read file {file_id}: {e}")
                return None
    return None

def find_relevant_context(file_id: str, query: str, max_chars: int = 4000) -> str:
    """Retrieves relevant chunk segments from unified RAG service, falls back to head text."""
    from app.rag import find_relevant_chunks

    chunks = find_relevant_chunks(file_id, query)
    if chunks:
        return "\n[...]\n".join(chunks)
        
    # Fallback
    content = get_file_text(file_id)
    return content[:max_chars] if content else "No content found."
