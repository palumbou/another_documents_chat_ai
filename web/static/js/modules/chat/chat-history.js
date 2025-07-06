/**
 * Chat History Management Module
 * ES6 module version of chat history functionality
 * 
 * Features:
 * - Chat session management
 * - History persistence
 * - Database interactions
 * - Auto-refresh and synchronization
 * - Export/import functionality
 */

export class ChatHistoryManager {
    constructor() {
        this.currentChatId = null;
        this.currentProject = 'global';
        this.chats = [];
        this.autoRefreshInterval = null;
        this.isOperationInProgress = false;
        this.isCreatingChat = false;
        this.lastSentMessage = null; // Track last message to prevent duplicates
        this.isInitialized = false;
    }

    /**
     * Initialize chat history management
     */
    initialize() {
        if (this.isInitialized) {
            console.warn('Chat history already initialized');
            return;
        }

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setup();
            });
        } else {
            this.setup();
        }

        this.isInitialized = true;
    }

    /**
     * Setup chat history functionality
     */
    setup() {
        this.setupEventListeners();
        this.initializeCurrentProject();
        this.loadProjectChats();
        this.updateExportButtonState();
        this.startAutoRefresh();
        console.log('✅ Chat history initialized');
    }

    /**
     * Initialize current project
     */
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

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Project change handler
        const projectSelect = document.getElementById('project-select');
        if (projectSelect) {
            projectSelect.addEventListener('change', (e) => {
                this.handleProjectChange(e.target.value);
            });
        }

        // Chat list events
        this.setupChatListEventListeners();

        // Export/import events
        this.setupExportImportEventListeners();
    }

    /**
     * Setup chat list event listeners
     */
    setupChatListEventListeners() {
        // New chat button
        const newChatBtn = document.getElementById('new-chat');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                this.createNewChat();
            });
        }

        // Refresh chats button
        const refreshBtn = document.getElementById('refresh-chats');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadProjectChats();
            });
        }

        // Clear current chat button
        const clearChatBtn = document.getElementById('clear-chat');
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => {
                this.clearCurrentChat();
            });
        }
    }

    /**
     * Setup export/import event listeners
     */
    setupExportImportEventListeners() {
        // Export chat button
        const exportBtn = document.getElementById('export-chat');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportCurrentChat();
            });
        }

        // Export all chats button
        const exportAllBtn = document.getElementById('export-all-chats');
        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', () => {
                this.exportAllChats();
            });
        }
    }

    /**
     * Handle project change
     */
    async handleProjectChange(newProject) {
        if (this.isOperationInProgress) return;

        this.isOperationInProgress = true;
        this.currentProject = newProject;
        window.currentProject = newProject;

        // Clear current chat
        this.currentChatId = null;
        this.clearChatDisplay();

        // Load chats for new project
        await this.loadProjectChats();

        this.isOperationInProgress = false;
        console.log(`Switched to project: ${newProject}`);
    }

    /**
     * Load chats for current project
     */
    async loadProjectChats() {
        try {
            const response = await fetch(`/chats/${encodeURIComponent(this.currentProject)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.chats = data.chats || [];
            this.updateChatList();
            this.updateExportButtonState();
            
        } catch (error) {
            console.error('Error loading chats:', error);
            this.chats = [];
            this.updateChatList();
        }
    }

    /**
     * Update chat list display
     */
    updateChatList() {
        const chatList = document.getElementById('chat-list');
        if (!chatList) return;

        if (this.chats.length === 0) {
            chatList.innerHTML = '<div class="no-chats">No chat sessions found</div>';
            return;
        }

        chatList.innerHTML = this.chats.map(chat => `
            <div class="chat-item ${chat.id === this.currentChatId ? 'active' : ''}" 
                 data-chat-id="${chat.id}"
                 onclick="window.chatHistory.loadChat('${chat.id}')">
                <div class="chat-title">${this.escapeHtml(chat.title || 'Untitled Chat')}</div>
                <div class="chat-info">
                    <span class="chat-date">${new Date(chat.created_at).toLocaleDateString()}</span>
                    <span class="chat-messages">${chat.message_count || 0} messages</span>
                </div>
                <div class="chat-actions">
                    <button onclick="event.stopPropagation(); window.chatHistory.renameChat('${chat.id}')" 
                            title="Rename chat">✏️</button>
                    <button onclick="event.stopPropagation(); window.chatHistory.deleteChat('${chat.id}')" 
                            title="Delete chat">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Create new chat
     */
    async createNewChat() {
        if (this.isCreatingChat) return;

        this.isCreatingChat = true;
        try {
            const response = await fetch(`/chats/${this.currentProject}/new`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: this.currentProject })
            });

            if (!response.ok) {
                throw new Error(`Failed to create chat: ${response.statusText}`);
            }

            const data = await response.json();
            this.currentChatId = data.chat_id;
            
            // Refresh chat list and clear display
            await this.loadProjectChats();
            this.clearChatDisplay();
            
            console.log(`Created new chat: ${this.currentChatId}`);
            
        } catch (error) {
            console.error('Error creating chat:', error);
            alert('Failed to create new chat');
        } finally {
            this.isCreatingChat = false;
        }
    }

    /**
     * Load specific chat
     */
    async loadChat(chatId) {
        if (this.isOperationInProgress || chatId === this.currentChatId) return;

        this.isOperationInProgress = true;
        try {
            const response = await fetch(`/chats/${encodeURIComponent(this.currentProject)}/${chatId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load chat: ${response.statusText}`);
            }

            const data = await response.json();
            this.currentChatId = chatId;
            
            // Display messages
            this.displayChatMessages(data.messages || []);
            this.updateChatList(); // Refresh to show active state
            
        } catch (error) {
            console.error('Error loading chat:', error);
            alert('Failed to load chat');
        } finally {
            this.isOperationInProgress = false;
        }
    }

    /**
     * Display chat messages
     */
    displayChatMessages(messages) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        chatMessages.innerHTML = '';
        
        messages.forEach(message => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message message-${message.sender}`;
            
            if (message.sender === 'ai' && message.model) {
                messageDiv.setAttribute('data-model', message.model);
            }
            
            messageDiv.innerHTML = `
                <div class="message-content">${message.content}</div>
                <div class="message-timestamp">${new Date(message.timestamp).toLocaleTimeString()}</div>
            `;
            
            chatMessages.appendChild(messageDiv);
        });
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Send message in current chat
     */
    async sendMessageInCurrentChat(query, model = null, debugMode = false) {
        // Ensure we have a current chat
        if (!this.currentChatId) {
            await this.createNewChat();
        }

        // Prevent duplicate messages
        if (this.lastSentMessage === query) {
            console.warn('Duplicate message prevented');
            return;
        }
        this.lastSentMessage = query;

        try {
            const response = await fetch(`/chats/${encodeURIComponent(this.currentProject)}/${this.currentChatId}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: query,
                    model: model,
                    debug: debugMode
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to send message: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Reset duplicate message prevention after successful send
            setTimeout(() => {
                this.lastSentMessage = null;
            }, 1000);
            
            return data;
            
        } catch (error) {
            this.lastSentMessage = null; // Reset on error
            throw error;
        }
    }

    /**
     * Delete chat
     */
    async deleteChat(chatId) {
        if (!confirm('Are you sure you want to delete this chat?')) return;

        try {
            const response = await fetch(`/chats/${encodeURIComponent(this.currentProject)}/${chatId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Failed to delete chat: ${response.statusText}`);
            }

            // If deleted chat was current, clear it
            if (this.currentChatId === chatId) {
                this.currentChatId = null;
                this.clearChatDisplay();
            }

            // Refresh chat list
            await this.loadProjectChats();
            
        } catch (error) {
            console.error('Error deleting chat:', error);
            alert('Failed to delete chat');
        }
    }

    /**
     * Rename chat
     */
    async renameChat(chatId) {
        const newTitle = prompt('Enter new chat title:');
        if (!newTitle) return;

        try {
            const response = await fetch(`/chats/${encodeURIComponent(this.currentProject)}/${chatId}/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle })
            });

            if (!response.ok) {
                throw new Error(`Failed to rename chat: ${response.statusText}`);
            }

            // Refresh chat list
            await this.loadProjectChats();
            
        } catch (error) {
            console.error('Error renaming chat:', error);
            alert('Failed to rename chat');
        }
    }

    /**
     * Clear current chat display
     */
    clearCurrentChat() {
        if (this.currentChatId && confirm('Clear current chat messages?')) {
            this.clearChatDisplay();
            this.currentChatId = null;
            this.updateChatList();
        }
    }

    /**
     * Clear chat display
     */
    clearChatDisplay() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
    }

    /**
     * Export current chat
     */
    async exportCurrentChat() {
        if (!this.currentChatId) {
            alert('No active chat to export');
            return;
        }

        try {
            const response = await fetch(`/chats/${encodeURIComponent(this.currentProject)}/${this.currentChatId}/export`);
            
            if (!response.ok) {
                throw new Error(`Failed to export chat: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat-${this.currentChatId}-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error exporting chat:', error);
            alert('Failed to export chat');
        }
    }

    /**
     * Export all chats
     */
    async exportAllChats() {
        try {
            const response = await fetch(`/chats/${encodeURIComponent(this.currentProject)}/export-all`);
            
            if (!response.ok) {
                throw new Error(`Failed to export chats: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `all-chats-${this.currentProject}-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error exporting chats:', error);
            alert('Failed to export chats');
        }
    }

    /**
     * Update export button state
     */
    updateExportButtonState() {
        const exportBtn = document.getElementById('export-chat');
        const exportAllBtn = document.getElementById('export-all-chats');
        
        if (exportBtn) {
            exportBtn.disabled = !this.currentChatId;
        }
        
        if (exportAllBtn) {
            exportAllBtn.disabled = this.chats.length === 0;
        }
    }

    /**
     * Start auto refresh
     */
    startAutoRefresh() {
        // Refresh chat list every 30 seconds
        this.autoRefreshInterval = setInterval(() => {
            if (!this.isOperationInProgress) {
                this.loadProjectChats();
            }
        }, 30000);
    }

    /**
     * Stop auto refresh
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    /**
     * Escape HTML characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopAutoRefresh();
        this.isInitialized = false;
        console.log('Chat history manager destroyed');
    }
}

// Create and export singleton instance
export const chatHistoryManager = new ChatHistoryManager();

// Legacy compatibility - expose global instance
window.chatHistory = chatHistoryManager;
