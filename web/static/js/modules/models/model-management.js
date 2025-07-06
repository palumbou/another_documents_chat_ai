/**
 * Model Management Module
 * Handles running local models, deletion, and model recovery operations
 * Manages model state changes and error handling
 */

import { isValidModelName } from './model-utils.js';
import { refreshLocalModels, clearModelSelections } from './model-list.js';

/**
 * Run a selected local model
 * Activates the model as the current engine
 */
export async function runLocalModel() {
    const select = document.getElementById('local-select');
    const runMsg = document.getElementById('run-msg');
    const runBtn = document.getElementById('run-btn');
    
    if (!select || !runMsg || !runBtn) {
        console.error('Required UI elements not found');
        return;
    }
    
    const modelName = select.value;
    if (!isValidModelName(modelName)) {
        runMsg.innerHTML = '<span style="color: #e74c3c;">❌ Please select a valid model</span>';
        return;
    }
    
    // Check if there's already an active model
    const engineInfo = document.getElementById('engine-info');
    const isAlreadyActive = engineInfo && 
                           engineInfo.textContent.includes(`Engine: ${modelName}`) && 
                           engineInfo.textContent.includes('🟢');
    
    if (isAlreadyActive) {
        runMsg.innerHTML = `<span style="color: #f39c12;">⚠️ Model ${modelName} is already active</span>`;
        return;
    }
    
    // Disable button and show loading state
    runBtn.disabled = true;
    const hasCurrentEngine = engineInfo && engineInfo.textContent.includes('Engine:');
    const loadingMessage = hasCurrentEngine ? 
        `🔄 Switching to ${modelName}...` : 
        `🔄 Starting ${modelName}...`;
    
    runMsg.innerHTML = `<span style="color: #3498db;">${loadingMessage}</span>`;
    
    try {
        const response = await fetch('/models/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            
            try {
                errorData = JSON.parse(errorText);
            } catch {
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            // Handle specific error types for better UX
            if (errorData.error_type === 'verification_failed') {
                await handleModelVerificationError(modelName, errorData);
                return;
            } else if (errorData.error_type === 'insufficient_memory') {
                runMsg.innerHTML = `
                    <span style="color: #e74c3c;">
                        ❌ Insufficient memory: ${errorData.detail}
                        <br><small>Try closing other applications or select a smaller model</small>
                    </span>
                `;
                return;
            } else {
                throw new Error(errorData.detail || errorData.error || 'Unknown error');
            }
        }
        
        const result = await response.json();
        
        if (result.switched_from) {
            runMsg.innerHTML = `
                <span style="color: #27ae60;">
                    ✅ Switched from ${result.switched_from} to ${modelName}
                </span>
            `;
        } else {
            runMsg.innerHTML = `<span style="color: #27ae60;">✅ Model ${modelName} is now active</span>`;
        }
        
        // Update engine status
        if (window.checkStatus) {
            await window.checkStatus();
        }
        
        // Clear selection after successful activation
        select.value = '';
        
    } catch (error) {
        console.error('Error running model:', error);
        runMsg.innerHTML = `<span style="color: #e74c3c;">❌ Failed to run model: ${error.message}</span>`;
    } finally {
        runBtn.disabled = false;
        
        // Clear message after delay
        setTimeout(() => {
            runMsg.innerHTML = '';
        }, 5000);
    }
}

/**
 * Delete a local model with confirmation
 * @param {string} modelName - Name of the model to delete
 */
export async function deleteLocalModel(modelName) {
    if (!modelName || !isValidModelName(modelName)) {
        console.error('Invalid model name for deletion');
        return;
    }
    
    // Confirm deletion
    const confirmed = confirm(`Are you sure you want to delete the model "${modelName}"?\n\nThis action cannot be undone.`);
    if (!confirmed) return;
    
    const runMsg = document.getElementById('run-msg');
    const deleteBtn = document.querySelector(`[onclick*="${modelName}"]`);
    
    if (deleteBtn) deleteBtn.disabled = true;
    if (runMsg) runMsg.innerHTML = `<span style="color: #f39c12;">🗑️ Deleting ${modelName}...</span>`;
    
    try {
        const response = await fetch(`/models/${encodeURIComponent(modelName)}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }
        
        const result = await response.json();
        
        if (runMsg) {
            if (result.was_active) {
                runMsg.innerHTML = `<span style="color: #27ae60;">✅ Model ${modelName} deleted and deactivated</span>`;
            } else {
                runMsg.innerHTML = `<span style="color: #27ae60;">✅ Model ${modelName} deleted successfully</span>`;
            }
        }
        
        // Refresh models list and status
        await refreshLocalModels();
        if (window.checkStatus) {
            await window.checkStatus();
        }
        
        // Clear selection if deleted model was selected
        const localSelect = document.getElementById('local-select');
        if (localSelect && localSelect.value === modelName) {
            localSelect.value = '';
        }
        
    } catch (error) {
        console.error('Error deleting model:', error);
        
        let errorMessage = error.message;
        try {
            const errorData = JSON.parse(errorMessage);
            errorMessage = errorData.detail || errorMessage;
        } catch {
            // Keep original error message
        }
        
        if (runMsg) {
            runMsg.innerHTML = `<span style="color: #e74c3c;">❌ Error deleting model: ${errorMessage}</span>`;
        }
    } finally {
        if (deleteBtn) deleteBtn.disabled = false;
        
        // Clear message after delay
        if (runMsg) {
            setTimeout(() => {
                runMsg.innerHTML = '';
            }, 5000);
        }
    }
}

/**
 * Handle model verification errors with recovery options
 * @param {string} modelName - Name of the failed model
 * @param {Object} errorData - Error details from server
 */
async function handleModelVerificationError(modelName, errorData) {
    const runMsg = document.getElementById('run-msg');
    if (!runMsg) return;
    
    // Determine error type and provide appropriate recovery options
    let errorType = 'unknown';
    let suggestions = [];
    
    if (errorData.detail) {
        const detail = errorData.detail.toLowerCase();
        
        if (detail.includes('file not found') || detail.includes('no such file')) {
            errorType = 'missing_files';
            suggestions = [
                'Re-download the model',
                'Check if the model was partially downloaded'
            ];
        } else if (detail.includes('corrupt') || detail.includes('invalid') || detail.includes('checksum')) {
            errorType = 'corruption';
            suggestions = [
                'Re-download the model',
                'Check available disk space',
                'Verify network stability during download'
            ];
        } else if (detail.includes('timeout') || detail.includes('connection')) {
            errorType = 'connection';
            suggestions = [
                'Wait a moment and try again',
                'Check Ollama service status',
                'Restart the application'
            ];
        }
    }
    
    // Show error with recovery options
    showModelRecoveryOptions(modelName, errorType, suggestions, errorData.detail);
}

/**
 * Show recovery options for failed models
 * @param {string} modelName - Name of the failed model
 * @param {string} errorType - Type of error encountered
 * @param {Array} suggestions - Array of suggestion strings
 * @param {string} errorDetail - Detailed error message
 */
function showModelRecoveryOptions(modelName, errorType, suggestions = [], errorDetail = '') {
    const runMsg = document.getElementById('run-msg');
    if (!runMsg) return;
    
    let recoveryHtml = `
        <div style="color: #e74c3c; margin-bottom: 10px;">
            ❌ Model verification failed: ${modelName}
        </div>
    `;
    
    if (errorDetail) {
        recoveryHtml += `
            <div style="color: #7f8c8d; font-size: 12px; margin-bottom: 10px;">
                ${errorDetail}
            </div>
        `;
    }
    
    if (suggestions.length > 0) {
        recoveryHtml += '<div style="color: #3498db; margin-bottom: 10px;">💡 Suggestions:</div>';
        recoveryHtml += '<ul style="color: #7f8c8d; font-size: 12px; margin-left: 20px;">';
        suggestions.forEach(suggestion => {
            recoveryHtml += `<li>${suggestion}</li>`;
        });
        recoveryHtml += '</ul>';
    }
    
    // Add recovery action buttons
    recoveryHtml += `
        <div style="margin-top: 10px;">
            <button onclick="window.modelManagement.retryModel('${modelName}')" 
                    style="margin-right: 10px; padding: 4px 8px; font-size: 12px; background: #3498db; color: white; border: none; border-radius: 3px; cursor: pointer;">
                🔄 Retry
            </button>
            <button onclick="window.modelManagement.redownloadModel('${modelName}')" 
                    style="margin-right: 10px; padding: 4px 8px; font-size: 12px; background: #e67e22; color: white; border: none; border-radius: 3px; cursor: pointer;">
                📥 Re-download
            </button>
            <button onclick="window.modelManagement.removeFailedModel('${modelName}')" 
                    style="padding: 4px 8px; font-size: 12px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer;">
                🗑️ Remove
            </button>
        </div>
    `;
    
    runMsg.innerHTML = recoveryHtml;
}

/**
 * Recovery action: Wait and retry model activation
 * @param {string} modelName - Name of the model to retry
 */
export async function retryModel(modelName) {
    const runMsg = document.getElementById('run-msg');
    if (runMsg) {
        runMsg.innerHTML = '<span style="color: #f39c12;">⏳ Waiting a moment before retry...</span>';
    }
    
    // Wait a few seconds before retrying
    setTimeout(async () => {
        await runLocalModel();
    }, 3000);
}

/**
 * Recovery action: Re-download a failed model
 * @param {string} modelName - Name of the model to re-download
 */
export async function redownloadModel(modelName) {
    const runMsg = document.getElementById('run-msg');
    
    try {
        // First try to delete the corrupted model
        await deleteLocalModel(modelName);
        
        // Then set it for re-download
        const remoteSelect = document.getElementById('remote-select');
        if (remoteSelect) {
            // Try to find and select the model in remote list
            const option = Array.from(remoteSelect.options).find(opt => 
                opt.value === modelName || opt.value.startsWith(modelName + ':')
            );
            
            if (option) {
                remoteSelect.value = option.value;
                if (runMsg) {
                    runMsg.innerHTML = `
                        <span style="color: #3498db;">
                            🔄 Model selected for re-download. Click "Pull Model" to start.
                        </span>
                    `;
                }
            } else {
                if (runMsg) {
                    runMsg.innerHTML = `
                        <span style="color: #f39c12;">
                            ⚠️ Model removed. Please manually select and download from remote models.
                        </span>
                    `;
                }
            }
        }
    } catch (error) {
        console.error('Error during re-download setup:', error);
        if (runMsg) {
            runMsg.innerHTML = `<span style="color: #e74c3c;">❌ Failed to set up re-download: ${error.message}</span>`;
        }
    }
}

/**
 * Recovery action: Remove a failed model
 * @param {string} modelName - Name of the model to remove
 */
export async function removeFailedModel(modelName) {
    // Just delete the model
    await deleteLocalModel(modelName);
}

// Export functions for global access
window.modelManagement = {
    retryModel,
    redownloadModel,
    removeFailedModel
};
