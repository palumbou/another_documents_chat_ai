"""
Chat service for handling AI conversations with document context.
"""

import time
import requests
from typing import Dict, Any, Optional

from app.config import (
    OLLAMA_BASE_URL, OLLAMA_TIMEOUT, CHAT_CONTEXT_WINDOW, 
    CHAT_MAX_RESPONSE, CHAT_TEMPERATURE, CHAT_TOP_P, DEFAULT_MODEL
)
from app.services.chunking_service import chunk_documents_for_processing, find_most_relevant_chunks, format_chunks_for_prompt
from app.services.engine_manager import engine_manager
from app.utils.logging import log_chat_request

def process_chat_request(query: str, documents: Dict[str, str], model: Optional[str] = None, include_debug: bool = False) -> Dict[str, Any]:
    """
    Process a chat query using Ollama with intelligent document chunking.
    Uses the provided model, or the currently selected engine, or fallback to a default model.
    Works with or without documents - if no documents, provides general AI assistance.
    
    Args:
        query: The user's question
        documents: Dictionary of documents to search through
        model: Optional specific model to use
        include_debug: Whether to include debug information in the response
    """
    chosen_model = model or engine_manager.current_engine or DEFAULT_MODEL

    # Check if we have any documents
    if not documents:
        # No documents - provide general AI assistance
        prompt = f"""You are a helpful AI assistant. Please provide a clear, accurate, and helpful response to the following question or request.

Question: {query}

Answer:"""
        
        context_info = {
            "mode": "general_chat",
            "chunks_processed": 0,
            "total_chunks_available": 0,
            "context_length": len(prompt)
        }
    else:
        # Split documents into chunks for processing
        all_chunks = chunk_documents_for_processing(documents, chunk_size=6000)
        
        # Find more relevant chunks for better context coverage
        relevant_chunks = find_most_relevant_chunks(all_chunks, query, max_chunks=3)
        context = format_chunks_for_prompt(relevant_chunks)
        
        # Build a more focused prompt for document-based chat
        prompt = f"""You are an AI assistant helping to answer questions based on document content.

{context}

Question: {query}

Instructions:
- Answer based only on the information provided in the documents above
- If the information is not in the documents, say so clearly
- Be concise but complete in your response
- If you reference specific information, mention which document it came from

Answer:"""

        context_info = {
            "mode": "document_chat",
            "chunks_processed": len(relevant_chunks),
            "total_chunks_available": len(all_chunks),
            "context_length": len(context)
        }

    # Log the chat request
    log_chat_request(query, chosen_model, context_info["mode"], context_info["chunks_processed"])

    # Prepare debug information if requested
    debug_info = None
    thinking_process = ""
    
    if include_debug:
        if context_info["mode"] == "general_chat":
            thinking_process = f"🤔 Modalità chat generale attivata. Nessun documento da analizzare. Utilizzo il modello {chosen_model} per una risposta diretta alla domanda."
        else:
            thinking_process = f"🤔 Modalità chat documentale attivata. Ho trovato {context_info['total_chunks_available']} chunk totali nei documenti. Sto analizzando i {context_info['chunks_processed']} chunk più rilevanti per la domanda. Contesto utilizzato: {context_info['context_length']} caratteri. Modello: {chosen_model}."

    # Prepare request payload
    request_payload = {
        "model": chosen_model, 
        "prompt": prompt, 
        "stream": False,
        "options": {
            "temperature": CHAT_TEMPERATURE,
            "top_p": CHAT_TOP_P,
            "num_ctx": CHAT_CONTEXT_WINDOW,
            "num_predict": CHAT_MAX_RESPONSE,
            "stop": ["Question:", "Instructions:"]  # Stop tokens to prevent repetition
        }
    }

    try:
        print(f"Processing query in {context_info['mode']} mode, context length: {context_info['context_length']} chars")
        
        # Call Ollama generate API with optimized settings for chunked content
        ollama_url = f"{OLLAMA_BASE_URL}/api/generate"
        resp = requests.post(
            ollama_url,
            json=request_payload,
            timeout=OLLAMA_TIMEOUT
        )
        resp.raise_for_status()
        data = resp.json()

        # Ollama generate API returns response in "response" field
        text = data.get("response", "No response generated")
        
        # Prepare debug info if requested
        if include_debug:
            debug_info = {
                "ollama_url": ollama_url,
                "prompt_used": prompt,
                "ollama_request_payload": request_payload,
                "thinking_process": thinking_process
            }
        
        # Return additional metadata about the processing
        result = {
            "success": True,
            "response": text, 
            "model": chosen_model,
            **context_info
        }
        
        if debug_info:
            result["debug_info"] = debug_info
            
        return result
        
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "Request timed out. Try asking a more specific question.",
            "model": chosen_model,
            **context_info
        }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": f"Error communicating with Ollama: {str(e)}",
            "model": chosen_model,
            **context_info
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "model": chosen_model,
            **context_info
        }
