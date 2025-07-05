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
  } catch (error) {
    console.error('Error loading models:', error);
    remoteSel.innerHTML = `<option>-- Error: ${error.message} --</option>`;
    localSel.innerHTML = `<option>-- Error: ${error.message} --</option>`;
    remoteSel.disabled = false;
    localSel.disabled = false;
  }
}

// Pull a remote model with progress tracking
async function pullRemoteModel() {
  const name = document.getElementById('remote-select').value;
  const pullMsg = document.getElementById('pull-msg');
  const btn = document.getElementById('pull-btn');
  
  if (!name) {
    pullMsg.innerText = 'Please select a model to pull';
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
  }
}

// Pull model with streaming progress
async function pullModelWithProgress(name, pullMsg) {
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
    </div>
  `;
  
  const response = await fetch('/models/pull/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
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
    
    if (!res.ok) throw new Error(await res.text());
    
    runMsg.innerText = `Using ${name}`;
    await window.checkStatus(); 
    await loadModels();
  } catch (e) {
    runMsg.innerText = `Error: ${e.message}`;
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
  
  // Initialize tooltip system
  initializeModelTooltips();
  
  // Initial load
  loadModels();
}
