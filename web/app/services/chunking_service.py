"""
Document chunking and search service.
Handles intelligent text chunking and relevance-based search across document chunks.
"""

import re
from typing import List, Dict, Any

from app.config import DEFAULT_CHUNK_SIZE, SEARCH_CHUNK_SIZE, MAX_CHUNKS_PER_QUERY
from app.utils.text_processing import split_content_intelligently, calculate_text_similarity
from app.utils.logging import log_chat_request

def chunk_documents_for_processing(documents_dict: Dict[str, str], chunk_size: int = DEFAULT_CHUNK_SIZE) -> List[Dict[str, Any]]:
    """
    Split documents into smaller chunks for processing.
    Returns a list of chunks with metadata.
    """
    if not documents_dict:
        return []
    
    chunks = []
    
    for filename, content in documents_dict.items():
        if len(content) <= chunk_size:
            # Small document, use as single chunk
            chunks.append({
                "filename": filename,
                "content": content,
                "chunk_index": 1,
                "total_chunks": 1,
                "char_count": len(content)
            })
        else:
            # Large document, split into chunks
            document_chunks = split_content_intelligently(content, chunk_size)
            total_chunks = len(document_chunks)
            
            for i, chunk_content in enumerate(document_chunks, 1):
                chunks.append({
                    "filename": filename,
                    "content": chunk_content,
                    "chunk_index": i,
                    "total_chunks": total_chunks,
                    "char_count": len(chunk_content)
                })
    
    return chunks

def find_most_relevant_chunks(chunks: List[Dict[str, Any]], query: str, max_chunks: int = MAX_CHUNKS_PER_QUERY) -> List[Dict[str, Any]]:
    """
    Find the most relevant chunks for a given query using improved keyword matching.
    Uses multiple scoring methods for better relevance.
    """
    if not chunks:
        return []
    
    query_words = set(word.lower().strip('.,!?;:"()[]{}') for word in query.split() if len(word) > 2)
    scored_chunks = []
    
    for chunk in chunks:
        content_lower = chunk["content"].lower()
        content_words = set(word.strip('.,!?;:"()[]{}') for word in content_lower.split() if len(word) > 2)
        
        # Multiple scoring criteria
        scores = []
        
        # 1. Exact keyword overlap score
        exact_matches = len(query_words.intersection(content_words))
        exact_score = exact_matches / len(query_words) if query_words else 0
        scores.append(exact_score * 2.0)  # Weight exact matches highly
        
        # 2. Partial word matching (for related terms)
        partial_score = 0
        for query_word in query_words:
            for content_word in content_words:
                if query_word in content_word or content_word in query_word:
                    partial_score += 0.5
        partial_score = min(partial_score / len(query_words) if query_words else 0, 1.0)
        scores.append(partial_score)
        
        # 3. Query phrase presence (bonus for phrases that appear together)
        phrase_score = 0
        if len(query.split()) > 1:
            # Check if query words appear close to each other
            for query_word in query_words:
                if query_word in content_lower:
                    phrase_score += 0.3
        phrase_score = min(phrase_score, 1.0)
        scores.append(phrase_score)
        
        # 4. Content length bonus (prefer chunks with more content)
        length_score = min(len(chunk["content"]) / 10000, 0.2)  # Small bonus for longer chunks
        scores.append(length_score)
        
        # Combined score
        final_score = sum(scores)
        scored_chunks.append((final_score, chunk))
    
    # Sort by score and return top chunks
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    # If no chunks have a good score, return the first few chunks from each document
    if not scored_chunks or scored_chunks[0][0] < 0.1:
        # Fallback: return first chunk from each document
        seen_docs = set()
        fallback_chunks = []
        for _, chunk in scored_chunks:
            if chunk["filename"] not in seen_docs:
                fallback_chunks.append(chunk)
                seen_docs.add(chunk["filename"])
                if len(fallback_chunks) >= max_chunks:
                    break
        return fallback_chunks
    
    return [chunk for score, chunk in scored_chunks[:max_chunks]]

def format_chunks_for_prompt(chunks: List[Dict[str, Any]]) -> str:
    """Format selected chunks into a prompt-friendly format."""
    if not chunks:
        return "No relevant document content found."
    
    formatted_parts = []
    
    for chunk in chunks:
        header = f"[Document: {chunk['filename']}"
        if chunk['total_chunks'] > 1:
            header += f" - Part {chunk['chunk_index']}/{chunk['total_chunks']}"
        header += f"] ({chunk['char_count']} chars)"
        
        formatted_parts.append(f"{header}\n{chunk['content']}")
    
    return "\n\n" + "="*60 + "\n\n".join(formatted_parts)

def search_documents(documents_dict: Dict[str, str], query: str, max_results: int = 5) -> Dict[str, Any]:
    """
    Search for relevant chunks across all documents.
    Returns search results with metadata.
    """
    all_chunks = chunk_documents_for_processing(documents_dict, chunk_size=SEARCH_CHUNK_SIZE)
    
    if not all_chunks:
        return {
            "query": query,
            "chunks": [], 
            "total_found": 0,
            "total_available": 0
        }
    
    relevant_chunks = find_most_relevant_chunks(all_chunks, query, max_chunks=max_results)
    
    return {
        "query": query,
        "chunks": [
            {
                "filename": chunk["filename"],
                "chunk_index": chunk["chunk_index"],
                "total_chunks": chunk["total_chunks"],
                "char_count": chunk["char_count"],
                "preview": chunk["content"][:500] + "..." if len(chunk["content"]) > 500 else chunk["content"],
                "full_content": chunk["content"]  # Include full content for complete viewing
            }
            for chunk in relevant_chunks
        ],
        "total_found": len(relevant_chunks),
        "total_available": len(all_chunks)
    }

def get_document_chunks_info(documents_dict: Dict[str, str], filename: str) -> Dict[str, Any]:
    """Get chunk information for a specific document."""
    if filename not in documents_dict:
        return {"error": f"Document {filename} not found"}
    
    # Get chunks for this specific document
    single_doc = {filename: documents_dict[filename]}
    chunks = chunk_documents_for_processing(single_doc, chunk_size=SEARCH_CHUNK_SIZE)
    
    return {
        "filename": filename,
        "total_chunks": len(chunks),
        "chunks": [
            {
                "chunk_index": chunk["chunk_index"],
                "char_count": chunk["char_count"],
                "preview": chunk["content"][:500] + "..." if len(chunk["content"]) > 500 else chunk["content"],
                "full_content": chunk["content"]  # Include full content for complete viewing
            }
            for chunk in chunks
        ]
    }
