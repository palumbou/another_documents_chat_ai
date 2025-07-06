/**
 * UI Main Module
 * Main entry point for all UI functionality
 * 
 * This module orchestrates all UI components and provides a unified interface
 * for initializing and managing the user interface.
 */

import { modalManager } from './modal-manager.js';
import { settingsManager } from './settings-manager.js';
import { systemStatus } from '../utils/system-status.js';

/**
 * Main UI Controller Class
 * Manages all UI components and their interactions
 */
export class UIController {
    constructor() {
        this.isInitialized = false;
        this.components = {
            modalManager,
            settingsManager,
            systemStatus
        };
    }

    /**
     * Initialize all UI components
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('UI already initialized');
            return;
        }

        try {
            // Initialize settings modal
            this.initializeSettingsModal();
            
            // Initialize settings UI
            this.components.settingsManager.initializeSettingsUI();
            
            // Initialize theme system
            await this.initializeThemeSystem();
            
            // Start system monitoring
            this.components.systemStatus.startMonitoring();
            
            // Set up global event listeners
            this.setupGlobalEventListeners();
            
            this.isInitialized = true;
            console.log('UI initialization complete');
            
        } catch (error) {
            console.error('UI initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize the settings modal
     */
    initializeSettingsModal() {
        this.components.modalManager.initializeModal(
            'settings-modal',
            'toggle-settings',
            'close-settings',
            {
                focusTrap: true,
                clickOutsideToClose: true
            }
        );
    }

    /**
     * Initialize the theme system
     */
    async initializeThemeSystem() {
        if (window.ThemeManager) {
            try {
                await window.ThemeManager.initializeThemeSystem();
                
                // Create theme selector in the settings modal
                const themeContainer = document.getElementById('theme-selector-container');
                if (themeContainer) {
                    window.ThemeManager.createThemeSelector(themeContainer);
                } else {
                    console.warn('Theme selector container not found');
                }
            } catch (error) {
                console.error('Failed to initialize theme system:', error);
            }
        } else {
            console.warn('ThemeManager not available');
        }
    }

    /**
     * Set up global event listeners
     */
    setupGlobalEventListeners() {
        // Listen for setting changes
        document.addEventListener('settingChanged', (event) => {
            this.handleSettingChange(event.detail);
        });

        // Listen for system status updates
        this.components.systemStatus.addStatusUpdateCallback((statusData) => {
            this.handleStatusUpdate(statusData);
        });

        // Handle window resize
        window.addEventListener('resize', this.debounce(() => {
            this.handleWindowResize();
        }, 250));

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }

    /**
     * Handle setting changes
     * @param {Object} settingData - Setting change data
     */
    handleSettingChange(settingData) {
        const { key, value } = settingData;
        
        switch (key) {
            case 'debugMode':
                console.log(`Debug mode ${value ? 'enabled' : 'disabled'}`);
                // Additional debug mode handling if needed
                break;
            case 'theme':
                console.log(`Theme changed to: ${value}`);
                break;
            default:
                console.log(`Setting '${key}' changed to:`, value);
        }
    }

    /**
     * Handle system status updates
     * @param {Object} statusData - Status update data
     */
    handleStatusUpdate(statusData) {
        // Handle status-specific UI updates if needed
        if (statusData.error) {
            console.warn('System status error:', statusData.error);
        }
        
        // Update UI elements based on status
        this.updateStatusIndicators(statusData);
    }

    /**
     * Update status indicators in the UI
     * @param {Object} statusData - Status data
     */
    updateStatusIndicators(statusData) {
        // This could be extended to update various status indicators
        // throughout the UI based on the system status
        
        // Example: Update a global status indicator
        const globalStatusElement = document.getElementById('global-status');
        if (globalStatusElement) {
            const statusClass = statusData.chatAvailable ? 'status-online' : 'status-offline';
            globalStatusElement.className = `global-status ${statusClass}`;
        }
    }

    /**
     * Handle window resize events
     */
    handleWindowResize() {
        // Handle responsive layout adjustments
        console.log('Window resized:', window.innerWidth, 'x', window.innerHeight);
        
        // Emit custom resize event for other components
        const resizeEvent = new CustomEvent('uiResize', {
            detail: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        });
        document.dispatchEvent(resizeEvent);
    }

    /**
     * Handle visibility change (tab focus/blur)
     */
    handleVisibilityChange() {
        if (document.hidden) {
            console.log('App lost focus');
            // Pause non-essential updates when tab is not visible
        } else {
            console.log('App gained focus');
            // Resume updates and refresh status
            this.components.systemStatus.refreshStatus();
        }
    }

    /**
     * Utility method for debouncing function calls
     * @param {function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Show a modal dialog
     * @param {string} modalId - ID of the modal to show
     * @param {Object} options - Modal options
     */
    showModal(modalId, options = {}) {
        return this.components.modalManager.showModal(modalId, options);
    }

    /**
     * Hide a modal dialog
     * @param {string} modalId - ID of the modal to hide
     */
    hideModal(modalId) {
        return this.components.modalManager.hideModal(modalId);
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return this.components.settingsManager.exportSettings();
    }

    /**
     * Update a setting
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     */
    setSetting(key, value) {
        this.components.settingsManager.set(key, value);
    }

    /**
     * Get current system status
     * @returns {Object} System status
     */
    getSystemStatus() {
        return this.components.systemStatus.getStatusSummary();
    }

    /**
     * Refresh system status
     */
    refreshSystemStatus() {
        return this.components.systemStatus.refreshStatus();
    }

    /**
     * Clean up resources when shutting down
     */
    destroy() {
        if (this.components.systemStatus) {
            this.components.systemStatus.stopMonitoring();
        }
        
        this.isInitialized = false;
        console.log('UI components destroyed');
    }
}

// Create and export singleton instance
export const uiController = new UIController();

// Legacy compatibility - expose global functions
window.initializeUI = () => uiController.initialize();
window.showModal = (modalId, options) => uiController.showModal(modalId, options);
window.hideModal = (modalId) => uiController.hideModal(modalId);

// Initialize automatically when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        uiController.initialize().catch(error => {
            console.error('Failed to initialize UI:', error);
        });
    });
} else {
    // DOM already ready
    uiController.initialize().catch(error => {
        console.error('Failed to initialize UI:', error);
    });
}
