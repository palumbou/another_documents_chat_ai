/**
 * Chat History Management (LEGACY - still in use)
 * 
 * ⚠️  NOTE: This file contains the well-structured ChatHistory class and is still being used.
 * It's already organized as an ES6 class with good documentation.
 * In the future it might be migrated to the modular system as an ES6 module.
 * 
 * Main features:
 * - Chat session management
 * - History persistence
 * - Database interactions
 * - Auto-refresh and synchronization
 */

class ChatHistory {
    constructor() {
        this.currentChatId = null;
        this.currentProject = 'global';
        this.chats = [];
        this.autoRefreshInterval = null;
        this.isOperationInProgress = false;
        this.isCreatingChat = false;
        this.lastSentMessage = null; // Track last message to prevent duplicates
        
        // Wait for DOM to be ready before setting up
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initialize();
            });
        } else {
            this.initialize();
        }
    }

    initialize() {
        this.setupEventListeners();
        this.initializeCurrentProject();
        this.loadProjectChats();
        this.updateExportButtonState(); // Initialize export button state
        this.startAutoRefresh();
    }

    initializeCurrentProject() {
        // Get the current project from the select element first
        const projectSelect = document.getElementById('project-select');
        if (projectSelect && projectSelect.value) {
            this.currentProject = projectSelect.value;
            window.currentProject = this.currentProject; // Sync global state
        }
        
        // If global currentProject is set, use that instead
        if (window.currentProject && window.currentProject !== this.currentProject) {
            this.currentProject = window.currentProject;
            if (projectSelect) {
                projectSelect.value = this.currentProject;
            }
        }
        
        console.log(`ChatHistory initialized with project: ${this.currentProject}`);
    }

    setupEventListeners() {
        // New chat button - prevent double clicks
        const newChatBtn = document.getElementById('new-chat-btn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.isCreatingChat) {
                    this.createNewChat();
                }
            });
        }

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
        const projectSelect = document.getElementById('project-select');
        if (projectSelect) {
            projectSelect.addEventListener('change', async (e) => {
                const newProject = e.target.value;
                console.log(`Switching from project "${this.currentProject}" to "${newProject}"`);
                
                // Prevent operations during project switch
                if (this.isOperationInProgress) {
                    console.log('Operation in progress, delaying project switch...');
                    setTimeout(() => {
                        projectSelect.value = this.currentProject; // Revert selection
                    }, 100);
                    return;
                }
                
                const oldProject = this.currentProject;
                this.currentProject = newProject;
                
                // Clear current chat when switching projects
                this.currentChatId = null;
                this.clearChatMessages();
                this.updateChatTitle('New Chat');
                
                // Update global project for other modules
                window.currentProject = this.currentProject;
                
                // Load chats for the new project
                await this.loadProjectChats();
                
                console.log(`Project switched from "${oldProject}" to "${newProject}"`);
            });
        }
    }

    async createNewChat(firstMessage = null) {
        // Prevent double creation
        if (this.isCreatingChat) {
            console.log('Chat creation already in progress, skipping...');
            return null;
        }
        
        // Check if Ollama is available before creating chat
        try {
            const statusResponse = await fetch('/status');
            const statusData = await statusResponse.json();
            
            if (!statusData.connected || !statusData.engine?.available) {
                showMessage('Cannot create chat: AI engine is not available. Please download and run a model first, or check the Ollama connection.', 'error');
                return null;
            }
        } catch (error) {
            console.error('Error checking engine status:', error);
            showMessage('Cannot create chat: Unable to verify AI engine status', 'error');
            return null;
        }

        this.isCreatingChat = true;
        this.isOperationInProgress = true;

        try {
            console.log(`Creating new chat in project: ${this.currentProject} with message: ${firstMessage ? 'yes' : 'no'}`);
            
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
            
            // Only clear messages if no first message (empty new chat)
            if (!firstMessage) {
                this.clearChatMessages();
            }
            
            // Load chats for current project to show the new chat
            await this.loadProjectChats();
            this.updateActiveChatInList();
            this.showChatActions();

            console.log(`Created new chat: ${chat.id} in project: ${this.currentProject}`);
            return chat.id;
            
        } catch (error) {
            console.error('Error creating chat:', error);
            showMessage('Error creating new chat: ' + error.message, 'error');
            return null;
        } finally {
            this.isCreatingChat = false;
            this.isOperationInProgress = false;
        }
    }

    async loadProjectChats() {
        try {
            console.log(`Loading chats for project: ${this.currentProject}`);
            const response = await fetch(`/chats/${this.currentProject}`);
            if (!response.ok) {
                throw new Error('Failed to load chats');
            }

            const chats = await response.json();
            this.chats = chats;
            console.log(`Loaded ${this.chats.length} chats for project: ${this.currentProject}`);
            this.renderChatList();
        } catch (error) {
            console.error('Error loading chats:', error);
            this.chats = [];
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
            this.updateExportButtonState();
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
    
    // Method to sync current project from global state
    syncCurrentProject() {
        const projectSelect = document.getElementById('project-select');
        if (projectSelect && projectSelect.value !== this.currentProject) {
            console.log(`Syncing project from ${this.currentProject} to ${projectSelect.value}`);
            this.currentProject = projectSelect.value;
            
            // Update global state
            window.currentProject = this.currentProject;
            
            // Reload chats for the new project
            this.loadProjectChats();
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public method to send message within current chat
    async sendMessageInCurrentChat(message, model = null, debugMode = false) {
        // Prevent operation if already in progress
        if (this.isOperationInProgress) {
            console.log('Operation in progress, waiting...');
            return null;
        }
        
        // Check for duplicate messages
        const messageKey = `${message}-${model}-${debugMode}`;
        if (this.lastSentMessage === messageKey) {
            console.log('Duplicate message detected, skipping...');
            return null;
        }
        this.lastSentMessage = messageKey;

        this.isOperationInProgress = true;

        try {
            // Check if Ollama is available before proceeding
            const statusResponse = await fetch('/status');
            const statusData = await statusResponse.json();
            
            if (!statusData.connected || !statusData.engine?.available) {
                throw new Error('AI engine is not available. Please download and run a model first, or check the Ollama connection.');
            }

            // If no current chat, create a new one
            if (!this.currentChatId) {
                console.log('No current chat, creating new one...');
                const chatId = await this.createNewChat(message);
                if (!chatId) {
                    throw new Error('Failed to create new chat');
                }
                // createNewChat already sets this.currentChatId
            }

            console.log(`Sending message to chat: ${this.currentChatId} in project: ${this.currentProject}`);

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
            
            // Refresh chat list to show the updated chat, but don't reload messages
            // to avoid overwriting what's displayed in the UI
            await this.loadProjectChats();
            this.updateActiveChatInList();
            
            return result;

        } catch (error) {
            console.error('Error sending message in chat:', error);
            showMessage('Error sending message: ' + error.message, 'error');
            throw error;
        } finally {
            this.isOperationInProgress = false;
            // Clear the last message key after a delay to allow for quick successive different messages
            setTimeout(() => {
                this.lastSentMessage = null;
            }, 1000);
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

    // Export chat functionality
    exportCurrentChat(format) {
        if (!this.currentChatId) {
            this.showMessage('No chat selected to export', 'error');
            return;
        }

        const url = `/chats/${this.currentProject}/${this.currentChatId}/export?format=${format}`;
        
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showMessage(`Chat exported as ${format.toUpperCase()}`, 'success');
    }

    // Update export button state
    updateExportButtonState() {
        const exportBtn = document.getElementById('export-chat-btn');
        if (exportBtn) {
            exportBtn.disabled = !this.currentChatId;
        }
    }
}

// Global instance
const chatHistory = new ChatHistory();
window.chatHistory = chatHistory; // Make available globally

// Global function for export (called from HTML)
function exportCurrentChat(format) {
    if (window.chatHistory) {
        window.chatHistory.exportCurrentChat(format);
    } else {
        console.error('ChatHistory not initialized');
    }
}