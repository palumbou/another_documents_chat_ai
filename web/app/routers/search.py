"""
Search router.
Handles document search and chunk retrieval operations.
"""

from fastapi import APIRouter, Form

from app.schemas import SearchResponse
from app.services.chunking_service import search_documents

router = APIRouter()

@router.post("/search-chunks", response_model=SearchResponse)
async def search_chunks(query: str = Form(...), max_results: int = Form(5)):
    """Search for relevant chunks across all documents."""
    from app.shared_state import get_documents
    
    documents = get_documents()
    result = search_documents(documents, query, max_results)
    return result
