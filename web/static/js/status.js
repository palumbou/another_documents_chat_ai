/**
 * Status Management Module
 * Handles Ollama connection status and engine availability
 */

// Check Ollama status and engine availability
async function checkStatus() {
  try {
    const res = await fetch('/status');
    const data = await res.json();
    const {connected, engine, local_models} = data;
    
    const connElement = document.getElementById('conn-status');
    if (connElement) {
      connElement.innerText = connected ? '🟢 Ollama online' : '🔴 Ollama offline';
    }
    
    // Handle engine object properly
    let engineText = '';
    let engineOnline = false;
    if (connected && engine && engine.name) {
      let status = '';
      if (engine.verified) {
        status = '✅';
        engineOnline = true;
      } else if (engine.available) {
        status = '⏳';
        engineOnline = true;
      } else {
        status = '❌';
        engineOnline = false;
      }
      engineText = `(Engine: ${engine.name} ${status})`;
    }
    
    const engineElement = document.getElementById('engine-info');
    if (engineElement) {
      engineElement.innerText = engineText;
    }
    
    // Enable/disable chat based on engine status and available models
    const hasModels = local_models && local_models.length > 0;
    updateChatAvailability(connected && engineOnline && hasModels);
    
  } catch (error) {
    const connElement = document.getElementById('conn-status');
    if (connElement) {
      connElement.innerText = '🔴 Error';
    }
    updateChatAvailability(false);
  }
}

// Function to enable/disable chat based on engine availability
function updateChatAvailability(isAvailable) {
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const debugToggle = document.getElementById('debug-mode');
  
  if (isAvailable) {
    chatInput.disabled = false;
    sendBtn.disabled = false;
    debugToggle.disabled = false;
    chatInput.placeholder = "Ask a question about your documents... (Enter to send, Shift+Enter for new line)";
    chatInput.style.opacity = "1";
    sendBtn.style.opacity = "1";
    sendBtn.style.cursor = "pointer";
  } else {
    chatInput.disabled = true;
    sendBtn.disabled = true;
    debugToggle.disabled = true;
    chatInput.placeholder = "⚠️ Chat disabled: No AI engine online. Please check Ollama connection and load a model.";
    chatInput.style.opacity = "0.6";
    sendBtn.style.opacity = "0.6";
    sendBtn.style.cursor = "not-allowed";
  }
}

// Check system memory
async function checkMemory() {
  try {
    const res = await fetch('/system/memory');
    const memory = await res.json();
    const memoryText = `💾 RAM: ${memory.used_gb}/${memory.total_gb}GB (${memory.percent_used.toFixed(1)}%)`;
    document.getElementById('memory-info').innerText = memoryText;
  } catch {
    document.getElementById('memory-info').innerText = '💾 Memory: Error';
  }
}

// Initialize status monitoring
function initializeStatusMonitoring() {
  checkStatus();
  checkMemory();
  setInterval(checkStatus, 15000);
  setInterval(checkMemory, 30000);
}
