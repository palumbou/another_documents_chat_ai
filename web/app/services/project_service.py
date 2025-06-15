"""
Project management service.
Handles project creation, deletion, and file organization.
"""

import os
import shutil
from typing import List, Dict, Any
from fastapi import HTTPException

from app.config import DOCS_DIR, PROJECTS_DIR, DEFAULT_PROJECT_NAME, MAX_PROJECT_NAME_LENGTH, ALLOWED_PROJECT_NAME_CHARS
from app.shared_state import get_documents

def get_projects() -> List[str]:
    """Get list of all available projects."""
    projects = [DEFAULT_PROJECT_NAME]  # Global project is always available
    
    if os.path.exists(PROJECTS_DIR):
        for item in os.listdir(PROJECTS_DIR):
            project_path = os.path.join(PROJECTS_DIR, item)
            if os.path.isdir(project_path) and is_valid_project_name(item):
                projects.append(item)
    
    return sorted(projects)

def create_project(project_name: str) -> Dict[str, Any]:
    """Create a new project directory."""
    if not is_valid_project_name(project_name):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid project name. Use only letters, numbers, underscore and dash. Max {MAX_PROJECT_NAME_LENGTH} characters."
        )
    
    if project_name == DEFAULT_PROJECT_NAME:
        raise HTTPException(status_code=400, detail=f"'{DEFAULT_PROJECT_NAME}' is reserved for global documents")
    
    project_path = get_project_path(project_name)
    
    if os.path.exists(project_path):
        raise HTTPException(status_code=400, detail=f"Project '{project_name}' already exists")
    
    os.makedirs(project_path, exist_ok=True)
    
    return {
        "message": f"Project '{project_name}' created successfully",
        "project_name": project_name,
        "project_path": project_path
    }

def delete_project(project_name: str, force: bool = False) -> Dict[str, Any]:
    """Delete a project and all its documents."""
    if project_name == DEFAULT_PROJECT_NAME:
        raise HTTPException(status_code=400, detail=f"Cannot delete '{DEFAULT_PROJECT_NAME}' project")
    
    if not is_valid_project_name(project_name):
        raise HTTPException(status_code=400, detail="Invalid project name")
    
    project_path = get_project_path(project_name)
    
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail=f"Project '{project_name}' not found")
    
    # Check if project has documents
    if not force and os.listdir(project_path):
        raise HTTPException(
            status_code=400, 
            detail=f"Project '{project_name}' contains documents. Use force=true to delete anyway"
        )
    
    shutil.rmtree(project_path)
    
    # Remove documents from memory that belong to this project
    documents = get_documents()
    docs_to_remove = []
    for doc_name in documents:
        if doc_name.startswith(f"{project_name}/"):
            docs_to_remove.append(doc_name)
    
    for doc_name in docs_to_remove:
        documents.pop(doc_name, None)
    
    return {
        "message": f"Project '{project_name}' deleted successfully",
        "deleted_documents": len(docs_to_remove)
    }

def get_project_path(project_name: str) -> str:
    """Get the full path for a project directory."""
    if project_name == DEFAULT_PROJECT_NAME:
        return DOCS_DIR
    return os.path.join(PROJECTS_DIR, project_name)

def get_project_documents(project_name: str) -> List[str]:
    """Get list of documents in a specific project."""
    project_path = get_project_path(project_name)
    
    if not os.path.exists(project_path):
        return []
    
    documents = []
    for filename in os.listdir(project_path):
        file_path = os.path.join(project_path, filename)
        if os.path.isfile(file_path):
            documents.append(filename)
    
    return sorted(documents)

def get_document_project(filename: str) -> str:
    """Determine which project a document belongs to based on its path."""
    # For documents in memory, they might have project prefix
    if "/" in filename:
        return filename.split("/")[0]
    
    # Check global documents
    global_path = os.path.join(DOCS_DIR, filename)
    if os.path.exists(global_path):
        return DEFAULT_PROJECT_NAME
    
    # Check project directories
    for project in get_projects():
        if project != DEFAULT_PROJECT_NAME:
            project_path = os.path.join(get_project_path(project), filename)
            if os.path.exists(project_path):
                return project
    
    return DEFAULT_PROJECT_NAME

def move_document_to_project(filename: str, target_project: str) -> Dict[str, Any]:
    """Move a document from one project to another."""
    current_project = get_document_project(filename)
    
    if current_project == target_project:
        raise HTTPException(status_code=400, detail="Document is already in the target project")
    
    current_path = os.path.join(get_project_path(current_project), filename)
    target_path = os.path.join(get_project_path(target_project), filename)
    
    if not os.path.exists(current_path):
        raise HTTPException(status_code=404, detail=f"Document '{filename}' not found")
    
    if os.path.exists(target_path):
        raise HTTPException(status_code=400, detail=f"Document '{filename}' already exists in project '{target_project}'")
    
    # Ensure target directory exists
    os.makedirs(get_project_path(target_project), exist_ok=True)
    
    # Move the file
    shutil.move(current_path, target_path)
    
    # Update in-memory documents
    documents = get_documents()
    old_key = f"{current_project}/{filename}" if current_project != DEFAULT_PROJECT_NAME else filename
    new_key = f"{target_project}/{filename}" if target_project != DEFAULT_PROJECT_NAME else filename
    
    if old_key in documents:
        documents[new_key] = documents.pop(old_key)
    
    return {
        "message": f"Document '{filename}' moved from '{current_project}' to '{target_project}'",
        "old_project": current_project,
        "new_project": target_project
    }

def is_valid_project_name(name: str) -> bool:
    """Validate project name according to rules."""
    if not name or len(name) > MAX_PROJECT_NAME_LENGTH:
        return False
    
    return all(c in ALLOWED_PROJECT_NAME_CHARS for c in name)

def get_projects_overview() -> Dict[str, Any]:
    """Get overview of all projects with document counts."""
    projects = get_projects()
    overview = {
        "projects": [],
        "total_projects": len(projects),
        "total_documents": 0
    }
    
    for project in projects:
        documents = get_project_documents(project)
        project_info = {
            "name": project,
            "document_count": len(documents),
            "is_global": project == DEFAULT_PROJECT_NAME,
            "documents": documents
        }
        overview["projects"].append(project_info)
        overview["total_documents"] += len(documents)
    
    return overview
