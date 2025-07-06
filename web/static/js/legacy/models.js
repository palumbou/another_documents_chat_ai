// Models management functionality

// Helper function to group models by family
function groupModelsByFamily(models) {
  const families = {};
  
  models.forEach(model => {
    const baseName = model.split(':')[0];
    if (!families[baseName]) {
      families[baseName] = [];
    }
    families[baseName].push(model);
  });
  
  return families;
}

// Helper function to create options for models (different logic for remote vs local)
function createModelOptions(models, isRemote = false) {
  if (!models || models.length === 0) {
    return '<option value="">-- None Available --</option>';
  }
  
  // If models are objects with memory info
  if (typeof models[0] === 'object' && models[0].name) {
    // For remote models, group by family (as before)
    if (isRemote) {
      const families = {};
      
      models.forEach(model => {
        const baseName = model.name.split(':')[0];
        if (!families[baseName]) {
          families[baseName] = [];
        }
        families[baseName].push(model);
      });
      
      let html = '';
      Object.keys(families).sort().forEach(family => {
        // Always create optgroup, even for single models
        const representativeModel = families[family][0];
        let familyTooltip = '';
        if (representativeModel.description) {
          familyTooltip += `Description: ${representativeModel.description}`;
        }
        if (representativeModel.updated) {
          if (familyTooltip) familyTooltip += '\n';
          familyTooltip += `Last updated: ${representativeModel.updated}`;
        }
        
        html += `<optgroup label="${family}" data-family-tooltip="${familyTooltip.replace(/"/g, '&quot;')}">`;
        families[family].sort((a, b) => a.estimated_ram_gb - b.estimated_ram_gb).forEach(model => {
          const memoryInfo = `${model.estimated_ram_gb}GB RAM required`;
          const sizeInfo = model.size ? ` - Model size: ${model.size}` : '';
          const categoryInfo = model.category ? ` - ${model.category}` : '';
          const pullsInfo = model.pulls ? ` - ${model.pulls} downloads` : '';
          const variantTooltip = `${memoryInfo}${sizeInfo}${categoryInfo}${pullsInfo}`;
          
          const displaySize = model.size ? ` (${model.size})` : '';
          html += `<option value="${model.name}" data-tooltip="${variantTooltip.replace(/"/g, '&quot;')}">${model.name}${displaySize} - ${model.estimated_ram_gb}GB</option>`;
        });
        html += '</optgroup>';
      });
      
      return html;
    } else {
      // For local models, simple list
      return models.map(model => {
        const memoryInfo = `${model.estimated_ram_gb}GB RAM required`;
        const sizeInfo = model.size ? ` - Model size: ${model.size}` : '';
        const categoryInfo = model.category ? ` - ${model.category}` : '';
        const pullsInfo = model.pulls ? ` - ${model.pulls} downloads` : '';
        const tooltip = `${memoryInfo}${sizeInfo}${categoryInfo}${pullsInfo}`;
        
        const displaySize = model.size ? ` (${model.size})` : '';
        return `<option value="${model.name}" title="${tooltip.replace(/"/g, '&quot;')}">${model.name}${displaySize} - ${model.estimated_ram_gb}GB</option>`;
      }).join('');
    }
  } else {
    // Fallback for simple string arrays
    return models.map(m => `<option value="${m}">${m}</option>`).join('');
  }
}

// Load remote & local models
async function loadModels() {
  const remoteSel = document.getElementById('remote-select');
  const localSel = document.getElementById('local-select');
  document.getElementById('pull-msg').innerText = '';
  document.getElementById('run-msg').innerText = '';
  
  try {
    const res = await fetch('/models');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    const {remote, local, remote_error} = data;
    
    // Remote models with error handling
    if (remote_error) {
      // Create a styled error message option
      remoteSel.innerHTML = `<option disabled style="color: #e74c3c; font-style: italic;">${remote_error}</option>`;
      console.error('Remote models error:', remote_error);
    } else if (remote && remote.length > 0) {
      remoteSel.innerHTML = createModelOptions(remote, true); // true for remote/grouping
    } else {
      remoteSel.innerHTML = '<option value="">-- None Available --</option>';
    }
    
    // Local models without grouping
    localSel.innerHTML = createModelOptions(local, false); // false for local/simple
    
    // Always enable so user sees the state
    remoteSel.disabled = false;
    localSel.disabled = false;

    // Preselect current engine in local-select
    const engineInfoText = document.getElementById('engine-info').innerText;
    const match = engineInfoText.match(/\(Engine: ([^\s]+)/); // Match engine name before any status icons
    if (match) {
      const engineName = match[1];
      // Check if we have model objects or simple strings
      if (local && local.length > 0 && typeof local[0] === 'object') {
        const localNames = local.map(m => m.name);
        if (localNames.includes(engineName)) {
          localSel.value = engineName;
        }
      } else if (local && local.includes(engineName)) {
        localSel.value = engineName;
      }
    }
    
    // Update button states after loading models
    updateModelButtons();
  } catch (error) {
    console.error('Error loading models:', error);
    remoteSel.innerHTML = `<option>-- Error: ${error.message} --</option>`;
    localSel.innerHTML = `<option>-- Error: ${error.message} --</option>`;
    remoteSel.disabled = false;
    localSel.disabled = false;
    updateModelButtons();
  }
}

// Global variable to track current download
let currentDownload = null;

// Pull a remote model with progress tracking
async function pullRemoteModel() {
  const name = document.getElementById('remote-select').value;
  const pullMsg = document.getElementById('pull-msg');
  const btn = document.getElementById('pull-btn');
  
  if (!name) {
    pullMsg.innerText = 'Please select a model to pull';
    return;
  }
  
  // Check if there's already a download in progress
  if (currentDownload) {
    pullMsg.innerHTML = '<span class="warning">⚠️ A download is already in progress</span>';
    return;
  }
  
  btn.disabled = true;
  
  // Try to use the streaming endpoint first
  try {
    await pullModelWithProgress(name, pullMsg);
  } catch (streamError) {
    console.warn('Streaming failed, falling back to standard method:', streamError);
    // Fallback to standard pulling
    try {
      await pullModelStandard(name, pullMsg);
    } catch (standardError) {
      pullMsg.innerHTML = `<span class="error">❌ Error: ${standardError.message}</span>`;
      setTimeout(() => {
        pullMsg.innerHTML = '';
      }, 10000);
    }
  } finally {
    btn.disabled = false;
    currentDownload = null;
  }
}

// Cancel current model download
async function cancelModelDownload() {
  if (!currentDownload) {
    return;
  }
  
  const { name, controller } = currentDownload;
  const pullMsg = document.getElementById('pull-msg');
  
  try {
    // Cancel the fetch request
    controller.abort();
    
    // Call backend to clean up partial files
    const response = await fetch('/models/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (response.ok) {
      const result = await response.json();
      pullMsg.innerHTML = `<span class="warning">⚠️ Download cancelled: ${result.message}</span>`;
    } else {
      pullMsg.innerHTML = `<span class="warning">⚠️ Download cancelled (cleanup may be incomplete)</span>`;
    }
  } catch (error) {
    console.error('Error cancelling download:', error);
    pullMsg.innerHTML = `<span class="warning">⚠️ Download cancelled</span>`;
  }
  
  // Clean up
  currentDownload = null;
  document.getElementById('pull-btn').disabled = false;
  
  // Clear message after 5 seconds
  setTimeout(() => {
    pullMsg.innerHTML = '';
  }, 5000);
}

// Pull model with streaming progress
async function pullModelWithProgress(name, pullMsg) {
  // Create abort controller for cancellation
  const controller = new AbortController();
  currentDownload = { name, controller };
  
  try {
    pullMsg.innerHTML = `
      <div class="pull-progress">
        <div class="progress-info">Initializing pull for ${name}...</div>
        <div class="progress-bar-container">
          <div class="progress-bar-bg">
            <div id="pull-progress-bar" class="progress-bar-fill" style="width: 0%"></div>
          </div>
          <div id="pull-progress-text" class="progress-text">0%</div>
        </div>
        <div id="pull-status-text" class="status-text">Starting download...</div>
        <button id="cancel-download-btn" class="btn-cancel" onclick="cancelModelDownload()">
          ✕ Cancel Download
        </button>
      </div>
    `;
    
    const response = await fetch('/models/pull/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      signal: controller.signal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
    
    // Accumula i dati nel buffer
    buffer += decoder.decode(value, { stream: true });
    
    // Processa le linee complete
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Mantieni l'ultima linea incompleta nel buffer
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonData = line.slice(6).trim();
        
        // Skip empty lines
        if (!jsonData) {
          continue;
        }
        
        try {
          const data = JSON.parse(jsonData);
          updatePullProgress(data);
          
          if (data.completed) {
            if (data.status === 'error') {
              throw new Error(data.error);
            } else if (data.status === 'cancelled') {
              // Download was cancelled
              pullMsg.innerHTML = `<span class="warning">⚠️ Download cancelled for ${name}</span>`;
              setTimeout(() => {
                pullMsg.innerHTML = '';
              }, 5000);
              return;
            } else {
              // Success - refresh models and status
              await loadModels();
              await window.checkStatus();
              pullMsg.innerHTML = `<span class="success">✅ Successfully pulled ${name}</span>`;
              setTimeout(() => {
                pullMsg.innerHTML = '';
              }, 5000);
            }
            return; // Exit function on completion
          }
        } catch (parseError) {
          // Solo logga se non è una linea vuota o troppo corta per essere JSON valido
          if (jsonData.length > 10 && jsonData.includes('{')) {
            console.warn('Failed to parse progress data:', parseError);
            console.warn('Problematic data:', jsonData.substring(0, 100) + '...');
          }
        }
      }
    }
  }
  
  // Process any remaining data in buffer
  if (buffer.trim()) {
    if (buffer.startsWith('data: ')) {
      const jsonData = buffer.slice(6).trim();
      if (jsonData) {
        try {
          const data = JSON.parse(jsonData);
          updatePullProgress(data);
        } catch (parseError) {
          if (jsonData.length > 10 && jsonData.includes('{')) {
            console.warn('Failed to parse final buffer data:', parseError);
          }
        }
      }
    }
  }
  
  } catch (error) {
    if (error.name === 'AbortError') {
      // Request was aborted, don't show error (cancellation already handled)
      return;
    } else {
      // Other errors
      throw error;
    }
  }
}

// Fallback to standard pulling method
async function pullModelStandard(name, pullMsg) {
  pullMsg.innerText = `Pulling ${name}...`;
  
  const res = await fetch('/models/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `HTTP ${res.status}`);
  }
  
  pullMsg.innerHTML = `<span class="success">✅ Successfully pulled ${name}</span>`;
  await loadModels(); 
  await window.checkStatus();
  
  setTimeout(() => {
    pullMsg.innerHTML = '';
  }, 5000);
}

// Update pull progress display
function updatePullProgress(data) {
  const progressBar = document.getElementById('pull-progress-bar');
  const progressText = document.getElementById('pull-progress-text');
  const statusText = document.getElementById('pull-status-text');
  
  if (progressBar) {
    const percentage = data.progress_percent || 0;
    progressBar.style.width = `${percentage}%`;
    
    // Stop animation when complete
    if (percentage >= 100) {
      progressBar.style.animation = 'none';
    }
  }
  
  if (progressText) {
    let text = `${data.progress_percent || 0}%`;
    if (data.downloaded && data.total && data.progress_percent > 0) {
      text += ` (${data.downloaded}/${data.total})`;
    }
    progressText.textContent = text;
  }
  
  if (statusText) {
    let status = data.status || 'Processing...';
    
    // Provide more user-friendly status messages
    switch (status.toLowerCase()) {
      case 'pulling manifest':
        status = '📋 Downloading manifest...';
        break;
      case 'pulling fs layer':
      case 'downloading':
        status = '⬇️ Downloading model data...';
        break;
      case 'verifying checksum':
        status = '🔍 Verifying download...';
        break;
      case 'writing manifest':
        status = '📝 Installing model...';
        break;
      case 'success':
        status = '✅ Download complete!';
        break;
      default:
        // Add download icon for generic status
        if (status && !status.startsWith('📋') && !status.startsWith('⬇️') && !status.startsWith('🔍') && !status.startsWith('📝') && !status.startsWith('✅')) {
          status = `⏳ ${status}`;
        }
    }
    
    statusText.textContent = status;
    
    // Stop animation when complete
    if (data.completed) {
      statusText.style.animation = 'none';
    }
  }
}

// Run a local model
async function runLocalModel() {
  const name = document.getElementById('local-select').value;
  const runMsg = document.getElementById('run-msg');
  const btn = document.getElementById('run-btn');
  
  btn.disabled = true; 
  
  // Check if there's already an active model
  let currentModel = null;
  try {
    const statusRes = await fetch('/status');
    if (statusRes.ok) {
      const status = await statusRes.json();
      currentModel = status.active_model;
    }
  } catch (e) {
    console.log('Could not check current model status');
  }
  
  // Set appropriate message based on whether we're switching or activating
  if (currentModel && currentModel !== 'None' && currentModel !== '') {
    runMsg.innerText = 'Switching model…';
  } else {
    runMsg.innerText = 'Activating model…';
  }
  
  try {
    const res = await fetch('/models/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        throw new Error(errorText);
      }
      
      // Handle detailed error information
      if (errorData.detail && typeof errorData.detail === 'object') {
        const error = errorData.detail;
        let message = `❌ ${error.error || 'Model verification failed'}`;
        
        // Add suggestions if available
        if (error.suggestions && error.suggestions.length > 0) {
          message += '\n\nSuggestions:\n• ' + error.suggestions.join('\n• ');
        }
        
        // Show detailed error in console for debugging
        console.error('Model verification failed:', error);
        
        throw new Error(message);
      } else {
        throw new Error(errorData.detail || errorText);
      }
    }
    
    runMsg.innerText = `✅ Using ${name}`;
    await window.checkStatus(); 
    await loadModels();
  } catch (e) {
    // Enhanced error display
    const errorMessage = e.message;
    if (errorMessage.includes('\n\nSuggestions:')) {
      // Multi-line error with suggestions
      const [mainError, suggestions] = errorMessage.split('\n\nSuggestions:');
      runMsg.innerHTML = `
        <div style="color: #e74c3c; font-weight: bold;">${mainError}</div>
        <div style="color: #f39c12; font-size: 0.9em; margin-top: 8px; line-height: 1.4;">
          <strong>Suggestions:</strong><br>
          ${suggestions.replace(/\n• /g, '<br>• ')}
        </div>
      `;
    } else {
      runMsg.innerHTML = `<span style="color: #e74c3c;">❌ Error: ${errorMessage}</span>`;
    }
    
    // Try to extract error type from error message or response
    let errorType = 'unknown';
    if (errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
      errorType = 'timeout';
    } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      errorType = 'model_not_found';
    } else if (errorMessage.includes('empty response')) {
      errorType = 'empty_response';
    } else if (errorMessage.includes('server error') || errorMessage.includes('500')) {
      errorType = 'server_error';
    }
    
    // Show recovery options
    setTimeout(() => showModelRecoveryOptions(name, errorType), 1000);
  } finally {
    btn.disabled = false;
  }
}

// Tooltip system for model selects - simplified
function initializeModelTooltips() {
  const remoteSelect = document.getElementById('remote-select');
  const localSelect = document.getElementById('local-select');
  
  // Use native browser tooltips with title attribute
  // The tooltip content is already set in the title attribute by createModelOptions
  if (remoteSelect) {
    // Additional visual cues on hover
    remoteSelect.addEventListener('mouseenter', () => {
      remoteSelect.style.backgroundColor = 'rgba(88, 101, 242, 0.1)';
    });
    remoteSelect.addEventListener('mouseleave', () => {
      remoteSelect.style.backgroundColor = '';
    });
  }
  if (localSelect) {
    localSelect.addEventListener('mouseenter', () => {
      localSelect.style.backgroundColor = 'rgba(88, 101, 242, 0.1)';
    });
    localSelect.addEventListener('mouseleave', () => {
      localSelect.style.backgroundColor = '';
    });
  }
}

// Initialize models functionality
function initializeModels() {
  // Pull model button
  document.getElementById('pull-btn').addEventListener('click', pullRemoteModel);
  
  // Run model button  
  document.getElementById('run-btn').addEventListener('click', runLocalModel);
  
  // Delete model button
  document.getElementById('delete-model-btn').addEventListener('click', deleteLocalModel);
  
  // Local select change handler
  document.getElementById('local-select').addEventListener('change', updateModelButtons);
  
  // Initialize tooltip system
  initializeModelTooltips();
  
  // Initialize button states
  updateModelButtons();
  
  // Initial load
  loadModels();
}

// Function to show model recovery options
function showModelRecoveryOptions(modelName, errorType) {
  const recoveryContainer = document.getElementById('model-recovery-options');
  if (!recoveryContainer) {
    // Create recovery options container if it doesn't exist
    const container = document.createElement('div');
    container.id = 'model-recovery-options';
    container.className = 'recovery-options';
    container.style.cssText = `
      margin-top: 15px;
      padding: 15px;
      background-color: var(--background-secondary, #f8f9fa);
      border-radius: 8px;
      border-left: 4px solid var(--accent-color, #5865f2);
      display: none;
    `;
    
    const modelsSection = document.querySelector('.models-section') || document.querySelector('.models-card');
    if (modelsSection) {
      modelsSection.appendChild(container);
    }
  }
  
  const container = document.getElementById('model-recovery-options');
  if (!container) return;
  
  let recoveryHtml = `
    <h4 style="margin: 0 0 10px 0; color: var(--text-primary, #333);">
      🔧 Recovery Options for "${modelName}"
    </h4>
  `;
  
  if (errorType === 'timeout' || errorType === 'empty_response') {
    recoveryHtml += `
      <p style="margin: 0 0 10px 0; color: var(--text-secondary, #666);">
        The model may still be loading or may be too large for your system.
      </p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button onclick="waitAndRetry('${modelName}')" class="btn btn-secondary btn-sm">
          ⏳ Wait & Retry (60s)
        </button>
        <button onclick="tryDifferentModel()" class="btn btn-secondary btn-sm">
          🔄 Try Different Model
        </button>
        <button onclick="checkSystemMemory()" class="btn btn-secondary btn-sm">
          💾 Check System Memory
        </button>
      </div>
    `;
  } else if (errorType === 'model_not_found' || errorType === 'server_error') {
    recoveryHtml += `
      <p style="margin: 0 0 10px 0; color: var(--text-secondary, #666);">
        The model files may be corrupted or missing.
      </p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button onclick="redownloadModel('${modelName}')" class="btn btn-secondary btn-sm">
          🔄 Re-download Model
        </button>
        <button onclick="refreshModelsList()" class="btn btn-secondary btn-sm">
          🔃 Refresh Models List
        </button>
        <button onclick="tryDifferentModel()" class="btn btn-secondary btn-sm">
          🔄 Try Different Model
        </button>
      </div>
    `;
  } else {
    recoveryHtml += `
      <p style="margin: 0 0 10px 0; color: var(--text-secondary, #666);">
        General troubleshooting options:
      </p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button onclick="refreshModelsList()" class="btn btn-secondary btn-sm">
          🔃 Refresh Models
        </button>
        <button onclick="checkOllamaStatus()" class="btn btn-secondary btn-sm">
          🔍 Check Ollama Status
        </button>
        <button onclick="tryDifferentModel()" class="btn btn-secondary btn-sm">
          🔄 Try Different Model
        </button>
      </div>
    `;
  }
  
  recoveryHtml += `
    <button onclick="hideRecoveryOptions()" style="float: right; margin-top: 10px; background: none; border: none; color: var(--text-secondary, #666); cursor: pointer;">
      ✕ Close
    </button>
  `;
  
  container.innerHTML = recoveryHtml;
  container.style.display = 'block';
}

// Recovery action functions
async function waitAndRetry(modelName) {
  const btn = document.querySelector(`button[onclick="waitAndRetry('${modelName}')"]`);
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Waiting...';
    
    // Wait 60 seconds
    for (let i = 60; i > 0; i--) {
      btn.innerText = `Waiting... ${i}s`;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    btn.innerText = 'Retrying...';
    await runModel(modelName);
    hideRecoveryOptions();
  }
}

async function redownloadModel(modelName) {
  if (confirm(`This will remove and re-download the model "${modelName}". Continue?`)) {
    hideRecoveryOptions();
    // First try to remove the model
    try {
      await fetch('/models/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });
    } catch (e) {
      console.log('Could not delete model, proceeding with re-download');
    }
    
    // Then re-download it
    await pullModel(modelName);
  }
}

async function tryDifferentModel() {
  hideRecoveryOptions();
  const localSelect = document.getElementById('local-select');
  if (localSelect && localSelect.options.length > 1) {
    // Focus on the local select to help user choose
    localSelect.focus();
    localSelect.style.backgroundColor = 'rgba(88, 101, 242, 0.2)';
    setTimeout(() => {
      localSelect.style.backgroundColor = '';
    }, 2000);
  }
}

async function checkSystemMemory() {
  try {
    const res = await fetch('/models');
    const data = await res.json();
    if (data.system_memory) {
      const { total_gb, available_gb, used_percent } = data.system_memory;
      alert(`System Memory:\nTotal: ${total_gb.toFixed(1)} GB\nAvailable: ${available_gb.toFixed(1)} GB\nUsed: ${used_percent.toFixed(1)}%\n\nTip: Models typically need 1-2x their size in RAM to run smoothly.`);
    }
  } catch (e) {
    alert('Could not retrieve system memory information.');
  }
}

async function refreshModelsList() {
  hideRecoveryOptions();
  await loadModels();
}

async function checkOllamaStatus() {
  await window.checkStatus();
  const statusEl = document.getElementById('conn-status');
  if (statusEl) {
    statusEl.style.backgroundColor = 'rgba(88, 101, 242, 0.2)';
    setTimeout(() => {
      statusEl.style.backgroundColor = '';
    }, 2000);
  }
}

function hideRecoveryOptions() {
  const container = document.getElementById('model-recovery-options');
  if (container) {
    container.style.display = 'none';
  }
}

// Delete model functionality
async function deleteLocalModel() {
  const select = document.getElementById('local-select');
  const deleteBtn = document.getElementById('delete-model-btn');
  const runMsg = document.getElementById('run-msg');
  
  const modelName = select.value;
  if (!modelName) {
    runMsg.innerHTML = '<span style="color: #e74c3c;">❌ Please select a model to delete</span>';
    return;
  }
  
  // Confirm deletion
  const confirmed = confirm(
    `Are you sure you want to delete the model "${modelName}"?\n\n` +
    `This action cannot be undone and you'll need to re-download the model if you want to use it again.`
  );
  
  if (!confirmed) return;
  
  deleteBtn.disabled = true;
  runMsg.innerText = `Deleting ${modelName}...`;
  
  try {
    const res = await fetch(`/models/${encodeURIComponent(modelName)}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText);
    }
    
    const result = await res.json();
    
    if (result.was_active) {
      runMsg.innerHTML = `<span style="color: #27ae60;">✅ Model ${modelName} deleted and deactivated</span>`;
    } else {
      runMsg.innerHTML = `<span style="color: #27ae60;">✅ Model ${modelName} deleted successfully</span>`;
    }
    
    // Refresh the models list and status
    await loadModels();
    await window.checkStatus();
    
    // Clear selection
    select.value = '';
    
  } catch (error) {
    console.error('Error deleting model:', error);
    let errorMessage = error.message;
    try {
      const errorData = JSON.parse(errorMessage);
      errorMessage = errorData.detail || errorMessage;
    } catch {}
    
    runMsg.innerHTML = `<span style="color: #e74c3c;">❌ Error deleting model: ${errorMessage}</span>`;
  } finally {
    deleteBtn.disabled = false;
  }
}

// Update model selection change handler
function updateModelButtons() {
  const select = document.getElementById('local-select');
  const deleteBtn = document.getElementById('delete-model-btn');
  const runBtn = document.getElementById('run-btn');
  
  const hasSelection = select.value && select.value !== '';
  deleteBtn.disabled = !hasSelection;
  runBtn.disabled = !hasSelection;
}
