/**
 * System Status Module
 * Handles system status monitoring and health checks
 * 
 * Features:
 * - Ollama connection monitoring
 * - Engine status tracking
 * - Memory usage monitoring
 * - Real-time status updates
 * - Chat availability management
 */

export class SystemStatus {
    constructor() {
        this.isOnline = false;
        this.engineStatus = null;
        this.memoryInfo = null;
        this.statusCheckInterval = null;
        this.memoryCheckInterval = null;
        this.statusUpdateCallbacks = new Set();
    }

    /**
     * Start monitoring system status
     * @param {number} statusInterval - Status check interval in ms (default: 15000)
     * @param {number} memoryInterval - Memory check interval in ms (default: 30000)
     */
    startMonitoring(statusInterval = 15000, memoryInterval = 30000) {
        // Initial checks
        this.checkStatus();
        this.checkMemory();
        this.updateDateTime();

        // Set up intervals
        this.statusCheckInterval = setInterval(() => this.checkStatus(), statusInterval);
        this.memoryCheckInterval = setInterval(() => this.checkMemory(), memoryInterval);
        
        // Update time every second
        setInterval(() => this.updateDateTime(), 1000);

        console.log('System status monitoring started');
    }

    /**
     * Stop monitoring system status
     */
    stopMonitoring() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
            this.memoryCheckInterval = null;
        }
        
        console.log('System status monitoring stopped');
    }

    /**
     * Check Ollama status and engine availability
     */
    async checkStatus() {
        try {
            const res = await fetch('/status');
            const data = await res.json();
            const { connected, engine, local_models } = data;
            
            this.isOnline = connected;
            this.engineStatus = engine;
            
            // Update connection status display
            const connElement = document.getElementById('conn-status');
            if (connElement) {
                connElement.innerText = connected ? '🟢 Ollama online' : '🔴 Ollama offline';
            }
            
            // Handle engine status display
            let engineText = '';
            let engineOnline = false;
            
            if (connected && engine && engine.name) {
                let status = '';
                if (engine.verified) {
                    status = '✅';
                    engineOnline = true;
                } else if (engine.available) {
                    status = '⏳';
                    engineOnline = true;
                } else {
                    status = '❌';
                    engineOnline = false;
                }
                engineText = `(Engine: ${engine.name} ${status})`;
            }
            
            const engineElement = document.getElementById('engine-info');
            if (engineElement) {
                engineElement.innerText = engineText;
            }
            
            // Update chat availability
            const hasModels = local_models && local_models.length > 0;
            const chatAvailable = connected && engineOnline && hasModels;
            this.updateChatAvailability(chatAvailable);
            
            // Notify callbacks
            this.notifyStatusUpdate({
                connected,
                engine,
                local_models,
                chatAvailable
            });
            
        } catch (error) {
            console.error('Status check failed:', error);
            
            this.isOnline = false;
            this.engineStatus = null;
            
            const connElement = document.getElementById('conn-status');
            if (connElement) {
                connElement.innerText = '🔴 Error';
            }
            
            this.updateChatAvailability(false);
            
            // Notify callbacks about error
            this.notifyStatusUpdate({
                connected: false,
                engine: null,
                local_models: [],
                chatAvailable: false,
                error: error.message
            });
        }
    }

    /**
     * Check system memory usage
     */
    async checkMemory() {
        try {
            const res = await fetch('/system/memory');
            const memory = await res.json();
            
            this.memoryInfo = memory;
            
            const memoryText = `💾 RAM: ${memory.used_gb}/${memory.total_gb}GB (${memory.percent_used.toFixed(1)}%)`;
            const memoryElement = document.getElementById('memory-info');
            if (memoryElement) {
                memoryElement.innerText = memoryText;
            }
            
        } catch (error) {
            console.error('Memory check failed:', error);
            
            const memoryElement = document.getElementById('memory-info');
            if (memoryElement) {
                memoryElement.innerText = '💾 Memory: Error';
            }
        }
    }

    /**
     * Update current date and time display
     */
    updateDateTime() {
        const now = new Date();
        
        const datetimeFullElement = document.getElementById('datetime-full-info');
        if (datetimeFullElement) {
            const time = now.toLocaleTimeString();
            const date = now.toLocaleDateString();
            
            // Get timezone info
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const offset = now.getTimezoneOffset();
            const offsetHours = Math.floor(Math.abs(offset) / 60);
            const offsetMinutes = Math.abs(offset) % 60;
            const sign = offset <= 0 ? '+' : '-';
            const offsetString = `${sign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
            const timezoneShort = `${timezone.split('/').pop()} (UTC${offsetString})`;
            
            datetimeFullElement.innerText = `${time} | ${date} | ${timezoneShort}`;
        }
    }

    /**
     * Enable/disable chat interface based on system availability
     * @param {boolean} isAvailable - Whether chat should be available
     */
    updateChatAvailability(isAvailable) {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const debugToggle = document.getElementById('debug-toggle');
        const debugMode = document.getElementById('debug-mode');
        
        // Chat input and send button
        if (chatInput && sendBtn) {
            if (isAvailable) {
                chatInput.disabled = false;
                sendBtn.disabled = false;
                chatInput.placeholder = "Ask a question about your documents... (Enter to send, Shift+Enter for new line)";
                chatInput.style.opacity = "1";
                sendBtn.style.opacity = "1";
                sendBtn.style.cursor = "pointer";
            } else {
                chatInput.disabled = true;
                sendBtn.disabled = true;
                chatInput.placeholder = "⚠️ Chat disabled: No AI engine online. Please check Ollama connection and load a model.";
                chatInput.style.opacity = "0.6";
                sendBtn.style.opacity = "0.6";
                sendBtn.style.cursor = "not-allowed";
            }
        }
        
        // Debug toggles (non-essential, don't block on these)
        if (debugToggle) {
            debugToggle.disabled = !isAvailable;
        }
        if (debugMode) {
            debugMode.disabled = !isAvailable;
        }
    }

    /**
     * Add a callback to be notified of status updates
     * @param {function} callback - Function to call on status updates
     */
    addStatusUpdateCallback(callback) {
        this.statusUpdateCallbacks.add(callback);
    }

    /**
     * Remove a status update callback
     * @param {function} callback - Function to remove
     */
    removeStatusUpdateCallback(callback) {
        this.statusUpdateCallbacks.delete(callback);
    }

    /**
     * Notify all callbacks of status update
     * @param {Object} statusData - Current status data
     */
    notifyStatusUpdate(statusData) {
        this.statusUpdateCallbacks.forEach(callback => {
            try {
                callback(statusData);
            } catch (error) {
                console.error('Status update callback failed:', error);
            }
        });
    }

    /**
     * Get current status summary
     * @returns {Object} Current status information
     */
    getStatusSummary() {
        return {
            isOnline: this.isOnline,
            engineStatus: this.engineStatus,
            memoryInfo: this.memoryInfo,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Force a status refresh
     */
    async refreshStatus() {
        await Promise.all([
            this.checkStatus(),
            this.checkMemory()
        ]);
        this.updateDateTime();
    }
}

// Create and export singleton instance
export const systemStatus = new SystemStatus();
