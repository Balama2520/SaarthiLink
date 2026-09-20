import os
import logging
from typing import List

logger = logging.getLogger(__name__)

CHROMA_DIR = "chroma_db"
embedding_model = None
collection = None
_rag_initialized = False


def _ensure_initialized() -> bool:
    global embedding_model, collection, _rag_initialized
    if _rag_initialized:
        return bool(collection and embedding_model)

    _rag_initialized = True
    try:
        import chromadb
        from sentence_transformers import SentenceTransformer

        os.makedirs(CHROMA_DIR, exist_ok=True)
        embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
        collection = chroma_client.get_or_create_collection(name="saarthi_docs")
    except Exception as exc:
        logger.error(
            f"Failed to initialize ChromaDB or SentenceTransformer in RAG: {exc}"
        )
        embedding_model = None
        collection = None

    return bool(collection and embedding_model)


def index_text_content(file_id: str, filename: str, text_content: str) -> bool:
    """Chunks and indexes the text content into ChromaDB."""
    if not _ensure_initialized():
        logger.error("RAG engine not initialized. Cannot index content.")
        return False

    try:
        # Split into overlapping chunks
        chunk_size = 1200
        overlap = 200
        chunks = []
        for i in range(0, len(text_content), chunk_size - overlap):
            chunks.append(text_content[i : i + chunk_size])

        if chunks:
            embeddings = embedding_model.encode(chunks).tolist()
            ids = [f"{file_id}_chunk_{i}" for i in range(len(chunks))]
            metadatas = [{"file_id": file_id, "filename": filename} for _ in chunks]

            collection.add(
                documents=chunks, embeddings=embeddings, metadatas=metadatas, ids=ids
            )
            logger.info(
                f"RAG: Indexed {len(chunks)} chunks for {filename} -> {file_id}"
            )
            return True
    except Exception as e:
        logger.error(f"RAG: Failed to index file {filename}: {e}")

    return False


def find_relevant_chunks(file_id: str, query: str, limit: int = 3) -> List[str]:
    """Queries ChromaDB for chunks matching the query string within the specified file."""
    if not _ensure_initialized():
        logger.warning("RAG: ChromaDB/Model not loaded. Cannot run query search.")
        return []

    try:
        query_embedding = embedding_model.encode([query]).tolist()
        results = collection.query(
            query_embeddings=query_embedding,
            n_results=limit,
            where={"file_id": file_id},
        )

        if results and results["documents"] and results["documents"][0]:
            return results["documents"][0]

    except Exception as e:
        logger.error(f"RAG: ChromaDB Query Error: {e}")

    return []
