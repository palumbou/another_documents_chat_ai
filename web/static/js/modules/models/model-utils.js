/**
 * Model Utilities Module
 * Provides helper functions for model data manipulation and formatting
 * Used by other model modules for common operations
 */

/**
 * Group models by family name (base name before colon)
 * @param {Array} models - Array of model names
 * @returns {Object} - Object with family names as keys and arrays of models as values
 */
export function groupModelsByFamily(models) {
    const families = {};
    
    models.forEach(model => {
        const baseName = model.split(':')[0];
        if (!families[baseName]) {
            families[baseName] = [];
        }
        families[baseName].push(model);
    });
    
    return families;
}

/**
 * Create HTML options for model select elements
 * @param {Array} models - Array of models (can be objects or strings)
 * @param {boolean} isRemote - Whether models are remote (affects grouping)
 * @returns {string} - HTML string for option elements
 */
export function createModelOptions(models, isRemote = false) {
    if (!models || models.length === 0) {
        return '<option value="">-- None Available --</option>';
    }
    
    // Handle model objects with memory info
    if (typeof models[0] === 'object' && models[0].name) {
        return isRemote ? createRemoteModelOptions(models) : createLocalModelOptions(models);
    }
    
    // Fallback for simple string arrays
    return models.map(model => `<option value="${model}">${model}</option>`).join('');
}

/**
 * Create options for remote models with family grouping
 * @param {Array} models - Array of model objects
 * @returns {string} - HTML string with optgroups
 */
function createRemoteModelOptions(models) {
    const families = {};
    
    // Group models by family
    models.forEach(model => {
        const baseName = model.name.split(':')[0];
        if (!families[baseName]) {
            families[baseName] = [];
        }
        families[baseName].push(model);
    });
    
    let html = '';
    Object.keys(families).sort().forEach(family => {
        const representativeModel = families[family][0];
        let familyTooltip = '';
        
        // Build tooltip with description and update info
        if (representativeModel.description) {
            familyTooltip += `Description: ${representativeModel.description}`;
        }
        if (representativeModel.updated) {
            if (familyTooltip) familyTooltip += '\n';
            familyTooltip += `Last updated: ${representativeModel.updated}`;
        }
        
        html += `<optgroup label="${family}" title="${familyTooltip}">`;
        
        // Sort models within family
        families[family].sort((a, b) => a.name.localeCompare(b.name)).forEach(model => {
            let tooltip = `Model: ${model.name}`;
            if (model.size) tooltip += `\nSize: ${model.size}`;
            if (model.pulls) tooltip += `\nDownloads: ${model.pulls}`;
            if (model.tags) tooltip += `\nVariants: ${model.tags}`;
            
            html += `<option value="${model.name}" title="${tooltip}">${model.name}</option>`;
        });
        
        html += '</optgroup>';
    });
    
    return html;
}

/**
 * Create options for local models with memory info
 * @param {Array} models - Array of local model objects
 * @returns {string} - HTML string for option elements
 */
function createLocalModelOptions(models) {
    return models.map(model => {
        let tooltip = `Model: ${model.name}`;
        if (model.memory_required) tooltip += `\nMemory Required: ${formatBytes(model.memory_required)}`;
        if (model.memory_available !== undefined) tooltip += `\nMemory Available: ${formatBytes(model.memory_available)}`;
        
        return `<option value="${model.name}" title="${tooltip}">${model.name}</option>`;
    }).join('');
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} - Formatted string (e.g., "1.5 GB")
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extract model name from engine info text
 * @param {string} engineInfoText - Text containing engine information
 * @returns {string|null} - Extracted model name or null
 */
export function extractCurrentModelName(engineInfoText) {
    if (!engineInfoText) return null;
    
    const match = engineInfoText.match(/\(Engine: ([^\s\)]+)/);
    return match ? match[1] : null;
}

/**
 * Check if a model name is valid
 * @param {string} modelName - Model name to validate
 * @returns {boolean} - True if valid
 */
export function isValidModelName(modelName) {
    return !!(modelName && modelName.trim() && modelName !== '-- None Available --');
}

/**
 * Generate model tooltip content
 * @param {Object} model - Model object with metadata
 * @returns {string} - Tooltip text
 */
export function generateModelTooltip(model) {
    let tooltip = `Model: ${model.name}`;
    
    if (model.size) tooltip += `\nSize: ${model.size}`;
    if (model.pulls) tooltip += `\nDownloads: ${model.pulls}`;
    if (model.tags) tooltip += `\nVariants: ${model.tags}`;
    if (model.description) tooltip += `\nDescription: ${model.description}`;
    if (model.updated) tooltip += `\nLast updated: ${model.updated}`;
    if (model.memory_required) tooltip += `\nMemory Required: ${formatBytes(model.memory_required)}`;
    if (model.memory_available !== undefined) tooltip += `\nMemory Available: ${formatBytes(model.memory_available)}`;
    
    return tooltip;
}

/**
 * Check if browser supports streaming fetch
 * @returns {boolean} - True if streaming is supported
 */
export function supportsStreaming() {
    return !!(window.ReadableStream && window.fetch);
}
