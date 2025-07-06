/**
 * Documents Management - Main Module
 * Coordinates all document-related functionality including upload, listing, and management
 * This is the main entry point that initializes and coordinates all document modules
 */

// Load modules using dynamic imports for better browser compatibility
let documentUpload, documentList, documentUtils;

/**
 * Initialize all document functionality
 * This is the main initialization function called when the page loads
 */
async function initializeDocuments() {
    console.log('Initializing Documents Management System...');
    
    try {
        // Dynamically load modules
        documentUpload = await import('./modules/document/document-upload.js');
        documentList = await import('./modules/document/document-list.js');
        documentUtils = await import('./modules/document/document-utils.js');
        
        // Initialize all document modules
        documentUpload.initializeUpload();
        documentList.initializeDocumentList();
        setupProjectChangeHandler();
        setupSearchHandler();
        
        console.log('✅ Documents Management System initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize Documents Management System:', error);
        // Fallback to basic functionality without modules
        initializeBasicDocuments();
    }
}

/**
 * Setup handler for project changes
 * When the user switches projects, we need to refresh the document list and reset auto-refresh
 */
function setupProjectChangeHandler() {
    const projectSelect = document.getElementById('project-select');
    if (!projectSelect) {
        console.warn('Project selector not found - project change handling disabled');
        return;
    }
    
    projectSelect.addEventListener('change', (event) => {
        const newProject = event.target.value;
        const oldProject = window.currentProject;
        
        if (newProject !== oldProject) {
            console.log(`Project changed: ${oldProject} → ${newProject}`);
            
            // Update global project state
            window.currentProject = newProject;
            
            // Clear any existing messages
            clearMessages();
            
            // Reset auto-refresh with new project
            resetAutoRefresh();
            
            // Load documents for new project
            loadDocuments();
            
            showMessage(`Switched to project: ${newProject}`, 'info');
        }
    });
    
    console.log('Project change handler setup complete');
}

/**
 * Setup search handler for filtering documents
 */
function setupSearchHandler() {
    const searchInput = document.getElementById('doc-search');
    if (!searchInput) {
        console.warn('Document search input not found - search functionality disabled');
        return;
    }
    
    // Real-time search as user types
    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value;
        filterDocuments(searchTerm);
    });
    
    // Clear search on escape key
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.target.value = '';
            filterDocuments('');
        }
    });
    
    console.log('Document search handler setup complete');
}

/**
 * Handle manual refresh button click
 */
export function refreshDocuments() {
    clearMessages();
    showMessage('Refreshing documents...', 'info');
    loadDocuments();
}

/**
 * Handle manual upload button click
 */
export function triggerFileUpload() {
    const fileInput = document.getElementById('doc-file');
    if (fileInput) {
        fileInput.click();
    }
}

/**
 * Cancel current upload if in progress
 */
export function cancelUpload() {
    const wasCancelled = cancelCurrentUpload();
    if (!wasCancelled) {
        showMessage('No upload in progress to cancel', 'info');
    }
}

/**
 * Get current upload status
 * @returns {boolean} True if upload is in progress
 */
export function getUploadStatus() {
    return isUploadInProgress();
}

/**
 * Clean up resources when leaving the page
 */
export function cleanup() {
    stopAutoRefresh();
    cancelCurrentUpload();
    console.log('Documents Management System cleaned up');
}

// Make functions available globally for HTML onclick handlers
window.refreshDocuments = refreshDocuments;
window.triggerFileUpload = triggerFileUpload;
window.cancelUpload = cancelUpload;
window.loadDocuments = loadDocuments;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDocuments);
} else {
    initializeDocuments();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);
