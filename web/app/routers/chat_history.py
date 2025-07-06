"""
Chat History router.
Handles chat sessions, history management, and export functionality.
"""

import os
import json
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Form, Query
from fastapi.responses import Response

from app.config import CHATS_DIR, GLOBAL_CHATS_DIR, PROJECT_CHATS_DIR
from app.schemas import ChatSession, ChatMessage, ChatSessionRequest, ChatSessionResponse

router = APIRouter()

def get_chat_file_path(project_name: str, chat_id: str) -> str:
    """Get the file path for a chat session."""
    if project_name == "global":
        return os.path.join(GLOBAL_CHATS_DIR, f"{chat_id}.json")
    else:
        project_dir = os.path.join(PROJECT_CHATS_DIR, project_name)
        os.makedirs(project_dir, exist_ok=True)
        return os.path.join(project_dir, f"{chat_id}.json")

def load_chat_session(project_name: str, chat_id: str) -> Optional[ChatSession]:
    """Load a chat session from disk."""
    try:
        file_path = get_chat_file_path(project_name, chat_id)
        if not os.path.exists(file_path):
            return None
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return ChatSession(**data)
    except Exception as e:
        print(f"Error loading chat session {chat_id}: {e}")
        return None

def save_chat_session(chat: ChatSession) -> bool:
    """Save a chat session to disk."""
    try:
        file_path = get_chat_file_path(chat.project_name, chat.id)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Convert to dict for JSON serialization
        chat_data = chat.dict()
        
        # Convert datetime objects to ISO strings
        if chat_data.get('created_at'):
            if hasattr(chat_data['created_at'], 'isoformat'):
                chat_data['created_at'] = chat_data['created_at'].isoformat()
        if chat_data.get('updated_at'):
            if hasattr(chat_data['updated_at'], 'isoformat'):
                chat_data['updated_at'] = chat_data['updated_at'].isoformat()
        
        for message in chat_data.get('messages', []):
            if message.get('timestamp') and hasattr(message['timestamp'], 'isoformat'):
                message['timestamp'] = message['timestamp'].isoformat()
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(chat_data, f, indent=2, ensure_ascii=False)
        
        return True
    except Exception as e:
        print(f"Error saving chat session {chat.id}: {e}")
        return False

def list_project_chats(project_name: str) -> List[ChatSessionResponse]:
    """List all chat sessions for a project."""
    try:
        chats = []
        
        if project_name == "global":
            chat_dir = GLOBAL_CHATS_DIR
        else:
            chat_dir = os.path.join(PROJECT_CHATS_DIR, project_name)
        
        if not os.path.exists(chat_dir):
            return []
        
        for filename in os.listdir(chat_dir):
            if filename.endswith('.json'):
                chat_id = filename[:-5]  # Remove .json extension
                chat = load_chat_session(project_name, chat_id)
                if chat:
                    chats.append(ChatSessionResponse(
                        id=chat.id,
                        name=chat.name,
                        created_at=chat.created_at.isoformat() if hasattr(chat.created_at, 'isoformat') else str(chat.created_at),
                        updated_at=chat.updated_at.isoformat() if hasattr(chat.updated_at, 'isoformat') else str(chat.updated_at),
                        message_count=len(chat.messages)
                    ))
        
        # Sort by updated_at descending
        chats.sort(key=lambda x: x.updated_at, reverse=True)
        return chats
        
    except Exception as e:
        print(f"Error listing chats for project {project_name}: {e}")
        return []

@router.get("/chats/{project_name}")
async def get_project_chats(project_name: str) -> List[ChatSessionResponse]:
    """Get all chat sessions for a project."""
    return list_project_chats(project_name)

@router.get("/chats/{project_name}/{chat_id}")
async def get_chat_session(project_name: str, chat_id: str) -> ChatSession:
    """Get a specific chat session."""
    chat = load_chat_session(project_name, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return chat

@router.post("/chats/{project_name}/new")
async def create_chat_session(
    project_name: str, 
    chat_name: Optional[str] = Form(None),
    first_message: Optional[str] = Form(None)
) -> ChatSession:
    """Create a new chat session."""
    chat_id = str(uuid.uuid4())
    now = datetime.now()
    
    if not chat_name:
        chat_name = f"Chat {now.strftime('%Y-%m-%d %H:%M')}"
    
    chat = ChatSession(
        id=chat_id,
        name=chat_name,
        project_name=project_name,
        created_at=now,
        updated_at=now,
        messages=[]
    )
    
    if first_message:
        # Add the first message
        message = ChatMessage(
            role="user",
            content=first_message,
            timestamp=now
        )
        chat.messages.append(message)
    
    if save_chat_session(chat):
        return chat
    else:
        raise HTTPException(status_code=500, detail="Failed to create chat session")

@router.post("/chats/{project_name}/{chat_id}/chat")
async def add_message_to_chat(
    project_name: str,
    chat_id: str,
    query: str = Form(...),
    model: str = Form(None),
    debug: bool = Form(False)
):
    """Add a message to a chat session and get AI response."""
    from app.services.chat_service import process_chat_request
    from app.shared_state import get_documents
    from app.config import DEFAULT_PROJECT_NAME
    
    # Load the chat session
    chat = load_chat_session(project_name, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Add user message
    now = datetime.now()
    user_message = ChatMessage(
        role="user",
        content=query,
        timestamp=now
    )
    chat.messages.append(user_message)
    
    # Get documents for the project
    documents = get_documents()
    
    # Filter documents by project (same logic as chat.py)
    if project_name != "all":
        if project_name == DEFAULT_PROJECT_NAME:
            filtered_documents = {key: value for key, value in documents.items() if "/" not in key}
        else:
            project_prefix = f"{project_name}/"
            project_docs = {key: value for key, value in documents.items() 
                           if key.startswith(project_prefix)}
            global_docs = {key: value for key, value in documents.items() if "/" not in key}
            
            filtered_documents = global_docs.copy()
            
            for key, value in project_docs.items():
                filename = key.split("/", 1)[1] if "/" in key else key
                if filename in filtered_documents:
                    del filtered_documents[filename]
                filtered_documents[key] = value
        
        documents = filtered_documents
    
    # Process the chat request
    result = process_chat_request(query, documents, model, debug)
    
    if not result["success"]:
        if "timed out" in result["error"]:
            raise HTTPException(status_code=504, detail=result["error"])
        else:
            raise HTTPException(status_code=500, detail=result["error"])
    
    # Add AI response message
    ai_message = ChatMessage(
        role="assistant",
        content=result["response"],
        model=result["model"],
        timestamp=datetime.now()
    )
    
    if debug and result.get("debug_info"):
        ai_message.debug_info = result["debug_info"]
    
    chat.messages.append(ai_message)
    
    # Update the chat session
    chat.updated_at = datetime.now()
    
    # Save the updated chat
    if not save_chat_session(chat):
        raise HTTPException(status_code=500, detail="Failed to save chat session")
    
    return {
        "response": result["response"],
        "model": result["model"],
        "mode": result["mode"],
        "chunks_processed": result["chunks_processed"],
        "total_chunks_available": result["total_chunks_available"],
        "context_length": result["context_length"],
        "chat_id": chat_id
    }

@router.delete("/chats/{project_name}/{chat_id}")
async def delete_chat_session(project_name: str, chat_id: str):
    """Delete a chat session."""
    try:
        file_path = get_chat_file_path(project_name, chat_id)
        if os.path.exists(file_path):
            os.remove(file_path)
            return {"success": True, "message": "Chat session deleted"}
        else:
            raise HTTPException(status_code=404, detail="Chat session not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete chat session: {str(e)}")

@router.get("/chats/{project_name}/{chat_id}/export")
async def export_chat_session(
    project_name: str, 
    chat_id: str, 
    format: str = Query("json", regex="^(json|markdown|md)$")
):
    """Export a chat session in JSON or Markdown format."""
    chat = load_chat_session(project_name, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    if format.lower() in ["json"]:
        # Export as JSON
        content = json.dumps(chat.dict(), indent=2, ensure_ascii=False, default=str)
        media_type = "application/json"
        filename = f"{chat.name}_{chat.id}.json"
    
    elif format.lower() in ["markdown", "md"]:
        # Export as Markdown
        content = convert_chat_to_markdown(chat)
        media_type = "text/markdown"
        filename = f"{chat.name}_{chat.id}.md"
    
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'json' or 'markdown'")
    
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"",
            "Content-Type": f"{media_type}; charset=utf-8"
        }
    )

def convert_chat_to_markdown(chat: ChatSession) -> str:
    """Convert a chat session to Markdown format."""
    lines = []
    
    # Header
    lines.append(f"# {chat.name}")
    lines.append("")
    lines.append(f"**Project:** {chat.project_name}")
    lines.append(f"**Created:** {chat.created_at}")
    lines.append(f"**Updated:** {chat.updated_at}")
    lines.append(f"**Messages:** {len(chat.messages)}")
    lines.append("")
    lines.append("---")
    lines.append("")
    
    # Messages
    for i, message in enumerate(chat.messages, 1):
        if message.role == "user":
            lines.append(f"## 👤 User Message #{i}")
        else:
            model_info = f" ({message.model})" if message.model else ""
            lines.append(f"## 🤖 AI Response #{i}{model_info}")
        
        lines.append("")
        lines.append(message.content)
        lines.append("")
        
        # Add timestamp
        timestamp = message.timestamp
        if hasattr(timestamp, 'strftime'):
            lines.append(f"*Timestamp: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}*")
        else:
            lines.append(f"*Timestamp: {timestamp}*")
        
        # Add debug info if available
        if hasattr(message, 'debug_info') and message.debug_info:
            lines.append("")
            lines.append("### Debug Information")
            lines.append("```json")
            lines.append(json.dumps(message.debug_info.dict() if hasattr(message.debug_info, 'dict') else message.debug_info, indent=2))
            lines.append("```")
        
        lines.append("")
        lines.append("---")
        lines.append("")
    
    return "\n".join(lines)
