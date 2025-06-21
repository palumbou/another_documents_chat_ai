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

  // Add user message to chat
  addMessageToChat('user', query);
  
  // Clear input and disable send button
  chatInput.value = '';
  sendBtn.disabled = true;
  
  // Add thinking bubble if debug mode is enabled
  const debugMode = document.getElementById('debug-mode').checked;
  let thinkingId = null;
  
  if (debugMode) {
    thinkingId = addThinkingBubble('🤔 Thinking...');
  }
  
  // Add regular thinking message
  const processingId = addMessageToChat('ai', 'Thinking... (this may take a while)', true);
  
  try {      // Include current project and debug mode in the request
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
    
    const data = await res.json();
    
    // Remove thinking bubble if it exists
    if (thinkingId) {
      const thinkingBubble = document.getElementById(thinkingId);
      if (thinkingBubble) {
        thinkingBubble.remove();
      }
    }
    
    // Replace processing message with actual response
    const processingMsg = document.getElementById(processingId);
    if (processingMsg) {
      let responseContent = data.response || 'No response received';
      
      // Add debug information if available and debug mode is enabled
      if (data.debug_info && debugMode) {
        responseContent = addDebugInfoToResponse(responseContent, data.debug_info);
      }
      
      processingMsg.querySelector('.message-content').innerHTML = responseContent;
    }
    
  } catch (error) {
    // Remove thinking bubble if it exists
    if (thinkingId) {
      const thinkingBubble = document.getElementById(thinkingId);
      if (thinkingBubble) {
        thinkingBubble.remove();
      }
    }
    
    // Replace processing message with error
    const processingMsg = document.getElementById(processingId);
    if (processingMsg) {
      processingMsg.querySelector('.message-content').textContent = `Error: ${error.message}`;
      processingMsg.querySelector('.message-content').style.color = 'var(--danger-color)';
    }
    console.error('Chat error:', error);
  } finally {
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// Add message to chat function
function addMessageToChat(sender, content, isTemporary = false) {
  const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const messageDiv = document.createElement('div');
  messageDiv.id = messageId;
  messageDiv.className = `message message-${sender}`;
  
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
      <div class="thinking-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  
  chatMessages.appendChild(thinkingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return messageId;
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
