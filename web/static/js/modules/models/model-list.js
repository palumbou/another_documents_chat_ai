/**
 * Model List Management Module
 * Handles loading, displaying and updating of model lists (local and remote)
 * Manages the population of select elements and model state
 */

import { createModelOptions, extractCurrentModelName } from './model-utils.js';

/**
 * Load and display both remote and local models
 * Populates the select elements with current available models
 */
export async function loadModels() {
    console.log('Loading models...');
    
    const remoteSel = document.getElementById('remote-select');
    const localSel = document.getElementById('local-select');
    
    if (!remoteSel || !localSel) {
        console.error('Model select elements not found');
        return;
    }
    
    try {
        // Fetch models from backend
        const response = await fetch('/models');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Models data received:', data);
        
        // Handle remote models with error fallback
        if (data.error) {
            console.warn('Remote models error:', data.error);
            remoteSel.innerHTML = '<option value="" style="color: #e74c3c;">⚠️ Failed to load remote models</option>';
        } else {
            remoteSel.innerHTML = createModelOptions(data.remote, true); // true for remote/grouping
        }
        
        // Handle local models without grouping
        localSel.innerHTML = createModelOptions(data.local, false); // false for local/simple
        
        // Always enable selects so user can see the state
        remoteSel.disabled = false;
        localSel.disabled = false;
        
        // Preselect current engine in local-select if available
        const engineInfoElement = document.getElementById('engine-info');
        if (engineInfoElement) {
            const currentModelName = extractCurrentModelName(engineInfoElement.textContent);
            if (currentModelName) {
                // Try to select the current model in local select
                const localOptions = Array.from(localSel.options);
                const matchingOption = localOptions.find(option => {
                    // Handle both object models and simple strings
                    return option.value === currentModelName;
                });
                
                if (matchingOption) {
                    localSel.value = currentModelName;
                }
            }
        }
        
        // Update button states after loading models
        updateButtonStates();
        
        // Initialize tooltips for the newly loaded models
        initializeModelTooltips();
        
    } catch (error) {
        console.error('Error loading models:', error);
        
        // Show error state in selects
        remoteSel.innerHTML = '<option value="">⚠️ Error loading remote models</option>';
        localSel.innerHTML = '<option value="">⚠️ Error loading local models</option>';
        
        // Keep selects enabled so user can see error
        remoteSel.disabled = false;
        localSel.disabled = false;
    }
}

/**
 * Update button states based on current model selections and system state
 */
export function updateButtonStates() {
    const remoteSelect = document.getElementById('remote-select');
    const localSelect = document.getElementById('local-select');
    const pullBtn = document.getElementById('pull-btn');
    const runBtn = document.getElementById('run-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    
    if (!remoteSelect || !localSelect || !pullBtn || !runBtn) {
        console.warn('Some model control elements not found');
        return;
    }
    
    // Update pull button state
    const hasRemoteSelection = remoteSelect.value && 
                               remoteSelect.value !== '' && 
                               !remoteSelect.value.includes('Error') &&
                               !remoteSelect.value.includes('Failed');
    pullBtn.disabled = !hasRemoteSelection;
    
    // Update run button state
    const hasLocalSelection = localSelect.value && 
                              localSelect.value !== '' && 
                              !localSelect.value.includes('Error');
    runBtn.disabled = !hasLocalSelection;
    
    // Cancel button is handled by download state
    if (cancelBtn) {
        // Will be enabled/disabled by download functions
    }
}

/**
 * Initialize tooltips for model select options
 * Adds hover tooltips for models with additional information
 */
function initializeModelTooltips() {
    // Tooltips are handled via title attributes in createModelOptions
    // This function could be extended for custom tooltip libraries
    console.log('Model tooltips initialized');
}

/**
 * Refresh the local models list after changes
 * Used after model downloads or deletions
 */
export async function refreshLocalModels() {
    try {
        const response = await fetch('/models');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const localSel = document.getElementById('local-select');
        
        if (localSel && data.local) {
            const currentValue = localSel.value;
            localSel.innerHTML = createModelOptions(data.local, false);
            
            // Try to restore selection if still available
            if (currentValue && Array.from(localSel.options).some(opt => opt.value === currentValue)) {
                localSel.value = currentValue;
            }
            
            updateButtonStates();
        }
        
    } catch (error) {
        console.error('Error refreshing local models:', error);
    }
}

/**
 * Clear model selections
 * Resets both remote and local select elements
 */
export function clearModelSelections() {
    const remoteSelect = document.getElementById('remote-select');
    const localSelect = document.getElementById('local-select');
    
    if (remoteSelect) remoteSelect.value = '';
    if (localSelect) localSelect.value = '';
    
    updateButtonStates();
}

/**
 * Get currently selected remote model
 * @returns {string|null} - Selected remote model name or null
 */
export function getSelectedRemoteModel() {
    const remoteSelect = document.getElementById('remote-select');
    return remoteSelect && remoteSelect.value ? remoteSelect.value : null;
}

/**
 * Get currently selected local model
 * @returns {string|null} - Selected local model name or null
 */
export function getSelectedLocalModel() {
    const localSelect = document.getElementById('local-select');
    return localSelect && localSelect.value ? localSelect.value : null;
}

/**
 * Set the selected local model
 * @param {string} modelName - Name of the model to select
 * @returns {boolean} - True if selection was successful
 */
export function setSelectedLocalModel(modelName) {
    const localSelect = document.getElementById('local-select');
    
    if (!localSelect) return false;
    
    // Check if model exists in options
    const option = Array.from(localSelect.options).find(opt => opt.value === modelName);
    if (option) {
        localSelect.value = modelName;
        updateButtonStates();
        return true;
    }
    
    return false;
}
