// UI utilities and theme management

// Theme switcher functionality with auto system theme detection
function initializeThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle.querySelector('.theme-icon');
  
  // Load saved theme or default to auto
  const savedTheme = localStorage.getItem('theme') || 'auto';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addListener(handleSystemThemeChange);
  
  function handleSystemThemeChange() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'auto') {
      // Force a re-render by briefly changing theme
      document.documentElement.setAttribute('data-theme', 'temp');
      setTimeout(() => {
        document.documentElement.setAttribute('data-theme', 'auto');
      }, 1);
    }
  }
  
  function updateThemeIcon(theme) {
    themeIcon.classList.remove('auto-icon');
    const themeText = themeToggle.querySelector('.theme-text');
    
    if (theme === 'auto') {
      themeIcon.textContent = '⚙️';
      if (themeText) themeText.textContent = 'Auto';
      themeToggle.title = 'Auto theme (follows system) - Click to switch to Dawn';
    } else if (theme === 'dark') {
      themeIcon.textContent = '☀️';
      if (themeText) themeText.textContent = 'Dark';
      themeToggle.title = 'Moon theme (dark) - Click to switch to Auto';
    } else {
      themeIcon.textContent = '🌙';
      if (themeText) themeText.textContent = 'Light';
      themeToggle.title = 'Dawn theme (light) - Click to switch to Moon';
    }
  }
  
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    let newTheme;
    
    // Cycle: auto → light → dark → auto
    if (currentTheme === 'auto') {
      newTheme = 'light';
    } else if (currentTheme === 'light') {
      newTheme = 'dark';
    } else {
      newTheme = 'auto';
    }
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });
}

// Debug toggle functionality
function initializeDebugToggle() {
  const debugToggleBtn = document.getElementById('debug-toggle');
  const debugCheckbox = document.getElementById('debug-mode');
  const debugStatus = debugToggleBtn.querySelector('.debug-status');
  
  // Load saved debug state
  const savedDebugMode = localStorage.getItem('debugMode') === 'true';
  debugCheckbox.checked = savedDebugMode;
  updateDebugUI(savedDebugMode);
  
  function updateDebugUI(isActive) {
    if (isActive) {
      debugToggleBtn.classList.add('active');
      debugStatus.textContent = 'On';
    } else {
      debugToggleBtn.classList.remove('active');
      debugStatus.textContent = 'Off';
    }
  }
  
  debugToggleBtn.addEventListener('click', () => {
    const newState = !debugCheckbox.checked;
    debugCheckbox.checked = newState;
    
    // Save to localStorage
    localStorage.setItem('debugMode', newState.toString());
    
    // Update UI
    updateDebugUI(newState);
  });
}

// Initialize all UI functionality
function initializeUI() {
  initializeThemeToggle();
  initializeDebugToggle();
  initializeSidebarToggle();
}

// Sidebar toggle functionality
function initializeSidebarToggle() {
  // Initialize sidebar states from localStorage
  initializeSidebarStates();
  
  // Setup event listeners
  setupSidebarEventListeners();
  
  // Handle responsive behavior
  window.addEventListener('resize', handleSidebarResize);
  handleSidebarResize();
}

function initializeSidebarStates() {
  // Load saved left sidebar state
  const leftHidden = localStorage.getItem('leftSidebarHidden') === 'true';
  const appContainer = document.querySelector('.app-container');
  
  if (leftHidden && appContainer) {
    const toggleBtn = document.getElementById('toggle-left-sidebar');
    appContainer.classList.add('left-sidebar-hidden');
    if (toggleBtn) toggleBtn.style.opacity = '0.6';
  }
  
  // Right sidebar starts visible by default
  // No need to initialize from localStorage for right sidebar
}

function setupSidebarEventListeners() {
  // Right sidebar toggle
  document.getElementById('toggle-right-sidebar')?.addEventListener('click', () => {
    console.log('Right sidebar toggle clicked');
    toggleRightSidebar();
  });
  
  // Left sidebar toggle
  document.getElementById('toggle-left-sidebar')?.addEventListener('click', () => {
    console.log('Left sidebar toggle clicked');
    toggleLeftSidebar();
  });
  
  // Mobile menu toggle
  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    toggleLeftSidebar();
  });
  
  // Close right sidebar (mobile)
  document.getElementById('close-right-sidebar')?.addEventListener('click', () => {
    closeRightSidebar();
  });
  
  // Close right sidebar (desktop)
  document.getElementById('close-right-sidebar-desktop')?.addEventListener('click', () => {
    console.log('Right sidebar close button clicked (desktop)');
    closeRightSidebar();
  });
  
  // ESC key to close right sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const rightSidebar = document.getElementById('right-sidebar');
      const appContainer = document.querySelector('.app-container');
      
      // Check if right sidebar is visible
      if (rightSidebar && appContainer && !appContainer.classList.contains('right-sidebar-hidden')) {
        console.log('ESC pressed - closing right sidebar');
        closeRightSidebar();
      }
    }
  });
}

function toggleRightSidebar() {
  const appContainer = document.querySelector('.app-container');
  const rightSidebar = document.getElementById('right-sidebar');
  
  if (!appContainer || !rightSidebar) {
    console.error('Elements not found for right sidebar toggle');
    return;
  }
  
  // Toggle the state
  const isHidden = appContainer.classList.contains('right-sidebar-hidden');
  
  if (isHidden) {
    // Show sidebar
    appContainer.classList.remove('right-sidebar-hidden');
    rightSidebar.style.display = 'block';
  } else {
    // Hide sidebar
    appContainer.classList.add('right-sidebar-hidden');
    rightSidebar.style.display = 'none';
  }
}

function toggleLeftSidebar() {
  const leftSidebar = document.querySelector('.left-sidebar');
  const appContainer = document.querySelector('.app-container');
  const toggleBtn = document.getElementById('toggle-left-sidebar');
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile && leftSidebar) {
    // Mobile behavior
    const isVisible = leftSidebar.classList.contains('visible');
    
    if (isVisible) {
      leftSidebar.classList.remove('visible');
      hideOverlay();
    } else {
      leftSidebar.classList.add('visible');
      showOverlay();
    }
  } else {
    // Desktop behavior
    if (!appContainer || !toggleBtn) {
      console.error('Elements not found for left sidebar toggle');
      return;
    }
    
    const isHidden = appContainer.classList.contains('left-sidebar-hidden');
    
    if (isHidden) {
      // Show sidebar
      appContainer.classList.remove('left-sidebar-hidden');
      toggleBtn.style.opacity = '1';
      localStorage.setItem('leftSidebarHidden', 'false');
    } else {
      // Hide sidebar
      appContainer.classList.add('left-sidebar-hidden');
      toggleBtn.style.opacity = '0.6';
      localStorage.setItem('leftSidebarHidden', 'true');
    }
  }
}

function closeRightSidebar() {
  const appContainer = document.querySelector('.app-container');
  const rightSidebar = document.getElementById('right-sidebar');
  
  if (!appContainer || !rightSidebar) {
    console.error('Elements not found for close right sidebar');
    return;
  }
  
  // Force close the sidebar
  appContainer.classList.add('right-sidebar-hidden');
  rightSidebar.style.display = 'none';
}

function showOverlay() {
  let overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', () => {
      // Close any open sidebar
      if (window.innerWidth <= 768) {
        const leftSidebar = document.querySelector('.left-sidebar');
        if (leftSidebar?.classList.contains('visible')) {
          toggleLeftSidebar();
          return;
        }
      }
      toggleRightSidebar();
    });
    document.body.appendChild(overlay);
  }
  overlay.classList.add('visible');
}

function hideOverlay() {
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) {
    overlay.classList.remove('visible');
  }
}

function handleSidebarResize() {
  const width = window.innerWidth;
  
  // For now, keep desktop behavior simple
  if (width > 1024) {
    // Desktop - keep current toggle state
  } else {
    // Mobile/tablet - could add special handling here
  }
}

/**
 * UI Utility Functions
 * Centralized functions for UI management and user feedback
 */

/**
 * Show a message to the user
 * @param {string} message - The message to display
 * @param {string} type - Message type: 'success', 'error', 'warning', 'info'
 * @param {HTMLElement|null} container - Optional container element, defaults to global message area
 */
function showMessage(message, type = 'info', container = null) {
    // If no container specified, create a global message or use default
    if (!container) {
        // Try to find a global message container
        container = document.getElementById('global-message') || 
                   document.getElementById('upload-msg') ||
                   document.querySelector('.status-msg');
        
        // If still no container, create a temporary toast
        if (!container) {
            showToast(message, type);
            return;
        }
    }
    
    // Clear existing content and classes
    container.textContent = message;
    container.className = `status-msg ${type}`;
    
    // Auto-clear after delay for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            container.textContent = '';
            container.className = 'status-msg';
        }, 5000);
    }
}

/**
 * Show a temporary toast message
 */
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    // Set color based on type
    switch(type) {
        case 'success':
            toast.style.background = '#10b981';
            break;
        case 'error':
            toast.style.background = '#ef4444';
            break;
        case 'warning':
            toast.style.background = '#f59e0b';
            break;
        default:
            toast.style.background = '#3b82f6';
    }
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}
