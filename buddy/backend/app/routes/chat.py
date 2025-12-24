from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import httpx
import json
import logging
from datetime import datetime, timezone

from app.database import get_db, SessionLocal
from app.auth import get_current_user
from app.models import ChatSession, ChatMessage, ChatRequest, ChatWithFileRequest
from app.config import get_settings

router = APIRouter(tags=["chat"])
settings = get_settings()
logger = logging.getLogger(__name__)

async def query_ollama(prompt: str, model: str):
    """Stream responses from Ollama"""
    url = settings.OLLAMA_URL
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": True
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    raise HTTPException(status_code=response.status_code, detail="Ollama Error")
                
                async for chunk in response.aiter_bytes():
                    yield chunk
    except Exception as e:
        logger.error(f"Ollama connection failed: {e}")
        yield json.dumps({"error": str(e)}).encode()

@router.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # 1. Save User Message
    user_msg = ChatMessage(
        session_id=request.session_id,
        role="user",
        content=request.message,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(user_msg)
    db.commit()

    # 2. Get Context (History) - Optimized query
    history = db.query(ChatMessage).filter(
        ChatMessage.session_id == request.session_id
    ).order_by(ChatMessage.timestamp.asc()).limit(10).all()
    
    context_prompt = ""
    for msg in history:
        context_prompt += f"{msg.role.upper()}: {msg.content}\n"
    
    full_prompt = f"{context_prompt}USER: {request.message}\nASSISTANT:"
    
    # 3. Stream from Ollama (Simple & Free)
    async def stream_generator():
        full_response = ""
        try:
            async for chunk in query_ollama(full_prompt, request.model):
                try:
                    data = json.loads(chunk)
                    text_chunk = data.get("response", "")
                    full_response += text_chunk
                    yield text_chunk.encode()
                except:
                    pass
            
            # Save Assistant Message after stream completes
            if full_response:
                with SessionLocal() as async_db:
                    assistant_msg = ChatMessage(
                        session_id=request.session_id,
                        role="assistant",
                        content=full_response,
                        timestamp=datetime.now(timezone.utc)
                    )
                    async_db.add(assistant_msg)
                    async_db.commit()
                    logger.info(f"Persistence: Assistant msg saved for session {request.session_id}")
        except Exception as e:
            logger.error(f"Stream error: {e}")

    from fastapi.responses import StreamingResponse
    return StreamingResponse(stream_generator(), media_type="text/plain")


@router.post("/upload-file")
async def upload_file(file: UploadFile = File(...), current_user = Depends(get_current_user)):
    # Mock file upload for now
    return {"filename": file.filename, "file_id": "file_12345", "size": file.size}

@router.post("/chat-with-file")
async def chat_with_file(request: ChatWithFileRequest, current_user = Depends(get_current_user)):
    # Mock RAG response
    return {"response": f"Analyzing file {request.file_id}... [Not Implemented yet]"}
