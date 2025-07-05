/**
 * Theme Management System
 * Handles dynamic theme loading and CSS variable application
 */

// Cache for loaded themes
const themeCache = new Map();
let currentTheme = null;
let availableThemes = [];

/**
 * Load available themes from the directory
 * @returns {Promise<Array>} List of available themes
 */
async function loadAvailableThemes() {
  if (availableThemes.length > 0) {
    return availableThemes;
  }

  // List of theme files to check (can be expanded dynamically later)
  const themeFiles = ['base.json', 'catppuccin.json', 'dracula.json', 'tokyo-night.json', 'gruvbox.json', 'nord.json', 'solarized.json'];
  
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
 * Create theme selector dropdown with popup preview
 * @param {HTMLElement} container - Container element for the theme selector
 */
async function createThemeSelector(container) {
  const themes = await loadAvailableThemes();
  
  // Sort themes: light first, then dark
  const lightThemes = themes.filter(t => t.type === 'light').sort((a, b) => a.name.localeCompare(b.name));
  const darkThemes = themes.filter(t => t.type === 'dark').sort((a, b) => a.name.localeCompare(b.name));
  
  const selectorHTML = `
    <div class="theme-selector">
      <h3>🎨 Themes</h3>
      <div class="theme-dropdown-container">
        <label for="theme-select">Select Theme:</label>
        <div class="theme-dropdown-wrapper">
          <select id="theme-select" class="theme-dropdown">
            <optgroup label="Light Themes">
              ${lightThemes.map(theme => `
                <option value="${theme.id}" title="${theme.description}">
                  ${theme.name}
                </option>
              `).join('')}
            </optgroup>
            <optgroup label="Dark Themes">
              ${darkThemes.map(theme => `
                <option value="${theme.id}" title="${theme.description}">
                  ${theme.name}
                </option>
              `).join('')}
            </optgroup>
          </select>
          <button id="theme-info-btn" class="btn-icon theme-info-btn" title="View theme details">ℹ️</button>
        </div>
      </div>
      <div class="theme-description">
        <small id="theme-description-text">Select a theme to see its description</small>
      </div>
    </div>
    
    <!-- Theme Info Popup -->
    <div id="theme-info-popup" class="theme-popup" style="display: none;">
      <div class="theme-popup-backdrop"></div>
      <div class="theme-popup-content">
        <div class="theme-popup-header">
          <h4 id="theme-popup-title">Theme Information</h4>
          <button id="close-theme-popup" class="btn-icon">✕</button>
        </div>
        <div class="theme-popup-body">
          <div class="theme-preview-large" id="theme-preview-large"></div>
          <div class="theme-info">
            <p><strong>Name:</strong> <span id="theme-popup-name">-</span></p>
            <p><strong>Type:</strong> <span id="theme-popup-type">-</span></p>
            <p><strong>Author:</strong> <span id="theme-popup-author">-</span></p>
            <p><strong>Description:</strong> <span id="theme-popup-description">-</span></p>
          </div>
          <div class="theme-colors-preview" id="theme-colors-preview">
            <!-- Color swatches will be populated here -->
          </div>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = selectorHTML;
  
  const select = container.querySelector('#theme-select');
  const descriptionText = container.querySelector('#theme-description-text');
  const infoBtn = container.querySelector('#theme-info-btn');
  const popup = document.querySelector('#theme-info-popup');
  const closePopup = document.querySelector('#close-theme-popup');
  const backdrop = document.querySelector('.theme-popup-backdrop');
  
  // Update description on hover/selection
  function updateDescription() {
    const selectedId = select.value;
    const selectedTheme = themes.find(t => t.id === selectedId);
    if (selectedTheme) {
      descriptionText.textContent = selectedTheme.description;
    }
  }
  
  // Show theme info popup
  async function showThemeInfo() {
    const selectedId = select.value;
    const selectedTheme = themes.find(t => t.id === selectedId);
    
    if (!selectedTheme) return;
    
    try {
      const themeData = await loadThemeFile(selectedTheme.file);
      const variantData = themeData.variants[selectedTheme.variant];
      
      // Populate popup content
      document.getElementById('theme-popup-title').textContent = selectedTheme.name;
      document.getElementById('theme-popup-name').textContent = selectedTheme.name;
      document.getElementById('theme-popup-type').textContent = selectedTheme.type;
      document.getElementById('theme-popup-author').textContent = themeData.author || 'Unknown';
      document.getElementById('theme-popup-description').textContent = selectedTheme.description;
      
      // Create color preview
      const colorsPreview = document.getElementById('theme-colors-preview');
      const colors = variantData.colors;
      const mainColors = ['--primary-color', '--secondary-color', '--accent-color', '--success-color', '--warning-color', '--error-color'];
      
      colorsPreview.innerHTML = `
        <h5>Color Palette</h5>
        <div class="color-swatches">
          ${mainColors.map(colorVar => `
            <div class="color-swatch" title="${colorVar}">
              <div class="color-preview" style="background-color: ${colors[colorVar]}"></div>
              <small>${colorVar.replace('--', '').replace('-', ' ')}</small>
            </div>
          `).join('')}
        </div>
      `;
      
      // Show popup
      popup.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    } catch (error) {
      console.error('Failed to load theme info:', error);
    }
  }
  
  // Hide theme info popup
  function hideThemeInfo() {
    popup.style.display = 'none';
    document.body.style.overflow = '';
  }
  
  // Event listeners
  select.addEventListener('change', async () => {
    const themeId = select.value;
    updateDescription();
    
    try {
      await applyTheme(themeId);
    } catch (error) {
      console.error('Failed to apply theme:', error);
    }
  });
  
  select.addEventListener('mouseover', updateDescription);
  infoBtn.addEventListener('click', showThemeInfo);
  closePopup.addEventListener('click', hideThemeInfo);
  backdrop.addEventListener('click', hideThemeInfo);
  
  // Close popup with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popup.style.display === 'flex') {
      hideThemeInfo();
    }
  });
  
  // Set current theme as selected
  if (currentTheme) {
    select.value = currentTheme.id;
    updateDescription();
  }
}

/**
 * Initialize theme system
 */
async function initializeThemeSystem() {
  try {
    // Load available themes first
    await loadAvailableThemes();
    
    // Load saved theme or use default
    const savedTheme = localStorage.getItem('currentTheme');
    if (savedTheme) {
      const themeData = JSON.parse(savedTheme);
      await applyTheme(themeData.id);
    } else {
      // Apply default theme (base dark)
      await applyTheme('base-dark');
    }
  } catch (error) {
    console.error('Failed to initialize theme system:', error);
    // Fallback to CSS defaults
  }
}

// Export functions for global use
window.ThemeManager = {
  applyTheme,
  loadAvailableThemes,
  createThemeSelector,
  initializeThemeSystem,
  getCurrentTheme: () => currentTheme
};
