/**
 * Models Main Coordinator Module
 * Initializes and coordinates all model-related functionality
 * Acts as the central entry point for model management
 */

import { loadModels, updateButtonStates } from './model-list.js';
import { pullRemoteModel, cancelModelDownload, isDownloadActive } from './model-download.js';
import { runLocalModel, deleteLocalModel } from './model-management.js';

/**
 * Initialize all model functionality
 * Sets up event listeners and loads initial data
 */
export function initializeModels() {
    console.log('Initializing models functionality...');
    
    // Set up event listeners for model controls
    setupModelEventListeners();
    
    // Load models on initialization
    loadModels();
    
    // Set up periodic status updates
    setupPeriodicUpdates();
    
    console.log('Models functionality initialized');
}

/**
 * Set up event listeners for model-related UI elements
 */
function setupModelEventListeners() {
    // Pull button
    const pullBtn = document.getElementById('pull-btn');
    if (pullBtn) {
        pullBtn.addEventListener('click', handlePullModel);
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', handleCancelDownload);
    }
    
    // Run button
    const runBtn = document.getElementById('run-btn');
    if (runBtn) {
        runBtn.addEventListener('click', handleRunModel);
    }
    
    // Model selection changes
    const remoteSelect = document.getElementById('remote-select');
    const localSelect = document.getElementById('local-select');
    
    if (remoteSelect) {
        remoteSelect.addEventListener('change', updateButtonStates);
    }
    
    if (localSelect) {
        localSelect.addEventListener('change', updateButtonStates);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-models-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefreshModels);
    }
}

/**
 * Handle pull model button click
 */
async function handlePullModel() {
    const remoteSelect = document.getElementById('remote-select');
    if (!remoteSelect || !remoteSelect.value) {
        console.error('No remote model selected');
        return;
    }
    
    await pullRemoteModel(remoteSelect.value);
}

/**
 * Handle cancel download button click
 */
async function handleCancelDownload() {
    await cancelModelDownload();
}

/**
 * Handle run model button click
 */
async function handleRunModel() {
    await runLocalModel();
}

/**
 * Handle refresh models button click
 */
async function handleRefreshModels() {
    const refreshBtn = document.getElementById('refresh-models-btn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
    }
    
    try {
        await loadModels();
        
        // Also refresh status
        if (window.checkStatus) {
            await window.checkStatus();
        }
        
    } catch (error) {
        console.error('Error refreshing models:', error);
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'Refresh Models';
        }
    }
}

/**
 * Set up periodic updates for model status
 */
function setupPeriodicUpdates() {
    // Update button states periodically in case of external changes
    setInterval(() => {
        if (!isDownloadActive()) {
            updateButtonStates();
        }
    }, 30000); // Every 30 seconds
}

/**
 * Add delete button to local model option
 * @param {string} modelName - Name of the model
 * @returns {string} - HTML for delete button
 */
export function createDeleteButton(modelName) {
    return `
        <button onclick="window.deleteLocalModel('${modelName}')" 
                style="margin-left: 5px; padding: 2px 6px; font-size: 11px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer;"
                title="Delete model ${modelName}">
            🗑️
        </button>
    `;
}

/**
 * Initialize model tooltips for additional information
 */
function initializeModelTooltips() {
    // Model tooltips are handled via title attributes in the options
    // This function could be extended for custom tooltip libraries if needed
    const selects = document.querySelectorAll('#remote-select, #local-select');
    
    selects.forEach(select => {
        select.addEventListener('mouseover', function(e) {
            if (e.target.tagName === 'OPTION' && e.target.title) {
                // Tooltip is already shown via title attribute
                // Could add custom tooltip logic here
            }
        });
    });
}

/**
 * Clear all messages in model sections
 */
export function clearModelMessages() {
    const pullMsg = document.getElementById('pull-msg');
    const runMsg = document.getElementById('run-msg');
    
    if (pullMsg) pullMsg.innerHTML = '';
    if (runMsg) runMsg.innerHTML = '';
}

/**
 * Show a notification message in the model section
 * @param {string} message - Message to display
 * @param {string} type - Type of message (success, error, warning, info)
 * @param {string} section - Section to show message in (pull or run)
 */
export function showModelMessage(message, type = 'info', section = 'run') {
    const elementId = section === 'pull' ? 'pull-msg' : 'run-msg';
    const msgElement = document.getElementById(elementId);
    
    if (!msgElement) return;
    
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const color = colors[type] || colors.info;
    const icon = icons[type] || icons.info;
    
    msgElement.innerHTML = `<span style="color: ${color};">${icon} ${message}</span>`;
    
    // Auto-clear after delay for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            msgElement.innerHTML = '';
        }, 5000);
    }
}

/**
 * Get current model status for external access
 * @returns {Object} - Current model state
 */
export function getModelStatus() {
    const remoteSelect = document.getElementById('remote-select');
    const localSelect = document.getElementById('local-select');
    
    return {
        selectedRemote: remoteSelect ? remoteSelect.value : null,
        selectedLocal: localSelect ? localSelect.value : null,
        isDownloading: isDownloadActive(),
        hasLocalModels: localSelect ? localSelect.options.length > 1 : false, // > 1 to account for placeholder
        hasRemoteModels: remoteSelect ? remoteSelect.options.length > 1 : false
    };
}

// Export delete function globally for onclick handlers
window.deleteLocalModel = deleteLocalModel;

// Export the main initialization function
export default initializeModels;
