/**
 * Modal Manager Module
 * Handles modal dialogs throughout the application
 * 
 * Features:
 * - Generic modal management
 * - Focus trap for accessibility
 * - Keyboard navigation (ESC to close)
 * - Click outside to close
 */

export class ModalManager {
    constructor() {
        this.activeModals = new Set();
        this.setupGlobalListeners();
    }

    /**
     * Set up global event listeners for modal management
     */
    setupGlobalListeners() {
        // Global ESC key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.size > 0) {
                // Close the most recently opened modal
                const modals = Array.from(this.activeModals);
                const lastModal = modals[modals.length - 1];
                this.hideModal(lastModal);
            }
        });
    }

    /**
     * Show a modal dialog
     * @param {string} modalId - ID of the modal element
     * @param {Object} options - Configuration options
     * @param {boolean} options.focusTrap - Enable focus trap (default: true)
     * @param {boolean} options.clickOutsideToClose - Allow click outside to close (default: true)
     */
    showModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal with ID '${modalId}' not found`);
            return false;
        }

        const config = {
            focusTrap: true,
            clickOutsideToClose: true,
            ...options
        };

        // Show modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        this.activeModals.add(modalId);

        // Set up click outside to close
        if (config.clickOutsideToClose) {
            const backdrop = modal.querySelector('.modal-backdrop, .settings-modal-backdrop');
            if (backdrop) {
                backdrop.addEventListener('click', () => this.hideModal(modalId), { once: true });
            }
        }

        // Focus management
        if (config.focusTrap) {
            setTimeout(() => {
                const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            }, 100);
        }

        return true;
    }

    /**
     * Hide a modal dialog
     * @param {string} modalId - ID of the modal element
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal with ID '${modalId}' not found`);
            return false;
        }

        modal.style.display = 'none';
        this.activeModals.delete(modalId);

        // Restore body scroll if no modals are active
        if (this.activeModals.size === 0) {
            document.body.style.overflow = '';
        }

        return true;
    }

    /**
     * Check if a modal is currently active
     * @param {string} modalId - ID of the modal element
     * @returns {boolean}
     */
    isModalActive(modalId) {
        return this.activeModals.has(modalId);
    }

    /**
     * Get the number of active modals
     * @returns {number}
     */
    getActiveModalCount() {
        return this.activeModals.size;
    }

    /**
     * Initialize modal for a specific element
     * @param {string} modalId - ID of the modal element
     * @param {string} triggerId - ID of the element that triggers the modal
     * @param {string} closeId - ID of the close button (optional)
     * @param {Object} options - Configuration options
     */
    initializeModal(modalId, triggerId, closeId = null, options = {}) {
        const trigger = document.getElementById(triggerId);
        const closeBtn = closeId ? document.getElementById(closeId) : null;

        if (!trigger) {
            console.warn(`Modal trigger with ID '${triggerId}' not found`);
            return;
        }

        // Set up trigger event
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal(modalId, options);
        });

        // Set up close button if provided
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideModal(modalId);
            });
        }
    }
}

// Create and export singleton instance
export const modalManager = new ModalManager();
