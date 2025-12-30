from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import json
import logging
from datetime import datetime, timezone
from fastapi.responses import StreamingResponse

from app.database import get_db, SessionLocal
from app.auth import get_current_user
from app.models import ChatSession, ChatMessage, ChatRequest, ChatWithFileRequest
from app.config import get_settings
from app.services import ai_service, memory_service, file_service

router = APIRouter(tags=["chat"])
settings = get_settings()
logger = logging.getLogger(__name__)

@router.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # 1. Verify Session Ownership
    session = db.query(ChatSession).filter(
        ChatSession.id == request.session_id, 
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or access denied")

    # 2. Save User Message
    memory_service.add_message(db, request.session_id, "user", request.message)

    # 3. Get Context (History)
    history = memory_service.get_history(db, request.session_id, limit=10)
    
    # 4. Stream from AI Service
    async def stream_generator():
        full_response = ""
        try:
            # We use a dedicated session for the background persistence task
            async for text_chunk in ai_service.generate_response_stream_async(history, request.model, request.personality):
                full_response += text_chunk
                yield text_chunk.encode()
            
            # Save Assistant Message after stream completes
            if full_response:
                with SessionLocal() as persistence_db:
                    memory_service.add_message(persistence_db, request.session_id, "assistant", full_response)
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"⚠️ Neural Link Interrupted: {str(e)}".encode()

    return StreamingResponse(stream_generator(), media_type="text/plain")

@router.post("/upload-file")
async def upload_file(file: UploadFile = File(...), current_user = Depends(get_current_user)):
    content = await file.read()
    file_id = file_service.save_file(content, file.filename)
    return {
        "filename": file.filename, 
        "file_id": file_id, 
        "size": len(content),
        "status": "indexed"
    }

@router.post("/chat-with-file")
async def chat_with_file(request: ChatWithFileRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # 1. Verify Session
    session = db.query(ChatSession).filter(ChatSession.id == request.session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 2. Get Context via RAG
    context = file_service.find_relevant_context(request.file_id, request.message)
    
    # 3. Build Prompt
    augmented_prompt = f"Context from uploaded file:\n{context}\n\nUser Question: {request.message}"
    
    # 4. Log User Query
    memory_service.add_message(db, request.session_id, "user", f"[File Query] {request.message}")
    
    # 5. Handle Streaming Response
    async def stream_generator():
        full_response = ""
        history = [{"role": "user", "content": augmented_prompt}]
        try:
            async for text_chunk in ai_service.generate_response_stream_async(history, request.model):
                full_response += text_chunk
                yield text_chunk.encode()
            
            # Save Assistant Message
            if full_response:
                with SessionLocal() as persistence_db:
                    memory_service.add_message(persistence_db, request.session_id, "assistant", full_response)
        except Exception as e:
            logger.error(f"RAG Stream error: {e}")
            yield f"⚠️ RAG Uplink Fault: {str(e)}".encode()

    return StreamingResponse(stream_generator(), media_type="text/plain")
