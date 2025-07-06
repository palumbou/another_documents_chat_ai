/**
 * API Explorer Module
 * Provides a user interface to explore and test all available API endpoints
 * 
 * Features:
 * - List all available endpoints organized by category
 * - Interactive testing with clicka                <h2 style="margin: 0; color: var(--text-primary);">🐝 API Explorer</h2>le buttons
 * - Response display with syntax highlighting
 * - Copy URL and response functionality
 */

export class APIExplorer {
    constructor() {
        this.baseUrl = window.location.origin;
        this.endpoints = this.initializeEndpoints();
        this.isVisible = false;
    }

    /**
     * Initialize all API endpoints with their metadata
     */
    initializeEndpoints() {
        return {
            'System & Status': [
                {
                    method: 'GET',
                    url: '/status',
                    description: 'Get overall system status including Ollama connection and engine information',
                    requiresParams: false
                },
                {
                    method: 'GET',
                    url: '/system/memory',
                    description: 'Get current system memory usage information',
                    requiresParams: false
                }
            ],
            'Projects Management': [
                {
                    method: 'GET',
                    url: '/projects',
                    description: 'List all available projects',
                    requiresParams: false
                },
                {
                    method: 'GET',
                    url: '/projects/names',
                    description: 'Get list of project names only',
                    requiresParams: false
                },
                {
                    method: 'GET',
                    url: '/projects/{project_name}/overview',
                    description: 'Get detailed overview of a specific project',
                    requiresParams: true,
                    params: ['project_name']
                }
            ],
            'Documents Management': [
                {
                    method: 'GET',
                    url: '/documents',
                    description: 'List all documents in current project with processing status',
                    requiresParams: false,
                    queryParams: ['project']
                },
                {
                    method: 'GET',
                    url: '/documents/status',
                    description: 'Get processing status of all documents',
                    requiresParams: false
                },
                {
                    method: 'GET',
                    url: '/documents/status/{filename}',
                    description: 'Get processing status of a specific document',
                    requiresParams: true,
                    params: ['filename']
                },
                {
                    method: 'GET',
                    url: '/documents/{filename}/chunks',
                    description: 'Get all chunks/segments of a processed document',
                    requiresParams: true,
                    params: ['filename']
                }
            ],
            'Chat & Chat History': [
                {
                    method: 'GET',
                    url: '/chats/{project_name}',
                    description: 'Get all chat sessions for a project',
                    requiresParams: true,
                    params: ['project_name']
                },
                {
                    method: 'GET',
                    url: '/chats/{project_name}/{chat_id}',
                    description: 'Get messages from a specific chat session',
                    requiresParams: true,
                    params: ['project_name', 'chat_id']
                }
            ],
            'Models Management': [
                {
                    method: 'GET',
                    url: '/models',
                    description: 'Get all available models (local and remote) with system information',
                    requiresParams: false
                },
                {
                    method: 'GET',
                    url: '/models/grouped',
                    description: 'Get models grouped by categories (size, type, etc.)',
                    requiresParams: false
                }
            ],
            'Debug & Search': [
                {
                    method: 'GET',
                    url: '/debug/pdf/{filename}',
                    description: 'Get debug information about PDF processing',
                    requiresParams: true,
                    params: ['filename']
                }
            ],
            'Engine Management': [
                {
                    method: 'GET',
                    url: '/engine/health',
                    description: 'Get detailed health status of the AI engine',
                    requiresParams: false
                }
            ]
        };
    }

    /**
     * Create and show the API Explorer modal
     */
    show() {
        if (this.isVisible) return;

        const modal = this.createModal();
        document.body.appendChild(modal);
        this.isVisible = true;

        // Show modal with animation
        setTimeout(() => {
            modal.style.display = 'flex';
            modal.style.opacity = '1';
        }, 10);
    }

    /**
     * Hide the API Explorer modal
     */
    hide() {
        const modal = document.getElementById('api-explorer-modal');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
                this.isVisible = false;
            }, 300);
        }
    }

    /**
     * Create the modal HTML structure
     */
    createModal() {
        const modal = document.createElement('div');
        modal.id = 'api-explorer-modal';
        modal.className = 'modal-backdrop';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.cssText = `
            background: var(--bg-primary);
            border-radius: 12px;
            width: 90%;
            max-width: 1200px;
            height: 80%;
            display: flex;
            flex-direction: column;
            border: 1px solid var(--border-color);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            color: var(--text-primary);
        `;

        content.innerHTML = `
            <div class="modal-header" style="
                padding: 1.5rem;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <h2 style="margin: 0; color: var(--text-primary);">� API Explorer</h2>
                <button id="close-api-explorer" style="
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--text-secondary);
                    padding: 0.5rem;
                    border-radius: 4px;
                " title="Close">✕</button>
            </div>
            <div class="modal-body" style="
                display: flex;
                flex: 1;
                overflow: hidden;
            ">
                <div class="api-sidebar" style="
                    width: 350px;
                    border-right: 1px solid var(--border-color);
                    overflow-y: auto;
                    padding: 1rem;
                ">
                    ${this.createSidebarHTML()}
                </div>
                <div class="api-content" style="
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    padding: 1rem;
                ">
                    <div id="api-response-area" style="
                        flex: 1;
                        background: var(--bg-secondary);
                        border-radius: 8px;
                        padding: 1rem;
                        overflow-y: auto;
                        font-family: 'Courier New', monospace;
                        white-space: pre-wrap;
                        border: 1px solid var(--border-color);
                    ">
                        Click on an API endpoint to test it and see the response here.
                    </div>
                    <div style="margin-top: 1rem; display: flex; gap: 1rem;">
                        <button id="copy-url-btn" style="
                            padding: 0.5rem 1rem;
                            background: var(--accent-color);
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            opacity: 0.5;
                        " disabled>Copy URL</button>
                        <button id="copy-response-btn" style="
                            padding: 0.5rem 1rem;
                            background: var(--accent-color);
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            opacity: 0.5;
                        " disabled>Copy Response</button>
                    </div>
                </div>
            </div>
        `;

        modal.appendChild(content);
        this.setupEventListeners(modal);
        return modal;
    }

    /**
     * Create the sidebar HTML with all endpoints
     */
    createSidebarHTML() {
        let html = '';
        
        for (const [category, endpoints] of Object.entries(this.endpoints)) {
            html += `
                <div class="api-category" style="margin-bottom: 1.5rem;">
                    <h3 style="
                        margin: 0 0 0.75rem 0;
                        color: var(--accent-color);
                        font-size: 0.9rem;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">${category}</h3>
                    <div class="api-endpoints">
            `;
            
            endpoints.forEach((endpoint, index) => {
                const methodColor = this.getMethodColor(endpoint.method);
                const endpointId = `${category.replace(/[^a-zA-Z0-9]/g, '')}-${index}`;
                
                html += `
                    <div class="api-endpoint" 
                         data-endpoint='${JSON.stringify(endpoint)}'
                         data-id="${endpointId}"
                         style="
                            margin-bottom: 0.5rem;
                            padding: 0.75rem;
                            border: 1px solid var(--border-color);
                            border-radius: 6px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            background: var(--bg-primary);
                         "
                         onmouseover="this.style.background='var(--bg-secondary)'"
                         onmouseout="this.style.background='var(--bg-primary)'">
                        <div style="display: flex; align-items: center; margin-bottom: 0.25rem;">
                            <span style="
                                background: ${methodColor};
                                color: white;
                                padding: 0.2rem 0.5rem;
                                border-radius: 3px;
                                font-size: 0.7rem;
                                font-weight: bold;
                                margin-right: 0.5rem;
                            ">${endpoint.method}</span>
                            <code style="
                                color: var(--text-primary);
                                font-size: 0.8rem;
                                word-break: break-all;
                            ">${endpoint.url}</code>
                        </div>
                        <div style="
                            font-size: 0.75rem;
                            color: var(--text-secondary);
                            line-height: 1.3;
                        ">${endpoint.description}</div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    /**
     * Get color for HTTP method
     */
    getMethodColor(method) {
        const colors = {
            'GET': '#28a745',
            'POST': '#007bff',
            'PUT': '#ffc107',
            'DELETE': '#dc3545',
            'PATCH': '#6c757d'
        };
        return colors[method] || '#6c757d';
    }

    /**
     * Setup event listeners for the modal
     */
    setupEventListeners(modal) {
        // Close modal
        modal.querySelector('#close-api-explorer').addEventListener('click', () => {
            this.hide();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hide();
            }
        });

        // Handle endpoint clicks
        modal.querySelectorAll('.api-endpoint').forEach(endpoint => {
            endpoint.addEventListener('click', () => {
                const data = JSON.parse(endpoint.dataset.endpoint);
                this.testEndpoint(data);
            });
        });

        // Copy buttons
        modal.querySelector('#copy-url-btn').addEventListener('click', () => {
            this.copyCurrentUrl();
        });

        modal.querySelector('#copy-response-btn').addEventListener('click', () => {
            this.copyCurrentResponse();
        });
    }

    /**
     * Test an API endpoint
     */
    async testEndpoint(endpoint) {
        const responseArea = document.getElementById('api-response-area');
        const copyUrlBtn = document.getElementById('copy-url-btn');
        const copyResponseBtn = document.getElementById('copy-response-btn');

        try {
            // Build URL
            let url = endpoint.url;
            
            // Handle path parameters
            if (endpoint.requiresParams && endpoint.params) {
                for (const param of endpoint.params) {
                    const value = prompt(`Enter value for ${param}:`);
                    if (value === null) return; // User cancelled
                    url = url.replace(`{${param}}`, encodeURIComponent(value));
                }
            }

            // Handle query parameters
            if (endpoint.queryParams) {
                const queryString = new URLSearchParams();
                for (const param of endpoint.queryParams) {
                    const value = prompt(`Enter value for ${param} (optional):`);
                    if (value) {
                        queryString.append(param, value);
                    }
                }
                if (queryString.toString()) {
                    url += '?' + queryString.toString();
                }
            }

            const fullUrl = this.baseUrl + url;
            this.currentUrl = fullUrl;

            // Show loading
            responseArea.textContent = 'Loading...';
            responseArea.style.color = 'var(--text-secondary)';

            // Make request
            const response = await fetch(fullUrl, {
                method: endpoint.method,
                headers: {
                    'Accept': 'application/json'
                }
            });

            const data = await response.json();
            
            // Display response
            const formatted = JSON.stringify(data, null, 2);
            responseArea.textContent = formatted;
            responseArea.style.color = 'var(--text-primary)';
            this.currentResponse = formatted;

            // Enable copy buttons
            copyUrlBtn.disabled = false;
            copyUrlBtn.style.opacity = '1';
            copyResponseBtn.disabled = false;
            copyResponseBtn.style.opacity = '1';

        } catch (error) {
            responseArea.textContent = `Error: ${error.message}`;
            responseArea.style.color = '#dc3545';
        }
    }

    /**
     * Copy current URL to clipboard
     */
    async copyCurrentUrl() {
        if (this.currentUrl) {
            try {
                await navigator.clipboard.writeText(this.currentUrl);
                this.showToast('URL copied to clipboard!');
            } catch (error) {
                console.error('Failed to copy URL:', error);
            }
        }
    }

    /**
     * Copy current response to clipboard
     */
    async copyCurrentResponse() {
        if (this.currentResponse) {
            try {
                await navigator.clipboard.writeText(this.currentResponse);
                this.showToast('Response copied to clipboard!');
            } catch (error) {
                console.error('Failed to copy response:', error);
            }
        }
    }

    /**
     * Show a temporary toast notification
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--accent-color);
            color: white;
            padding: 0.75rem 1rem;
            border-radius: 4px;
            z-index: 2000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.style.opacity = '1', 10);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// Create and export singleton instance
export const apiExplorer = new APIExplorer();
