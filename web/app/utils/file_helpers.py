"""
File helper utilities for document processing.
"""

import os
from typing import List

def get_file_size_mb(filepath: str) -> float:
    """Get file size in megabytes."""
    return os.path.getsize(filepath) / (1024 * 1024)

def is_supported_file(filename: str) -> bool:
    """Check if file type is supported."""
    return filename.lower().endswith(('.pdf', '.docx', '.doc', '.txt', '.md'))

def get_supported_files_in_dir(directory: str) -> List[str]:
    """Get list of supported files in directory."""
    if not os.path.exists(directory):
        return []
    
    return [
        filename for filename in os.listdir(directory)
        if is_supported_file(filename)
    ]

def ensure_directory_exists(directory: str) -> None:
    """Ensure directory exists, create if not."""
    os.makedirs(directory, exist_ok=True)

def safe_filename(filename: str) -> str:
    """Sanitize filename for safe filesystem usage."""
    # Remove or replace dangerous characters
    import re
    safe_name = re.sub(r'[<>:"/\\|?*]', '_', filename)
    return safe_name

def get_file_extension(filename: str) -> str:
    """Get file extension in lowercase."""
    return os.path.splitext(filename)[1].lower()

def file_exists(filepath: str) -> bool:
    """Check if file exists."""
    return os.path.exists(filepath)
