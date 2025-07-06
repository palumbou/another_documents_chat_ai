/**
 * Chat Debug Module
 * Handles debug functionality for chat interactions
 * Provides detailed information about AI processing
 */

/**
 * Check if debug mode is currently enabled
 * @returns {boolean} - True if debug mode is active
 */
export function isDebugModeEnabled() {
    const debugModeCheckbox = document.getElementById('debug-mode');
    return debugModeCheckbox ? debugModeCheckbox.checked : false;
}

/**
 * Toggle debug mode
 * @param {boolean} enabled - Whether to enable debug mode
 */
export function setDebugMode(enabled) {
    const debugModeCheckbox = document.getElementById('debug-mode');
    if (debugModeCheckbox) {
        debugModeCheckbox.checked = enabled;
        
        // Trigger change event to update UI
        debugModeCheckbox.dispatchEvent(new Event('change'));
    }
}

/**
 * Initialize debug mode UI
 */
export function initializeDebugMode() {
    const debugModeCheckbox = document.getElementById('debug-mode');
    const debugInfo = document.getElementById('debug-info');
    
    if (!debugModeCheckbox) return;
    
    // Update debug info visibility on toggle
    debugModeCheckbox.addEventListener('change', function() {
        const isEnabled = this.checked;
        
        if (debugInfo) {
            debugInfo.style.display = isEnabled ? 'block' : 'none';
        }
        
        // Update chat messages to show/hide debug info
        updateDebugInfoVisibility(isEnabled);
        
        console.log(`Debug mode ${isEnabled ? 'enabled' : 'disabled'}`);
    });
    
    // Initialize visibility
    const isEnabled = debugModeCheckbox.checked;
    if (debugInfo) {
        debugInfo.style.display = isEnabled ? 'block' : 'none';
    }
    
    updateDebugInfoVisibility(isEnabled);
}

/**
 * Update visibility of debug information in existing messages
 * @param {boolean} visible - Whether debug info should be visible
 */
function updateDebugInfoVisibility(visible) {
    const debugElements = document.querySelectorAll('.debug-info');
    
    debugElements.forEach(element => {
        element.style.display = visible ? 'block' : 'none';
    });
    
    const thinkingMessages = document.querySelectorAll('.thinking-message');
    
    thinkingMessages.forEach(element => {
        if (!visible) {
            // Hide thinking messages when debug mode is disabled
            element.style.display = 'none';
        } else {
            element.style.display = 'block';
        }
    });
}

/**
 * Create debug information panel for a response
 * @param {Object} debugData - Debug information from the server
 * @returns {HTMLElement} - Debug panel element
 */
export function createDebugPanel(debugData) {
    const panel = document.createElement('div');
    panel.className = 'debug-panel';
    
    let content = '<h4>🔍 Debug Information</h4>';
    
    // Add sections based on available data
    if (debugData.query) {
        content += createDebugSection('Original Query', debugData.query, 'text');
    }
    
    if (debugData.full_prompt) {
        content += createDebugSection('Full Prompt Sent to AI', debugData.full_prompt, 'code');
    }
    
    if (debugData.thinking_process) {
        content += createDebugSection('AI Thinking Process', debugData.thinking_process, 'code');
    }
    
    if (debugData.context_documents) {
        content += createDebugSection('Context Documents Used', 
            `${debugData.context_documents} document(s)`, 'text');
    }
    
    if (debugData.model_info) {
        content += createDebugSection('Model Information', 
            formatModelInfo(debugData.model_info), 'text');
    }
    
    if (debugData.processing_time) {
        content += createDebugSection('Processing Time', 
            `${debugData.processing_time} seconds`, 'text');
    }
    
    if (debugData.token_count) {
        content += createDebugSection('Token Usage', 
            formatTokenUsage(debugData.token_count), 'text');
    }
    
    panel.innerHTML = content;
    return panel;
}

/**
 * Create a debug information section
 * @param {string} title - Section title
 * @param {string} content - Section content
 * @param {string} type - Content type ('text' or 'code')
 * @returns {string} - HTML for the section
 */
function createDebugSection(title, content, type = 'text') {
    const escapedContent = escapeHtml(content);
    
    if (type === 'code') {
        return `
            <div class="debug-section">
                <h5>${title}:</h5>
                <pre class="debug-code">${escapedContent}</pre>
            </div>
        `;
    } else {
        return `
            <div class="debug-section">
                <h5>${title}:</h5>
                <p class="debug-text">${escapedContent}</p>
            </div>
        `;
    }
}

/**
 * Format model information for display
 * @param {Object} modelInfo - Model information object
 * @returns {string} - Formatted model info
 */
function formatModelInfo(modelInfo) {
    if (typeof modelInfo === 'string') {
        return modelInfo;
    }
    
    let info = '';
    if (modelInfo.name) info += `Name: ${modelInfo.name}\n`;
    if (modelInfo.size) info += `Size: ${modelInfo.size}\n`;
    if (modelInfo.parameters) info += `Parameters: ${modelInfo.parameters}\n`;
    if (modelInfo.context_length) info += `Context Length: ${modelInfo.context_length}\n`;
    
    return info || 'Model information not available';
}

/**
 * Format token usage information
 * @param {Object} tokenCount - Token usage object
 * @returns {string} - Formatted token usage
 */
function formatTokenUsage(tokenCount) {
    if (typeof tokenCount === 'number') {
        return `${tokenCount} tokens`;
    }
    
    if (typeof tokenCount === 'object') {
        let usage = '';
        if (tokenCount.prompt) usage += `Prompt: ${tokenCount.prompt} tokens\n`;
        if (tokenCount.completion) usage += `Completion: ${tokenCount.completion} tokens\n`;
        if (tokenCount.total) usage += `Total: ${tokenCount.total} tokens`;
        
        return usage || `${JSON.stringify(tokenCount)} tokens`;
    }
    
    return 'Token usage not available';
}

/**
 * Log debug information to console
 * @param {string} label - Log label
 * @param {any} data - Data to log
 */
export function debugLog(label, data) {
    if (isDebugModeEnabled()) {
        console.group(`🔍 Chat Debug: ${label}`);
        console.log(data);
        console.groupEnd();
    }
}

/**
 * Add debug timing information
 * @param {string} operation - Operation name
 * @param {number} startTime - Start timestamp
 * @param {number} endTime - End timestamp
 */
export function logTiming(operation, startTime, endTime) {
    if (isDebugModeEnabled()) {
        const duration = ((endTime - startTime) / 1000).toFixed(3);
        console.log(`⏱️ ${operation}: ${duration}s`);
    }
}

/**
 * Create a performance timing tracker
 * @param {string} operation - Operation name
 * @returns {Function} - Function to call when operation completes
 */
export function createTimingTracker(operation) {
    const startTime = performance.now();
    
    return function endTiming() {
        const endTime = performance.now();
        logTiming(operation, startTime, endTime);
        return endTime - startTime;
    };
}

/**
 * Escape HTML characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Export debug information to file
 * @param {Object} debugData - Debug data to export
 * @param {string} filename - Filename for export
 */
export function exportDebugData(debugData, filename = 'chat-debug-info.json') {
    const dataStr = JSON.stringify(debugData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Debug data exported:', filename);
}
