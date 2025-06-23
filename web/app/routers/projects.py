"""
Project management router.
Handles project creation, deletion, listing, and document organization.
"""

from typing import List
from fastapi import APIRouter, HTTPException, Query

from app.schemas import (
    ProjectsResponse, CreateProjectRequest, CreateProjectResponse,
    DeleteProjectResponse, MoveDocumentRequest, MoveDocumentResponse
)
from app.services.project_service import (
    get_projects_overview, create_project, delete_project,
    move_document_to_project, get_projects
)

router = APIRouter()

@router.get("/projects", response_model=ProjectsResponse)
async def list_projects():
    """Get list of all projects with their document counts."""
    return get_projects_overview()

@router.post("/projects", response_model=CreateProjectResponse)
async def create_new_project(request: CreateProjectRequest):
    """Create a new project and return its initial state."""
    from app.services.chat_history_service import ChatHistoryService
    
    # Create the project
    result = create_project(request.name)
    
    # Get initial state (should be empty)
    chat_service = ChatHistoryService()
    project_chats = chat_service.get_project_chats(request.name)
    
    # Add project overview to response
    result["initial_state"] = {
        "documents": {
            "count": 0,
            "items": []
        },
        "chats": {
            "count": len(project_chats),
            "items": project_chats
        }
    }
    
    return result

@router.delete("/projects/{project_name}", response_model=DeleteProjectResponse)
async def delete_existing_project(
    project_name: str,
    force: bool = Query(False, description="Force delete even if project contains documents")
):
    """Delete a project and optionally its documents."""
    return delete_project(project_name, force)

@router.get("/projects/names")
async def get_project_names() -> List[str]:
    """Get simple list of project names."""
    return get_projects()

@router.post("/projects/move-document", response_model=MoveDocumentResponse)
async def move_document(request: MoveDocumentRequest):
    """Move a document from one project to another."""
    return move_document_to_project(request.filename, request.target_project)

@router.get("/projects/{project_name}/overview")
async def get_project_overview(project_name: str):
    """Get complete overview of a project including documents and chats."""
    from app.services.project_service import get_project_documents, is_valid_project_name
    from app.services.chat_history_service import ChatHistoryService
    from app.config import DEFAULT_PROJECT_NAME
    from app.shared_state import get_documents
    
    # Validate project name
    if project_name != DEFAULT_PROJECT_NAME and not is_valid_project_name(project_name):
        raise HTTPException(status_code=400, detail="Invalid project name")
    
    # Check if project exists
    projects = get_projects()
    if project_name not in projects:
        raise HTTPException(status_code=404, detail=f"Project '{project_name}' not found")
    
    # Get project documents (includes inheritance for non-global projects)
    project_documents = get_project_documents(project_name)
    
    # Get documents from memory with their processing status
    documents = get_documents()
    documents_info = []
    
    for filename in project_documents:
        # Determine document key for memory lookup
        if project_name == DEFAULT_PROJECT_NAME:
            doc_key = filename
        else:
            # Check if document exists in project or is inherited from global
            project_specific_key = f"{project_name}/{filename}"
            if project_specific_key in documents:
                doc_key = project_specific_key
            else:
                doc_key = filename  # Global document
        
        doc_info = {
            "filename": filename,
            "key": doc_key,
            "is_loaded": doc_key in documents,
            "is_inherited": project_name != DEFAULT_PROJECT_NAME and "/" not in doc_key
        }
        
        if doc_info["is_loaded"]:
            doc_content = documents[doc_key]
            doc_info["chunks"] = len(doc_content) if isinstance(doc_content, list) else 1
            doc_info["size"] = len(str(doc_content))
        
        documents_info.append(doc_info)
    
    # Get project chats
    chat_service = ChatHistoryService()
    project_chats = chat_service.get_project_chats(project_name)
    
    return {
        "project_name": project_name,
        "is_global": project_name == DEFAULT_PROJECT_NAME,
        "documents": {
            "count": len(documents_info),
            "items": documents_info
        },
        "chats": {
            "count": len(project_chats),
            "items": project_chats
        }
    }

@router.post("/projects/{project_name}/refresh")
async def refresh_project_data(project_name: str):
    """Force refresh of project documents and chats data."""
    from app.services.project_service import get_project_documents, is_valid_project_name
    from app.services.chat_history_service import ChatHistoryService
    from app.services.extraction_service import load_existing_documents
    from app.config import DEFAULT_PROJECT_NAME
    from app.shared_state import get_documents
    
    # Validate project name
    if project_name != DEFAULT_PROJECT_NAME and not is_valid_project_name(project_name):
        raise HTTPException(status_code=400, detail="Invalid project name")
    
    # Check if project exists
    projects = get_projects()
    if project_name not in projects:
        raise HTTPException(status_code=404, detail=f"Project '{project_name}' not found")
    
    try:
        # Force reload of all documents from filesystem
        refreshed_documents = load_existing_documents()
        
        # Update shared state
        current_documents = get_documents()
        current_documents.clear()
        current_documents.update(refreshed_documents)
        
        # Get updated project data
        project_documents = get_project_documents(project_name)
        chat_service = ChatHistoryService()
        project_chats = chat_service.get_project_chats(project_name)
        
        return {
            "message": f"Project '{project_name}' data refreshed successfully",
            "project_name": project_name,
            "documents_count": len(project_documents),
            "chats_count": len(project_chats),
            "total_documents_in_memory": len(current_documents)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing project data: {str(e)}")
