"""
Pydantic schemas for request/response validation.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    query: str = Field(..., description="The user's question or message")
    model: Optional[str] = Field(None, description="Optional model to use for chat")

class DebugInfo(BaseModel):
    ollama_url: str
    prompt_used: str
    ollama_request_payload: Dict[str, Any]
    thinking_process: str

class ChatResponse(BaseModel):
    response: str
    model: str
    mode: str  # "document_chat" or "general_chat"
    chunks_processed: int
    total_chunks_available: int
    context_length: int
    debug_info: Optional[DebugInfo] = None

class DocumentInfo(BaseModel):
    processing_status: str
    processing_progress: int
    is_processed: bool
    error: Optional[str] = None
    total_chunks: int
    total_chars: int

class DocumentsResponse(BaseModel):
    documents: List[str]
    document_info: Dict[str, DocumentInfo]
    total_chunks: int
    processing_summary: Dict[str, int]

class ChunkInfo(BaseModel):
    chunk_index: int
    char_count: int
    preview: str

class DocumentChunksResponse(BaseModel):
    filename: str
    total_chunks: int
    chunks: List[ChunkInfo]

class SearchChunk(BaseModel):
    filename: str
    chunk_index: int
    total_chunks: int
    char_count: int
    preview: str

class SearchResponse(BaseModel):
    query: str
    chunks_found: int
    chunks: List[SearchChunk]

class UploadResponse(BaseModel):
    uploaded: List[str]
    existing: List[str]
    errors: List[str]
    processing: List[str]

class ModelInfo(BaseModel):
    name: str
    estimated_ram_gb: int
    category: str

class ModelsResponse(BaseModel):
    local: List[ModelInfo]
    remote: List[ModelInfo]
    system_memory: Dict[str, Any]
    remote_error: Optional[str] = None

class MemoryInfo(BaseModel):
    total_gb: float
    available_gb: float
    used_gb: float
    percent_used: float

class EngineStatus(BaseModel):
    name: Optional[str]
    available: bool
    responding: bool
    verified: bool

class StatusResponse(BaseModel):
    connected: bool
    engine: EngineStatus
    local_models: List[str]
    total_models: int
    error: Optional[str] = None

class EngineVerifyResponse(BaseModel):
    verified: bool
    engine: Optional[str]
    message: str
    previous_engine: Optional[str] = None

class EngineHealthResponse(BaseModel):
    healthy: bool
    engine: Optional[str]
    response_time_seconds: Optional[float] = None
    test_response: Optional[str] = None
    message: str
    error: Optional[str] = None

class DocumentStatus(BaseModel):
    status: str  # "pending", "processing", "completed", "error"
    progress: int  # 0-100
    error: Optional[str] = None
    uploaded_at: Optional[float] = None

class DocumentStatusResponse(BaseModel):
    filename: str
    status: DocumentStatus
    is_processed: bool
    text_length: int

class ProcessingStatusResponse(BaseModel):
    document_status: Dict[str, DocumentStatus]
    processed_documents: List[str]
    total_documents: int

class ModelPullRequest(BaseModel):
    name: str

class ModelRunRequest(BaseModel):
    name: str

class DebugPDFInfo(BaseModel):
    filename: str
    file_size_mb: float
    total_pages: int
    is_encrypted: bool
    pages_analysis: List[Dict[str, Any]]

class ExtractionMethodResult(BaseModel):
    success: bool
    text_length: Optional[int] = None
    has_text: Optional[bool] = None
    preview: Optional[str] = None
    error: Optional[str] = None

class DebugExtractionResponse(BaseModel):
    filename: str
    file_size_mb: float
    extraction_methods: Dict[str, ExtractionMethodResult]

class ReprocessResponse(BaseModel):
    filename: str
    reprocessed: bool
    text_length: int
    has_content: bool

# Project schemas
class ProjectInfo(BaseModel):
    name: str
    document_count: int
    is_global: bool
    documents: List[str]

class ProjectsResponse(BaseModel):
    projects: List[ProjectInfo]
    total_projects: int
    total_documents: int

class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="Project name")

class CreateProjectResponse(BaseModel):
    message: str
    project_name: str
    project_path: str

class DeleteProjectResponse(BaseModel):
    message: str
    deleted_documents: int

class MoveDocumentRequest(BaseModel):
    filename: str = Field(..., description="Document filename to move")
    target_project: str = Field(..., description="Target project name")

class MoveDocumentResponse(BaseModel):
    message: str
    old_project: str
    new_project: str
