/**
 * Settings Manager Module
 * Handles application settings and preferences
 * 
 * Features:
 * - Debug mode toggle
 * - Local storage persistence
 * - Theme management integration
 * - Settings validation
 */

export class SettingsManager {
    constructor() {
        this.settings = {
            debugMode: false,
            theme: 'auto',
            autoRefresh: true,
            refreshInterval: 15000
        };
        this.loadSettings();
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('appSettings');
            if (saved) {
                const parsedSettings = JSON.parse(saved);
                this.settings = { ...this.settings, ...parsedSettings };
            }
        } catch (error) {
            console.warn('Failed to load settings from localStorage:', error);
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('appSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings to localStorage:', error);
        }
    }

    /**
     * Get a specific setting value
     * @param {string} key - Setting key
     * @returns {any} Setting value
     */
    get(key) {
        return this.settings[key];
    }

    /**
     * Set a specific setting value
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     * @param {boolean} persist - Whether to save to localStorage (default: true)
     */
    set(key, value, persist = true) {
        this.settings[key] = value;
        if (persist) {
            this.saveSettings();
        }
    }

    /**
     * Initialize debug mode toggle
     */
    initializeDebugToggle() {
        const debugToggle = document.getElementById('debug-toggle');
        const debugMode = document.getElementById('debug-mode');
        
        if (!debugToggle || !debugMode) {
            console.warn('Debug toggle elements not found');
            return;
        }
        
        // Set initial state from settings
        const debugState = this.get('debugMode');
        debugToggle.checked = debugState;
        debugMode.checked = debugState;
        
        // Update debug state when toggle changes
        debugToggle.addEventListener('change', () => {
            const newState = debugToggle.checked;
            debugMode.checked = newState;
            
            // Save to settings
            this.set('debugMode', newState);
            
            console.log('Debug mode:', newState ? 'enabled' : 'disabled');
            
            // Trigger debug mode change event
            this.dispatchSettingChange('debugMode', newState);
        });
    }

    /**
     * Initialize all settings UI elements
     */
    initializeSettingsUI() {
        this.initializeDebugToggle();
        // Add other settings initialization here as needed
    }

    /**
     * Dispatch a custom event when a setting changes
     * @param {string} settingKey - The key of the setting that changed
     * @param {any} newValue - The new value
     */
    dispatchSettingChange(settingKey, newValue) {
        const event = new CustomEvent('settingChanged', {
            detail: {
                key: settingKey,
                value: newValue,
                allSettings: { ...this.settings }
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Reset all settings to defaults
     */
    resetToDefaults() {
        this.settings = {
            debugMode: false,
            theme: 'auto',
            autoRefresh: true,
            refreshInterval: 15000
        };
        this.saveSettings();
        
        // Re-initialize UI to reflect changes
        this.initializeSettingsUI();
        
        console.log('Settings reset to defaults');
    }

    /**
     * Validate settings object
     * @param {Object} settings - Settings to validate
     * @returns {boolean} Whether settings are valid
     */
    validateSettings(settings) {
        const validKeys = ['debugMode', 'theme', 'autoRefresh', 'refreshInterval'];
        
        for (const key in settings) {
            if (!validKeys.includes(key)) {
                console.warn(`Invalid setting key: ${key}`);
                return false;
            }
        }
        
        // Validate specific setting types
        if (settings.debugMode !== undefined && typeof settings.debugMode !== 'boolean') {
            console.warn('debugMode must be a boolean');
            return false;
        }
        
        if (settings.refreshInterval !== undefined && (typeof settings.refreshInterval !== 'number' || settings.refreshInterval < 1000)) {
            console.warn('refreshInterval must be a number >= 1000');
            return false;
        }
        
        return true;
    }

    /**
     * Import settings from an object
     * @param {Object} newSettings - Settings to import
     * @returns {boolean} Whether import was successful
     */
    importSettings(newSettings) {
        if (!this.validateSettings(newSettings)) {
            return false;
        }
        
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        this.initializeSettingsUI();
        
        console.log('Settings imported successfully');
        return true;
    }

    /**
     * Export current settings
     * @returns {Object} Current settings object
     */
    exportSettings() {
        return { ...this.settings };
    }
}

// Create and export singleton instance
export const settingsManager = new SettingsManager();
