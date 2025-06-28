"""
Chat History Router
Handles chat session management, storage, and sharing.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from app.schemas import (
    ChatSession, ChatMessage, ChatSessionRequest, ChatSessionResponse,
    ShareChatRequest, ChatRequest, ChatResponse
)
from app.services.chat_history_service import ChatHistoryService
from app.services.chat_service import process_chat_request
from app.shared_state import get_documents

router = APIRouter()

# Initialize services
chat_history_service = ChatHistoryService()

@router.post("/chats/create", response_model=ChatSessionResponse)
async def create_chat_session(request: ChatSessionRequest):
    """Create a new chat session."""
    try:
        chat_id = chat_history_service.create_chat_session(
            project_name=request.project_name,
            chat_name=request.chat_name,
            first_message=request.first_message
        )
        
        # Load the created session to return details
        session = chat_history_service.load_chat_session(chat_id, request.project_name)
        if not session:
            raise HTTPException(status_code=500, detail="Failed to create chat session")
        
        return ChatSessionResponse(
            id=session.id,
            name=session.name,
            created_at=session.created_at.isoformat(),
            updated_at=session.updated_at.isoformat(),
            message_count=len(session.messages)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating chat session: {str(e)}")

@router.get("/chats/{project_name}", response_model=List[ChatSessionResponse])
async def get_project_chats(project_name: str):
    """Get all chat sessions for a project."""
    try:
        chats = chat_history_service.get_project_chats(project_name)
        return [
            ChatSessionResponse(
                id=chat["id"],
                name=chat["name"],
                created_at=chat["created_at"],
                updated_at=chat["updated_at"],
                message_count=chat["message_count"]
            )
            for chat in chats
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting chats: {str(e)}")

@router.get("/chats/{project_name}/{chat_id}")
async def get_chat_session(project_name: str, chat_id: str):
    """Get a specific chat session with all its messages."""
    try:
        session = chat_history_service.load_chat_session(chat_id, project_name)
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        return {
            "id": session.id,
            "name": session.name,
            "project_name": session.project_name,
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat(),
            "messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp,
                    "model": msg.model,
                    "debug_info": getattr(msg, 'debug_info', None)
                }
                for msg in session.messages
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting chat session: {str(e)}")

@router.get("/chats/{project_name}/{chat_id}/messages")
async def get_chat_messages(project_name: str, chat_id: str):
    """Get messages for a specific chat session."""
    try:
        session = chat_history_service.load_chat_session(chat_id, project_name)
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        # Group messages by conversation pairs (user + ai response)
        messages = []
        current_message = {}
        
        for msg in session.messages:
            if msg.role == "user":
                # Start new message pair
                if current_message:
                    messages.append(current_message)
                current_message = {
                    "user_message": msg.content,
                    "timestamp": msg.timestamp,
                    "model": msg.model
                }
            elif msg.role == "assistant" and current_message:
                # Complete the message pair
                current_message["ai_response"] = msg.content
                current_message["debug_info"] = getattr(msg, 'debug_info', None)
        
        # Add the last message if exists
        if current_message:
            messages.append(current_message)
        
        return messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting chat messages: {str(e)}")

@router.post("/chats/{project_name}/{chat_id}/chat")
async def chat_in_session(project_name: str, chat_id: str, request: ChatRequest):
    """Send a chat message within an existing session."""
    try:
        # Load the chat session
        session = chat_history_service.load_chat_session(chat_id, project_name)
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        try:
            print(f"Debug: Chat request - project: {project_name}, chat_id: {chat_id}")
            print(f"Debug: Request data - query: {request.query}, model: {request.model}, debug: {request.debug}")
            
            # Get documents for the current project
            documents = get_documents()
            print(f"Debug: Documents loaded: {len(documents) if documents else 0}")
            
            # Process the chat request
            result = process_chat_request(
                query=request.query,
                documents=documents,
                model=request.model,
                include_debug=request.debug
            )
            
            print(f"Debug: Chat result success: {result.get('success', 'unknown')}")
            if not result["success"]:
                print(f"Debug: Chat error: {result.get('error', 'unknown')}")
                if "timed out" in result["error"]:
                    raise HTTPException(status_code=504, detail=result["error"])
                else:
                    raise HTTPException(status_code=500, detail=result["error"])
            
            # Create chat response
            chat_response = ChatResponse(
                response=result["response"],
                model=result["model"],
                mode=result.get("mode", "chat"),
                chunks_processed=result.get("chunks_processed", 0),
                total_chunks_available=result.get("total_chunks_available", 0),
                context_length=result.get("context_length", 0)
            )
            
            # Add user message to session
            user_message = ChatMessage(
                role="user",
                content=request.query,
                timestamp=datetime.now().isoformat(),
                model=None
            )
            chat_history_service.add_message_to_chat(chat_id, project_name, user_message)
            
            # Add AI response to session
            ai_message = ChatMessage(
                role="assistant",
                content=chat_response.response,
                timestamp=datetime.now().isoformat(),
                model=chat_response.model
            )
            chat_history_service.add_message_to_chat(chat_id, project_name, ai_message)
            
            return chat_response
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@router.delete("/chats/{project_name}/{chat_id}")
async def delete_chat_session(project_name: str, chat_id: str):
    """Delete a chat session."""
    try:
        success = chat_history_service.delete_chat_session(chat_id, project_name)
        if not success:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        return {"message": "Chat session deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting chat session: {str(e)}")

@router.put("/chats/{project_name}/{chat_id}/rename")
async def rename_chat_session(project_name: str, chat_id: str, request: dict):
    """Rename a chat session."""
    try:
        new_name = request.get("name", "").strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        
        success = chat_history_service.rename_chat_session(chat_id, project_name, new_name)
        if not success:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        return {"message": "Chat session renamed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error renaming chat session: {str(e)}")

@router.post("/chats/{project_name}/{chat_id}/share")
async def create_share_link(project_name: str, chat_id: str):
    """Create a shareable link for a chat session."""
    try:
        share_token = chat_history_service.generate_share_token(chat_id, project_name)
        if not share_token:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        return {
            "share_token": share_token,
            "share_url": f"/shared/{share_token}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating share link: {str(e)}")

@router.get("/shared/{share_token}")
async def get_shared_chat(share_token: str):
    """Get a shared chat session by token."""
    try:
        session = chat_history_service.get_chat_by_share_token(share_token)
        if not session:
            raise HTTPException(status_code=404, detail="Shared chat not found")
        
        return {
            "id": session.id,
            "name": session.name,
            "project_name": session.project_name,
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat(),
            "messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp,
                    "model": msg.model
                }
                for msg in session.messages
            ],
            "is_shared": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting shared chat: {str(e)}")

@router.get("/chats/overview")
async def get_chats_overview():
    """Get overview of all projects with their chat counts."""
    try:
        return chat_history_service.get_all_projects_with_chats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting chats overview: {str(e)}")
