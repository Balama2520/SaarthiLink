from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from typing import Optional
import json
import logging
from fastapi.responses import StreamingResponse

from app.core.dependencies.auth import get_current_user
from app.schemas.chat import ChatRequest, ChatWithFileRequest
from app.core.config import get_settings
from app.services import ai_service, file_service, memory_json_service, voice_service
from app.services.chat_service import ChatService
from app.services.memory_service import MemoryService
from app.core.dependencies.services import get_chat_service, get_memory_service, save_message_background
from app.agents.graph import determine_agent

router = APIRouter(tags=["chat"])
settings = get_settings()
logger = logging.getLogger(__name__)

@router.post("/voice-to-text")
async def voice_to_text(file: UploadFile = File(...), current_user = Depends(get_current_user)):
    content = await file.read()
    text = await voice_service.voice_service.transcribe_audio(content)
    return {"text": text}

@router.post("/chat")
async def chat(
    request: ChatRequest,
    current_user = Depends(get_current_user),
    chat_svc: ChatService = Depends(get_chat_service),
    mem_svc: MemoryService = Depends(get_memory_service)
):
    # 1. Verify Session Ownership
    chat_svc.get_session(request.session_id, current_user.id)

    # 2. Save User Message to SQLite and JSON Memory
    mem_svc.add_message(request.session_id, "user", request.message)
    memory_json_service.memory_json_service.add_to_history(
        str(current_user.id), request.session_id, "user", request.message
    )

    # 3. Get Context
    history = mem_svc.get_history(request.session_id, limit=10)
    
    # 4. Agent Router (LangGraph)
    actual_personality = request.personality
    if request.personality == "default":
        actual_personality = await determine_agent(request.message)

    # 5. Stream from AI Service
    async def stream_generator():
        full_response = ""
        try:
            async for text_chunk in ai_service.generate_response_stream_async(
                history, 
                request.model, 
                actual_personality,
                image_data=request.image_data,
                user_id=str(current_user.id)
            ):
                full_response += text_chunk
                yield text_chunk.encode()
            
            if full_response:
                save_message_background(request.session_id, "assistant", full_response)
                memory_json_service.memory_json_service.add_to_history(
                    str(current_user.id), request.session_id, "assistant", full_response
                )
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
async def chat_with_file(
    request: ChatWithFileRequest,
    current_user = Depends(get_current_user),
    chat_svc: ChatService = Depends(get_chat_service),
    mem_svc: MemoryService = Depends(get_memory_service)
):
    # 1. Verify Session
    chat_svc.get_session(request.session_id, current_user.id)

    # 2. Get Context via RAG
    context = file_service.find_relevant_context(request.file_id, request.message)
    
    # 3. Build Prompt
    augmented_prompt = f"Context from uploaded file:\n{context}\n\nUser Question: {request.message}"
    
    mem_svc.add_message(request.session_id, "user", f"[File Query] {request.message}")
    
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
                save_message_background(request.session_id, "assistant", full_response)
        except Exception as e:
            logger.error(f"RAG Stream error: {e}")
            yield f"⚠️ RAG Uplink Fault: {str(e)}".encode()

    return StreamingResponse(stream_generator(), media_type="text/plain")


@router.post("/local")
async def chat_local(request: Request):
    """Handle a local-only chat request from guests. Expects JSON:
    { message, model?, personality?, local_profile?, local_history? }
    This endpoint will NOT persist messages to the DB; it only streams AI responses using provided local context.
    """
    payload = await request.json()
    message = payload.get("message")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    model = payload.get("model", settings.DEFAULT_MODEL if hasattr(settings, "DEFAULT_MODEL") else "phi3")
    personality = payload.get("personality", "default")
    local_profile = payload.get("local_profile")
    local_history = payload.get("local_history") or []

    # Build a conversational history combining local_profile and local_history
    history = []
    if local_profile:
        try:
            profile_text = json.dumps(local_profile)
        except Exception:
            profile_text = str(local_profile)
        history.append({"role": "system", "content": f"User profile and local data: {profile_text}"})

    # Append any supplied local history (should be list of {role, content})
    for h in local_history:
        if isinstance(h, dict) and h.get("role") and h.get("content"):
            history.append(h)

    # Finally add the user's current message
    history.append({"role": "user", "content": message})

    async def stream_generator():
        try:
            async for chunk in ai_service.generate_response_stream_async(history, model, personality, user_id="guest_local"):
                yield chunk.encode()
        except Exception as e:
            yield f"⚠️ Local chat error: {str(e)}".encode()

    return StreamingResponse(stream_generator(), media_type="text/plain")
