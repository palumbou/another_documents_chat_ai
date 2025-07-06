/**
 * Document Utilities Module
 * Handles file validation, message display, and common utility functions
 * Used by other document modules for shared functionality
 */

// Supported file types configuration
export const SUPPORTED_FILE_TYPES = {
    extensions: ['.pdf', '.docx', '.doc', '.txt', '.md', '.log'],
    mimeTypes: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'text/markdown',
        'text/x-markdown'
    ],
    maxSize: 100 * 1024 * 1024 // 100MB
};

/**
 * Display message to user with appropriate styling
 * @param {string} message - Message to display
 * @param {string} type - Message type: 'success', 'error', 'warning', 'info'
 * @param {HTMLElement} element - Optional specific element to show message in
 */
export function showMessage(message, type, element) {
    if (!element) element = document.getElementById('upload-msg');
    if (!element) return;
    
    element.innerHTML = `<span class="${type}">${message}</span>`;
    
    // Auto-clear success and info messages after 5 seconds
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            element.innerHTML = '';
        }, 5000);
    }
}

/**
 * Clear all messages from upload message area
 */
export function clearMessages() {
    const uploadMsg = document.getElementById('upload-msg');
    if (uploadMsg) uploadMsg.innerHTML = '';
}

/**
 * Validate files for upload (size, type, etc.)
 * @param {FileList} files - Files to validate
 * @returns {Object} - Object with validFiles array and errors array
 */
export function validateFiles(files) {
    const errors = [];
    const validFiles = [];
    
    for (let file of files) {
        // Check file size
        if (file.size > SUPPORTED_FILE_TYPES.maxSize) {
            errors.push(`${file.name}: File too large (max 100MB)`);
            continue;
        }
        
        // Check file extension
        const fileExt = '.' + file.name.toLowerCase().split('.').pop();
        const hasValidExtension = SUPPORTED_FILE_TYPES.extensions.includes(fileExt);
        
        // Check MIME type
        const hasValidMimeType = SUPPORTED_FILE_TYPES.mimeTypes.includes(file.type);
        
        if (!hasValidExtension && !hasValidMimeType) {
            errors.push(`${file.name}: Unsupported file type`);
            continue;
        }
        
        validFiles.push(file);
    }
    
    return { validFiles, errors };
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size string
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if a filename is supported
 * @param {string} filename - Name of the file to check
 * @returns {boolean} - True if file type is supported
 */
export function isFileSupported(filename) {
    if (!filename) return false;
    
    const fileExt = '.' + filename.toLowerCase().split('.').pop();
    return SUPPORTED_FILE_TYPES.extensions.includes(fileExt);
}

/**
 * Sanitize filename for safe usage
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(filename) {
    // Remove/replace potentially problematic characters
    return filename
        .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .substring(0, 200); // Limit length
}
