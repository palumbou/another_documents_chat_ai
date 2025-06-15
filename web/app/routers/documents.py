"""
Document management router.
Handles document upload, deletion, listing, and processing status.
"""

import os
from typing import List
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, BackgroundTasks, Query

from app.config import DOCS_DIR, DEFAULT_PROJECT_NAME
from app.schemas import DocumentsResponse, DocumentChunksResponse, DocumentStatusResponse, ProcessingStatusResponse, ReprocessResponse
from app.services.project_service import get_project_path, get_projects, is_valid_project_name
from app.services.processing_service import (
    process_document_async, initialize_document_processing_status, 
    get_processing_status, retry_document_processing, get_documents_overview
)
from app.services.extraction_service import extract_text
from app.services.chunking_service import get_document_chunks_info
from app.utils.file_helpers import is_supported_file
from app.shared_state import get_documents

router = APIRouter()

@router.get("/documents", response_model=DocumentsResponse)
async def list_documents(project: str = Query(None, description="Filter documents by project name")):
    """Return the list of currently loaded documents with chunk and processing information."""
    documents = get_documents()
    
    # Filter documents by project if specified
    if project is not None:
        if project == DEFAULT_PROJECT_NAME:
            # Global project: return only documents without "/" in the key
            filtered_documents = {key: value for key, value in documents.items() if "/" not in key}
        else:
            # Specific project: return only documents with the exact project prefix
            project_prefix = f"{project}/"
            filtered_documents = {key: value for key, value in documents.items() 
                                 if key.startswith(project_prefix)}
        
        return get_documents_overview(filtered_documents)
    else:
        # No filter: return all documents
        return get_documents_overview(documents)

@router.get("/documents/{filename:path}/chunks", response_model=DocumentChunksResponse)
async def get_document_chunks(filename: str):
    """Get chunk information for a specific document."""
    documents = get_documents()
    if filename not in documents:
        raise HTTPException(status_code=404, detail=f"Document {filename} not found")
    
    result = get_document_chunks_info(documents, filename)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result

@router.post("/upload")
async def upload(
    files: List[UploadFile] = File(...), 
    overwrite: str = Form("false"), 
    project: str = Form(DEFAULT_PROJECT_NAME),
    background_tasks: BackgroundTasks = None
):
    """
    Handle document uploads with instant upload and background processing.
    Files are saved immediately, text extraction happens in background.
    Supports project-based organization.
    """
    results = {"uploaded": [], "existing": [], "errors": [], "processing": []}
    overwrite_all = overwrite.lower() == "true"
    
    # Validate project name
    if project != DEFAULT_PROJECT_NAME and not is_valid_project_name(project):
        results["errors"].append(f"Invalid project name: {project}")
        return results
    
    # Get project path
    project_path = get_project_path(project)
    os.makedirs(project_path, exist_ok=True)
    
    for f in files:
        # Check if file type is supported
        if not is_supported_file(f.filename):
            results["errors"].append(f"Unsupported file type: {f.filename}")
            continue
            
        dest = os.path.join(project_path, f.filename)
        
        # Check if file already exists
        if os.path.exists(dest) and not overwrite_all:
            results["existing"].append(f.filename)
            continue
        
        try:
            # Save file immediately
            content = await f.read()
            with open(dest, "wb") as out:
                out.write(content)
            
            # Create document key with project prefix if not global
            doc_key = f.filename if project == DEFAULT_PROJECT_NAME else f"{project}/{f.filename}"
            
            # Initialize processing status
            initialize_document_processing_status(doc_key)
            
            # Add to background processing queue
            background_tasks.add_task(process_document_async, doc_key, get_documents(), dest)
            
            results["uploaded"].append(f.filename)
            results["processing"].append(doc_key)
            
        except Exception as e:
            results["errors"].append(f"Error uploading {f.filename}: {str(e)}")
    
    return results

@router.delete("/documents/{doc_key:path}")
async def delete_document(doc_key: str):
    """Delete a document from the docs folder and memory. Supports project paths."""
    from app.services.project_service import get_document_project, get_project_path
    
    # Determine the actual file path
    if "/" in doc_key:
        # Project document
        project_name, filename = doc_key.split("/", 1)
        file_path = os.path.join(get_project_path(project_name), filename)
    else:
        # Global document
        file_path = os.path.join(DOCS_DIR, doc_key)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Document {doc_key} not found")
    
    try:
        os.remove(file_path)
        documents = get_documents()
        if doc_key in documents:
            from app.shared_state import remove_document
            remove_document(doc_key)
        return {"deleted": doc_key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting {doc_key}: {str(e)}")

@router.post("/documents/reprocess/{filename}", response_model=ReprocessResponse)
async def reprocess_document(filename: str):
    """
    Reprocess a document with the improved extraction methods.
    """
    file_path = os.path.join(DOCS_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File {filename} not found")
    
    try:
        # Re-extract text with new methods
        from app.shared_state import set_document
        extracted_text = extract_text(file_path)
        set_document(filename, extracted_text)
        
        return {
            "filename": filename,
            "reprocessed": True,
            "text_length": len(extracted_text),
            "has_content": len(extracted_text.strip()) > 100
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reprocessing {filename}: {str(e)}")

@router.get("/documents/status", response_model=ProcessingStatusResponse)
async def get_documents_status():
    """
    Get the processing status of all documents.
    Returns status, progress, and metadata for each document.
    """
    status_info = get_processing_status()
    documents = get_documents()
    return {
        "document_status": status_info["document_status"],
        "processed_documents": list(documents.keys()),
        "total_documents": status_info["total_documents"]
    }

@router.get("/documents/status/{filename}", response_model=DocumentStatusResponse)
async def get_document_status(filename: str):
    """Get the processing status of a specific document."""
    status_info = get_processing_status(filename)
    
    if "error" in status_info:
        raise HTTPException(status_code=404, detail=status_info["error"])
    
    return {
        "filename": filename,
        "status": status_info["status"],
        "is_processed": filename in get_documents(),
        "text_length": len(get_documents().get(filename, ""))
    }

@router.post("/documents/{filename}/retry")
async def retry_document_processing_endpoint(filename: str, background_tasks: BackgroundTasks):
    """Retry processing for a failed document."""
    result = retry_document_processing(filename)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    # Remove from documents if it was there
    documents = get_documents()
    if filename in documents:
        from app.shared_state import remove_document
        remove_document(filename)
    
    # Add to background processing
    background_tasks.add_task(process_document_async, filename, get_documents())
    
    return result
