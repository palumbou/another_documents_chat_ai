"""
Pydantic schemas for request/response validation.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    query: str = Field(..., description="The user's question or message")
    model: Optional[str] = Field(None, description="Optional model to use for chat")

class ChatResponse(BaseModel):
    response: str
    model: str
    mode: str  # "document_chat" or "general_chat"
    chunks_processed: int
    total_chunks_available: int
    context_length: int

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
    chunks: List[SearchChunk]
    total_found: int
    total_available: int

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
