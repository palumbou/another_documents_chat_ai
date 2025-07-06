/**
 * Main Application Initialization Script
 * 
 * This script handles the initialization of legacy components.
 * Most functionality is now handled by the modular ES6 system
 * that auto-initializes via imports in the HTML.
 */

// Initialize all modules when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for all elements to be ready
  setTimeout(function() {
    // Initialize remaining legacy modules
    try {
      console.log('🚀 Starting legacy components initialization...');
      
      // Chat functionality (legacy, but still active)
      if (typeof initializeChat === 'function') {
        initializeChat();
        console.log('✅ Chat initialized');
      }
      
      // Note: Most functionality (status monitoring, UI, utils, models)
      // is now handled by the modular ES6 system that auto-initializes
      
      // Chat functionality
      if (typeof initializeChat === 'function') {
        initializeChat();
        console.log('✅ Chat initialized');
      }
      
      // Document management
      if (typeof initializeDocuments === 'function') {
        initializeDocuments();
        console.log('✅ Documents initialized');
      }
      
      // Model management (now modular)
      // The new modular model system initializes itself
      
      // File upload improvements
      if (typeof setupImprovedFileUpload === 'function') {
        setupImprovedFileUpload();
        console.log('✅ File upload initialized');
      }
      
      console.log('🎉 Application initialization complete!');
      
    } catch (error) {
      console.error('💥 Error during initialization:', error);
    }
  }, 500);
});

// Make functions available globally for onclick handlers
// Note: deleteDocument is made global by document-list.js module
window.retryProcessing = retryProcessing;
window.createProject = createProject;
window.loadProjects = loadProjects;
window.loadExistingDocuments = loadExistingDocuments;
window.checkStatus = checkStatus;
window.toggleChunkContent = toggleChunkContent;
window.clearChunkSearch = clearChunkSearch;
window.copyChunkContent = copyChunkContent;
window.copyAllChunks = copyAllChunks;
window.deleteCurrentProject = deleteCurrentProject;
window.closeChunksModal = closeChunksModal;
window.searchInChunks = searchInChunks;
