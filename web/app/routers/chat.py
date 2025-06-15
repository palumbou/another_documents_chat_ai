"""
Chat router.
Handles AI chat conversations with document context.
"""

from fastapi import APIRouter, Form, HTTPException

from app.schemas import ChatResponse
from app.services.chat_service import process_chat_request

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat(query: str = Form(...), model: str = Form(None), project: str = Form("global")):
    """
    Perform a chat query using Ollama with intelligent document chunking.
    Uses the provided model, or the currently selected engine, or fallback to a default model.
    Works with or without documents - if no documents, provides general AI assistance.
    Project parameter allows filtering documents by project with priority handling.
    """
    from app.shared_state import get_documents
    from app.config import DEFAULT_PROJECT_NAME
    
    documents = get_documents()
    
    # Filter documents by project with priority logic
    if project != "all":
        if project == DEFAULT_PROJECT_NAME:
            # Global project: include only global documents  
            filtered_documents = {key: value for key, value in documents.items() if "/" not in key}
        else:
            # Specific project: include project documents AND global documents
            # but prioritize project documents when same filename exists
            project_prefix = f"{project}/"
            project_docs = {key: value for key, value in documents.items() 
                           if key.startswith(project_prefix)}
            global_docs = {key: value for key, value in documents.items() if "/" not in key}
            
            # Merge with priority: project documents override global ones
            filtered_documents = global_docs.copy()
            
            # Add project documents, and for conflicts, use project version
            for key, value in project_docs.items():
                # Extract filename from project key (e.g., "test-project/file.txt" -> "file.txt")  
                filename = key.split("/", 1)[1] if "/" in key else key
                
                # Remove global version if exists
                if filename in filtered_documents:
                    del filtered_documents[filename]
                
                # Add project version with its full key
                filtered_documents[key] = value
        
        documents = filtered_documents
    
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
