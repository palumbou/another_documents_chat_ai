"""
Background document processing service.
Handles asynchronous document processing with status tracking and retry logic.
"""

import time
from typing import Dict, Any
import threading
import os

from app.config import DOCS_DIR
from app.services.extraction_service import extract_text
from app.utils.logging import log_processing_start, log_processing_complete, log_processing_error

# Document processing status tracking
document_status: Dict[str, Dict[str, Any]] = {}  # filename -> {"status": "pending|processing|completed|error", "progress": 0-100, "error": "..."}

def process_document_async(filename: str, documents: Dict[str, str]) -> None:
    """
    Process a document in the background: extract text, OCR if needed, and create chunks.
    Updates the document_status dictionary with progress.
    """
    from app.shared_state import set_document
    import time
    
    filepath = os.path.join(DOCS_DIR, filename)
    start_time = time.time()
    
    try:
        # Update status to processing
        document_status[filename]["status"] = "processing"
        document_status[filename]["progress"] = 10
        document_status[filename]["timestamp"] = start_time
        
        # Extract text from the document
        text_content = extract_text(filepath)
        document_status[filename]["progress"] = 80
        
        # Store the extracted text using shared state
        set_document(filename, text_content)
        document_status[filename]["progress"] = 100
        document_status[filename]["status"] = "completed"
        
        duration = time.time() - start_time
        log_processing_complete(filename, len(text_content), duration)
        print(f"✅ Document '{filename}' processed successfully ({len(text_content)} characters)")
        
    except Exception as e:
        error_msg = str(e)
        log_processing_error(filename, error_msg)
        print(f"❌ Error processing document '{filename}': {error_msg}")
        document_status[filename]["status"] = "error"
        document_status[filename]["error"] = error_msg
        document_status[filename]["progress"] = 0

def initialize_document_processing_status(filename: str) -> None:
    """Initialize processing status for a new document."""
    document_status[filename] = {
        "status": "pending",
        "progress": 0,
        "uploaded_at": time.time()
    }

def get_processing_status(filename: str = None) -> Dict[str, Any]:
    """Get processing status for a specific document or all documents."""
    if filename:
        if filename not in document_status:
            return {"error": f"Document {filename} not found"}
        
        return {
            "filename": filename,
            "status": document_status[filename]
        }
    else:
        return {
            "document_status": document_status,
            "total_documents": len(document_status),
            "summary": {
                "pending": len([f for f, s in document_status.items() if s["status"] == "pending"]),
                "processing": len([f for f, s in document_status.items() if s["status"] == "processing"]),
                "completed": len([f for f, s in document_status.items() if s["status"] == "completed"]),
                "error": len([f for f, s in document_status.items() if s["status"] == "error"])
            }
        }

def retry_document_processing(filename: str) -> Dict[str, Any]:
    """Reset document status for retry."""
    filepath = os.path.join(DOCS_DIR, filename)
    
    # Check if file exists
    if not os.path.exists(filepath):
        return {"error": f"File {filename} not found"}
    
    # Reset status and start processing again
    document_status[filename] = {
        "status": "pending",
        "progress": 0,
        "uploaded_at": time.time()
    }
    
    return {
        "message": f"Retry processing initialized for {filename}",
        "status": "pending"
    }

def get_documents_overview(documents: Dict[str, str]) -> Dict[str, Any]:
    """Get overview of all documents with processing and chunk information."""
    from app.services.chunking_service import chunk_documents_for_processing
    
    # Get all files that have been uploaded (including those still processing)
    all_files = set(documents.keys()) | set(document_status.keys())
    
    # Get chunk information for processed documents
    all_chunks = chunk_documents_for_processing(documents, chunk_size=6000)
    
    # Create summary by document
    doc_info = {}
    for filename in all_files:
        # Processing status
        status_info = document_status.get(filename, {"status": "completed", "progress": 100})
        
        doc_info[filename] = {
            "processing_status": status_info["status"],
            "processing_progress": status_info.get("progress", 100),
            "is_processed": filename in documents,
            "error": status_info.get("error"),
            "total_chunks": 0,
            "total_chars": 0
        }
    
    # Add chunk information for processed documents
    for chunk in all_chunks:
        filename = chunk['filename']
        if filename in doc_info:
            doc_info[filename]['total_chunks'] = chunk['total_chunks']
            doc_info[filename]['total_chars'] += chunk['char_count']
    
    return {
        "documents": list(all_files),
        "document_info": doc_info,
        "total_chunks": len(all_chunks),
        "processing_summary": {
            "pending": len([f for f, s in document_status.items() if s["status"] == "pending"]),
            "processing": len([f for f, s in document_status.items() if s["status"] == "processing"]),
            "completed": len([f for f, s in document_status.items() if s["status"] == "completed"]),
            "error": len([f for f, s in document_status.items() if s["status"] == "error"])
        }
    }

def schedule_document_processing(filename: str, documents: Dict[str, str]) -> None:
    """
    Schedule a document for background processing.
    Starts processing in a separate thread to avoid blocking.
    """
    # Initialize status if not exists
    if filename not in document_status:
        document_status[filename] = {
            "status": "pending",
            "progress": 0,
            "error": None,
            "timestamp": None
        }
    
    # Start processing in background thread
    def background_process():
        process_document_async(filename, documents)
    
    processing_thread = threading.Thread(target=background_process, daemon=True)
    processing_thread.start()
    print(f"🔄 Started background processing for: {filename}")
