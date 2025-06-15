"""
Chat router.
Handles AI chat conversations with document context.
"""

from fastapi import APIRouter, Form, HTTPException

from app.schemas import ChatResponse
from app.services.chat_service import process_chat_request

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat(query: str = Form(...), model: str = Form(None)):
    """
    Perform a chat query using Ollama with intelligent document chunking.
    Uses the provided model, or the currently selected engine, or fallback to a default model.
    Works with or without documents - if no documents, provides general AI assistance.
    """
    from app.shared_state import get_documents
    
    documents = get_documents()
    result = process_chat_request(query, documents, model)
    
    if not result["success"]:
        if "timed out" in result["error"]:
            raise HTTPException(status_code=504, detail=result["error"])
        else:
            raise HTTPException(status_code=500, detail=result["error"])
    
    return {
        "response": result["response"],
        "model": result["model"],
        "mode": result["mode"],
        "chunks_processed": result["chunks_processed"],
        "total_chunks_available": result["total_chunks_available"],
        "context_length": result["context_length"]
    }
