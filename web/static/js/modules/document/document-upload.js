/**
 * Document Upload Module
 * Handles file upload functionality including drag & drop, progress tracking,
 * and file processing with detailed user feedback
 */

import { showMessage, clearMessages, validateFiles, formatFileSize } from './document-utils.js';

// Upload state tracking
let currentUploadController = null;

/**
 * Initialize upload functionality - sets up drag & drop and file input handlers
 */
export function initializeUpload() {
    const fileInput = document.getElementById('doc-file');
    const fileLabel = document.querySelector('label[for="doc-file"]');
    
    if (!fileInput || !fileLabel) {
        console.warn('Upload elements not found - upload functionality disabled');
        return;
    }
    
    // File input change handler
    fileInput.addEventListener('change', handleFileInputChange);
    
    // Drag and drop handlers
    setupDragAndDrop(fileLabel);
    
    console.log('Document upload initialized');
}

/**
 * Handle file input change event
 * @param {Event} event - File input change event
 */
function handleFileInputChange(event) {
    const files = event.target.files;
    if (files && files.length > 0) {
        uploadFiles(files);
        // Reset the input so same file can be uploaded again if needed
        event.target.value = '';
    }
}

/**
 * Setup drag and drop functionality for file upload
 * @param {HTMLElement} dropZone - Element to serve as drop zone
 */
function setupDragAndDrop(dropZone) {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
}

/**
 * Prevent default drag behaviors
 * @param {Event} e - Drag event
 */
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Highlight drop zone
 * @param {Event} e - Drag event
 */
function highlight(e) {
    e.target.classList.add('drag-over');
}

/**
 * Remove highlight from drop zone
 * @param {Event} e - Drag event
 */
function unhighlight(e) {
    e.target.classList.remove('drag-over');
}

/**
 * Handle file drop
 * @param {Event} e - Drop event
 */
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files && files.length > 0) {
        uploadFiles(files);
    }
}

/**
 * Upload multiple files with validation and progress tracking
 * @param {FileList} files - Files to upload
 */
export async function uploadFiles(files) {
    if (!files || files.length === 0) return;
    
    // Validate files first
    const { validFiles, errors } = validateFiles(files);
    
    // Show validation errors
    if (errors.length > 0) {
        const errorMsg = 'Validation errors:\\n' + errors.join('\\n');
        showMessage(errorMsg, 'error');
        
        // If no valid files, stop here
        if (validFiles.length === 0) return;
    }
    
    // Check if there's already an upload in progress
    if (currentUploadController) {
        showMessage('Upload already in progress. Please wait or cancel the current upload.', 'warning');
        return;
    }
    
    // Show initial upload message
    const totalFiles = validFiles.length;
    showMessage(`Starting upload of ${totalFiles} file(s)...`, 'info');
    
    let successCount = 0;
    let errorCount = 0;
    
    // Upload files one by one (sequential to avoid overwhelming the server)
    for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        
        try {
            showMessage(`Uploading ${file.name} (${i + 1}/${totalFiles})...`, 'info');
            
            const success = await uploadSingleFile(file);
            
            if (success) {
                successCount++;
                showMessage(`✅ ${file.name} uploaded successfully`, 'success');
            } else {
                errorCount++;
                showMessage(`❌ Failed to upload ${file.name}`, 'error');
            }
            
        } catch (error) {
            errorCount++;
            console.error(`Error uploading ${file.name}:`, error);
            showMessage(`❌ Error uploading ${file.name}: ${error.message}`, 'error');
        }
        
        // Small delay between uploads to prevent overwhelming
        if (i < validFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    // Show final summary
    if (successCount > 0 && errorCount === 0) {
        showMessage(`🎉 All ${successCount} file(s) uploaded successfully!`, 'success');
    } else if (successCount > 0 && errorCount > 0) {
        showMessage(`⚠️ Upload complete: ${successCount} succeeded, ${errorCount} failed`, 'warning');
    } else {
        showMessage(`❌ Upload failed: No files were uploaded successfully`, 'error');
    }
    
    // Refresh document list if any files were uploaded successfully
    if (successCount > 0 && window.loadDocuments) {
        setTimeout(() => {
            window.loadDocuments();
        }, 1000);
    }
}

/**
 * Upload a single file with progress tracking
 * @param {File} file - File to upload
 * @returns {Promise<boolean>} - True if upload successful
 */
async function uploadSingleFile(file) {
    return new Promise((resolve, reject) => {
        // Create abort controller for this upload
        currentUploadController = new AbortController();
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project', window.currentProject || 'global');
        
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                showMessage(
                    `Uploading ${file.name}: ${Math.round(percentComplete)}% (${formatFileSize(e.loaded)}/${formatFileSize(e.total)})`,
                    'info'
                );
            }
        });
        
        // Handle upload completion
        xhr.addEventListener('load', () => {
            currentUploadController = null;
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(true);
                } catch (e) {
                    console.error('Error parsing upload response:', e);
                    resolve(false);
                }
            } else {
                console.error('Upload failed with status:', xhr.status);
                resolve(false);
            }
        });
        
        // Handle upload errors
        xhr.addEventListener('error', () => {
            currentUploadController = null;
            console.error('Upload error occurred');
            resolve(false);
        });
        
        // Handle upload abort
        xhr.addEventListener('abort', () => {
            currentUploadController = null;
            console.log('Upload aborted');
            resolve(false);
        });
        
        // Setup abort handling
        currentUploadController.signal.addEventListener('abort', () => {
            xhr.abort();
        });
        
        // Start the upload
        xhr.open('POST', '/documents/upload');
        xhr.send(formData);
    });
}

/**
 * Cancel current upload if in progress
 */
export function cancelCurrentUpload() {
    if (currentUploadController) {
        currentUploadController.abort();
        currentUploadController = null;
        showMessage('Upload cancelled', 'warning');
        return true;
    }
    return false;
}

/**
 * Check if upload is currently in progress
 * @returns {boolean} - True if upload is in progress
 */
export function isUploadInProgress() {
    return currentUploadController !== null;
}
