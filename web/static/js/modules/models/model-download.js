/**
 * Model Download Management Module
 * Handles downloading of remote models with progress tracking and cancellation
 * Supports both streaming and standard download methods
 */

import { supportsStreaming } from './model-utils.js';
import { refreshLocalModels } from './model-list.js';

// Global state for tracking downloads
let currentDownload = {
    controller: null,
    modelName: null,
    isActive: false
};

/**
 * Pull a remote model with progress tracking
 * Attempts streaming first, falls back to standard method
 * @param {string} modelName - Name of the model to download
 */
export async function pullRemoteModel(modelName) {
    if (!modelName) {
        console.error('No model name provided for download');
        return;
    }
    
    const pullMsg = document.getElementById('pull-msg');
    if (!pullMsg) {
        console.error('Pull message element not found');
        return;
    }
    
    // Check if there's already a download in progress
    if (currentDownload.isActive) {
        pullMsg.innerHTML = '<span style="color: #f39c12;">⚠️ Another download is already in progress</span>';
        return;
    }
    
    console.log(`Starting download of model: ${modelName}`);
    
    // Try streaming progress first, fallback to standard
    try {
        if (supportsStreaming()) {
            await pullModelWithProgress(modelName, pullMsg);
        } else {
            await pullModelStandard(modelName, pullMsg);
        }
    } catch (error) {
        console.error('Download failed:', error);
        await pullModelStandard(modelName, pullMsg);
    }
}

/**
 * Cancel the current model download
 * Aborts the request and cleans up partial files
 */
export async function cancelModelDownload() {
    if (!currentDownload.isActive || !currentDownload.controller) {
        console.log('No active download to cancel');
        return;
    }
    
    const pullMsg = document.getElementById('pull-msg');
    
    try {
        // Abort the fetch request
        currentDownload.controller.abort();
        
        // Call backend to clean up partial downloads
        const response = await fetch('/models/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (pullMsg) {
                pullMsg.innerHTML = `<span style="color: #e67e22;">⏹️ ${result.message}</span>`;
            }
        } else {
            if (pullMsg) {
                pullMsg.innerHTML = '<span style="color: #e74c3c;">❌ Failed to cancel download</span>';
            }
        }
    } catch (error) {
        console.error('Error cancelling download:', error);
        if (pullMsg) {
            pullMsg.innerHTML = '<span style="color: #e74c3c;">❌ Error during cancellation</span>';
        }
    }
    
    // Clean up download state
    cleanupDownloadState();
    
    // Clear message after delay
    if (pullMsg) {
        setTimeout(() => {
            pullMsg.innerHTML = '';
        }, 5000);
    }
}

/**
 * Pull model with streaming progress updates
 * Uses fetch streaming API for real-time progress
 * @param {string} modelName - Name of the model to download
 * @param {HTMLElement} pullMsg - Element to display progress messages
 */
async function pullModelWithProgress(modelName, pullMsg) {
    // Create abort controller for cancellation
    currentDownload.controller = new AbortController();
    currentDownload.modelName = modelName;
    currentDownload.isActive = true;
    
    // Update UI state
    updateDownloadUI(true);
    pullMsg.innerHTML = '<span style="color: #3498db;">🔄 Starting download...</span>';
    
    try {
        const response = await fetch('/models/pull/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName }),
            signal: currentDownload.controller.signal
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                // Accumulate data in buffer
                buffer += decoder.decode(value, { stream: true });
                
                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer
                
                lines.forEach(line => {
                    line = line.trim();
                    if (line.length > 0) {
                        try {
                            const data = JSON.parse(line);
                            updatePullProgress(data);
                            
                            // Handle completion or cancellation
                            if (data.status === 'cancelled') {
                                pullMsg.innerHTML = '<span style="color: #e67e22;">⏹️ Download cancelled</span>';
                                return;
                            } else if (data.status === 'success') {
                                pullMsg.innerHTML = '<span style="color: #27ae60;">✅ Model downloaded successfully!</span>';
                                
                                // Refresh models and status
                                setTimeout(async () => {
                                    await refreshLocalModels();
                                    if (window.checkStatus) await window.checkStatus();
                                }, 1000);
                            }
                            return; // Exit function on completion
                        } catch (parseError) {
                            // Log only if not empty line or too short for valid JSON
                            if (line.length > 5) {
                                console.warn('Failed to parse progress data:', line, parseError);
                            }
                        }
                    }
                });
            }
            
            // Process any remaining data in buffer
            if (buffer.trim()) {
                try {
                    const data = JSON.parse(buffer.trim());
                    updatePullProgress(data);
                } catch (parseError) {
                    console.warn('Failed to parse final buffer data:', buffer, parseError);
                }
            }
            
        } finally {
            reader.releaseLock();
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted (cancellation), don't show error
            console.log('Download request aborted');
        } else {
            // Other errors
            console.error('Streaming download error:', error);
            pullMsg.innerHTML = `<span style="color: #e74c3c;">❌ Download failed: ${error.message}</span>`;
        }
    } finally {
        cleanupDownloadState();
    }
}

/**
 * Fallback to standard pulling method
 * Uses regular HTTP request without streaming
 * @param {string} modelName - Name of the model to download
 * @param {HTMLElement} pullMsg - Element to display progress messages
 */
async function pullModelStandard(modelName, pullMsg) {
    currentDownload.modelName = modelName;
    currentDownload.isActive = true;
    updateDownloadUI(true);
    
    pullMsg.innerHTML = '<span style="color: #3498db;">🔄 Downloading model (standard method)...</span>';
    
    try {
        const response = await fetch('/models/pull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.pulled) {
            pullMsg.innerHTML = '<span style="color: #27ae60;">✅ Model downloaded successfully!</span>';
            
            // Refresh models and status
            setTimeout(async () => {
                await refreshLocalModels();
                if (window.checkStatus) await window.checkStatus();
            }, 1000);
        } else {
            pullMsg.innerHTML = '<span style="color: #f39c12;">⚠️ Model may already exist</span>';
        }
        
    } catch (error) {
        console.error('Standard download error:', error);
        pullMsg.innerHTML = `<span style="color: #e74c3c;">❌ Download failed: ${error.message}</span>`;
    } finally {
        cleanupDownloadState();
    }
}

/**
 * Update pull progress display with real-time information
 * @param {Object} data - Progress data from server
 */
function updatePullProgress(data) {
    const pullMsg = document.getElementById('pull-msg');
    if (!pullMsg) return;
    
    try {
        if (data.status === 'downloading' && data.completed && data.total) {
            // Calculate and display download progress
            const percentage = Math.round((data.completed / data.total) * 100);
            const completedMB = (data.completed / (1024 * 1024)).toFixed(1);
            const totalMB = (data.total / (1024 * 1024)).toFixed(1);
            
            pullMsg.innerHTML = `
                <span style="color: #3498db;">
                    📥 Downloading: ${percentage}% (${completedMB}/${totalMB} MB)
                </span>
            `;
            
            // Stop animation when complete
            if (percentage >= 100) {
                pullMsg.style.animation = 'none';
            }
        } else if (data.status) {
            // Provide user-friendly status messages
            let icon = '🔄';
            let color = '#3498db';
            let message = data.status;
            
            switch (data.status.toLowerCase()) {
                case 'pulling manifest':
                    icon = '📋';
                    message = 'Preparing download...';
                    break;
                case 'pulling blob':
                case 'downloading':
                    icon = '📥';
                    message = 'Downloading model data...';
                    break;
                case 'verifying sha256':
                    icon = '🔍';
                    message = 'Verifying download integrity...';
                    break;
                case 'writing manifest':
                    icon = '💾';
                    message = 'Finalizing installation...';
                    break;
                case 'success':
                    icon = '✅';
                    color = '#27ae60';
                    message = 'Download completed successfully!';
                    break;
                default:
                    // Add download icon for generic status
                    icon = '📥';
                    break;
            }
            
            pullMsg.innerHTML = `<span style="color: ${color};">${icon} ${message}</span>`;
        }
        
        // Stop animation when complete
        if (data.status === 'success') {
            pullMsg.style.animation = 'none';
        }
        
    } catch (error) {
        console.error('Error updating progress:', error);
    }
}

/**
 * Update UI elements for download state
 * @param {boolean} isDownloading - Whether download is active
 */
function updateDownloadUI(isDownloading) {
    const pullBtn = document.getElementById('pull-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const remoteSelect = document.getElementById('remote-select');
    
    if (pullBtn) pullBtn.disabled = isDownloading;
    if (cancelBtn) cancelBtn.disabled = !isDownloading;
    if (remoteSelect) remoteSelect.disabled = isDownloading;
}

/**
 * Clean up download state and UI
 */
function cleanupDownloadState() {
    currentDownload.controller = null;
    currentDownload.modelName = null;
    currentDownload.isActive = false;
    
    updateDownloadUI(false);
}

/**
 * Check if a download is currently active
 * @returns {boolean} - True if download is in progress
 */
export function isDownloadActive() {
    return currentDownload.isActive;
}

/**
 * Get current download information
 * @returns {Object} - Current download state
 */
export function getCurrentDownload() {
    return {
        modelName: currentDownload.modelName,
        isActive: currentDownload.isActive
    };
}
