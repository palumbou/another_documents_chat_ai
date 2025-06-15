"""
Shared state management for the application.
In a production environment, this would be replaced with a proper database.
"""

from typing import Dict

# Global documents storage
documents: Dict[str, str] = {}

def get_documents() -> Dict[str, str]:
    """Get the global documents dictionary."""
    return documents

def set_document(filename: str, content: str) -> None:
    """Set a document in the global storage."""
    documents[filename] = content

def remove_document(filename: str) -> bool:
    """Remove a document from global storage."""
    if filename in documents:
        del documents[filename]
        return True
    return False

def clear_documents() -> None:
    """Clear all documents from storage."""
    documents.clear()
