// Documents management functionality

// Global variables
window.currentProject = 'global';
window.autoRefreshInterval = null;
window.currentUploadController = null; 
window.currentProgressInterval = null;

// Supported file types configuration
const SUPPORTED_FILE_TYPES = {
    // Extensions
    extensions: ['.pdf', '.docx', '.doc', '.txt', '.md'],
    // MIME types
    mimeTypes: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword', // .doc
        'text/plain', // .txt
        'text/markdown', // .md
        'text/x-markdown' // .md alternative
    ],
    // Max file size (100MB)
    maxSize: 100 * 1024 * 1024
};

// Validate file types and size
function validateFiles(files) {
    const errors = [];
    const validFiles = [];
    
    for (let file of files) {
        // Check file size
        if (file.size > SUPPORTED_FILE_TYPES.maxSize) {
            errors.push(`${file.name}: File too large (max 100MB)`);
            continue;
        }
        
        // Check file extension
        const fileName = file.name.toLowerCase();
        const hasValidExtension = SUPPORTED_FILE_TYPES.extensions.some(ext => 
            fileName.endsWith(ext)
        );
        
        // Check MIME type
        const hasValidMimeType = SUPPORTED_FILE_TYPES.mimeTypes.includes(file.type);
        
        if (!hasValidExtension && !hasValidMimeType) {
            errors.push(`${file.name}: Unsupported file type. Supported: ${SUPPORTED_FILE_TYPES.extensions.join(', ')}`);
            continue;
        }
        
        validFiles.push(file);
    }
    
    return { validFiles, errors };
}

// Setup improved file upload with drag & drop
function setupImprovedFileUpload() {
    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');
    const cancelBtn = document.getElementById('cancel-upload-btn');
    const uploadButtons = document.querySelector('.upload-buttons');
    const fileLabel = document.querySelector('.file-input-label');
    const uploadMsg = document.getElementById('upload-msg');

    if (!fileInput || !fileLabel) return;

    // Handle file selection
    fileInput.addEventListener('change', function() {
        const files = this.files;
        updateFileDisplay(files, fileLabel, uploadButtons);
    });

    // Handle drag and drop
    fileLabel.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('drag-over');
    });

    fileLabel.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
    });

    fileLabel.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        fileInput.files = files;
        updateFileDisplay(files, fileLabel, uploadButtons);
    });

    // Prevent label click when clicking buttons
    if (uploadButtons) {
        uploadButtons.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Handle upload button
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            await uploadSelectedFiles();
        });
    }

    // Handle cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            cancelUpload();
        });
    }

    function cancelUpload() {
        // Reset file input
        fileInput.value = '';
        
        // Reset display
        const label = document.querySelector('.file-input-label');
        const buttons = document.querySelector('.upload-buttons');
        resetUploadArea(label, buttons);
        hideFileUploadList();
        
        // Show message
        showMessage('Upload cancelled', 'info', uploadMsg);
    }

    function updateFileDisplay(files, label, buttonsContainer) {
        if (files.length > 0) {
            // Validate files
            const validation = validateFiles(files);
            
            if (validation.errors.length > 0) {
                // Show validation errors
                label.classList.add('has-errors');
                label.classList.remove('has-files');
                label.querySelector('.upload-text').textContent = 'Invalid files detected';
                label.querySelector('.upload-hint').textContent = validation.errors[0]; // Show first error
                
                // Show all errors in a message
                const uploadMsg = document.getElementById('upload-msg');
                showMessage(validation.errors.join('\n'), 'error', uploadMsg);
                
                if (buttonsContainer) {
                    buttonsContainer.style.display = 'none';
                }
                return;
            }
            
            // Valid files - show individual file list
            createFileUploadList(validation.validFiles);
            
            // Update label to show ready state
            label.classList.add('has-files');
            label.classList.remove('has-errors');
            label.querySelector('.upload-text').textContent = `${validation.validFiles.length} file(s) ready`;
            label.querySelector('.upload-hint').textContent = 'Click "Upload Files" to start';
            
            // Show buttons and update upload button text
            if (buttonsContainer) {
                buttonsContainer.style.display = 'flex';
                const uploadBtn = buttonsContainer.querySelector('#upload-btn');
                if (uploadBtn) {
                    uploadBtn.textContent = `Upload ${validation.validFiles.length} file(s)`;
                }
            }
        } else {
            // Reset to original state
            resetUploadArea(label, buttonsContainer);
            hideFileUploadList();
        }
    }

    function resetUploadArea(label, buttonsContainer) {
        label.classList.remove('has-files', 'has-errors');
        label.querySelector('.upload-text').textContent = 'Choose files or drag & drop';
        label.querySelector('.upload-hint').textContent = 'PDF, DOCX, DOC, TXT, MD';
        
        if (buttonsContainer) {
            buttonsContainer.style.display = 'none';
        }
    }

    function createFileUploadList(files) {
        const container = document.getElementById('file-upload-list');
        
        // Add header if files exist
        let headerHTML = '';
        if (files.length > 0) {
            headerHTML = `
                <div class="file-list-header">
                    <h4>Files to Upload (${files.length})</h4>
                </div>
            `;
        }
        
        container.innerHTML = headerHTML;
        container.classList.add('visible');
        
        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-upload-item';
            fileItem.setAttribute('data-file-index', index);
            
            const fileIcon = getFileIcon(file.name);
            const fileSize = formatFileSize(file.size);
            
            fileItem.innerHTML = `
                <div class="file-icon">${fileIcon}</div>
                <div class="file-info">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
                <div class="file-progress">
                    <div class="file-progress-bar">
                        <div class="file-progress-fill"></div>
                    </div>
                    <div class="file-status">Ready</div>
                </div>
            `;
            
            container.appendChild(fileItem);
        });
    }

    function hideFileUploadList() {
        const container = document.getElementById('file-upload-list');
        container.classList.remove('visible');
        setTimeout(() => {
            container.innerHTML = '';
        }, 300);
    }

    function getFileIcon(filename) {
        const ext = filename.toLowerCase().split('.').pop();
        switch (ext) {
            case 'pdf': return '📄';
            case 'docx':
            case 'doc': return '📝';
            case 'txt': return '📃';
            case 'md': return '📋';
            default: return '📎';
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function updateFileProgress(fileIndex, progress, status = 'uploading') {
        const fileItem = document.querySelector(`[data-file-index="${fileIndex}"]`);
        if (!fileItem) return;
        
        const progressFill = fileItem.querySelector('.file-progress-fill');
        const statusText = fileItem.querySelector('.file-status');
        
        // Update progress bar
        progressFill.style.width = `${progress}%`;
        
        // Update status
        fileItem.className = `file-upload-item ${status}`;
        
        switch (status) {
            case 'uploading':
                statusText.textContent = `${Math.round(progress)}%`;
                break;
            case 'success':
                statusText.textContent = 'Complete';
                progressFill.style.width = '100%';
                break;
            case 'error':
                statusText.textContent = 'Error';
                break;
            default:
                statusText.textContent = 'Ready';
        }
    }

    async function uploadSelectedFiles() {
        const files = fileInput.files;
        if (files.length === 0) return;

        // Create AbortController for cancellation early
        window.currentUploadController = new AbortController();

        // Validate files
        const { validFiles, errors } = validateFiles(files);
        if (errors.length > 0) {
            showMessage(errors.join('\n'), 'error', uploadMsg);
            return;
        }

        const formData = new FormData();
        for (let file of validFiles) {
            formData.append('files', file);
        }
        
        // Add current project
        const projectSelect = document.getElementById('project-select');
        if (projectSelect) {
            formData.append('project', projectSelect.value);
        }

        try {
            // Update UI for upload state - change upload button to cancel
            const uploadButton = document.getElementById('upload-btn');
            if (uploadButton) {
                uploadButton.textContent = '❌ Cancel Upload';
                uploadButton.classList.add('btn-danger');
                uploadButton.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    cancelUpload();
                };
            }
            
            // Hide general progress bar (we'll use individual file progress)
            const progressContainer = document.getElementById('upload-progress');
            progressContainer.style.display = 'none';
            
            showMessage('Starting upload...', 'info', uploadMsg);

            // Simulate individual file progress
            const { validFiles } = validateFiles(fileInput.files);
            let completedFiles = 0;
            
            // Initialize all files as uploading
            validFiles.forEach((file, index) => {
                updateFileProgress(index, 0, 'uploading');
            });
            
            // Simulate progress for each file
            const progressIntervals = validFiles.map((file, index) => {
                let progress = 0;
                return setInterval(() => {
                    progress += Math.random() * 10 + 5; // Random progress increment
                    if (progress < 95) {
                        updateFileProgress(index, progress, 'uploading');
                    }
                }, 150 + Math.random() * 100); // Slightly different speeds
            });

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
                signal: window.currentUploadController.signal
            });
            
            // Complete all file progress
            progressIntervals.forEach(interval => clearInterval(interval));
            
            const result = await response.json();

            if (response.ok) {
                let message = '';
                
                // Mark successful uploads
                if (result.uploaded && result.uploaded.length > 0) {
                    result.uploaded.forEach((fileName, index) => {
                        const fileIndex = validFiles.findIndex(f => f.name === fileName);
                        if (fileIndex !== -1) {
                            updateFileProgress(fileIndex, 100, 'success');
                        }
                    });
                    message += `Uploaded: ${result.uploaded.join(', ')}`;
                    if (result.processing && result.processing.length > 0) {
                        message += ` (processing in background...)`;
                    }
                }

                // Handle existing files
                if (result.existing && result.existing.length > 0) {
                    const overwrite = confirm(
                        `The following files already exist:\n${result.existing.join(', ')}\n\nDo you want to overwrite them?`
                    );
                    
                    if (overwrite) {
                        formData.append('overwrite', 'true');
                        
                        const overwriteRes = await fetch('/upload', { 
                            method: 'POST', 
                            body: formData,
                            signal: window.currentUploadController.signal 
                        });
                        const overwriteData = await overwriteRes.json();
                        
                        if (overwriteData.uploaded) {
                            message += (message ? '\n' : '') + `Overwritten: ${overwriteData.uploaded.join(', ')}`;
                            // Update progress for overwritten files
                            overwriteData.uploaded.forEach((fileName) => {
                                const fileIndex = validFiles.findIndex(f => f.name === fileName);
                                if (fileIndex !== -1) {
                                    updateFileProgress(fileIndex, 100, 'success');
                                }
                            });
                        }
                    } else {
                        message += (message ? '\n' : '') + `Skipped: ${result.existing.join(', ')}`;
                        // Mark skipped files
                        result.existing.forEach((fileName) => {
                            const fileIndex = validFiles.findIndex(f => f.name === fileName);
                            if (fileIndex !== -1) {
                                updateFileProgress(fileIndex, 100, 'error');
                            }
                        });
                    }
                }

                showMessage(message || 'Upload completed', 'success', uploadMsg);
                
                // Reset form and restore original upload area
                fileInput.value = '';
                
                // Delay reset to show completion status, then restore original state
                setTimeout(() => {
                    // Hide the file upload list
                    hideFileUploadList();
                    // Reset upload area to original state
                    const label = document.querySelector('.file-input-label');
                    const buttons = document.querySelector('.upload-buttons');
                    resetUploadArea(label, buttons);
                    
                    // Clear upload message after a delay
                    setTimeout(() => {
                        const uploadMsg = document.getElementById('upload-msg');
                        uploadMsg.textContent = '';
                        uploadMsg.className = 'status-msg';
                    }, 2000);
                }, 3000);
                
                // Refresh documents list
                loadExistingDocuments();
                
                // Start auto-refresh for processing status
                startAutoRefresh();
            } else {
                throw new Error(result.error || 'Upload failed');
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                showMessage('Upload cancelled', 'info', uploadMsg);
                // Mark all files as cancelled and reset after delay
                const { validFiles } = validateFiles(fileInput.files);
                validFiles.forEach((file, index) => {
                    updateFileProgress(index, 0, 'error');
                });
                
                // Reset to original state after showing cancellation
                setTimeout(() => {
                    fileInput.value = '';
                    hideFileUploadList();
                    const label = document.querySelector('.file-input-label');
                    const buttons = document.querySelector('.upload-buttons');
                    resetUploadArea(label, buttons);
                }, 2000);
            } else {
                console.error('Upload error:', error);
                showMessage('Upload failed: ' + error.message, 'error', uploadMsg);
                // Mark all files as error and reset after delay
                const { validFiles } = validateFiles(fileInput.files);
                validFiles.forEach((file, index) => {
                    updateFileProgress(index, 0, 'error');
                });
                
                // Reset to original state after showing error
                setTimeout(() => {
                    fileInput.value = '';
                    hideFileUploadList();
                    const label = document.querySelector('.file-input-label');
                    const buttons = document.querySelector('.upload-buttons');
                    resetUploadArea(label, buttons);
                }, 3000);
            }
        } finally {
            // Always clean up and reset upload state
            resetUploadButton();
            window.currentUploadController = null;
        }
    }
    
    function resetUploadButton() {
        const uploadBtn = document.getElementById('upload-btn');
        const buttonsContainer = document.querySelector('.upload-buttons');
        
        if (uploadBtn) {
            uploadBtn.textContent = 'Upload Files';
            uploadBtn.classList.remove('btn-danger');
            uploadBtn.classList.add('btn-primary');
            uploadBtn.onclick = async function(e) {
                e.preventDefault();
                e.stopPropagation();
                await uploadSelectedFiles();
            };
        }
    }

    // Define cancelUpload in the closure scope
    function cancelUpload() {
        if (window.currentUploadController) {
            window.currentUploadController.abort();
        }
        if (window.currentProgressInterval) {
            clearInterval(window.currentProgressInterval);
            window.currentProgressInterval = null;
        }
        
        // Reset to original upload state
        const fileInput = document.getElementById('file-input');
        const label = document.querySelector('.file-input-label');
        const buttons = document.querySelector('.upload-buttons');
        
        fileInput.value = '';
        resetUploadArea(label, buttons);
        hideFileUploadList();
        
        // Show immediate feedback
        showMessage('Upload cancelled by user', 'info', document.getElementById('upload-msg'));
    }
}

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

// Auto-refresh documents list every 10 seconds to detect changes

function startAutoRefresh() {
  if (window.autoRefreshInterval) return; // Already running
  
  window.autoRefreshInterval = setInterval(async () => {
    try {
      const res = await fetch('/documents');
      const data = await res.json();
      const summary = data.processing_summary || {};
      
      // Always refresh to detect new documents added manually or via API
      await loadExistingDocuments();
      
      // If there are documents processing, check more frequently
      if (summary.pending > 0 || summary.processing > 0) {
        // Continue with current interval for processing documents
      }
    } catch (error) {
      console.error('Auto-refresh error:', error);
    }
  }, 10000); // Refresh every 10 seconds
}

function stopAutoRefresh() {
  if (window.autoRefreshInterval) {
    clearInterval(window.autoRefreshInterval);
    window.autoRefreshInterval = null;
  }
}

// Handle uploads with background processing
function initializeUploadHandler() {
  const uploadForm = document.getElementById('upload-form');
  if (!uploadForm) {
    console.warn('Upload form not found');
    return;
  }
  
  uploadForm.onsubmit = async e => {
    e.preventDefault();
    const files = document.getElementById('file-input').files;
    if (!files.length) return;
    
    const uploadMsg = document.getElementById('upload-msg');
    if (uploadMsg) {
      uploadMsg.innerText = 'Uploading…';
    }
    
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
      const result = await res.json();
      document.getElementById('new-project-modal').style.display = 'none';
      document.getElementById('new-project-name').value = '';
      document.getElementById('project-msg').textContent = '';
      
      // Switch to the new project
      window.currentProject = name;
      await loadProjects();
      await loadExistingDocuments();
      
      // Update chat history for the new project and clear current chat
      if (window.chatHistory) {
        window.chatHistory.currentProject = window.currentProject;
        window.chatHistory.currentChatId = null;
        window.chatHistory.clearChatMessages();
        window.chatHistory.updateChatTitle('New Chat');
        await window.chatHistory.loadProjectChats();
      }
      
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
      // Switch back to global project
      window.currentProject = 'global';
      await loadProjects();
      await loadExistingDocuments();
      
      // Update chat history back to global
      if (window.chatHistory) {
        window.chatHistory.currentProject = 'global';
        await window.chatHistory.loadProjectChats();
      }
      
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
    const previousProject = window.currentProject;
    window.currentProject = this.value;
    document.getElementById('upload-project').value = window.currentProject;
    
    // Update delete button state
    const deleteBtn = document.getElementById('delete-project-btn');
    deleteBtn.style.display = window.currentProject === 'global' ? 'none' : 'inline-flex';
    
    // Update documents and chats for the new project
    await loadExistingDocuments();
    
    // Update chat history for the new project
    if (window.chatHistory) {
      window.chatHistory.currentProject = window.currentProject;
      await window.chatHistory.loadProjectChats();
    }
    
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
  setupImprovedFileUpload();
  
  // Load initial data
  loadProjects().then(() => loadExistingDocuments());
}
