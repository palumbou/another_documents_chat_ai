/**
 * Chat Main Coordinator Module
 * Initializes and coordinates all chat functionality
 * Acts as the central entry point for chat management
 */

import { 
    addMessageToChat, 
    addThinkingBubble, 
    updateChatControls, 
    getChatInput, 
    clearChatInput, 
    focusChatInput,
    showChatNotification
} from './chat-ui.js';

import { sendChatMessage } from './chat-api.js';

import { 
    isDebugModeEnabled, 
    initializeDebugMode, 
    debugLog, 
    createTimingTracker 
} from './chat-debug.js';

// Global state
let isProcessing = false;
let lastSentMessage = null;

/**
 * Initialize chat functionality
 * Sets up event listeners and prepares the chat interface
 */
export function initializeChat() {
    console.log('Initializing chat functionality...');
    
    // Set up event listeners
    setupChatEventListeners();
    
    // Initialize debug mode
    initializeDebugMode();
    
    // Set initial state
    updateChatControls(false);
    focusChatInput();
    
    console.log('Chat functionality initialized');
}

/**
 * Set up event listeners for chat interface
 */
function setupChatEventListeners() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (!chatInput || !sendBtn) {
        console.error('Chat UI elements not found');
        return;
    }
    
    // Send button click
    sendBtn.addEventListener('click', handleSendMessage);
    
    // Enter key in input (without Shift)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Input change to prevent duplicate messages
    chatInput.addEventListener('input', () => {
        const currentInput = getChatInput();
        
        // Enable/disable send button based on input
        if (sendBtn) {
            sendBtn.disabled = !currentInput || isProcessing;
        }
        
        // Update last message tracking
        if (currentInput !== lastSentMessage) {
            lastSentMessage = null;
        }
    });
    
    // Clear chat button
    const clearBtn = document.getElementById('clear-chat-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearChat);
    }
}

/**
 * Handle sending a chat message
 */
async function handleSendMessage() {
    const message = getChatInput();
    
    // Validation
    if (!message) {
        console.log('No message to send');
        return;
    }
    
    if (isProcessing) {
        console.log('Already processing a message');
        return;
    }
    
    // Check for duplicate messages
    if (message === lastSentMessage) {
        showChatNotification('This message was already sent', 'warning');
        return;
    }
    
    // Check if chat is available
    const chatInput = document.getElementById('chat-input');
    if (chatInput && chatInput.disabled) {
        showChatNotification('Chat unavailable: No AI engine online. Please check Ollama connection and load a model.', 'error');
        return;
    }
    
    // Start processing
    isProcessing = true;
    lastSentMessage = message;
    
    const debugMode = isDebugModeEnabled();
    const endTiming = createTimingTracker('Chat Message Processing');
    
    debugLog('Sending message', { message, debugMode });
    
    try {
        // Update UI state
        updateChatControls(true);
        clearChatInput();
        
        // Add user message to chat
        addMessageToChat('user', message);
        
        // Add thinking bubble if debug mode is enabled
        let thinkingId = null;
        if (debugMode) {
            thinkingId = addThinkingBubble(`🔍 Query: "${message}"`);
        }
        
        // Send message to API
        await sendChatMessage(message, debugMode, thinkingId);
        
        debugLog('Message sent successfully', { processingTime: endTiming() });
        
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Show error to user
        const errorMessage = extractErrorMessage(error);
        showChatNotification(`Failed to send message: ${errorMessage}`, 'error');
        
        // Restore input if there was an error
        if (chatInput) {
            chatInput.value = message;
        }
        
        debugLog('Message sending failed', { error: error.message });
        
    } finally {
        // Reset processing state
        isProcessing = false;
        updateChatControls(false);
        focusChatInput();
        
        // Update chat history
        if (window.chatHistory) {
            try {
                await window.chatHistory.loadProjectChats();
            } catch (historyError) {
                console.warn('Failed to refresh chat history:', historyError);
            }
        }
    }
}

/**
 * Handle clearing the chat
 */
function handleClearChat() {
    // Ask for confirmation
    const confirmed = confirm('Are you sure you want to clear the chat history? This action cannot be undone.');
    
    if (confirmed) {
        // Clear the UI
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        
        // Clear the current chat in history
        if (window.chatHistory) {
            window.chatHistory.clearCurrentChat();
        }
        
        // Show confirmation
        showChatNotification('Chat cleared', 'info');
        
        debugLog('Chat cleared', {});
    }
}

/**
 * Check if chat is currently available
 * @returns {boolean} - True if chat is available
 */
export function isChatAvailable() {
    const engineInfo = document.getElementById('engine-info');
    
    if (!engineInfo) return false;
    
    // Check if engine is online (contains green circle)
    return engineInfo.textContent.includes('🟢');
}

/**
 * Update chat availability based on engine status
 * @param {boolean} available - Whether chat should be available
 */
export function updateChatAvailability(available) {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (chatInput) {
        chatInput.disabled = !available;
        chatInput.placeholder = available ? 
            'Type your message...' : 
            'No AI engine available - load a model first';
    }
    
    if (sendBtn && !isProcessing) {
        sendBtn.disabled = !available || !getChatInput();
    }
    
    // Show status message if chat becomes unavailable
    if (!available && !isProcessing) {
        showChatNotification('Chat unavailable: Please load an AI model first', 'warning');
    }
}

/**
 * Get current chat processing state
 * @returns {Object} - Current state information
 */
export function getChatState() {
    return {
        isProcessing,
        isAvailable: isChatAvailable(),
        hasInput: !!getChatInput(),
        debugMode: isDebugModeEnabled(),
        lastMessage: lastSentMessage
    };
}

/**
 * Force stop current chat processing
 * Emergency function to reset chat state
 */
export function stopChatProcessing() {
    isProcessing = false;
    updateChatControls(false);
    focusChatInput();
    
    console.log('Chat processing forcibly stopped');
}

/**
 * Send a programmatic message (from other parts of the app)
 * @param {string} message - Message to send
 * @param {Object} options - Send options
 */
export async function sendProgrammaticMessage(message, options = {}) {
    const { 
        debugMode = false, 
        skipDuplicateCheck = false,
        showInUI = true 
    } = options;
    
    if (isProcessing && !options.force) {
        throw new Error('Chat is currently processing another message');
    }
    
    if (!skipDuplicateCheck && message === lastSentMessage) {
        throw new Error('Duplicate message detected');
    }
    
    const oldProcessingState = isProcessing;
    isProcessing = true;
    
    try {
        if (showInUI) {
            addMessageToChat('user', message);
        }
        
        let thinkingId = null;
        if (debugMode && showInUI) {
            thinkingId = addThinkingBubble(`🔍 Processing: "${message}"`);
        }
        
        await sendChatMessage(message, debugMode, thinkingId);
        
        if (!skipDuplicateCheck) {
            lastSentMessage = message;
        }
        
    } finally {
        isProcessing = oldProcessingState;
        if (!isProcessing) {
            updateChatControls(false);
        }
    }
}

// === HELPER FUNCTIONS ===

/**
 * Extract error message from error object
 * @param {Error} error - Error object
 * @returns {string} - Human-readable error message
 */
function extractErrorMessage(error) {
    if (!error) return 'Unknown error';
    
    if (error.message) {
        try {
            const errorData = JSON.parse(error.message);
            return errorData.detail || errorData.error || error.message;
        } catch {
            return error.message;
        }
    }
    
    return error.toString();
}

// Export the main initialization function
export default initializeChat;
