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
    """Create a new project."""
    return create_project(request.name)

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
