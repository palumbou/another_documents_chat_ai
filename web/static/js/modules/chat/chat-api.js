/**
 * Chat API Communication Module
 * Handles all backend communication for chat functionality
 * Manages streaming responses and error handling
 */

import { addMessageToChat, updateThinkingBubble, removeThinkingBubble } from './chat-ui.js';

/**
 * Send a chat message with streaming response
 * @param {string} query - User's message
 * @param {boolean} debugMode - Whether debug mode is enabled
 * @param {string} thinkingId - ID of thinking bubble (if any)
 * @returns {Promise<void>}
 */
export async function sendChatMessage(query, debugMode = false, thinkingId = null) {
    try {
        // Get current project for context
        const currentProject = window.currentProject || 'global';
        const currentChatId = window.chatHistory ? window.chatHistory.currentChatId : null;
        
        if (debugMode && thinkingId) {
            updateThinkingBubble(thinkingId, '🔍 Sending query to AI...');
        }
        
        // Prepare request data
        const requestData = {
            query: query,
            project: currentProject,
            chat_id: currentChatId,
            debug: debugMode
        };
        
        // Try streaming first, fallback to regular request
        try {
            await sendStreamingChatRequest(requestData, debugMode, thinkingId);
        } catch (streamError) {
            console.warn('Streaming failed, falling back to regular request:', streamError);
            await sendRegularChatRequest(requestData, debugMode, thinkingId);
        }
        
    } catch (error) {
        console.error('Chat request failed:', error);
        
        // Remove thinking bubble
        if (thinkingId) {
            removeThinkingBubble(thinkingId);
        }
        
        // Show error message
        const errorMessage = getErrorMessage(error);
        addMessageToChat('assistant', `❌ Error: ${errorMessage}`, false);
        
        throw error;
    }
}

/**
 * Send streaming chat request
 * @param {Object} requestData - Request payload
 * @param {boolean} debugMode - Debug mode status
 * @param {string} thinkingId - Thinking bubble ID
 */
async function sendStreamingChatRequest(requestData, debugMode, thinkingId) {
    const response = await fetch('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentMessageId = null;
    let isFirstChunk = true;
    let debugInfo = null;
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Accumulate data in buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;
                
                try {
                    const data = JSON.parse(trimmedLine);
                    
                    // Handle different types of streaming data
                    if (data.type === 'thinking' && debugMode && thinkingId) {
                        updateThinkingBubble(thinkingId, data.content);
                    } else if (data.type === 'response_start') {
                        // Remove thinking bubble and start response
                        if (thinkingId) {
                            removeThinkingBubble(thinkingId);
                        }
                        
                        const model = getCurrentModel();
                        currentMessageId = addMessageToChat('assistant', '', false, model);
                        isFirstChunk = true;
                        
                        // Store debug info if available
                        if (data.debug_info) {
                            debugInfo = data.debug_info;
                        }
                        
                    } else if (data.type === 'content' && currentMessageId) {
                        // Append content to the message
                        appendToMessage(currentMessageId, data.content, isFirstChunk);
                        isFirstChunk = false;
                        
                    } else if (data.type === 'response_end') {
                        // Add debug info if available and debug mode is on
                        if (debugMode && debugInfo && currentMessageId) {
                            appendDebugInfo(currentMessageId, debugInfo);
                        }
                        break;
                        
                    } else if (data.type === 'error') {
                        throw new Error(data.message || 'Streaming error');
                    }
                    
                } catch (parseError) {
                    // Log non-JSON lines in debug mode
                    if (debugMode && trimmedLine.length > 5) {
                        console.log('Non-JSON stream data:', trimmedLine);
                    }
                }
            }
        }
        
        // Process any remaining buffer data
        if (buffer.trim()) {
            try {
                const data = JSON.parse(buffer.trim());
                if (data.type === 'content' && currentMessageId) {
                    appendToMessage(currentMessageId, data.content, isFirstChunk);
                }
            } catch (e) {
                // Ignore parse errors for final buffer
            }
        }
        
    } finally {
        reader.releaseLock();
    }
}

/**
 * Send regular (non-streaming) chat request
 * @param {Object} requestData - Request payload
 * @param {boolean} debugMode - Debug mode status
 * @param {string} thinkingId - Thinking bubble ID
 */
async function sendRegularChatRequest(requestData, debugMode, thinkingId) {
    if (debugMode && thinkingId) {
        updateThinkingBubble(thinkingId, '⏳ Waiting for response...');
    }
    
    const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    // Remove thinking bubble
    if (thinkingId) {
        removeThinkingBubble(thinkingId);
    }
    
    // Add assistant response
    const model = getCurrentModel();
    const messageId = addMessageToChat('assistant', result.response, false, model);
    
    // Add debug info if available
    if (debugMode && result.debug_info && messageId) {
        appendDebugInfo(messageId, result.debug_info);
    }
}

/**
 * Append content to an existing message
 * @param {string} messageId - ID of the message to update
 * @param {string} content - Content to append
 * @param {boolean} isFirstChunk - Whether this is the first chunk
 */
function appendToMessage(messageId, content, isFirstChunk = false) {
    const messageElement = document.getElementById(messageId);
    if (!messageElement) return;
    
    const contentElement = messageElement.querySelector('.message-content');
    if (!contentElement) return;
    
    if (isFirstChunk) {
        contentElement.innerHTML = escapeHtml(content);
    } else {
        contentElement.innerHTML += escapeHtml(content);
    }
    
    // Apply markdown formatting
    contentElement.innerHTML = formatMarkdown(contentElement.textContent);
    
    // Scroll to bottom
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

/**
 * Append debug information to a message
 * @param {string} messageId - ID of the message
 * @param {Object} debugInfo - Debug information object
 */
function appendDebugInfo(messageId, debugInfo) {
    const messageElement = document.getElementById(messageId);
    if (!messageElement) return;
    
    const debugSection = document.createElement('div');
    debugSection.className = 'debug-info';
    debugSection.innerHTML = `
        <details>
            <summary>🔍 Debug Information</summary>
            <div class="debug-content">
                ${formatDebugInfo(debugInfo)}
            </div>
        </details>
    `;
    
    messageElement.appendChild(debugSection);
}

/**
 * Format debug information for display
 * @param {Object} debugInfo - Debug information
 * @returns {string} - Formatted HTML
 */
function formatDebugInfo(debugInfo) {
    let html = '';
    
    if (debugInfo.query) {
        html += `<p><strong>Original Query:</strong> ${escapeHtml(debugInfo.query)}</p>`;
    }
    
    if (debugInfo.prompt) {
        html += `<p><strong>Full Prompt:</strong></p><pre>${escapeHtml(debugInfo.prompt)}</pre>`;
    }
    
    if (debugInfo.model) {
        html += `<p><strong>Model:</strong> ${escapeHtml(debugInfo.model)}</p>`;
    }
    
    if (debugInfo.processing_time) {
        html += `<p><strong>Processing Time:</strong> ${debugInfo.processing_time}s</p>`;
    }
    
    if (debugInfo.context_documents) {
        html += `<p><strong>Context Documents:</strong> ${debugInfo.context_documents}</p>`;
    }
    
    if (debugInfo.thinking_process) {
        html += `<p><strong>Thinking Process:</strong></p><pre>${escapeHtml(debugInfo.thinking_process)}</pre>`;
    }
    
    return html;
}

/**
 * Get current model name
 * @returns {string} - Current model name
 */
function getCurrentModel() {
    const engineInfo = document.getElementById('engine-info');
    if (!engineInfo) return 'Unknown';
    
    const match = engineInfo.textContent.match(/Engine: ([^\s\)]+)/);
    return match ? match[1] : 'Unknown';
}

/**
 * Extract error message from error object
 * @param {Error} error - Error object
 * @returns {string} - Human-readable error message
 */
function getErrorMessage(error) {
    if (error.message) {
        // Try to parse JSON error message
        try {
            const errorData = JSON.parse(error.message);
            return errorData.detail || errorData.error || error.message;
        } catch {
            return error.message;
        }
    }
    
    return 'Unknown error occurred';
}

// === HELPER FUNCTIONS ===

/**
 * Escape HTML characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format markdown text
 * @param {string} text - Text to format
 * @returns {string} - Formatted HTML
 */
function formatMarkdown(text) {
    if (!text) return '';
    
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}
