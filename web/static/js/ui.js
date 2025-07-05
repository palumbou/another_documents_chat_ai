/**
 * UI Management Module
 * Handles user interface interactions, modal management, and settings
 */

// Settings Modal Management
function initializeSettingsModal() {
  const settingsModal = document.getElementById('settings-modal');
  const toggleSettings = document.getElementById('toggle-settings');
  const closeModal = document.getElementById('close-settings');
  const modalBackdrop = document.querySelector('.settings-modal-backdrop');
  
  if (!settingsModal || !toggleSettings) {
    console.warn('Settings modal elements not found');
    return;
  }
  
  // Show modal
  function showModal() {
    settingsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Focus trap
    setTimeout(() => {
      const firstFocusable = settingsModal.querySelector('button, input, select, textarea');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }, 100);
  }
  
  // Hide modal
  function hideModal() {
    settingsModal.style.display = 'none';
    document.body.style.overflow = '';
  }
  
  // Event listeners
  toggleSettings.addEventListener('click', (e) => {
    e.preventDefault();
    showModal();
  });
  
  if (closeModal) {
    closeModal.addEventListener('click', hideModal);
  }
  
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', hideModal);
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal.style.display === 'flex') {
      hideModal();
    }
  });
}

// Debug toggle functionality
function initializeDebugToggle() {
  const debugToggle = document.getElementById('debug-toggle');
  const debugMode = document.getElementById('debug-mode');
  
  if (!debugToggle || !debugMode) {
    console.warn('Debug toggle elements not found');
    return;
  }
  
  // Load saved debug state
  const savedDebugMode = localStorage.getItem('debugMode') === 'true';
  debugToggle.checked = savedDebugMode;
  debugMode.checked = savedDebugMode;
  
  // Update debug state when toggle changes
  debugToggle.addEventListener('change', () => {
    const newState = debugToggle.checked;
    debugMode.checked = newState;
    
    // Save to localStorage
    localStorage.setItem('debugMode', newState.toString());
    
    console.log('Debug mode:', newState ? 'enabled' : 'disabled');
  });
}

// Initialize all UI functionality
function initializeUI() {
  initializeSettingsModal();
  initializeDebugToggle();
  
  // Initialize theme system
  if (window.ThemeManager) {
    window.ThemeManager.initializeThemeSystem().then(() => {
      // Create theme selector in the settings modal
      const themeContainer = document.getElementById('theme-selector-container');
      if (themeContainer) {
        window.ThemeManager.createThemeSelector(themeContainer);
      }
    }).catch(error => {
      console.error('Failed to initialize theme system:', error);
    });
  }
}

// Export functions for global access
window.initializeUI = initializeUI;
