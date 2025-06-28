"""
Configuration module for the Documents Chat AI application.
Contains all configurable parameters and settings.
"""

import os

# Directory configuration - All paths are absolute in container
BASE_DATA_DIR = "/app/data"  # Base directory for all application data
DOCS_DIR = "/app/data/documents"  # Directory for documents
GLOBAL_DOCS_DIR = "/app/data/documents/global"  # Directory for global documents
PROJECTS_DIR = "/app/data/documents/projects"  # Directory for project-specific documents
CHATS_DIR = "/app/data/chats"  # Base directory for chats
GLOBAL_CHATS_DIR = "/app/data/chats/global"  # Directory for global chats
PROJECT_CHATS_DIR = "/app/data/chats/projects"  # Directory for project-specific chats
STATIC_DIR = "static"
TEMPLATES_DIR = "templates"

# Ensure directories exist
os.makedirs(BASE_DATA_DIR, exist_ok=True)
os.makedirs(DOCS_DIR, exist_ok=True)
os.makedirs(GLOBAL_DOCS_DIR, exist_ok=True)
os.makedirs(PROJECTS_DIR, exist_ok=True)
os.makedirs(CHATS_DIR, exist_ok=True)
os.makedirs(GLOBAL_CHATS_DIR, exist_ok=True)
os.makedirs(PROJECT_CHATS_DIR, exist_ok=True)

# Processing limits and settings
MAX_FILE_SIZE_MB = 100  # Maximum file size in MB
MAX_CHARS_PER_PAGE = 8000  # Maximum characters per page for PDF extraction
MAX_TOTAL_CHARS = 2000000  # Maximum total characters per document
MAX_PAGES_LARGE_FILES = 100  # Maximum pages to process for large files (>10MB)
MAX_PAGES_OCR = 30  # Maximum pages to process with OCR for large files

# Chunking configuration
DEFAULT_CHUNK_SIZE = 12000  # Default chunk size for document processing
SEARCH_CHUNK_SIZE = 8000  # Chunk size for search operations
MAX_CHUNKS_PER_QUERY = 5  # Maximum chunks to return per search query

# Model and engine configuration
DEFAULT_MODEL = "llama3.2"
PREFERRED_MODELS = ["llama3.2:1b", "phi3.5:mini", "gemma2:2b", "llama3.2:3b"]

# API timeouts and settings
OLLAMA_BASE_URL = "http://ollama:11434"
OLLAMA_TIMEOUT = 300  # 5 minutes for complex queries
OLLAMA_HEALTH_TIMEOUT = 30
OLLAMA_QUICK_TIMEOUT = 10

# Chat settings
CHAT_CONTEXT_WINDOW = 12288  # 12K tokens for balanced performance
CHAT_MAX_RESPONSE = 2048  # Maximum response length
CHAT_TEMPERATURE = 0.7
CHAT_TOP_P = 0.9

# Cache settings
MODELS_CACHE_TTL = 300  # 5 minutes cache for remote models

# OCR settings
OCR_DPI = 150  # Balance between quality and speed
OCR_LANGUAGES = 'ita+eng'  # Italian and English
OCR_CONFIG = '--psm 3 --oem 3'  # Page segmentation and OCR engine modes

# Processing queue settings
PROCESSING_RETRY_DELAY = 5  # Seconds to wait before retrying failed processing

# Memory thresholds for model recommendations
MEMORY_THRESHOLD_SMALL = 4  # GB - recommend small models
MEMORY_THRESHOLD_MEDIUM = 16  # GB - recommend medium models
MEMORY_THRESHOLD_LARGE = 64  # GB - recommend large models

# Project configuration
DEFAULT_PROJECT_NAME = "global"  # Name for global documents (in root docs folder)
MAX_PROJECT_NAME_LENGTH = 50
ALLOWED_PROJECT_NAME_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"
