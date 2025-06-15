"""
Search router.
Handles document search and chunk retrieval operations.
"""

from fastapi import APIRouter, Form

from app.schemas import SearchResponse
from app.services.chunking_service import search_documents

router = APIRouter()

@router.post("/search-chunks", response_model=SearchResponse)
async def search_chunks(query: str = Form(...), max_results: int = Form(5), project: str = Form("global")):
    """Search for relevant chunks across documents filtered by project."""
    from app.shared_state import get_documents
    from app.config import DEFAULT_PROJECT_NAME
    
    documents = get_documents()
    
    # Filter documents by project with priority logic (same as chat)
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
    
    result = search_documents(documents, query, max_results)
    return result
