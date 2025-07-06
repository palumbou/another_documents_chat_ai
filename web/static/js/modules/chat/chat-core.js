/**
 * Chat Core Module
 * Core chat functionality as ES6 module
 * 
 * Features:
 * - Message sending and receiving
 * - Debug mode integration
 * - Chat history integration
 * - Error handling and user feedback
 * - Model selection integration
 */

export class ChatCore {
    constructor() {
        this.chatInput = null;
        this.sendBtn = null;
        this.chatMessages = null;
        this.isInitialized = false;
    }

    /**
     * Initialize chat functionality
     */
    initialize() {
        if (this.isInitialized) {
            console.warn('Chat already initialized');
            return;
        }

        this.chatInput = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('send-btn');
        this.chatMessages = document.getElementById('chat-messages');

        if (!this.chatInput || !this.sendBtn || !this.chatMessages) {
            console.error('Chat elements not found');
            return false;
        }

        this.setupEventListeners();
        this.isInitialized = true;
        console.log('✅ Chat core initialized');
        return true;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Send button click
        this.sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter key to send message
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    /**
     * Send message function
     */
    async sendMessage() {
        const query = this.chatInput.value.trim();
        if (!query) return;

        // Check if chat is available (engine online)
        if (this.chatInput.disabled) {
            alert('⚠️ Chat unavailable: No AI engine online. Please check Ollama connection and load a model.');
            return;
        }

        // Add user message to chat display
        this.addMessageToChat('user', query);

        // Clear input and disable send button
        this.chatInput.value = '';
        this.sendBtn.disabled = true;

        // Add thinking bubble if debug mode is enabled
        const debugMode = document.getElementById('debug-mode')?.checked || false;
        let thinkingId = null;

        if (debugMode) {
            thinkingId = this.addThinkingBubble(`🔍 Query: "${query}"`);
        }

        // Add regular thinking message
        const currentModel = this.getCurrentModel();
        const processingId = this.addMessageToChat('ai', 'Thinking... (this may take a while)', true, currentModel);

        try {
            // Use chat history service if available, otherwise use regular chat
            let response;

            if (window.chatHistory) {
                // Always use chat history service - it will handle chat creation if needed
                response = await window.chatHistory.sendMessageInCurrentChat(query, currentModel, debugMode);
            } else {
                // Fallback to regular chat endpoint
                response = await this.sendChatRequest(query, debugMode);
            }

            // Remove thinking bubble if it exists
            if (thinkingId) {
                const thinkingBubble = document.getElementById(thinkingId);
                if (thinkingBubble) {
                    thinkingBubble.remove();
                }
            }

            // Replace processing message with actual response
            const processingMsg = document.getElementById(processingId);
            if (processingMsg && response) {
                let responseContent = response.response || 'No response received';

                // Add debug information if available and debug mode is enabled
                if (response.debug_info && debugMode) {
                    responseContent = this.addDebugInfoToResponse(responseContent, response.debug_info);

                    // Update thinking bubble with real AI thinking and prompt if available
                    if (thinkingId && response.debug_info) {
                        let thinkingContent = `🧠 ${response.debug_info.thinking_process}`;

                        // Add prompt preview in thinking mode
                        if (response.debug_info.prompt_used) {
                            const promptPreview = response.debug_info.prompt_used.length > 200
                                ? response.debug_info.prompt_used.substring(0, 200) + '...'
                                : response.debug_info.prompt_used;
                            thinkingContent += `\n\n🔍 Prompt sent to AI:\n"${promptPreview}"`;
                        }

                        this.updateThinkingBubble(thinkingId, thinkingContent);
                    }
                }

                // Update the content
                processingMsg.querySelector('.message-content').innerHTML = responseContent;

                // Update the model attribute if available in response
                if (response.model) {
                    processingMsg.setAttribute('data-model', response.model);
                }

                processingMsg.classList.remove('thinking');
            }

        } catch (error) {
            console.error('Chat error:', error);

            // Remove thinking bubble if it exists
            if (thinkingId) {
                const thinkingBubble = document.getElementById(thinkingId);
                if (thinkingBubble) {
                    thinkingBubble.remove();
                }
            }

            // Show error message
            const processingMsg = document.getElementById(processingId);
            if (processingMsg) {
                processingMsg.querySelector('.message-content').innerHTML =
                    `❌ <strong>Error:</strong> ${error.message}`;
                processingMsg.classList.remove('thinking');
                processingMsg.classList.add('error');
            }
        } finally {
            this.sendBtn.disabled = false;
        }
    }

    /**
     * Fallback function for regular chat requests
     */
    async sendChatRequest(query, debugMode) {
        const formData = new URLSearchParams({
            query: query,
            project: window.currentProject || 'global',
            debug: debugMode
        });

        const res = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        if (!res.ok) {
            const errorText = await res.text();
            let errorMessage;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.detail || 'Unknown error';
            } catch {
                errorMessage = errorText || `HTTP ${res.status}`;
            }
            throw new Error(errorMessage);
        }

        return await res.json();
    }

    /**
     * Add message to chat function
     */
    addMessageToChat(sender, content, isTemporary = false, model = null) {
        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `message message-${sender}`;

        if (isTemporary) {
            messageDiv.classList.add('thinking');
        }

        // Add model info as data attribute for AI messages
        if (sender === 'ai' && model) {
            messageDiv.setAttribute('data-model', model);
        }

        messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-timestamp">${new Date().toLocaleTimeString()}</div>
        `;

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        return messageId;
    }

    /**
     * Add thinking bubble for AI
     */
    addThinkingBubble(content) {
        const messageId = 'thinking-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const thinkingDiv = document.createElement('div');
        thinkingDiv.id = messageId;
        thinkingDiv.className = 'message message-thinking';

        thinkingDiv.innerHTML = `
            <div class="thinking-bubble">
                <div class="thinking-content">${content}</div>
                <div class="thinking-status" id="${messageId}-status" style="margin-top: 0.5rem; font-size: 0.8rem; opacity: 0.7;">
                    🧠 AI is processing...
                </div>
                <div class="thinking-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;

        this.chatMessages.appendChild(thinkingDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        return messageId;
    }

    /**
     * Update thinking bubble with new information
     */
    updateThinkingBubble(messageId, newStatus) {
        const statusElement = document.getElementById(messageId + '-status');
        if (statusElement) {
            statusElement.innerHTML = newStatus;
        }
    }

    /**
     * Get current active model
     */
    getCurrentModel() {
        const localSelect = document.getElementById('local-select');
        const engineInfo = document.getElementById('engine-info');

        // Try to get from engine info first
        if (engineInfo && engineInfo.textContent) {
            const match = engineInfo.textContent.match(/\(Engine: ([^\s\)]+)/);
            if (match) {
                return match[1];
            }
        }

        // Fallback to selected value in local select
        if (localSelect && localSelect.value) {
            return localSelect.value;
        }

        return null;
    }

    /**
     * Function to add debug information to the response
     */
    addDebugInfoToResponse(response, debugInfo) {
        return `
            <div class="debug-thinking">
                <div class="debug-section">
                    <strong>🧠 AI Thinking Process:</strong>
                    <div class="thinking-content">${debugInfo.thinking_process}</div>
                </div>
            </div>
            
            <div class="ai-response">
                <strong>💬 Response:</strong>
                <div class="response-content">${response}</div>
            </div>
            
            <div class="debug-technical">
                <details>
                    <summary>🔧 Technical Debug Info</summary>
                    <div class="debug-details">
                        <div class="debug-item">
                            <strong>Ollama URL:</strong> <code>${debugInfo.ollama_url}</code>
                        </div>
                        <div class="debug-item">
                            <strong>Request Payload:</strong>
                            <pre class="debug-code">${JSON.stringify(debugInfo.ollama_request_payload, null, 2)}</pre>
                        </div>
                        <div class="debug-item">
                            <strong>Prompt Used:</strong>
                            <pre class="debug-code">${debugInfo.prompt_used}</pre>
                        </div>
                    </div>
                </details>
            </div>
        `;
    }

    /**
     * Clear chat messages
     */
    clearChat() {
        if (this.chatMessages) {
            this.chatMessages.innerHTML = '';
        }
    }

    /**
     * Check if chat is initialized
     */
    isReady() {
        return this.isInitialized;
    }
}

// Create and export singleton instance
export const chatCore = new ChatCore();

// Legacy compatibility - expose global functions
window.initializeChat = () => chatCore.initialize();
window.addMessageToChat = (sender, content, isTemporary, model) => 
    chatCore.addMessageToChat(sender, content, isTemporary, model);
window.getCurrentModel = () => chatCore.getCurrentModel();
