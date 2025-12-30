import os
import uuid
import logging
import numpy as np
from typing import Optional, List

logger = logging.getLogger(__name__)

# Basic storage path
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_file(content: bytes, filename: str) -> str:
    """Save raw bytes to UPLOAD_DIR and return a unique file_id."""
    fid = str(uuid.uuid4())
    ext = os.path.splitext(filename)[1]
    path = os.path.join(UPLOAD_DIR, f"{fid}{ext}")
    
    with open(path, "wb") as f:
        f.write(content)
    
    logger.info(f"File saved: {filename} -> {fid}")
    return fid

def get_file_text(file_id: str) -> Optional[str]:
    """Retrieve text content from a saved file (supports text/md for now)."""
    # Find the file in UPLOAD_DIR
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
    """Enhanced RAG: Chunking and Keyword Relevance via Numpy."""
    content = get_file_text(file_id)
    if not content:
        return "No content found in file."
    
    # Split into overlaps chunks
    chunk_size = 1200
    overlap = 200
    chunks = []
    for i in range(0, len(content), chunk_size - overlap):
        chunks.append(content[i : i + chunk_size])
        
    if not chunks: return ""

    # Simple Keyword Overlap Ranking
    query_words = set(query.lower().split())
    relevance_scores = []
    
    for chunk in chunks:
        chunk_words = set(chunk.lower().split())
        score = len(query_words.intersection(chunk_words))
        relevance_scores.append(score)
    
    # Use numpy to get top indices
    relevance_scores = np.array(relevance_scores)
    top_indices = np.argsort(relevance_scores)[-3:] # Top 3 chunks
    
    relevant_chunks = [chunks[i] for i in top_indices if relevance_scores[i] > 0]
    
    if not relevant_chunks:
        return content[:max_chars] # Fallback to head
        
    return "\n[...]\n".join(relevant_chunks)
