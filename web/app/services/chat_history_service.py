"""
Chat History Service
Manages chat history storage, retrieval, and sharing functionality.
"""

import os
import json
import uuid
import hashlib
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any
from app.schemas import ChatMessage, ChatSession

class ChatHistoryService:
    """Service for managing chat history and sessions."""
    
    def __init__(self, base_path: str = "/app/data"):
        self.base_path = Path(base_path)
        self.chats_dir = self.base_path / "chats"
        self.chats_dir.mkdir(exist_ok=True)
        # Ensure subdirectories exist
        (self.chats_dir / "global").mkdir(exist_ok=True)
        (self.chats_dir / "projects").mkdir(exist_ok=True)
    
    def _get_project_chat_dir(self, project_name: str) -> Path:
        """Get the chat directory for a specific project."""
        if project_name == "global":
            return self.chats_dir / "global"
        else:
            return self.chats_dir / "projects" / project_name
    
    def _ensure_chat_dir(self, project_name: str) -> Path:
        """Ensure chat directory exists for the project."""
        chat_dir = self._get_project_chat_dir(project_name)
        chat_dir.mkdir(parents=True, exist_ok=True)
        return chat_dir
    
    def generate_chat_name(self, first_message: str) -> str:
        """Generate a meaningful chat name from the first message using AI."""
        import re
        import requests
        from app.config import DEFAULT_MODEL, OLLAMA_BASE_URL
        
        # Clean the message
        clean_message = first_message.strip()
        
        if not clean_message:
            return f"Chat {datetime.now().strftime('%d/%m %H:%M')}"
        
        # If message is very short, use it directly
        if len(clean_message) <= 30:
            # Just clean special characters and capitalize
            clean_name = re.sub(r'[^\w\s-]', '', clean_message)
            return clean_name.strip().title() if clean_name.strip() else f"Chat {datetime.now().strftime('%d/%m %H:%M')}"
        
        try:
            # Use Ollama to generate a concise title
            # Prepare the prompt for title generation
            prompt = f"""Generate a short, meaningful title (maximum 4-5 words) for a chat conversation that starts with this message:

"{clean_message}"

Requirements:
- Maximum 40 characters
- No quotation marks
- Capture the main topic/question
- Be concise and clear
- Use the same language as the input

Title:"""

            # Call Ollama API
            response = requests.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": DEFAULT_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,  # Low temperature for more consistent results
                        "top_p": 0.8,
                        "max_tokens": 20     # Limit tokens for short response
                    }
                },
                timeout=10  # Short timeout for title generation
            )
            
            if response.status_code == 200:
                result = response.json()
                generated_title = result.get('response', '').strip()
                
                # Clean and validate the generated title
                if generated_title:
                    # Remove quotes, newlines, and extra spaces
                    clean_title = re.sub(r'["\n\r]', '', generated_title).strip()
                    # Remove common prefixes like "Title:", "Chat:", etc.
                    clean_title = re.sub(r'^(title|chat|conversation|topic):\s*', '', clean_title, flags=re.IGNORECASE)
                    
                    # Limit length
                    if len(clean_title) > 40:
                        clean_title = clean_title[:37] + '...'
                    
                    # Validate that it's not empty and contains meaningful content
                    if clean_title and len(clean_title.strip()) > 2:
                        return clean_title.strip()
            
        except Exception as e:
            print(f"Error generating AI title: {e}")
            # Fall through to fallback method
        
        # Fallback: Extract key words from the message
        return self._generate_fallback_title(clean_message)
    
    def _generate_fallback_title(self, message: str) -> str:
        """Generate a fallback title when AI generation fails."""
        import re
        
        # Simple extraction of meaningful words
        # Remove common question words and extract nouns/topics
        words = re.findall(r'\b\w+\b', message.lower())
        
        # Filter out very common words (basic stopwords in multiple languages)
        basic_stopwords = {
            # Italian
            'il', 'la', 'lo', 'le', 'gli', 'un', 'una', 'di', 'da', 'in', 'con', 'su', 'per', 'a', 'e',
            'come', 'cosa', 'dove', 'quando', 'perché', 'chi', 'che', 'sono', 'è', 'sei', 'siamo',
            'ciao', 'salve', 'buongiorno', 'puoi', 'può', 'posso', 'dimmi', 'spiegami', 'aiutami',
            # English  
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'how', 'what', 'where', 'when', 'why', 'who', 'which', 'is', 'are', 'was', 'were', 'be',
            'hello', 'hi', 'good', 'morning', 'can', 'could', 'please', 'tell', 'me', 'help', 'explain'
        }
        
        # Extract meaningful words (longer than 2 chars, not in stopwords)
        meaningful_words = [
            word.capitalize() for word in words 
            if len(word) > 2 and word not in basic_stopwords
        ]
        
        # Take first 3-4 words
        if meaningful_words:
            title = ' '.join(meaningful_words[:4])
            # Limit length
            if len(title) > 40:
                title = title[:37] + '...'
            return title
        
        # Last resort: use first few words of original message
        first_words = message.split()[:3]
        if first_words:
            title = ' '.join(word.capitalize() for word in first_words)
            if len(title) > 40:
                title = title[:37] + '...'
            return title
            
        # Ultimate fallback
        return f"Chat {datetime.now().strftime('%d/%m %H:%M')}"
    
    def create_chat_session(self, project_name: str, chat_name: str = None, first_message: str = None) -> str:
        """Create a new chat session and return its ID."""
        chat_id = str(uuid.uuid4())
        
        if not chat_name and first_message:
            chat_name = self.generate_chat_name(first_message)
        elif not chat_name:
            chat_name = f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        session = ChatSession(
            id=chat_id,
            name=chat_name,
            project_name=project_name,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            messages=[],
            share_token=None
        )
        
        self.save_chat_session(session)
        return chat_id
    
    def save_chat_session(self, session: ChatSession) -> None:
        """Save a chat session to file."""
        chat_dir = self._ensure_chat_dir(session.project_name)
        session_file = chat_dir / f"{session.id}.json"
        
        # Update timestamp
        session.updated_at = datetime.now()
        
        with open(session_file, 'w', encoding='utf-8') as f:
            json.dump(session.dict(), f, default=str, ensure_ascii=False, indent=2)
    
    def load_chat_session(self, chat_id: str, project_name: str) -> Optional[ChatSession]:
        """Load a chat session by ID."""
        chat_dir = self._get_project_chat_dir(project_name)
        session_file = chat_dir / f"{chat_id}.json"
        
        if not session_file.exists():
            return None
        
        try:
            with open(session_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Convert datetime strings back to datetime objects safely
            if isinstance(data.get('created_at'), str):
                try:
                    data['created_at'] = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    # Fallback to current time if parsing fails
                    data['created_at'] = datetime.now()
                    
            if isinstance(data.get('updated_at'), str):
                try:
                    data['updated_at'] = datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    # Fallback to current time if parsing fails
                    data['updated_at'] = datetime.now()
            
            # Ensure we have datetime objects if they don't exist
            if 'created_at' not in data:
                data['created_at'] = datetime.now()
            if 'updated_at' not in data:
                data['updated_at'] = datetime.now()
            
            # Convert message dicts to ChatMessage objects
            if 'messages' in data:
                messages = []
                for msg_data in data['messages']:
                    if isinstance(msg_data, dict):
                        messages.append(ChatMessage(**msg_data))
                    else:
                        messages.append(msg_data)  # Already a ChatMessage object
                data['messages'] = messages
            
            return ChatSession(**data)
        except Exception as e:
            print(f"Error loading chat session {chat_id}: {e}")
            # Log more details for debugging
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            return None
    
    def get_project_chats(self, project_name: str) -> List[Dict[str, Any]]:
        """Get all chat sessions for a project."""
        chat_dir = self._get_project_chat_dir(project_name)
        
        if not chat_dir.exists():
            return []
        
        chats = []
        for session_file in chat_dir.glob("*.json"):
            try:
                with open(session_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Return summary info only
                chats.append({
                    "id": data["id"],
                    "name": data["name"],
                    "created_at": data["created_at"],
                    "updated_at": data["updated_at"],
                    "message_count": len(data.get("messages", []))
                })
            except Exception as e:
                print(f"Error reading chat file {session_file}: {e}")
                continue
        
        # Sort by updated_at descending
        chats.sort(key=lambda x: x["updated_at"], reverse=True)
        return chats
    
    def add_message_to_chat(self, chat_id: str, project_name: str, message: ChatMessage) -> bool:
        """Add a message to an existing chat session."""
        session = self.load_chat_session(chat_id, project_name)
        if not session:
            return False
        
        session.messages.append(message)
        # Update the timestamp when adding new messages
        session.updated_at = datetime.now()
        self.save_chat_session(session)
        return True
    
    def delete_chat_session(self, chat_id: str, project_name: str) -> bool:
        """Delete a chat session."""
        chat_dir = self._get_project_chat_dir(project_name)
        session_file = chat_dir / f"{chat_id}.json"
        
        try:
            if session_file.exists():
                session_file.unlink()
                return True
        except Exception as e:
            print(f"Error deleting chat session {chat_id}: {e}")
        
        return False
    
    def rename_chat_session(self, chat_id: str, project_name: str, new_name: str) -> bool:
        """Rename a chat session."""
        session = self.load_chat_session(chat_id, project_name)
        if not session:
            return False
        
        session.name = new_name.strip()
        self.save_chat_session(session)
        return True
    
    def generate_share_token(self, chat_id: str, project_name: str) -> Optional[str]:
        """Generate a share token for a chat session."""
        session = self.load_chat_session(chat_id, project_name)
        if not session:
            return None
        
        # Generate a unique share token
        token_data = f"{chat_id}{project_name}{datetime.now().isoformat()}"
        share_token = hashlib.sha256(token_data.encode()).hexdigest()[:16]
        
        session.share_token = share_token
        self.save_chat_session(session)
        return share_token
    
    def get_chat_by_share_token(self, share_token: str) -> Optional[ChatSession]:
        """Get a chat session by its share token."""
        # Search through all projects and chats
        for project_dir in self.chats_dir.iterdir():
            if project_dir.is_dir():
                for session_file in project_dir.glob("*.json"):
                    try:
                        with open(session_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        
                        if data.get("share_token") == share_token:
                            # Convert datetime strings back to datetime objects
                            if isinstance(data.get('created_at'), str):
                                data['created_at'] = datetime.fromisoformat(data['created_at'])
                            if isinstance(data.get('updated_at'), str):
                                data['updated_at'] = datetime.fromisoformat(data['updated_at'])
                            
                            return ChatSession(**data)
                    except Exception as e:
                        print(f"Error reading chat file {session_file}: {e}")
                        continue
        
        return None
    
    def get_all_projects_with_chats(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get all projects and their chat counts."""
        projects = {}
        
        # Check global chats
        global_chats = self.get_project_chats("global")
        if global_chats:
            projects["global"] = global_chats
        
        # Check project chats
        projects_dir = self.chats_dir / "projects"
        if projects_dir.exists():
            for project_dir in projects_dir.iterdir():
                if project_dir.is_dir():
                    project_name = project_dir.name
                    project_chats = self.get_project_chats(project_name)
                    if project_chats:
                        projects[project_name] = project_chats
        
        return projects
