/**
 * Chat Module
 * Handles all chat functionality including sending messages and debug features
 */

// Global chat variables
let chatInput, sendBtn, chatMessages;

// Initialize chat functionality
function initializeChat() {
  chatInput = document.getElementById('chat-input');
  sendBtn = document.getElementById('send-btn');
  chatMessages = document.getElementById('chat-messages');
  
  // Event listeners
  sendBtn.addEventListener('click', sendMessage);
  
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// Send message function
async function sendMessage() {
  const query = chatInput.value.trim();
  if (!query) return;
  
  // Check if chat is available (engine online)
  if (chatInput.disabled) {
    alert('⚠️ Chat unavailable: No AI engine online. Please check Ollama connection and load a model.');
    return;
  }

  // Add user message to chat display
  addMessageToChat('user', query);
  
  // Clear input and disable send button
  chatInput.value = '';
  sendBtn.disabled = true;
  
  // Add thinking bubble if debug mode is enabled
  const debugMode = document.getElementById('debug-mode').checked;
  let thinkingId = null;
  
  if (debugMode) {
    thinkingId = addThinkingBubble(`🔍 Query: "${query}"`);
  }
  
  // Add regular thinking message
  const currentModel = getCurrentModel();
  const processingId = addMessageToChat('ai', 'Thinking... (this may take a while)', true, currentModel);
  
  try {
    // Use chat history service if available, otherwise use regular chat
    let response;
    
    if (window.chatHistory && window.chatHistory.currentChatId) {
      // Send through chat history for persistence
      response = await window.chatHistory.sendMessageInCurrentChat(query, currentModel, debugMode);
    } else if (window.chatHistory) {
      // Create new chat and send message
      response = await window.chatHistory.sendMessageInCurrentChat(query, currentModel, debugMode);
    } else {
      // Fallback to regular chat endpoint
      response = await sendChatRequest(query, debugMode);
    }
    
    // IMPORTANT: Don't let chat history reload messages, we handle the display manually
    // This ensures our model display logic works correctly
    
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
        responseContent = addDebugInfoToResponse(responseContent, response.debug_info);
        
        // Update thinking bubble with real AI thinking if available
        if (thinkingId && response.debug_info.thinking_process) {
          updateThinkingBubble(thinkingId, `🧠 ${response.debug_info.thinking_process}`);
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
    sendBtn.disabled = false;
  }
}

// Fallback function for regular chat requests
async function sendChatRequest(query, debugMode) {
  const formData = new URLSearchParams({ 
    query: query,
    project: window.currentProject,
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

// Add message to chat function
function addMessageToChat(sender, content, isTemporary = false, model = null) {
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
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return messageId;
}

// Add thinking bubble for AI
function addThinkingBubble(content) {
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
  
  chatMessages.appendChild(thinkingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return messageId;
}

// Update thinking bubble with new information
function updateThinkingBubble(messageId, newStatus) {
  const statusElement = document.getElementById(messageId + '-status');
  if (statusElement) {
    statusElement.innerHTML = newStatus;
  }
}

// Get current active model
function getCurrentModel() {
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

// Function to add debug information to the response
function addDebugInfoToResponse(response, debugInfo) {
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
