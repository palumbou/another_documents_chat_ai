/**
 * Chat History Management
 * Handles chat sessions, loading, saving, and database interactions.
 */

class ChatHistory {
    constructor() {
        this.currentChatId = null;
        this.currentProject = 'global';
        this.chats = [];
        this.autoRefreshInterval = null;
        this.setupEventListeners();
        this.initializeCurrentProject();
        this.startAutoRefresh();
    }

    initializeCurrentProject() {
        // Get the current project from the select element
        const projectSelect = document.getElementById('project-select');
        if (projectSelect && projectSelect.value) {
            this.currentProject = projectSelect.value;
        }
    }

    setupEventListeners() {
        // New chat button
        document.getElementById('new-chat-btn')?.addEventListener('click', () => {
            this.createNewChat();
        });

        // Chat actions
        document.getElementById('rename-chat-btn')?.addEventListener('click', () => {
            this.renameChatPrompt();
        });

        document.getElementById('share-chat-btn')?.addEventListener('click', () => {
            this.shareChatPrompt();
        });

        document.getElementById('delete-chat-btn')?.addEventListener('click', () => {
            this.deleteChatPrompt();
        });

        // Project change listener
        document.getElementById('project-select')?.addEventListener('change', (e) => {
            this.currentProject = e.target.value;
            // Clear current chat when switching projects
            this.currentChatId = null;
            this.clearChatMessages();
            this.updateChatTitle('New Chat');
            this.loadProjectChats();
            // Also update the current project globally for other modules
            window.currentProject = this.currentProject;
        });
    }

    async createNewChat(firstMessage = null) {
        try {
            const response = await fetch('/chats/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_name: this.currentProject,
                    first_message: firstMessage
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create chat');
            }

            const chat = await response.json();
            this.currentChatId = chat.id;
            this.updateChatTitle(chat.name);
            this.clearChatMessages();
            await this.loadProjectChats(); // Refresh chat list
            this.updateActiveChatInList(); // Highlight the new chat
            this.showChatActions();

            return chat.id;
        } catch (error) {
            console.error('Error creating chat:', error);
            showMessage('Error creating new chat', 'error');
            return null;
        }
    }

    async loadProjectChats() {
        try {
            const response = await fetch(`/chats/${this.currentProject}`);
            if (!response.ok) {
                throw new Error('Failed to load chats');
            }

            this.chats = await response.json();
            this.renderChatList();
        } catch (error) {
            console.error('Error loading chats:', error);
            this.renderEmptyChatList();
        }
    }

    renderChatList() {
        const chatList = document.getElementById('chat-list');
        if (!chatList) return;

        if (this.chats.length === 0) {
            this.renderEmptyChatList();
            return;
        }

        chatList.innerHTML = '';
        
        this.chats.forEach(chat => {
            const chatItem = this.createChatItemElement(chat);
            chatList.appendChild(chatItem);
        });
    }

    renderEmptyChatList() {
        const chatList = document.getElementById('chat-list');
        if (!chatList) return;

        chatList.innerHTML = `
            <div class="chat-placeholder">
                No chats yet. Start chatting to create your first conversation!
            </div>
        `;
    }

    createChatItemElement(chat) {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
        chatItem.dataset.chatId = chat.id;

        const createdDate = new Date(chat.created_at).toLocaleDateString();
        const updatedTime = new Date(chat.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        chatItem.innerHTML = `
            <div class="chat-info">
                <div class="chat-name">${this.escapeHtml(chat.name)}</div>
                <div class="chat-meta">${chat.message_count} messages • ${updatedTime}</div>
            </div>
            <div class="chat-actions">
                <button class="btn-icon" onclick="chatHistory.loadChat('${chat.id}')" title="Load chat">📖</button>
                <button class="btn-icon" onclick="chatHistory.renameChatPrompt('${chat.id}')" title="Rename chat">✏️</button>
                <button class="btn-icon" onclick="chatHistory.deleteChatPrompt('${chat.id}')" title="Delete chat">🗑️</button>
            </div>
        `;

        chatItem.addEventListener('click', (e) => {
            if (!e.target.closest('.chat-actions')) {
                this.loadChat(chat.id);
            }
        });

        return chatItem;
    }

    async loadChat(chatId) {
        try {
            const response = await fetch(`/chats/${this.currentProject}/${chatId}`);
            if (!response.ok) {
                throw new Error('Failed to load chat');
            }

            const chatSession = await response.json();
            this.currentChatId = chatId;
            this.updateChatTitle(chatSession.name);
            this.displayMessages(chatSession.messages || []);
            this.updateActiveChatInList();
            this.showChatActions();

        } catch (error) {
            console.error('Error loading chat:', error);
            showMessage('Error loading chat', 'error');
        }
    }

    async loadChatMessages(chatId) {
        try {
            const response = await fetch(`/chats/${this.currentProject}/${chatId}/messages`);
            if (!response.ok) {
                throw new Error('Failed to load chat messages');
            }

            const messages = await response.json();
            this.displayMessages(messages);
            
        } catch (error) {
            console.error('Error loading chat messages:', error);
            showMessage('Error loading chat messages', 'error');
        }
    }

    displayMessages(messages) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        // Clear existing messages
        chatMessages.innerHTML = '';

        // Display each message
        messages.forEach(msg => {
            if (msg.role === 'user') {
                this.addMessageToDisplay('user', msg.content);
            } else if (msg.role === 'assistant') {
                let content = msg.content;
                
                // Add debug info if available and debug mode is enabled
                const debugMode = document.getElementById('debug-mode')?.checked;
                if (msg.debug_info && debugMode) {
                    content = this.addDebugInfoToResponse(content, msg.debug_info);
                }
                
                this.addMessageToDisplay('assistant', content, msg.model);
            }
        });

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addMessageToDisplay(sender, content, model = null) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `message message-${sender}`;
        
        // Add model info as data attribute for AI messages
        if (sender === 'ai' && model) {
            messageDiv.setAttribute('data-model', model);
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-timestamp">${new Date().toLocaleTimeString()}</div>
        `;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return messageId;
    }

    addDebugInfoToResponse(response, debugInfo) {
        let debugHtml = '<div class="debug-info" style="margin-top: 1rem; padding: 0.75rem; background: var(--background-light); border-radius: 6px; font-size: 0.85rem; border-left: 3px solid var(--accent);">';
        
        debugHtml += '<div style="margin-bottom: 0.75rem;"><strong>🧠 AI Thinking Process:</strong></div>';
        
        if (debugInfo.thinking_process) {
            debugHtml += `<div style="margin-bottom: 1rem; padding: 0.5rem; background: var(--background); border-radius: 4px;"><em>${this.escapeHtml(debugInfo.thinking_process)}</em></div>`;
        }
        
        debugHtml += '<div style="margin-bottom: 0.5rem;"><strong>💬 AI Response:</strong></div>';
        debugHtml += `<div style="margin-bottom: 1rem; padding: 0.5rem; background: var(--background); border-radius: 4px;">${response}</div>`;
        
        if (debugInfo.ollama_url) {
            debugHtml += `<div style="margin-bottom: 0.5rem;"><strong>🌐 Ollama URL:</strong> <code style="background: var(--background); padding: 0.2rem 0.4rem; border-radius: 3px;">${this.escapeHtml(debugInfo.ollama_url)}</code></div>`;
        }
        
        if (debugInfo.ollama_request_payload) {
            debugHtml += `<div style="margin-bottom: 0.5rem;"><strong>⚙️ Model Used:</strong> <code style="background: var(--background); padding: 0.2rem 0.4rem; border-radius: 3px;">${debugInfo.ollama_request_payload.model || 'Unknown'}</code></div>`;
        }
        
        if (debugInfo.prompt_used) {
            debugHtml += `<div style="margin-top: 0.75rem;"><details style="cursor: pointer;"><summary style="font-weight: bold; color: var(--accent);">🔍 View Full Prompt</summary><pre style="white-space: pre-wrap; font-size: 0.75rem; margin-top: 0.5rem; padding: 0.5rem; background: var(--background); border-radius: 4px; overflow-x: auto; max-height: 200px; border: 1px solid var(--border-color);">${this.escapeHtml(debugInfo.prompt_used)}</pre></details></div>`;
        }
        
        if (debugInfo.ollama_request_payload) {
            debugHtml += `<div style="margin-top: 0.75rem;"><details style="cursor: pointer;"><summary style="font-weight: bold; color: var(--accent);">⚙️ Technical Details</summary><pre style="white-space: pre-wrap; font-size: 0.75rem; margin-top: 0.5rem; padding: 0.5rem; background: var(--background); border-radius: 4px; overflow-x: auto; max-height: 200px; border: 1px solid var(--border-color);">${this.escapeHtml(JSON.stringify(debugInfo.ollama_request_payload, null, 2))}</pre></details></div>`;
        }
        
        debugHtml += '</div>';
        
        return debugHtml;
    }

    clearChatMessages() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        chatMessages.innerHTML = `
            <div class="welcome-message">
                <h2>🤖 Ready to Chat</h2>
                <p>Start your conversation by asking a question!</p>
            </div>
        `;
    }

    updateChatTitle(name) {
        const titleElement = document.getElementById('current-chat-name');
        if (titleElement) {
            titleElement.textContent = name;
        }
    }

    updateActiveChatInList() {
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            if (item.dataset.chatId === this.currentChatId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    showChatActions() {
        // This method can be used to show/hide UI elements based on chat state
        // For example, enable share button, show chat options etc.
    }

    async renameChatPrompt(chatId = null) {
        // Use provided chatId or current chat
        const targetChatId = chatId || this.currentChatId;
        if (!targetChatId) return;

        // Find the chat name for the prompt
        const chat = this.chats.find(c => c.id === targetChatId);
        const currentName = chat ? chat.name : 'Chat';

        const newName = prompt(`Enter new chat name:`, currentName);
        if (!newName || !newName.trim()) return;

        try {
            const response = await fetch(`/chats/${this.currentProject}/${targetChatId}/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim() })
            });

            if (!response.ok) {
                throw new Error('Failed to rename chat');
            }

            // If renaming current chat, update the title
            if (targetChatId === this.currentChatId) {
                this.updateChatTitle(newName.trim());
            }
            
            this.loadProjectChats(); // Refresh list
            showMessage('Chat renamed successfully', 'success');

        } catch (error) {
            console.error('Error renaming chat:', error);
            showMessage('Error renaming chat', 'error');
        }
    }

    async shareChatPrompt() {
        if (!this.currentChatId) return;

        try {
            const response = await fetch(`/chats/${this.currentProject}/${this.currentChatId}/share`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to create share link');
            }

            const data = await response.json();
            const shareUrl = `${window.location.origin}${data.share_url}`;
            
            // Copy to clipboard
            await navigator.clipboard.writeText(shareUrl);
            showMessage('Share link copied to clipboard!', 'success');

        } catch (error) {
            console.error('Error creating share link:', error);
            showMessage('Error creating share link', 'error');
        }
    }

    async deleteChatPrompt(chatId = null) {
        const targetChatId = chatId || this.currentChatId;
        if (!targetChatId) return;

        if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/chats/${this.currentProject}/${targetChatId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete chat');
            }

            if (targetChatId === this.currentChatId) {
                this.currentChatId = null;
                this.updateChatTitle('New Chat');
                this.clearChatMessages();
                this.showChatActions();
            }

            this.loadProjectChats(); // Refresh list
            showMessage('Chat deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting chat:', error);
            showMessage('Error deleting chat', 'error');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public method to send message within current chat
    async sendMessageInCurrentChat(message, model = null, debugMode = false) {
        try {
            // If no current chat, create a new one
            if (!this.currentChatId) {
                // Create new chat with first message as title suggestion
                const chatId = await this.createNewChat(message);
                if (!chatId) {
                    throw new Error('Failed to create new chat');
                }
            }

            // Send message to current chat
            const response = await fetch(`/chats/${this.currentProject}/${this.currentChatId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: message,
                    model: model,
                    debug: debugMode
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const result = await response.json();
            
            // Update chat title if this was the first message and we have a suggested name
            if (result.chat_name && result.chat_name !== 'New Chat') {
                this.updateChatTitle(result.chat_name);
            }
            
            // Refresh chat list to show the updated chat
            await this.loadProjectChats();
            this.updateActiveChatInList();
            
            return result;

        } catch (error) {
            console.error('Error sending message in chat:', error);
            throw error;
        }
    }
    
    // Auto-refresh methods
    startAutoRefresh() {
        if (this.autoRefreshInterval) return; // Already running
        
        this.autoRefreshInterval = setInterval(async () => {
            try {
                // Only refresh if we're not currently creating a chat or sending a message
                if (!this.isOperationInProgress) {
                    await this.loadProjectChats();
                }
            } catch (error) {
                console.error('Chat auto-refresh error:', error);
            }
        }, 15000); // Refresh every 15 seconds
    }
    
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
}

// Global instance
const chatHistory = new ChatHistory();
window.chatHistory = chatHistory; // Make available globally

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load project chats and set up initial state
    chatHistory.loadProjectChats();
    
    // Initialize with a fresh chat interface
    chatHistory.clearChatMessages();
    chatHistory.updateChatTitle('New Chat');
});