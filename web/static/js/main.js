// Main initialization script

// Initialize all modules when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for all elements to be ready
  setTimeout(function() {
    // Initialize all modules
    try {
      
      if (typeof initializeStatusMonitoring === 'function') {
        initializeStatusMonitoring();
      }
      if (typeof initializeChat === 'function') {
        initializeChat();
      }
      if (typeof initializeDocuments === 'function') {
        initializeDocuments();
      }
      if (typeof initializeModels === 'function') {
        initializeModels();
      }
      if (typeof initializeUI === 'function') {
        initializeUI();
      }
      if (typeof initializeUtils === 'function') {
        initializeUtils();
      }
      if (typeof setupImprovedFileUpload === 'function') {
        setupImprovedFileUpload();
      }
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }, 500);
});

// Make functions available globally for onclick handlers
window.viewDocumentChunks = viewDocumentChunks;
window.deleteDocument = deleteDocument;
window.retryProcessing = retryProcessing;
window.createProject = createProject;
window.loadProjects = loadProjects;
window.loadExistingDocuments = loadExistingDocuments;
window.checkStatus = checkStatus;
