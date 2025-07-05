// Documents management functionality

// Global variables
window.currentProject = 'global';
window.autoRefreshInterval = null;
window.currentUploadController = null;

// Supported file types configuration
const SUPPORTED_FILE_TYPES = {
    extensions: ['.pdf', '.docx', '.doc', '.txt', '.md', '.log'],
    mimeTypes: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'text/markdown',
        'text/x-markdown'
    ],
    maxSize: 100 * 1024 * 1024 // 100MB
};

// Utility functions
function showMessage(message, type, element) {
    if (!element) element = document.getElementById('upload-msg');
    if (!element) return;
    
    element.innerHTML = `<span class="${type}">${message}</span>`;
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            element.innerHTML = '';
        }, 5000);
    }
}

function clearMessages() {
    const uploadMsg = document.getElementById('upload-msg');
    if (uploadMsg) uploadMsg.innerHTML = '';
}

// Validate file types and size
function validateFiles(files) {
    const errors = [];
    const validFiles = [];
    
    for (let file of files) {
        if (file.size > SUPPORTED_FILE_TYPES.maxSize) {
            errors.push(`${file.name}: File too large (max 100MB)`);
            continue;
        }
        
        const fileName = file.name.toLowerCase();
        const hasValidExtension = SUPPORTED_FILE_TYPES.extensions.some(ext => 
            fileName.endsWith(ext)
        );
        
        const hasValidMimeType = SUPPORTED_FILE_TYPES.mimeTypes.includes(file.type);
        
        if (!hasValidExtension && !hasValidMimeType) {
            errors.push(`${file.name}: Unsupported file type. Supported: ${SUPPORTED_FILE_TYPES.extensions.join(', ')}`);
            continue;
        }
        
        validFiles.push(file);
    }
    
    return { validFiles, errors };
}

// Setup file upload with drag & drop
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
        
        // Validate files first
        const validation = validateFiles(files);
        
        if (validation.validFiles.length > 0) {
            // Auto-upload valid files immediately
            uploadFiles(validation.validFiles, true);
        }
        
        if (validation.errors.length > 0) {
            showMessage(`Invalid files skipped:\n${validation.errors.join('\n')}`, 'warning', uploadMsg);
        }
        
        // Reset the drop area immediately
        resetUploadArea(fileLabel, uploadButtons);
        fileInput.value = '';
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
            const files = fileInput.files;
            if (files.length > 0) {
                const validation = validateFiles(files);
                if (validation.validFiles.length > 0) {
                    await uploadFiles(validation.validFiles, false);
                }
            }
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
}

function updateFileDisplay(files, label, buttonsContainer) {
    if (files.length > 0) {
        const validation = validateFiles(files);
        
        if (validation.errors.length > 0 && validation.validFiles.length === 0) {
            label.classList.add('has-errors');
            label.classList.remove('has-files');
            label.querySelector('.upload-text').textContent = 'Invalid files selected';
            label.querySelector('.upload-hint').textContent = validation.errors[0];
            
            showMessage(validation.errors.join('\n'), 'error', document.getElementById('upload-msg'));
            
            if (buttonsContainer) {
                buttonsContainer.style.display = 'none';
            }
            return;
        }
        
        if (validation.errors.length > 0) {
            showMessage(`Some files are invalid and will be skipped:\n${validation.errors.join('\n')}`, 'warning', document.getElementById('upload-msg'));
        }
        
        createFileUploadList(validation.validFiles);
        
        label.classList.add('has-files');
        label.classList.remove('has-errors');
        label.querySelector('.upload-text').textContent = `${validation.validFiles.length} file(s) ready`;
        label.querySelector('.upload-hint').textContent = 'Click "Upload Files" to start';
        
        if (buttonsContainer) {
            buttonsContainer.style.display = 'flex';
            const uploadBtn = buttonsContainer.querySelector('#upload-btn');
            if (uploadBtn) {
                uploadBtn.textContent = `Upload ${validation.validFiles.length} file(s)`;
            }
        }
    } else {
        resetUploadArea(label, buttonsContainer);
        hideFileUploadList();
    }
}

function resetUploadArea(label, buttonsContainer) {
    label.classList.remove('has-files', 'has-errors');
    label.querySelector('.upload-text').textContent = 'Choose files or drag & drop';
    label.querySelector('.upload-hint').textContent = 'PDF, DOCX, DOC, TXT, MD, LOG';
    
    if (buttonsContainer) {
        buttonsContainer.style.display = 'none';
    }
}

function createFileUploadList(files) {
    const container = document.getElementById('file-upload-list');
    
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
    
    if (progressFill) progressFill.style.width = `${progress}%`;
    fileItem.className = `file-upload-item ${status}`;
    
    if (statusText) {
        switch (status) {
            case 'uploading':
                statusText.textContent = `${Math.round(progress)}%`;
                break;
            case 'success':
                statusText.textContent = 'Complete';
                if (progressFill) progressFill.style.width = '100%';
                break;
            case 'error':
                statusText.textContent = 'Error';
                break;
            default:
                statusText.textContent = 'Ready';
        }
    }
}

// Unified upload function for both manual and drag&drop
async function uploadFiles(validFiles, isAutoUpload = false) {
    if (validFiles.length === 0) return;

    window.currentUploadController = new AbortController();
    const uploadMsg = document.getElementById('upload-msg');

    const formData = new FormData();
    for (let file of validFiles) {
        formData.append('files', file);
    }
    
    const projectSelect = document.getElementById('project-select');
    if (projectSelect) {
        formData.append('project', projectSelect.value);
    }

    try {
        if (!isAutoUpload) {
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
        }
        
        const uploadType = isAutoUpload ? 'Auto-uploading' : 'Uploading';
        showMessage(`${uploadType} ${validFiles.length} file(s)...`, 'info', uploadMsg);

        if (!isAutoUpload) {
            createFileUploadList(validFiles);
            validFiles.forEach((file, index) => {
                updateFileProgress(index, 0, 'uploading');
            });
        }

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData,
            signal: window.currentUploadController?.signal
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        let message = '';
        
        if (result.uploaded && result.uploaded.length > 0) {
            if (!isAutoUpload) {
                result.uploaded.forEach((fileName, index) => {
                    const fileIndex = validFiles.findIndex(f => f.name === fileName);
                    if (fileIndex !== -1) {
                        updateFileProgress(fileIndex, 100, 'success');
                    }
                });
            }
            message += `✅ Uploaded: ${result.uploaded.join(', ')}`;
            if (result.processing && result.processing.length > 0) {
                message += ` (processing in background...)`;
            }
        }

        if (result.existing && result.existing.length > 0) {
            const overwrite = confirm(
                `The following files already exist:\n${result.existing.join(', ')}\n\nDo you want to overwrite them?`
            );
            
            if (overwrite) {
                formData.append('overwrite', 'true');
                
                const overwriteRes = await fetch('/upload', { 
                    method: 'POST', 
                    body: formData,
                    signal: window.currentUploadController?.signal 
                });
                const overwriteData = await overwriteRes.json();
                
                if (overwriteData.uploaded) {
                    message += (message ? '\n' : '') + `Overwritten: ${overwriteData.uploaded.join(', ')}`;
                    if (!isAutoUpload) {
                        overwriteData.uploaded.forEach((fileName) => {
                            const fileIndex = validFiles.findIndex(f => f.name === fileName);
                            if (fileIndex !== -1) {
                                updateFileProgress(fileIndex, 100, 'success');
                            }
                        });
                    }
                }
            } else {
                message += (message ? '\n' : '') + `Skipped: ${result.existing.join(', ')}`;
                if (!isAutoUpload) {
                    result.existing.forEach((fileName) => {
                        const fileIndex = validFiles.findIndex(f => f.name === fileName);
                        if (fileIndex !== -1) {
                            updateFileProgress(fileIndex, 100, 'error');
                        }
                    });
                }
            }
        }

        showMessage(message || 'Upload completed', 'success', uploadMsg);
        
        // Clean up UI
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
        
        setTimeout(() => {
            if (!isAutoUpload) {
                hideFileUploadList();
                const label = document.querySelector('.file-input-label');
                const buttons = document.querySelector('.upload-buttons');
                resetUploadArea(label, buttons);
            }
            clearMessages();
        }, isAutoUpload ? 3000 : 2000);
        
        await loadExistingDocuments();
        startAutoRefresh();

    } catch (error) {
        if (error.name === 'AbortError') {
            showMessage('Upload cancelled', 'info', uploadMsg);
        } else {
            console.error('Upload error:', error);
            showMessage(`Upload failed: ${error.message}`, 'error', uploadMsg);
        }
        
        if (!isAutoUpload) {
            validFiles.forEach((file, index) => {
                updateFileProgress(index, 0, 'error');
            });
            
            setTimeout(() => {
                const fileInput = document.getElementById('file-input');
                if (fileInput) fileInput.value = '';
                hideFileUploadList();
                const label = document.querySelector('.file-input-label');
                const buttons = document.querySelector('.upload-buttons');
                resetUploadArea(label, buttons);
            }, 3000);
        } else {
            hideFileUploadList();
        }
    } finally {
        if (!isAutoUpload) {
            resetUploadButton();
        }
        window.currentUploadController = null;
    }
}

function resetUploadButton() {
    const uploadBtn = document.getElementById('upload-btn');
    
    if (uploadBtn) {
        uploadBtn.textContent = 'Upload Files';
        uploadBtn.classList.remove('btn-danger');
        uploadBtn.classList.add('btn-primary');
        uploadBtn.onclick = async function(e) {
            e.preventDefault();
            e.stopPropagation();
            const fileInput = document.getElementById('file-input');
            const files = fileInput.files;
            if (files.length > 0) {
                const validation = validateFiles(files);
                if (validation.validFiles.length > 0) {
                    await uploadFiles(validation.validFiles, false);
                }
            }
        };
    }
}

function cancelUpload() {
    if (window.currentUploadController) {
        window.currentUploadController.abort();
    }
    
    const fileInput = document.getElementById('file-input');
    const label = document.querySelector('.file-input-label');
    const buttons = document.querySelector('.upload-buttons');
    
    if (fileInput) fileInput.value = '';
    resetUploadArea(label, buttons);
    hideFileUploadList();
    
    showMessage('Upload cancelled by user', 'info', document.getElementById('upload-msg'));
}

// Load and display existing documents
async function loadExistingDocuments() {
    try {
        const res = await fetch('/documents');
        const data = await res.json();
        const docsList = document.getElementById('docs-list');
        
        if (data.documents && data.documents.length > 0) {
            let html = '';
            
            const filteredDocs = data.documents.filter(doc => {
                if (window.currentProject === 'global') {
                    return !doc.includes('/');
                } else {
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
                
                const displayName = window.currentProject === 'global' ? doc : doc.substring(window.currentProject.length + 1);
                
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
        
        projectSelect.value = window.currentProject;
        document.getElementById('upload-project').value = window.currentProject;
        
        const deleteBtn = document.getElementById('delete-project-btn');
        deleteBtn.style.display = window.currentProject === 'global' ? 'none' : 'inline-flex';
        
    } catch (error) {
        console.error('Error loading projects:', error);
    }
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
        
        await loadProjects();
        await loadExistingDocuments();
        showMessage(`Deleted "${filename}"`, 'success', document.getElementById('upload-msg'));
    } catch (error) {
        showMessage(`Error deleting document: ${error.message}`, 'error', document.getElementById('upload-msg'));
    }
}

// View document chunks (enhanced implementation)
async function viewDocumentChunks(filename) {
    try {
        showMessage(`Loading chunks for "${filename}"...`, 'info', document.getElementById('upload-msg'));
        
        const response = await fetch(`/documents/${encodeURIComponent(filename)}/chunks`);
        if (!response.ok) {
            throw new Error(`Failed to load chunks: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Create and show modal
        createChunksModal(filename, data);
        showMessage('', 'success', document.getElementById('upload-msg'));
        
    } catch (error) {
        console.error('Error loading document chunks:', error);
        showMessage(`Error loading chunks: ${error.message}`, 'error', document.getElementById('upload-msg'));
    }
}

// Create chunks modal
function createChunksModal(filename, data) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.chunks-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'chunks-modal';
    modal.innerHTML = `
        <div class="chunks-modal-content">
            <div class="chunks-modal-header">
                <h3>📊 Document Chunks: ${filename}</h3>
                <div class="chunks-modal-actions">
                    <button class="btn-secondary copy-all-chunks" onclick="copyAllChunks('${filename}', ${JSON.stringify(data.chunks)})" title="Copy all chunks">📋 Copy All</button>
                    <button class="btn-secondary" onclick="closeChunksModal()" title="Close">❌</button>
                </div>
            </div>
            <div class="chunks-modal-info">
                <span>Total chunks: ${data.total_chunks}</span>
                <span>Total characters: ${data.total_chars}</span>
                <div class="chunk-search">
                    <input type="text" id="chunk-search-input" placeholder="Search in chunks..." onkeyup="searchInChunks(event)">
                    <button onclick="clearChunkSearch()" class="btn-xs">Clear</button>
                </div>
            </div>
            <div class="chunks-list" id="chunks-list">
                ${generateChunksList(data.chunks)}
            </div>
        </div>
        <div class="chunks-modal-backdrop" onclick="closeChunksModal()"></div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus search input
    setTimeout(() => {
        const searchInput = document.getElementById('chunk-search-input');
        if (searchInput) searchInput.focus();
    }, 100);
}

// Generate chunks list HTML
function generateChunksList(chunks) {
    return chunks.map((chunk, index) => {
        const isExpanded = chunk.full_content && chunk.full_content.length <= 500; // Auto-expand short chunks
        return `
        <div class="chunk-item">
            <div class="chunk-header">
                <strong>Chunk ${chunk.chunk_index}/${chunks.length}</strong>
                <div class="chunk-actions">
                    <span class="chunk-size">(${chunk.char_count} characters)</span>
                    <button class="btn-xs copy-chunk" onclick="copyChunkContent(this, ${index})" data-chunk-index="${index}" title="Copy chunk content">📋</button>
                    ${!isExpanded && chunk.full_content ? `<button class="btn-xs expand-chunk" onclick="toggleChunkContent(this, ${index})" data-chunk-index="${index}" title="Show full content">📖 Expand</button>` : ''}
                </div>
            </div>
            <div class="chunk-preview" data-preview="${escapeHtml(chunk.preview)}" data-full="${chunk.full_content ? escapeHtml(chunk.full_content) : ''}" data-original="${escapeHtml(chunk.preview)}">${isExpanded && chunk.full_content ? escapeHtml(chunk.full_content) : escapeHtml(chunk.preview)}</div>
        </div>`;
    }).join('');
}

// Close chunks modal
function closeChunksModal() {
    const modal = document.querySelector('.chunks-modal');
    if (modal) {
        modal.remove();
    }
}

// Search in chunks
function searchInChunks(event) {
    const searchTerm = event.target.value.toLowerCase();
    const modal = document.querySelector('.chunks-modal');
    
    if (!modal) return;
    
    const chunkItems = modal.querySelectorAll('.chunk-item');
    let visibleCount = 0;
    
    chunkItems.forEach(item => {
        const chunkPreview = item.querySelector('.chunk-preview');
        const originalContent = chunkPreview.getAttribute('data-original');
        const fullContent = chunkPreview.getAttribute('data-full');
        const contentToSearch = (fullContent || originalContent).toLowerCase();
        
        if (searchTerm === '' || contentToSearch.includes(searchTerm)) {
            item.style.display = 'block';
            visibleCount++;
            
            // Highlight search term
            if (searchTerm !== '') {
                const highlightedContent = highlightSearchTerm(originalContent, searchTerm);
                chunkPreview.innerHTML = highlightedContent;
            } else {
                chunkPreview.innerHTML = originalContent;
            }
        } else {
            item.style.display = 'none';
        }
    });
    
    // Show/hide search navigation
    const searchNav = modal.querySelector('.search-navigation') || createSearchNavigation(modal);
    if (searchTerm !== '' && visibleCount > 0) {
        searchNav.style.display = 'block';
        searchNav.querySelector('.search-results').textContent = `${visibleCount} chunks found`;
    } else {
        searchNav.style.display = 'none';
    }
}

// Create search navigation
function createSearchNavigation(modal) {
    const nav = document.createElement('div');
    nav.className = 'search-navigation';
    nav.innerHTML = `
        <div class="search-results"></div>
    `;
    
    const modalInfo = modal.querySelector('.chunks-modal-info');
    modalInfo.appendChild(nav);
    return nav;
}

// Highlight search term in text
function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// Escape special regex characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Escape HTML characters
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Retry processing a failed document (placeholder for future implementation)
async function retryProcessing(filename) {
    try {
        showMessage(`Retrying processing for "${filename}"...`, 'info', document.getElementById('upload-msg'));
        // This would typically call an API endpoint to retry processing
        // For now, just refresh the documents list
        await loadExistingDocuments();
    } catch (error) {
        showMessage(`Error retrying processing: ${error.message}`, 'error', document.getElementById('upload-msg'));
    }
}

// Auto-refresh functionality
function startAutoRefresh() {
    if (window.autoRefreshInterval) return;
    
    window.autoRefreshInterval = setInterval(async () => {
        try {
            const res = await fetch('/documents');
            const data = await res.json();
            const summary = data.processing_summary || {};
            
            await loadExistingDocuments();
            
            if (summary.pending > 0 || summary.processing > 0) {
                // Continue refreshing
            }
        } catch (error) {
            console.error('Auto-refresh error:', error);
        }
    }, 10000);
}

function stopAutoRefresh() {
    if (window.autoRefreshInterval) {
        clearInterval(window.autoRefreshInterval);
        window.autoRefreshInterval = null;
    }
}

// Project management
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

function initializeProjectManagement() {
    document.getElementById('project-select').addEventListener('change', async function() {
        const previousProject = window.currentProject;
        window.currentProject = this.value;
        document.getElementById('upload-project').value = window.currentProject;
        
        const deleteBtn = document.getElementById('delete-project-btn');
        deleteBtn.style.display = window.currentProject === 'global' ? 'none' : 'inline-flex';
        
        await loadExistingDocuments();
        
        if (window.chatHistory) {
            if (window.chatHistory.currentProject !== window.currentProject) {
                window.chatHistory.currentProject = window.currentProject;
                window.chatHistory.currentChatId = null;
                window.chatHistory.clearChatMessages();
                window.chatHistory.updateChatTitle('New Chat');
                await window.chatHistory.loadProjectChats();
            }
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
    
    // Add delete project button event listener
    document.getElementById('delete-project-btn').addEventListener('click', deleteCurrentProject);
}

// Chunk content management functions
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
        console.error('Failed to copy chunk content:', err);
        alert('Failed to copy content to clipboard');
    });
}

// Copy all chunks content to clipboard
function copyAllChunks(filename, chunks) {
    const allContent = chunks.map((chunk, index) => 
        `=== Chunk ${chunk.chunk_index}/${chunks.length} ===\n${chunk.full_content || chunk.preview}\n`
    ).join('\n');
    
    navigator.clipboard.writeText(allContent).then(() => {
        const button = document.querySelector('.copy-all-chunks');
        if (button) {
            const originalText = button.innerHTML;
            button.innerHTML = '✅ Copied All';
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 3000);
        }
        showMessage(`Copied all ${chunks.length} chunks to clipboard`, 'success', document.getElementById('upload-msg'));
    }).catch(err => {
        console.error('Failed to copy all chunks:', err);
        alert('Failed to copy all chunks to clipboard');
    });
}

// Delete current project
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
            
            // Update chat history if available
            if (window.chatHistory) {
                window.chatHistory.currentProject = window.currentProject;
                window.chatHistory.currentChatId = null;
                window.chatHistory.clearChatMessages();
                window.chatHistory.updateChatTitle('New Chat');
                await window.chatHistory.loadProjectChats();
            }
            
            showMessage('Project deleted successfully', 'success', document.getElementById('upload-msg'));
        } else {
            const error = await res.json();
            alert(error.detail || 'Error deleting project');
        }
    } catch (error) {
        alert('Error deleting project');
        console.error('Error deleting project:', error);
    }
}

// Initialize documents functionality
function initializeDocuments() {
    initializeProjectManagement();
    setupImprovedFileUpload();
    loadProjects().then(() => loadExistingDocuments());
}
