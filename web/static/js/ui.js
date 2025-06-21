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
    
    if (theme === 'auto') {
      themeIcon.textContent = '🔄';
      themeIcon.classList.add('auto-icon');
      themeToggle.title = 'Auto theme (follows system) - Click to switch to Dawn';
    } else if (theme === 'dark') {
      themeIcon.textContent = '☀️';
      themeToggle.title = 'Moon theme (dark) - Click to switch to Auto';
    } else {
      themeIcon.textContent = '🌙';
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

// Initialize all UI functionality
function initializeUI() {
  initializeThemeToggle();
}
