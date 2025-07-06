/**
 * Document List Management Module
 * Handles displaying, filtering, and managing the document list
 * Includes auto-refresh functionality for real-time updates
 */

import { showMessage, formatFileSize } from './document-utils.js';

// Auto-refresh configuration
const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds
let autoRefreshInterval = null;
let lastDocumentState = null;

/**
 * Initialize document list management
 */
export function initializeDocumentList() {
    loadDocuments();
    startAutoRefresh();
    
    console.log('Document list management initialized with auto-refresh');
}

/**
 * Load and display documents for current project
 */
export async function loadDocuments() {
    try {
        const project = window.currentProject || 'global';
        const response = await fetch(`/documents?project=${encodeURIComponent(project)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        displayDocuments(data.documents || []);
        updateDocumentCount(data.documents?.length || 0);
        
    } catch (error) {
        console.error('Error loading documents:', error);
        showMessage(`Error loading documents: ${error.message}`, 'error');
        displayDocuments([]); // Show empty list
    }
}

/**
 * Display documents in the UI
 * @param {Array} documents - Array of document objects
 */
function displayDocuments(documents) {
    const container = document.getElementById('docs-list');
    if (!container) {
        console.warn('Documents container not found');
        return;
    }
    
    // Clear existing content
    container.innerHTML = '';
    
    if (documents.length === 0) {
        container.innerHTML = `
            <div class="no-documents">
                <p>📄 No documents in this project yet</p>
                <p>Upload your first document to get started!</p>
            </div>
        `;
        return;
    }
    
    // Sort documents by name for consistent display
    const sortedDocs = [...documents].sort((a, b) => 
        a.filename.localeCompare(b.filename)
    );
    
    // Create document list
    const docList = document.createElement('div');
    docList.className = 'documents-grid';
    
    sortedDocs.forEach(doc => {
        const docElement = createDocumentElement(doc);
        docList.appendChild(docElement);
    });
    
    container.appendChild(docList);
}

/**
 * Create HTML element for a single document
 * @param {Object} doc - Document object
 * @returns {HTMLElement} - Document element
 */
function createDocumentElement(doc) {
    const docDiv = document.createElement('div');
    docDiv.className = 'document-item';
    docDiv.setAttribute('data-filename', doc.filename);
    
    // Determine document status and styling
    const statusInfo = getDocumentStatusInfo(doc);
    
    docDiv.innerHTML = `
        <div class="document-header">
            <div class="document-icon">📄</div>
            <div class="document-info">
                <div class="document-name" title="${doc.filename}">${doc.filename}</div>
                <div class="document-meta">
                    ${statusInfo.text}
                    ${doc.size ? `• ${formatFileSize(doc.size)}` : ''}
                </div>
            </div>
            <div class="document-actions">
                <button class="btn-icon" onclick="viewDocumentChunks('${doc.filename}')" 
                        title="View chunks" ${!statusInfo.processed ? 'disabled' : ''}>
                    🔍
                </button>
                <button class="btn-icon" onclick="reprocessDocument('${doc.filename}')" 
                        title="Reprocess document">
                    🔄
                </button>
                <button class="btn-icon btn-danger" onclick="deleteDocument('${doc.filename}')" 
                        title="Delete document">
                    🗑️
                </button>
            </div>
        </div>
        <div class="document-status ${statusInfo.class}">
            <div class="status-indicator"></div>
            <span>${statusInfo.statusText}</span>
        </div>
    `;
    
    return docDiv;
}

/**
 * Get document status information for display
 * @param {Object} doc - Document object
 * @returns {Object} - Status information object
 */
function getDocumentStatusInfo(doc) {
    const chunks = doc.chunks || 0;
    const hasError = doc.error_details && doc.error_details.length > 0;
    
    if (hasError) {
        return {
            class: 'status-error',
            processed: false,
            text: 'Processing failed',
            statusText: `❌ Error: ${doc.error_details}`
        };
    }
    
    if (doc.processing_status === 'processing') {
        return {
            class: 'status-processing',
            processed: false,
            text: 'Processing...',
            statusText: '⏳ Processing document...'
        };
    }
    
    if (doc.processing_status === 'pending') {
        return {
            class: 'status-pending',
            processed: false,
            text: 'Pending processing',
            statusText: '⏸️ Waiting to be processed'
        };
    }
    
    if (chunks > 0) {
        return {
            class: 'status-ready',
            processed: true,
            text: `${chunks} chunks ready`,
            statusText: `✅ Ready • ${chunks} text chunks`
        };
    }
    
    return {
        class: 'status-unknown',
        processed: false,
        text: 'Status unknown',
        statusText: '❓ Unknown status'
    };
}

/**
 * Update document count display
 * @param {number} count - Number of documents
 */
function updateDocumentCount(count) {
    const countElement = document.getElementById('doc-count');
    if (countElement) {
        countElement.textContent = `${count} document${count !== 1 ? 's' : ''}`;
    }
}

/**
 * Start auto-refresh for document list
 */
export function startAutoRefresh() {
    stopAutoRefresh(); // Clear any existing interval
    
    autoRefreshInterval = setInterval(async () => {
        try {
            await checkForDocumentChanges();
        } catch (error) {
            console.error('Auto-refresh error:', error);
        }
    }, AUTO_REFRESH_INTERVAL);
    
    console.log('Document auto-refresh started');
}

/**
 * Stop auto-refresh
 */
export function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('Document auto-refresh stopped');
    }
}

/**
 * Check for document changes and update if needed
 */
async function checkForDocumentChanges() {
    try {
        const project = window.currentProject || 'global';
        const response = await fetch(`/documents/watch?project=${encodeURIComponent(project)}`);
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        // Compare with last known state
        const currentState = JSON.stringify(data.documents);
        
        if (lastDocumentState && lastDocumentState !== currentState) {
            console.log('Document changes detected - refreshing list');
            await loadDocuments();
        }
        
        lastDocumentState = currentState;
        
    } catch (error) {
        console.error('Error checking document changes:', error);
    }
}

/**
 * Reset auto-refresh when project changes
 */
export function resetAutoRefresh() {
    lastDocumentState = null;
    startAutoRefresh();
}

/**
 * Filter documents by search term
 * @param {string} searchTerm - Term to search for
 */
export function filterDocuments(searchTerm) {
    const container = document.getElementById('docs-list');
    if (!container) return;
    
    const documents = container.querySelectorAll('.document-item');
    const term = searchTerm.toLowerCase();
    
    documents.forEach(doc => {
        const filename = doc.getAttribute('data-filename');
        const isVisible = !term || filename.toLowerCase().includes(term);
        doc.style.display = isVisible ? 'block' : 'none';
    });
    
    // Update count of visible documents
    const visibleCount = container.querySelectorAll('.document-item[style=\"display: block\"], .document-item:not([style])').length;
    updateDocumentCount(visibleCount);
}

// Global functions for HTML onclick handlers
window.loadDocuments = loadDocuments;
window.viewDocumentChunks = viewDocumentChunks;
window.reprocessDocument = reprocessDocument;
window.deleteDocument = deleteDocument;

/**
 * View document chunks in a modal
 * @param {string} filename - Document filename
 */
async function viewDocumentChunks(filename) {
    try {
        const response = await fetch(`/documents/${encodeURIComponent(filename)}/chunks`);
        if (!response.ok) throw new Error('Failed to load chunks');
        
        const data = await response.json();
        
        // Create and show modal with chunks
        showChunksModal(filename, data.chunks || []);
        
    } catch (error) {
        console.error('Error loading chunks:', error);
        showMessage(`Error loading chunks: ${error.message}`, 'error');
    }
}

/**
 * Reprocess a document
 * @param {string} filename - Document filename
 */
async function reprocessDocument(filename) {
    if (!confirm(`Reprocess "${filename}"?\\nThis will recreate all text chunks for this document.`)) {
        return;
    }
    
    try {
        showMessage(`Reprocessing ${filename}...`, 'info');
        
        const response = await fetch(`/documents/${encodeURIComponent(filename)}/reprocess`, {
            method: 'POST'
        });
        
        if (!response.ok) throw new Error('Failed to reprocess document');
        
        showMessage(`✅ ${filename} reprocessing started`, 'success');
        
        // Refresh document list after a short delay
        setTimeout(() => {
            loadDocuments();
        }, 2000);
        
    } catch (error) {
        console.error('Error reprocessing document:', error);
        showMessage(`Error reprocessing document: ${error.message}`, 'error');
    }
}

/**
 * Delete a document
 * @param {string} filename - Document filename
 */
async function deleteDocument(filename) {
    if (!confirm(`Delete "${filename}"?\\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        showMessage(`Deleting ${filename}...`, 'info');
        
        const response = await fetch(`/documents/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete document');
        
        showMessage(`✅ ${filename} deleted successfully`, 'success');
        
        // Refresh document list
        await loadDocuments();
        
    } catch (error) {
        console.error('Error deleting document:', error);
        showMessage(`Error deleting document: ${error.message}`, 'error');
    }
}

/**
 * Show chunks modal
 * @param {string} filename - Document filename
 * @param {Array} chunks - Document chunks
 */
function showChunksModal(filename, chunks) {
    // Create modal HTML
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content chunks-modal">
            <div class="modal-header">
                <h3>📄 Document Chunks: ${filename}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div class="chunks-info">
                    <p><strong>Total chunks:</strong> ${chunks.length}</p>
                </div>
                <div class="chunks-list">
                    ${chunks.map((chunk, index) => `
                        <div class="chunk-item">
                            <div class="chunk-header">
                                <strong>Chunk ${index + 1}</strong>
                                <span class="chunk-length">${chunk.content.length} characters</span>
                            </div>
                            <div class="chunk-content">${chunk.content}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}
