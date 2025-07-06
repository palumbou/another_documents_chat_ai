/**
 * Theme Management System
 * Handles dynamic theme loading and CSS variable application
 */

// Cache for loaded themes
const themeCache = new Map();
let currentTheme = null;
let availableThemes = [];

/**
 * Dynamically discover and load available themes from the themes directory
 * @returns {Promise<Array>} List of available themes with light/dark variants
 */
async function loadAvailableThemes() {
  if (availableThemes.length > 0) {
    return availableThemes;
  }

  // Try to get list of theme files dynamically
  let themeFiles = [];
  try {
    // Try to discover theme files by attempting to load common ones
    const commonThemes = [
      'base.json', 
      'Ayu.json', 
      'Catppuccin.json', 
      'Dracula.json', 
      'Gruvbox.json',
      'Material_Theme.json',
      'Monokai_Pro.json',
      'Nord.json',
      'One_Dark.json',
      'One_Light.json',
      'Palenight.json',
      'Rose_Pine.json',
      'Solarized.json',
      'Tokyo_Night.json'
    ];
    
    // Test which theme files actually exist
    for (const file of commonThemes) {
      try {
        const response = await fetch(`/static/themes/${file}`);
        if (response.ok) {
          themeFiles.push(file);
        }
      } catch (e) {
        // File doesn't exist, skip it
        console.log(`Theme file ${file} not found, skipping`);
      }
    }
  } catch (error) {
    console.error('Error discovering theme files:', error);
    // Fallback to base theme only
    themeFiles = ['base.json'];
  }
  
  availableThemes = [];
  
  for (const file of themeFiles) {
    try {
      const themeData = await loadThemeFile(file);
      if (themeData && themeData.variants) {
        Object.entries(themeData.variants).forEach(([variantKey, variantData]) => {
          availableThemes.push({
            id: `${file.replace('.json', '')}-${variantKey}`,
            file: file,
            variant: variantKey,
            name: variantData.name,
            description: variantData.description,
            type: variantData.type,
            parentTheme: themeData.name
          });
        });
      }
    } catch (error) {
      console.warn(`Failed to load theme ${file}:`, error);
    }
  }
  
  return availableThemes;
}

/**
 * Load a theme file from the server
 * @param {string} filename - The theme filename to load
 * @returns {Promise<Object>} Theme data
 */
async function loadThemeFile(filename) {
  if (themeCache.has(filename)) {
    return themeCache.get(filename);
  }

  try {
    const response = await fetch(`/static/themes/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load theme: ${response.statusText}`);
    }
    
    const themeData = await response.json();
    themeCache.set(filename, themeData);
    return themeData;
  } catch (error) {
    console.error('Error loading theme:', error);
    throw error;
  }
}

/**
 * Apply theme colors to CSS custom properties
 * @param {Object} colors - Color definitions from theme file
 */
function applyThemeColors(colors) {
  if (!colors || typeof colors !== 'object') {
    console.error('Invalid colors object:', colors);
    return;
  }
  
  const root = document.documentElement;
  
  // Apply each color variable
  Object.entries(colors).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}

/**
 * Apply a theme by ID
 * @param {string} themeId - Theme identifier (format: "filename-variant")
 */
async function applyTheme(themeId) {
  try {
    // Find theme in available themes
    const themes = await loadAvailableThemes();
    const themeInfo = themes.find(t => t.id === themeId);
    
    if (!themeInfo) {
      throw new Error(`Theme not found: ${themeId}`);
    }

    // Load theme file
    const themeData = await loadThemeFile(themeInfo.file);
    const variantData = themeData.variants[themeInfo.variant];
    
    if (!variantData || !variantData.colors) {
      throw new Error(`Invalid theme variant: ${themeId}`);
    }
    
    // Apply the theme colors
    applyThemeColors(variantData.colors);
    
    // Update theme attribute for additional styling
    document.documentElement.setAttribute('data-theme', themeId);
    document.documentElement.setAttribute('data-theme-type', variantData.type);
    
    // Save current theme
    currentTheme = { id: themeId, ...themeInfo };
    localStorage.setItem('currentTheme', JSON.stringify(currentTheme));
    
    console.log(`Applied theme: ${themeInfo.name}`);
    
    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { themeId, themeInfo } 
    }));
    
  } catch (error) {
    console.error('Failed to apply theme:', error);
    throw error;
  }
}

/**
 * Create advanced theme selector with auto/manual modes and separate light/dark themes
 * @param {HTMLElement} container - Container element for the theme selector
 */
async function createThemeSelector(container) {
  const themes = await loadAvailableThemes();
  const config = getThemeConfiguration();
  
  // Sort themes: light first, then dark
  const lightThemes = themes.filter(t => t.type === 'light').sort((a, b) => a.name.localeCompare(b.name));
  const darkThemes = themes.filter(t => t.type === 'dark').sort((a, b) => a.name.localeCompare(b.name));
  
  const selectorHTML = `
    <div class="theme-selector">
      <h3>🎨 Theme Configuration</h3>
      
      <!-- Theme Mode Selection -->
      <div class="theme-mode-section">
        <label for="theme-mode-select">Theme Mode:</label>
        <select id="theme-mode-select" class="theme-dropdown">
          <option value="auto" ${config.mode === 'auto' ? 'selected' : ''}>🌓 Auto (Follow System)</option>
          <option value="light" ${config.mode === 'light' ? 'selected' : ''}>☀️ Always Light</option>
          <option value="dark" ${config.mode === 'dark' ? 'selected' : ''}>🌙 Always Dark</option>
        </select>
        <small class="mode-description">
          Auto mode automatically switches between your light and dark theme preferences based on your system settings.
        </small>
      </div>
      
      <!-- Light Theme Selection -->
      <div class="theme-dropdown-container">
        <label for="light-theme-select">Light Theme:</label>
        <div class="theme-dropdown-wrapper">
          <select id="light-theme-select" class="theme-dropdown">
            ${lightThemes.map(theme => `
              <option value="${theme.id}" ${config.lightTheme === theme.id ? 'selected' : ''} title="${theme.description}">
                ${theme.parentTheme} - ${theme.name}
              </option>
            `).join('')}
          </select>
          <button class="btn-icon theme-info-btn" data-theme-type="light" title="Preview light theme">👁️</button>
        </div>
      </div>
      
      <!-- Dark Theme Selection -->
      <div class="theme-dropdown-container">
        <label for="dark-theme-select">Dark Theme:</label>
        <div class="theme-dropdown-wrapper">
          <select id="dark-theme-select" class="theme-dropdown">
            ${darkThemes.map(theme => `
              <option value="${theme.id}" ${config.darkTheme === theme.id ? 'selected' : ''} title="${theme.description}">
                ${theme.parentTheme} - ${theme.name}
              </option>
            `).join('')}
          </select>
          <button class="btn-icon theme-info-btn" data-theme-type="dark" title="Preview dark theme">👁️</button>
        </div>
      </div>
      
      <!-- Current Status -->
      <div class="theme-status">
        <small>
          <strong>Currently active:</strong> <span id="current-theme-status">${config.currentTheme?.name || 'Unknown'}</span>
        </small>
      </div>
    </div>
  `;
  
  container.innerHTML = selectorHTML;
  
  // Set up event listeners
  setupThemeSelectorEvents(container);
}

/**
 * Set up event listeners for the advanced theme selector
 */
function setupThemeSelectorEvents(container) {
  // Theme mode change
  const modeSelect = container.querySelector('#theme-mode-select');
  if (modeSelect) {
    modeSelect.addEventListener('change', async (e) => {
      await setThemeMode(e.target.value);
      updateThemeStatus();
    });
  }
  
  // Light theme change
  const lightSelect = container.querySelector('#light-theme-select');
  if (lightSelect) {
    lightSelect.addEventListener('change', async (e) => {
      await setLightTheme(e.target.value);
      updateThemeStatus();
    });
  }
  
  // Dark theme change
  const darkSelect = container.querySelector('#dark-theme-select');
  if (darkSelect) {
    darkSelect.addEventListener('change', async (e) => {
      await setDarkTheme(e.target.value);
      updateThemeStatus();
    });
  }
  
  // Preview buttons
  const previewButtons = container.querySelectorAll('.theme-info-btn');
  previewButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const themeType = btn.dataset.themeType;
      const selectElement = container.querySelector(`#${themeType}-theme-select`);
      if (selectElement) {
        const themeId = selectElement.value;
        previewTheme(themeId);
      }
    });
  });
}

/**
 * Update theme status display
 */
function updateThemeStatus() {
  const statusElement = document.getElementById('current-theme-status');
  if (statusElement && currentTheme) {
    statusElement.textContent = currentTheme.name;
  }
}

/**
 * Preview a theme temporarily
 */
async function previewTheme(themeId) {
  const originalTheme = currentTheme;
  try {
    await applyTheme(themeId);
    
    // Show a toast with option to keep or revert
    showThemePreviewToast(themeId, originalTheme);
  } catch (error) {
    console.error('Failed to preview theme:', error);
  }
}

/**
 * Show theme preview toast with keep/revert options
 */
function showThemePreviewToast(previewThemeId, originalTheme) {
  const toast = document.createElement('div');
  toast.className = 'theme-preview-toast';
  toast.innerHTML = `
    <div class="toast-content">
      <span>Theme preview active</span>
      <div class="toast-actions">
        <button id="keep-theme" class="btn-small btn-primary">Keep</button>
        <button id="revert-theme" class="btn-small btn-secondary">Revert</button>
      </div>
    </div>
  `;
  
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--accent-color);
    color: white;
    padding: 1rem;
    border-radius: 8px;
    z-index: 2000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  
  document.body.appendChild(toast);
  
  // Keep theme
  toast.querySelector('#keep-theme').addEventListener('click', () => {
    // Theme is already applied, just clean up
    toast.remove();
    updateThemeStatus();
  });
  
  // Revert theme
  toast.querySelector('#revert-theme').addEventListener('click', async () => {
    if (originalTheme) {
      await applyTheme(originalTheme.id);
    }
    toast.remove();
    updateThemeStatus();
  });
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.remove();
    }
  }, 10000);
}

// Theme system state
let themeMode = 'auto'; // 'auto', 'light', 'dark'
let lightTheme = 'base-light';
let darkTheme = 'base-dark';
let systemThemeListener = null;

/**
 * Advanced theme initialization with auto/manual modes
 */
async function initializeThemeSystem() {
  try {
    // Load available themes first
    await loadAvailableThemes();
    
    // Load saved preferences
    const savedMode = localStorage.getItem('themeMode') || 'auto';
    const savedLightTheme = localStorage.getItem('lightTheme') || 'base-light';
    const savedDarkTheme = localStorage.getItem('darkTheme') || 'base-dark';
    
    themeMode = savedMode;
    lightTheme = savedLightTheme;
    darkTheme = savedDarkTheme;
    
    // Apply theme based on mode
    await applyCurrentTheme();
    
    // Set up system theme listener for auto mode
    setupSystemThemeListener();
    
  } catch (error) {
    console.error('Failed to initialize theme system:', error);
    // Fallback to CSS defaults
  }
}

/**
 * Set up listener for system theme changes
 */
function setupSystemThemeListener() {
  if (!window.matchMedia) return;
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleSystemThemeChange = (e) => {
    if (themeMode === 'auto') {
      applyCurrentTheme();
    }
  };
  
  // Remove existing listener if any
  if (systemThemeListener) {
    mediaQuery.removeListener(systemThemeListener);
  }
  
  systemThemeListener = handleSystemThemeChange;
  mediaQuery.addListener(systemThemeListener);
}

/**
 * Apply current theme based on mode and preferences
 */
async function applyCurrentTheme() {
  let themeToApply;
  
  if (themeMode === 'auto') {
    // Use system preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    themeToApply = prefersDark ? darkTheme : lightTheme;
  } else if (themeMode === 'dark') {
    themeToApply = darkTheme;
  } else {
    themeToApply = lightTheme;
  }
  
  await applyTheme(themeToApply);
}

/**
 * Set theme mode (auto, light, dark)
 */
async function setThemeMode(mode) {
  themeMode = mode;
  localStorage.setItem('themeMode', mode);
  await applyCurrentTheme();
}

/**
 * Set specific theme for light mode
 */
async function setLightTheme(themeId) {
  lightTheme = themeId;
  localStorage.setItem('lightTheme', themeId);
  if (themeMode === 'light' || (themeMode === 'auto' && !window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    await applyCurrentTheme();
  }
}

/**
 * Set specific theme for dark mode
 */
async function setDarkTheme(themeId) {
  darkTheme = themeId;
  localStorage.setItem('darkTheme', themeId);
  if (themeMode === 'dark' || (themeMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    await applyCurrentTheme();
  }
}

/**
 * Get current theme configuration
 */
function getThemeConfiguration() {
  return {
    mode: themeMode,
    lightTheme: lightTheme,
    darkTheme: darkTheme,
    currentTheme: currentTheme
  };
}

// Export functions for global use
window.ThemeManager = {
  applyTheme,
  loadAvailableThemes,
  createThemeSelector,
  initializeThemeSystem,
  setThemeMode,
  setLightTheme,
  setDarkTheme,
  getThemeConfiguration,
  getCurrentTheme: () => currentTheme
};
