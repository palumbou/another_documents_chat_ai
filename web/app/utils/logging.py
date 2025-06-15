"""
Enhanced logging utilities for the application.
"""

import logging
import sys
from datetime import datetime
from typing import Optional

def setup_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Set up a logger with consistent formatting."""
    logger = logging.getLogger(name)
    
    if logger.handlers:
        return logger  # Logger already configured
    
    logger.setLevel(level)
    
    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    
    logger.addHandler(handler)
    return logger

def log_processing_start(filename: str, file_size_mb: float) -> None:
    """Log the start of document processing."""
    logger = logging.getLogger("document_processor")
    logger.info(f"🔄 Starting processing: {filename} ({file_size_mb:.1f} MB)")

def log_processing_complete(filename: str, text_length: int, duration: float) -> None:
    """Log successful completion of document processing."""
    logger = logging.getLogger("document_processor")
    logger.info(f"✅ Completed processing: {filename} ({text_length} chars in {duration:.1f}s)")

def log_processing_error(filename: str, error: str) -> None:
    """Log document processing errors."""
    logger = logging.getLogger("document_processor")
    logger.error(f"❌ Processing failed: {filename} - {error}")

def log_extraction_method(filename: str, method: str, success: bool, text_length: int = 0) -> None:
    """Log text extraction method results."""
    logger = logging.getLogger("extraction")
    status = "✅" if success else "❌"
    logger.info(f"{status} {method} on {filename}: {text_length} chars")

def log_chat_request(query: str, model: str, mode: str, chunks_used: int) -> None:
    """Log chat request details."""
    logger = logging.getLogger("chat")
    logger.info(f"💬 Chat [{mode}] with {model}: {chunks_used} chunks, query: {query[:50]}...")

def log_engine_status(engine: str, status: str, details: Optional[str] = None) -> None:
    """Log engine status changes."""
    logger = logging.getLogger("engine")
    msg = f"🤖 Engine {engine}: {status}"
    if details:
        msg += f" - {details}"
    logger.info(msg)

def log_system_info(memory_gb: float, cpu_percent: float) -> None:
    """Log system resource information."""
    logger = logging.getLogger("system")
    logger.info(f"🖥️  System: {memory_gb:.1f}GB RAM, {cpu_percent:.1f}% CPU")

# Initialize loggers
app_logger = setup_logger("app")
document_logger = setup_logger("document_processor")
extraction_logger = setup_logger("extraction")
chat_logger = setup_logger("chat")
engine_logger = setup_logger("engine")
system_logger = setup_logger("system")
