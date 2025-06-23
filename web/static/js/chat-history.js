/**
 * Chat History Management
 * Handles chat sessions, loading, saving, and UI interactions.
 */

class ChatHistory {
    constructor() {
        this.currentChatId = null;
        this.currentProject = 'global';
        this.chats = [];
        this.rightSidebarVisible = true; // Start with sidebar visible
        this.setupEventListeners();
        this.initializeCurrentProject();
        
        // Simple responsive handling
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    }

    handleResize() {
        const width = window.innerWidth;
        
        // For now, keep desktop behavior simple
        if (width > 1024) {
            // Desktop - keep current toggle state
        } else {
            // Mobile/tablet - could add special handling here
        }
    }

    initializeCurrentProject() {
        // Get the current project from the select element
        const projectSelect = document.getElementById('project-select');
        if (projectSelect && projectSelect.value) {
            this.currentProject = projectSelect.value;
        }
        
        // Initialize sidebar state
        const appContainer = document.querySelector('.app-container');
        const rightSidebar = document.getElementById('right-sidebar');
        if (appContainer && rightSidebar) {
            if (!this.rightSidebarVisible) {
                appContainer.classList.add('right-sidebar-hidden');
                rightSidebar.style.display = 'none';
            }
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

        // Right sidebar toggle
        document.getElementById('toggle-right-sidebar')?.addEventListener('click', () => {
            this.toggleRightSidebar();
        });
        
        // Mobile menu toggle
        document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
            this.toggleLeftSidebar();
        });
        
        // Close right sidebar (mobile)
        document.getElementById('close-right-sidebar')?.addEventListener('click', () => {
            this.rightSidebarVisible = false;
            this.updateLayout();
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
            this.loadProjectChats(); // Refresh chat list
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
            // Add user message
            if (msg.user_message) {
                this.addMessageToDisplay('user', msg.user_message);
            }
            
            // Add AI response
            if (msg.ai_response) {
                let content = msg.ai_response;
                
                // Add debug info if available
                if (msg.debug_info && msg.debug_info.query) {
                    content = this.addDebugInfoToResponse(content, msg.debug_info);
                }
                
                this.addMessageToDisplay('ai', content);
            }
        });

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addMessageToDisplay(sender, content) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${sender}`;
        
        messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        `;

        chatMessages.appendChild(messageDiv);
    }

    addDebugInfoToResponse(response, debugInfo) {
        let debugHtml = '<div class="debug-info" style="margin-top: 1rem; padding: 0.75rem; background: var(--background-light); border-radius: 6px; font-size: 0.85rem;">';
        
        if (debugInfo.thinking_process) {
            debugHtml += `<div><strong>🧠 AI Thinking:</strong> <em>${this.escapeHtml(debugInfo.thinking_process)}</em></div>`;
        }
        
        if (debugInfo.prompt_used) {
            debugHtml += `<div style="margin-top: 0.5rem;"><strong>🔍 Query to Ollama:</strong> <details style="margin-top: 0.25rem;"><summary>View prompt</summary><pre style="white-space: pre-wrap; font-size: 0.75rem; margin-top: 0.5rem;">${this.escapeHtml(debugInfo.prompt_used)}</pre></details></div>`;
        }
        
        if (debugInfo.ollama_request_payload) {
            debugHtml += `<div style="margin-top: 0.5rem;"><strong>⚙️ Technical:</strong> ${debugInfo.ollama_request_payload.model || 'Unknown model'} used</div>`;
        }
        
        debugHtml += '</div>';
        
        return response + debugHtml;
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

    async renameChatPrompt() {
        if (!this.currentChatId) return;

        const newName = prompt('Enter new chat name:');
        if (!newName || !newName.trim()) return;

        try {
            const response = await fetch(`/chats/${this.currentProject}/${this.currentChatId}/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim() })
            });

            if (!response.ok) {
                throw new Error('Failed to rename chat');
            }

            this.updateChatTitle(newName.trim());
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

    toggleRightSidebar() {
        const appContainer = document.querySelector('.app-container');
        const rightSidebar = document.getElementById('right-sidebar');
        
        if (!appContainer || !rightSidebar) {
            console.error('Elements not found for toggle');
            return;
        }
        
        // Toggle the state
        this.rightSidebarVisible = !this.rightSidebarVisible;
        
        
        if (this.rightSidebarVisible) {
            // Show sidebar
            appContainer.classList.remove('right-sidebar-hidden');
            rightSidebar.style.display = 'block';
        } else {
            // Hide sidebar
            appContainer.classList.add('right-sidebar-hidden');
            rightSidebar.style.display = 'none';
        }
        
    }

    toggleLeftSidebar() {
        const leftSidebar = document.querySelector('.left-sidebar');
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile && leftSidebar) {
            const isVisible = leftSidebar.classList.contains('visible');
            
            if (isVisible) {
                leftSidebar.classList.remove('visible');
                this.hideOverlay();
            } else {
                leftSidebar.classList.add('visible');
                this.showOverlay();
            }
        }
    }

    showOverlay() {
        let overlay = document.getElementById('sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sidebar-overlay';
            overlay.className = 'sidebar-overlay';
            overlay.addEventListener('click', () => {
                // Close any open sidebar
                if (window.innerWidth <= 768) {
                    const leftSidebar = document.querySelector('.left-sidebar');
                    if (leftSidebar?.classList.contains('visible')) {
                        this.toggleLeftSidebar();
                        return;
                    }
                }
                this.toggleRightSidebar();
            });
            document.body.appendChild(overlay);
        }
        overlay.classList.add('visible');
    }

    hideOverlay() {
        const overlay = document.getElementById('sidebar-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public method to send message within current chat
    async sendMessageInCurrentChat(message, model = null, includeDebug = false) {
        if (!this.currentChatId) {
            // Create new chat with first message
            this.currentChatId = await this.createNewChat(message);
            if (!this.currentChatId) return null;
        }

        try {
            const response = await fetch(`/chats/${this.currentProject}/${this.currentChatId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: message,
                    model: model,
                    debug: includeDebug
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const result = await response.json();
            
            // Load chat messages to update the UI immediately
            await this.loadChatMessages(this.currentChatId);
            
            this.loadProjectChats(); // Update chat list timestamps
            return result;

        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
}

// Global instance
const chatHistory = new ChatHistory();
window.chatHistory = chatHistory; // Make available globally

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    chatHistory.loadProjectChats();
});

// Global test function for debugging
window.testSidebarToggle = function() {
    const container = document.querySelector('.app-container');
    const sidebar = document.getElementById('right-sidebar');
    
    
    if (container.classList.contains('right-sidebar-hidden')) {
        container.classList.remove('right-sidebar-hidden');
        container.style.gridTemplateColumns = '380px 1fr 320px';
        sidebar.style.display = 'block';
    } else {
        container.classList.add('right-sidebar-hidden');
        container.style.gridTemplateColumns = '380px 1fr 0';
        sidebar.style.display = 'none';
    }
    
};
