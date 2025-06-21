// Documents management functionality

// Global variables
window.currentProject = 'global';
window.autoRefreshInterval = null;

// Load and display existing documents with processing status
async function loadExistingDocuments() {
  try {
    const res = await fetch('/documents');
    const data = await res.json();
    const docsList = document.getElementById('docs-list');
    
    if (data.documents && data.documents.length > 0) {
      let html = '';
      
      // Filter documents by current project
      const filteredDocs = data.documents.filter(doc => {
        if (window.currentProject === 'global') {
          // Show global documents (no slash in filename)
          return !doc.includes('/');
        } else {
          // Show documents belonging to current project
          return doc.startsWith(window.currentProject + '/');
        }
      });
      
      if (filteredDocs.length === 0) {
        docsList.innerHTML = '<em>No documents in this project</em>';
        return;
      }
      
      filteredDocs.forEach(doc => {
        const info = data.document_info[doc] || {};
        const status = info.processing_status || 'completed';
        const progress = info.processing_progress || 100;
        const isProcessed = info.is_processed || false;
        const chunks = info.total_chunks || 0;
        const chars = info.total_chars || 0;
        const error = info.error;
        
        // Display name without project prefix
        const displayName = window.currentProject === 'global' ? doc : doc.substring(window.currentProject.length + 1);
        
        // Status icon and text
        let statusIcon = '';
        let statusText = '';
        let statusClass = '';
        
        switch (status) {
          case 'pending':
            statusIcon = '⏳';
            statusText = 'Waiting to process...';
            statusClass = 'status-pending';
            break;
          case 'processing':
            statusIcon = '🔄';
            statusText = `Processing... ${progress}%`;
            statusClass = 'status-processing';
            break;
          case 'completed':
            statusIcon = '✅';
            statusText = isProcessed ? `${chunks} chunks, ${(chars/1000).toFixed(1)}k chars` : 'Uploaded';
            statusClass = 'status-completed';
            break;
          case 'error':
            statusIcon = '❌';
            statusText = `Error: ${error || 'Processing failed'}`;
            statusClass = 'status-error';
            break;
        }
        
        html += `
          <div class="doc-item ${statusClass}">
            <div class="doc-header">
              <span class="doc-name" title="${displayName}">${displayName.length > 25 ? displayName.substring(0, 25) + '...' : displayName}</span>
              <span class="status-icon">${statusIcon}</span>
            </div>
            <div class="doc-info">
              <span class="status-text">${statusText}</span>
              ${status === 'processing' ? `<div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>` : ''}
            </div>
            <div class="doc-actions">
              ${isProcessed ? `<button class="btn-xs" onclick="viewDocumentChunks('${doc}')" title="View Chunks">📊</button>` : ''}
              <button class="btn-xs delete" onclick="deleteDocument('${doc}')" title="Delete">🗑️</button>
              ${status === 'error' ? `<button class="btn-xs retry" onclick="retryProcessing('${doc}')" title="Retry">🔄</button>` : ''}
            </div>
          </div>`;
      });
      
      // Summary with processing info for current project
      const summary = data.processing_summary || {};
      const totalChunksInProject = filteredDocs.reduce((sum, doc) => {
        const info = data.document_info[doc] || {};
        return sum + (info.total_chunks || 0);
      }, 0);
      
      let summaryText = `${filteredDocs.length} documents, ${totalChunksInProject} chunks`;
      const pendingInProject = filteredDocs.filter(doc => data.document_info[doc]?.processing_status === 'pending').length;
      const processingInProject = filteredDocs.filter(doc => data.document_info[doc]?.processing_status === 'processing').length;
      
      if (processingInProject > 0 || pendingInProject > 0) {
        summaryText += ` (${pendingInProject} pending, ${processingInProject} processing)`;
      }
      
      html += `<div class="doc-summary">${summaryText}</div>`;
      docsList.innerHTML = html;
    } else {
      docsList.innerHTML = '<em>No documents uploaded yet</em>';
    }
  } catch (error) {
    document.getElementById('docs-list').innerHTML = '<em>Error loading documents</em>';
    console.error('Error loading documents:', error);
  }
}

// View chunks for a specific document
async function viewDocumentChunks(filename) {
  try {
    const res = await fetch(`/documents/${encodeURIComponent(filename)}/chunks`);
    const data = await res.json();
    
    let html = `
      <div class="chunks-header">
        <h4>Chunks for "${filename}"</h4>
        <div class="chunks-header-actions">
          <button class="btn-secondary" onclick="copyAllChunks('${filename}', ${JSON.stringify(data.chunks)})" title="Copy all chunks">📋 Copy All</button>
        </div>
      </div>`;
    html += `<p>Total chunks: ${data.total_chunks}</p>`;
    html += `
      <div class="chunk-search">
        <input type="text" id="chunk-search-input" placeholder="Search in chunks..." class="search-input">
        <button onclick="clearChunkSearch()" class="btn-xs">Clear</button>
        <div class="search-navigation" style="display: none;">
          <button onclick="navigateSearchResults(-1)" class="btn-xs" title="Previous result">↑</button>
          <span id="search-results-info"></span>
          <button onclick="navigateSearchResults(1)" class="btn-xs" title="Next result">↓</button>
        </div>
      </div>`;
    
    data.chunks.forEach((chunk, index) => {
      const isExpanded = chunk.preview === chunk.full_content; // Check if content is already fully shown
      html += `
        <div class="chunk-item">
          <div class="chunk-header">
            <strong>Chunk ${chunk.chunk_index}/${data.total_chunks}</strong>
            <div class="chunk-actions">
              <span class="chunk-size">(${chunk.char_count} characters)</span>
              <button class="btn-xs copy-chunk" onclick="copyChunkContent(this, ${index})" data-chunk-index="${index}" title="Copy chunk content">📋</button>
              ${!isExpanded ? `<button class="btn-xs expand-chunk" onclick="toggleChunkContent(this, ${index})" data-chunk-index="${index}" title="Show full content">📖 Expand</button>` : ''}
            </div>
          </div>
          <div class="chunk-preview" data-preview="${chunk.preview.replace(/"/g, '&quot;')}" data-full="${chunk.full_content ? chunk.full_content.replace(/"/g, '&quot;') : ''}">${chunk.preview}</div>
        </div>`;
    });
    
    // Create modal or update a section to show chunks
    const modal = document.createElement('div');
    modal.className = 'chunks-modal';
    modal.innerHTML = `
      <div class="chunks-modal-content">
        <span class="chunks-modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
        ${html}
      </div>`;
    
    // Add ESC key listener to close modal
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscKey);
      }
    };
    document.addEventListener('keydown', handleEscKey);
    
    // Add click outside to close modal
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.remove();
        document.removeEventListener('keydown', handleEscKey);
      }
    });
    
    document.body.appendChild(modal);
    
    // Add search functionality
    const searchInput = document.getElementById('chunk-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const chunkItems = modal.querySelectorAll('.chunk-item');
        
        chunkItems.forEach(item => {
          const chunkPreview = item.querySelector('.chunk-preview');
          const content = chunkPreview.textContent.toLowerCase();
          const chunkHeader = item.querySelector('.chunk-header strong').textContent.toLowerCase();
          
          // Reset highlight
          const originalContent = chunkPreview.getAttribute('data-original') || chunkPreview.innerHTML;
          if (!chunkPreview.getAttribute('data-original')) {
            chunkPreview.setAttribute('data-original', chunkPreview.innerHTML);
          }
          
          if (content.includes(searchTerm) || chunkHeader.includes(searchTerm) || searchTerm === '') {
            item.style.display = 'block';
            
            // Highlight search term
            if (searchTerm && searchTerm.length > 0) {
              const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
              const highlightedContent = originalContent.replace(regex, '<mark class="search-highlight">$1</mark>');
              chunkPreview.innerHTML = highlightedContent;
            } else {
              chunkPreview.innerHTML = originalContent;
            }
          } else {
            item.style.display = 'none';
          }
        });
      });
    }
    
  } catch (error) {
    alert(`Error loading chunks: ${error.message}`);
  }
}

// Toggle chunk content between preview and full content
function toggleChunkContent(button, chunkIndex) {
  const chunkPreview = button.parentElement.parentElement.nextElementSibling;
  const previewText = chunkPreview.getAttribute('data-preview');
  const fullText = chunkPreview.getAttribute('data-full');
  
  if (button.textContent.includes('Expand')) {
    // Show full content
    chunkPreview.innerHTML = fullText || previewText;
    button.innerHTML = '📄 Collapse';
    button.title = 'Show preview only';
  } else {
    // Show preview
    chunkPreview.innerHTML = previewText;
    button.innerHTML = '📖 Expand';
    button.title = 'Show full content';
  }
}

// Clear chunk search
function clearChunkSearch() {
  const searchInput = document.getElementById('chunk-search-input');
  const modal = document.querySelector('.chunks-modal');
  
  if (searchInput) {
    searchInput.value = '';
    
    // Show all chunks and remove highlights
    if (modal) {
      const chunkItems = modal.querySelectorAll('.chunk-item');
      chunkItems.forEach(item => {
        item.style.display = 'block';
        
        // Remove highlights
        const chunkPreview = item.querySelector('.chunk-preview');
        const originalContent = chunkPreview.getAttribute('data-original');
        if (originalContent) {
          chunkPreview.innerHTML = originalContent;
        }
      });
      
      // Hide search navigation
      const searchNav = modal.querySelector('.search-navigation');
      if (searchNav) {
        searchNav.style.display = 'none';
      }
    }
  }
}

// Copy chunk content to clipboard
function copyChunkContent(button, chunkIndex) {
  const chunkPreview = button.closest('.chunk-item').querySelector('.chunk-preview');
  const content = chunkPreview.textContent || chunkPreview.innerText;
  
  navigator.clipboard.writeText(content).then(() => {
    const originalText = button.innerHTML;
    button.innerHTML = '✅';
    button.title = 'Copied!';
    setTimeout(() => {
      button.innerHTML = originalText;
      button.title = 'Copy chunk content';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
    // Fallback for browsers that don't support clipboard API
    const textArea = document.createElement('textarea');
    textArea.value = content;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      const originalText = button.innerHTML;
      button.innerHTML = '✅';
      button.title = 'Copied!';
      setTimeout(() => {
        button.innerHTML = originalText;
        button.title = 'Copy chunk content';
      }, 2000);
    } catch (err) {
      alert('Copy failed. Please manually select and copy the text.');
    }
    document.body.removeChild(textArea);
  });
}

// Copy all chunks content to clipboard
function copyAllChunks(filename, chunks) {
  const allContent = chunks.map((chunk, index) => 
    `=== Chunk ${chunk.chunk_index}/${chunks.length} ===\n${chunk.full_content || chunk.preview}\n`
  ).join('\n');
  
  const fullContent = `Document: ${filename}\nTotal Chunks: ${chunks.length}\n\n${allContent}`;
  
  navigator.clipboard.writeText(fullContent).then(() => {
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '✅ Copied All';
    setTimeout(() => {
      button.innerHTML = originalText;
    }, 3000);
  }).catch(err => {
    console.error('Failed to copy all chunks: ', err);
    alert('Copy failed. Please try copying individual chunks.');
  });
}

// Delete a document
async function deleteDocument(filename) {
  if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
    return;
  }
  
  try {
    const res = await fetch(`/documents/${encodeURIComponent(filename)}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    await window.loadProjects(); // Refresh projects to update document counts
    await loadExistingDocuments(); // Refresh the list
    document.getElementById('upload-msg').innerText = `Deleted "${filename}"`;
    setTimeout(() => {
      document.getElementById('upload-msg').innerText = '';
    }, 3000);
  } catch (error) {
    alert(`Error deleting document: ${error.message}`);
  }
}

// Retry processing for a failed document
async function retryProcessing(filename) {
  try {
    const response = await fetch(`/documents/${encodeURIComponent(filename)}/retry`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    await loadExistingDocuments(); // Refresh the list
  } catch (error) {
    alert(`Error retrying processing: ${error.message}`);
  }
}

// Auto-refresh documents list every 5 seconds if there are documents being processed

function startAutoRefresh() {
  if (window.autoRefreshInterval) return; // Already running
  
  window.autoRefreshInterval = setInterval(async () => {
    try {
      const res = await fetch('/documents');
      const data = await res.json();
      const summary = data.processing_summary || {};
      
      // Check if there are documents still processing
      if (summary.pending > 0 || summary.processing > 0) {
        await loadExistingDocuments();
      } else {
        // Stop auto-refresh when all processing is complete
        stopAutoRefresh();
      }
    } catch (error) {
      console.error('Auto-refresh error:', error);
    }
  }, 3000); // Refresh every 3 seconds
}

function stopAutoRefresh() {
  if (window.autoRefreshInterval) {
    clearInterval(window.autoRefreshInterval);
    window.autoRefreshInterval = null;
  }
}

// Handle uploads with background processing
function initializeUploadHandler() {
  document.getElementById('upload-form').onsubmit = async e => {
    e.preventDefault();
    const files = document.getElementById('file-input').files;
    if (!files.length) return;
    
    document.getElementById('upload-msg').innerText = 'Uploading…';
    
    // First, check for existing files
    const form = new FormData(e.target);
    const res = await fetch('/upload', { method: 'POST', body: form });
    const data = await res.json();
    
    // Handle results
    let message = '';
    if (data.uploaded && data.uploaded.length > 0) {
      message += `Uploaded: ${data.uploaded.join(', ')}`;
      if (data.processing && data.processing.length > 0) {
        message += ` (processing in background...)`;
      }
    }
    
    if (data.existing && data.existing.length > 0) {
      const overwrite = confirm(
        `The following files already exist:\n${data.existing.join(', ')}\n\nDo you want to overwrite them?`
      );
      
      if (overwrite) {
        // Re-upload with overwrite flag
        const overwriteForm = new FormData(e.target);
        overwriteForm.append('overwrite', 'true');
        const overwriteRes = await fetch('/upload', { method: 'POST', body: overwriteForm });
        const overwriteData = await overwriteRes.json();
        
        if (overwriteData.uploaded) {
          message += (message ? '\n' : '') + `Overwritten: ${overwriteData.uploaded.join(', ')}`;
          if (overwriteData.processing && overwriteData.processing.length > 0) {
            message += ` (processing in background...)`;
          }
        }
      } else {
        message += (message ? '\n' : '') + `Skipped existing files: ${data.existing.join(', ')}`;
      }
    }
    
    if (data.errors && data.errors.length > 0) {
      message += (message ? '\n' : '') + `Errors: ${data.errors.join(', ')}`;
    }
    
    document.getElementById('upload-msg').innerText = message || 'Upload complete!';
    await window.loadProjects(); // Refresh projects to update document counts
    await loadExistingDocuments(); // Refresh the document list
    
    // Start auto-refresh if there are documents being processed
    if ((data.processing && data.processing.length > 0) || (data.uploaded && data.uploaded.length > 0)) {
      startAutoRefresh();
    }
    
    // Clear the file input
    document.getElementById('file-input').value = '';
  };
}

// Project Management Functions
async function loadProjects() {
  try {
    const res = await fetch('/projects');
    const data = await res.json();
    const projectSelect = document.getElementById('project-select');
    
    projectSelect.innerHTML = '';
    data.projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.name;
      option.textContent = project.is_global ? 'Global Documents' : project.name;
      if (project.document_count > 0) {
        option.textContent += ` (${project.document_count})`;
      }
      projectSelect.appendChild(option);
    });
    
    // Set current project
    projectSelect.value = window.currentProject;
    document.getElementById('upload-project').value = window.currentProject;
    
    // Update delete button state
    const deleteBtn = document.getElementById('delete-project-btn');
    deleteBtn.style.display = window.currentProject === 'global' ? 'none' : 'inline-flex';
    
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

async function createProject() {
  const name = document.getElementById('new-project-name').value.trim();
  if (!name) {
    document.getElementById('project-msg').textContent = 'Please enter a project name';
    return;
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    document.getElementById('project-msg').textContent = 'Use only letters, numbers, underscore and dash';
    return;
  }
  
  try {
    const res = await fetch('/projects', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: name})
    });
    
    if (res.ok) {
      document.getElementById('new-project-modal').style.display = 'none';
      document.getElementById('new-project-name').value = '';
      document.getElementById('project-msg').textContent = '';
      window.currentProject = name;
      await loadProjects();
      await loadExistingDocuments();
    } else {
      const error = await res.json();
      document.getElementById('project-msg').textContent = error.detail || 'Error creating project';
    }
  } catch (error) {
    document.getElementById('project-msg').textContent = 'Error creating project';
    console.error('Error creating project:', error);
  }
}

async function deleteCurrentProject() {
  if (window.currentProject === 'global') return;
  
  if (!confirm(`Are you sure you want to delete project "${window.currentProject}"? This will delete all documents in the project.`)) {
    return;
  }
  
  try {
    const res = await fetch(`/projects/${encodeURIComponent(window.currentProject)}?force=true`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      window.currentProject = 'global';
      await loadProjects();
      await loadExistingDocuments();
    } else {
      const error = await res.json();
      alert(error.detail || 'Error deleting project');
    }
  } catch (error) {
    alert('Error deleting project');
    console.error('Error deleting project:', error);
  }
}

function initializeProjectManagement() {
  // Event listeners for project management
  document.getElementById('project-select').addEventListener('change', async function() {
    window.currentProject = this.value;
    document.getElementById('upload-project').value = window.currentProject;
    
    // Update delete button state
    const deleteBtn = document.getElementById('delete-project-btn');
    deleteBtn.style.display = window.currentProject === 'global' ? 'none' : 'inline-flex';
    
    await loadExistingDocuments();
  });
  
  document.getElementById('new-project-btn').addEventListener('click', function() {
    document.getElementById('new-project-modal').style.display = 'flex';
    document.getElementById('new-project-name').focus();
  });
  
  document.getElementById('cancel-project-btn').addEventListener('click', function() {
    document.getElementById('new-project-modal').style.display = 'none';
    document.getElementById('new-project-name').value = '';
    document.getElementById('project-msg').textContent = '';
  });
  
  document.getElementById('create-project-btn').addEventListener('click', createProject);
  
  document.getElementById('new-project-name').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      createProject();
    }
  });
  
  document.getElementById('delete-project-btn').addEventListener('click', deleteCurrentProject);
  
  // Close modal when clicking outside
  document.getElementById('new-project-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      this.style.display = 'none';
      document.getElementById('new-project-name').value = '';
      document.getElementById('project-msg').textContent = '';
    }
  });
}

// Initialize documents functionality
function initializeDocuments() {
  initializeUploadHandler();
  initializeProjectManagement();
  
  // Load initial data
  loadProjects().then(() => loadExistingDocuments());
}
