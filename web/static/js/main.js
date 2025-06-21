// Main initialization script

// Initialize all modules when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for all elements to be ready
  setTimeout(function() {
    // Initialize all modules
    try {
      // Ensure chatHistory is available globally
      if (typeof chatHistory !== 'undefined') {
        window.chatHistory = chatHistory;
        console.log('Chat history initialized:', !!window.chatHistory);
      }
      
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
      // Initialize chat history last
      if (window.chatHistory) {
        window.chatHistory.loadProjectChats();
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
window.toggleChunkContent = toggleChunkContent;
window.clearChunkSearch = clearChunkSearch;
window.copyChunkContent = copyChunkContent;
window.copyAllChunks = copyAllChunks;
window.createProject = createProject;
window.deleteCurrentProject = deleteCurrentProject;
window.loadProjects = loadProjects;
window.loadExistingDocuments = loadExistingDocuments;
window.checkStatus = checkStatus;
