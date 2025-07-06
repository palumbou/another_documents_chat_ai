/**
 * Chat UI Management Module
 * Handles all user interface interactions for the chat functionality
 * Manages message display, input handling, and visual states
 */

/**
 * Add a message to the chat display
 * @param {string} sender - 'user' or 'assistant'
 * @param {string} content - Message content
 * @param {boolean} isTemporary - Whether this is a temporary message
 * @param {string} model - Model name used for the response
 * @returns {string} - ID of the created message element
 */
export function addMessageToChat(sender, content, isTemporary = false, model = null) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) {
        console.error('Chat messages container not found');
        return null;
    }
    
    const messageId = generateMessageId();
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.className = `message ${sender}-message ${isTemporary ? 'temporary' : ''}`;
    
    // Create message content
    let messageContent = '';
    
    if (sender === 'user') {
        messageContent = `
            <div class="message-header">
                <span class="sender">You</span>
                <span class="timestamp">${formatTimestamp(new Date())}</span>
            </div>
            <div class="message-content">${escapeHtml(content)}</div>
        `;
    } else {
        // Assistant message
        const modelInfo = model ? ` (${model})` : '';
        messageContent = `
            <div class="message-header">
                <span class="sender">Assistant${modelInfo}</span>
                <span class="timestamp">${formatTimestamp(new Date())}</span>
            </div>
            <div class="message-content">${formatMarkdown(content)}</div>
        `;
    }
    
    messageDiv.innerHTML = messageContent;
    
    // Add to chat
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    // Store message in chat history if not temporary
    if (!isTemporary && window.chatHistory) {
        window.chatHistory.addMessage(sender, content, model);
    }
    
    return messageId;
}

/**
 * Add a thinking bubble for debug mode
 * @param {string} content - Initial thinking content
 * @returns {string} - ID of the thinking bubble
 */
export function addThinkingBubble(content) {
    const messageId = generateMessageId();
    const chatMessages = document.getElementById('chat-messages');
    
    if (!chatMessages) return null;
    
    const thinkingDiv = document.createElement('div');
    thinkingDiv.id = messageId;
    thinkingDiv.className = 'message thinking-message';
    
    thinkingDiv.innerHTML = `
        <div class="message-header">
            <span class="sender">🤔 Thinking...</span>
            <span class="timestamp">${formatTimestamp(new Date())}</span>
        </div>
        <div class="message-content thinking-content">
            <div class="thinking-text">${escapeHtml(content)}</div>
            <div class="thinking-indicator">
                <span class="thinking-dots">
                    <span>•</span><span>•</span><span>•</span>
                </span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(thinkingDiv);
    scrollToBottom();
    
    return messageId;
}

/**
 * Update thinking bubble with new status
 * @param {string} messageId - ID of the thinking bubble
 * @param {string} newStatus - New status text
 */
export function updateThinkingBubble(messageId, newStatus) {
    const bubble = document.getElementById(messageId);
    if (!bubble) return;
    
    const thinkingText = bubble.querySelector('.thinking-text');
    if (thinkingText) {
        thinkingText.innerHTML = escapeHtml(newStatus);
    }
}

/**
 * Remove thinking bubble
 * @param {string} messageId - ID of the thinking bubble to remove
 */
export function removeThinkingBubble(messageId) {
    if (!messageId) return;
    
    const bubble = document.getElementById(messageId);
    if (bubble) {
        bubble.remove();
    }
}

/**
 * Update chat input and send button states
 * @param {boolean} disabled - Whether controls should be disabled
 */
export function updateChatControls(disabled) {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (chatInput) chatInput.disabled = disabled;
    if (sendBtn) sendBtn.disabled = disabled;
}

/**
 * Clear all messages from the chat
 */
export function clearChat() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
}

/**
 * Scroll chat to bottom
 */
export function scrollToBottom() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

/**
 * Get current chat input value
 * @returns {string} - Current input text
 */
export function getChatInput() {
    const chatInput = document.getElementById('chat-input');
    return chatInput ? chatInput.value.trim() : '';
}

/**
 * Clear chat input
 */
export function clearChatInput() {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.value = '';
    }
}

/**
 * Focus on chat input
 */
export function focusChatInput() {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.focus();
    }
}

/**
 * Show a temporary notification in the chat
 * @param {string} message - Notification message
 * @param {string} type - Type of notification (info, warning, error)
 */
export function showChatNotification(message, type = 'info') {
    const messageId = addMessageToChat('system', message, true);
    
    // Auto-remove after delay
    setTimeout(() => {
        const msgElement = document.getElementById(messageId);
        if (msgElement) {
            msgElement.remove();
        }
    }, 5000);
    
    return messageId;
}

// === HELPER FUNCTIONS ===

/**
 * Generate unique message ID
 * @returns {string} - Unique message identifier
 */
function generateMessageId() {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format timestamp for display
 * @param {Date} date - Date to format
 * @returns {string} - Formatted timestamp
 */
function formatTimestamp(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Escape HTML characters in text
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Basic markdown formatting for assistant responses
 * @param {string} text - Text to format
 * @returns {string} - Formatted HTML
 */
function formatMarkdown(text) {
    if (!text) return '';
    
    // Escape HTML first
    let formatted = escapeHtml(text);
    
    // Apply basic markdown formatting
    formatted = formatted
        // Bold **text**
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic *text*
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code `text`
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // Line breaks
        .replace(/\n/g, '<br>');
    
    return formatted;
}
