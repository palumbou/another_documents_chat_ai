"""
Document text extraction service.
Handles extraction from PDF, DOCX, and TXT files with optimization for large files.
"""

import os
from docx import Document

from app.config import DOCS_DIR
from app.utils.file_helpers import get_file_size_mb
from app.utils.pdf_helpers import extract_pdf_text_optimized
from app.utils.text_processing import clean_text
from app.utils.logging import log_extraction_method, log_processing_start, log_processing_complete

def extract_text(path: str) -> str:
    """
    Extract text from supported document types (PDF, DOCX, TXT).
    Optimized for large files with size limits and page limits.
    """
    file_size_mb = get_file_size_mb(path)
    filename = os.path.basename(path)
    
    log_processing_start(filename, file_size_mb)
    
    if path.lower().endswith(".pdf"):
        text = extract_pdf_text_optimized(path, int(file_size_mb * 1024 * 1024))
        log_extraction_method(filename, "PDF", len(text) > 100, len(text))
        return text
    elif path.lower().endswith(".docx"):
        text = extract_docx_text_optimized(path, int(file_size_mb * 1024 * 1024))
        log_extraction_method(filename, "DOCX", len(text) > 10, len(text))
        return text
    elif path.lower().endswith(".doc"):
        text = extract_doc_text_optimized(path, int(file_size_mb * 1024 * 1024))
        log_extraction_method(filename, "DOC", len(text) > 10, len(text))
        return text
    elif path.lower().endswith(".md"):
        text = extract_md_text_optimized(path, int(file_size_mb * 1024 * 1024))
        log_extraction_method(filename, "MD", len(text) > 10, len(text))
        return text
    else:
        text = extract_txt_file_optimized(path, int(file_size_mb * 1024 * 1024))
        log_extraction_method(filename, "TXT", len(text) > 10, len(text))
        return text

def extract_docx_text_optimized(path: str, file_size: int) -> str:
    """
    Optimized DOCX text extraction with limits.
    """
    try:
        doc = Document(path)
        max_chars = 100000 if file_size > 5 * 1024 * 1024 else 500000  # 5MB limit
        
        texts = []
        total_chars = 0
        
        for i, paragraph in enumerate(doc.paragraphs):
            if total_chars >= max_chars:
                texts.append(f"\n[... Truncated after {i} paragraphs due to size limit ...]")
                break
                
            para_text = paragraph.text.strip()
            if para_text:
                texts.append(para_text)
                total_chars += len(para_text)
        
        result = "\n".join(texts)
        result = clean_text(result)
        print(f"Extracted {len(result)} characters from {len(texts)} paragraphs")
        return result
        
    except Exception as e:
        print(f"Error reading DOCX {path}: {e}")
        return f"[Error reading DOCX: {str(e)}]"

def extract_doc_text_optimized(path: str, file_size: int) -> str:
    """
    Optimized DOC text extraction with limits.
    Uses python-docx2txt for legacy DOC files.
    """
    try:
        import docx2txt
        max_chars = 100000 if file_size > 5 * 1024 * 1024 else 500000  # 5MB limit
        
        # Extract text from DOC file
        text = docx2txt.process(path)
        
        if not text:
            return ""
        
        # Apply character limit
        if len(text) > max_chars:
            text = text[:max_chars] + "\n\n[Content truncated due to size limit]"
        
        return clean_text(text)
    
    except ImportError:
        # Fallback: try to read as plain text (not ideal but better than nothing)
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as file:
                text = file.read()
                max_chars = 100000 if file_size > 5 * 1024 * 1024 else 500000
                if len(text) > max_chars:
                    text = text[:max_chars] + "\n\n[Content truncated due to size limit]"
                return clean_text(text)
        except Exception as e:
            return f"Error reading DOC file: {str(e)}"
    
    except Exception as e:
        return f"Error extracting text from DOC file: {str(e)}"

def extract_md_text_optimized(path: str, file_size: int) -> str:
    """
    Optimized Markdown text extraction with limits.
    """
    try:
        max_chars = 100000 if file_size > 5 * 1024 * 1024 else 500000  # 5MB limit
        
        with open(path, 'r', encoding='utf-8', errors='ignore') as file:
            text = file.read()
        
        if not text:
            return ""
        
        # Apply character limit
        if len(text) > max_chars:
            text = text[:max_chars] + "\n\n[Content truncated due to size limit]"
        
        # For Markdown, we can optionally process it to remove markdown syntax
        # or keep it as-is for better context. Let's keep the markdown syntax.
        return clean_text(text)
    
    except Exception as e:
        return f"Error reading Markdown file: {str(e)}"

def extract_txt_file_optimized(path: str, file_size: int) -> str:
    """
    Optimized text file reading with size limits.
    """
    try:
        max_chars = 100000 if file_size > 1 * 1024 * 1024 else 500000  # 1MB limit
        
        with open(path, encoding="utf-8", errors="ignore") as f:
            content = f.read(max_chars)
            if len(content) == max_chars:
                content += f"\n[... File truncated at {max_chars} characters ...]"
        
        content = clean_text(content)
        print(f"Extracted {len(content)} characters from text file")
        return content
        
    except Exception as e:
        print(f"Error reading text file {path}: {e}")
        return f"[Error reading text file: {str(e)}]"

def load_existing_documents() -> dict:
    """Load documents that are already in the docs folder, including project subfolders."""
    from app.utils.file_helpers import get_supported_files_in_dir
    from app.services.processing_service import initialize_document_processing_status, document_status
    
    documents = {}
    
    # Load documents from main docs folder (global documents)
    supported_files = get_supported_files_in_dir(DOCS_DIR)
    for filename in supported_files:
        file_path = os.path.join(DOCS_DIR, filename)
        try:
            documents[filename] = extract_text(file_path)
            
            # Initialize processing status as completed
            initialize_document_processing_status(filename)
            document_status[filename]["status"] = "completed"
            document_status[filename]["progress"] = 100
            
            print(f"Loaded existing document: {filename}")
        except Exception as e:
            print(f"Error loading {filename}: {e}")
            # Initialize status as error if loading failed
            initialize_document_processing_status(filename)
            document_status[filename]["status"] = "error"
            document_status[filename]["error"] = str(e)
    
    # Load documents from project folders
    projects_dir = os.path.join(DOCS_DIR, "projects")
    if os.path.exists(projects_dir):
        for project_name in os.listdir(projects_dir):
            project_path = os.path.join(projects_dir, project_name)
            if os.path.isdir(project_path):
                project_files = get_supported_files_in_dir(project_path)
                for filename in project_files:
                    file_path = os.path.join(project_path, filename)
                    doc_key = f"{project_name}/{filename}"
                    try:
                        documents[doc_key] = extract_text(file_path)
                        
                        # Initialize processing status as completed
                        initialize_document_processing_status(doc_key)
                        document_status[doc_key]["status"] = "completed"
                        document_status[doc_key]["progress"] = 100
                        
                        print(f"Loaded existing project document: {doc_key}")
                    except Exception as e:
                        print(f"Error loading {doc_key}: {e}")
                        # Initialize status as error if loading failed
                        initialize_document_processing_status(doc_key)
                        document_status[doc_key]["status"] = "error"
                        document_status[doc_key]["error"] = str(e)
    
    return documents

def load_existing_documents_async() -> dict:
    """
    Initialize existing documents for async processing.
    Returns empty content but schedules background processing.
    """
    from app.utils.file_helpers import get_supported_files_in_dir
    from app.services.processing_service import schedule_document_processing, document_status
    import threading
    
    documents = {}
    supported_files = get_supported_files_in_dir(DOCS_DIR)
    
    if not supported_files:
        return documents
    
    print(f"🔍 Found {len(supported_files)} existing documents, scheduling background processing...")
    
    # Initialize status for all files as pending
    for filename in supported_files:
        document_status[filename] = {
            "status": "pending",
            "progress": 0,
            "error": None,
            "timestamp": None
        }
        documents[filename] = ""  # Empty content initially
        print(f"📋 Scheduled for processing: {filename}")
    
    # Start background processing with a small delay to let the web server start first
    def delayed_processing():
        import time
        time.sleep(2)  # 2 second delay to ensure web server is ready
        print("🚀 Starting background document processing...")
        
        for filename in supported_files:
            try:
                schedule_document_processing(filename, documents)
                time.sleep(0.5)  # Small delay between each document to avoid overwhelming the system
            except Exception as e:
                print(f"❌ Error scheduling processing for {filename}: {e}")
                document_status[filename]["status"] = "error"
                document_status[filename]["error"] = str(e)
    
    # Start the background thread
    processing_thread = threading.Thread(target=delayed_processing, daemon=True)
    processing_thread.start()
    
    return documents
