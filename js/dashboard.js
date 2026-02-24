/**
 * 📊 Enhanced Dashboard Manager
 * Professional dashboard with metrics, visualizations, and real-time updates
 */

class DashboardManager {
    constructor() {
        this.metrics = new Map();
        this.refreshInterval = null;
        this.updateInterval = 30000; // 30 seconds
        this.pendingWorkOrder = null;
    }

    async init() {
        // Render empty states immediately
        this.renderMetricsCards();
        this.renderJobCards();

        // Setup listeners first so navigation always works
        this.setupEventListeners();
        this.setupPDFUpload();
        this.setupAutoRefresh();

        // Load data in background (non-blocking)
        this.loadMetrics().then(() => {
            this.renderMetricsCards();
        }).catch(error => {
            console.warn('Failed to load metrics:', error);
        });

        this.loadActiveJobs().then(() => {
            this.renderJobCards();
        }).catch(error => {
            console.warn('Failed to load active jobs:', error);
        });
    }

    /**
     * Load dashboard metrics from backend
     */
    async loadMetrics() {
        try {
            const api = window.app?.api;
            if (!api) {
                console.warn('API not available');
                return;
            }

            // Check if any endpoints are configured
            if (!this.hasConfiguredEndpoints()) {
                console.log('No endpoints configured - skipping metrics load');
                this.showSetupRequired();
                return;
            }

            // Load inventory metrics
            const inventory = await api.callGoogleScript('inventory', 'getInventoryReport', []);
            const lowStock = await api.callGoogleScript('inventory', 'checkLowStock', []);
            const fleetReport = await api.callGoogleScript('inventory', 'getFleetReport', []);

            this.metrics.set('inventory', this.parseInventoryMetrics(inventory));
            this.metrics.set('lowStock', lowStock);
            this.metrics.set('fleet', this.parseFleetMetrics(fleetReport));

        } catch (error) {
            // Only show error if it's not about missing endpoints
            if (!error.message.includes('No Google Apps Script endpoint')) {
                console.error('Failed to load metrics:', error);
                this.showError('Unable to load dashboard metrics');
            } else {
                console.log('Endpoints not configured yet');
                this.showSetupRequired();
            }
        }
    }

    /**
     * Parse inventory report into metrics
     */
    parseInventoryMetrics(report) {
        if (!report) return { total: 0, locations: 0, value: 0 };

        // Extract numbers from report text
        const totalMatch = report.match(/Total Items:\s*(\d+)/);
        const locationsMatch = report.match(/Locations:\s*(\d+)/);

        return {
            total: totalMatch ? parseInt(totalMatch[1]) : 0,
            locations: locationsMatch ? parseInt(locationsMatch[1]) : 0,
            value: 0 // Could be calculated if we had pricing data
        };
    }

    /**
     * Parse fleet report into metrics
     */
    parseFleetMetrics(report) {
        if (!report) return { total: 0, active: 0, maintenance: 0 };

        const totalMatch = report.match(/Total Fleet Size:\s*(\d+)/);
        const activeMatch = report.match(/Active:\s*(\d+)/);
        const maintenanceMatch = report.match(/In Maintenance:\s*(\d+)/);

        return {
            total: totalMatch ? parseInt(totalMatch[1]) : 0,
            active: activeMatch ? parseInt(activeMatch[1]) : 0,
            maintenance: maintenanceMatch ? parseInt(maintenanceMatch[1]) : 0
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTIVE JOBS DASHBOARD
    // ═══════════════════════════════════════════════════════════════

    /**
     * Load active jobs from backend
     */
    async loadActiveJobs() {
        try {
            const api = window.app?.api;
            if (!api) {
                console.warn('API not available for jobs loading');
                return;
            }

            if (!this.hasConfiguredEndpoints()) {
                console.log('No endpoints configured - skipping jobs load');
                this.metrics.set('activeJobs', []);
                return;
            }

            const result = await api.callGoogleScript('inventory', 'getActiveJobs', []);
            const jobs = (result && result.jobs) ? result.jobs : (Array.isArray(result) ? result : []);
            this.metrics.set('activeJobs', jobs);

        } catch (error) {
            if (!error.message.includes('No Google Apps Script endpoint')) {
                console.error('Failed to load active jobs:', error);
            }
            this.metrics.set('activeJobs', []);
        }
    }

    /**
     * Render job cards grid
     */
    renderJobCards() {
        const container = document.getElementById('jobCardsGrid');
        if (!container) {
            console.warn('Job cards container not found');
            return;
        }

        const jobs = this.metrics.get('activeJobs') || [];

        if (jobs.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon">📋</div>
                    <p>No active jobs</p>
                    <span class="empty-hint">Upload a work order PDF above to get started</span>
                </div>`;
            return;
        }

        container.innerHTML = jobs.map(job => this.createJobCard(job)).join('');
    }

    /**
     * Create a single job card HTML
     */
    createJobCard(job) {
        const progress = job.progress ?? 0;
        const progressColor = progress >= 75 ? 'success' : progress >= 40 ? 'warning' : 'info';
        const statusClass = (job.status || '').toLowerCase().replace(/\s+/g, '-');

        return `
            <div class="job-card ${progressColor}" role="listitem">
                <div class="job-card-header">
                    <span class="job-wo-number">WO #${this.escapeHtml(job.woNumber || 'N/A')}</span>
                    <span class="job-status-badge ${statusClass}">${this.escapeHtml(job.status || 'Active')}</span>
                </div>
                <h3 class="job-card-title">${this.escapeHtml(job.jobName || 'Untitled Job')}</h3>
                <div class="job-card-details">
                    <div class="job-detail-row">
                        <span class="job-detail-icon">👤</span>
                        <span>${this.escapeHtml(job.clientName || 'No client')}</span>
                    </div>
                    <div class="job-detail-row">
                        <span class="job-detail-icon">📍</span>
                        <span>${this.escapeHtml(job.address || 'No address')}</span>
                    </div>
                    <div class="job-detail-row">
                        <span class="job-detail-icon">🏷️</span>
                        <span>${this.escapeHtml(job.category || 'General')}</span>
                    </div>
                    <div class="job-detail-row">
                        <span class="job-detail-icon">💼</span>
                        <span>${this.escapeHtml(job.salesRep || 'Unassigned')}</span>
                    </div>
                </div>
                <div class="job-card-progress">
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-bar-fill ${progressColor}" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-percentage">${progress}%</span>
                    </div>
                    <span class="progress-label">${this.escapeHtml(job.progressLabel || (job.tasksComplete || 0) + ' / ' + (job.tasksTotal || 0) + ' tasks complete')}</span>
                </div>
            </div>`;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ═══════════════════════════════════════════════════════════════
    // PDF UPLOAD & PARSE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Setup PDF upload zone event listeners
     */
    setupPDFUpload() {
        const dropZone = document.getElementById('pdfUploadZone');
        const fileInput = document.getElementById('pdfFileInput');
        if (!dropZone || !fileInput) return;

        // Click to upload
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                this.handlePDFFile(file);
            } else {
                this.showToast('Please upload a PDF file', 'warning');
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handlePDFFile(file);
            fileInput.value = ''; // Reset so same file can be re-selected
        });

        // Preview panel buttons
        document.getElementById('previewConfirmBtn')?.addEventListener('click', () => this.confirmWorkOrder());
        document.getElementById('previewCancelBtn')?.addEventListener('click', () => this.cancelPreview());
    }

    /**
     * Handle a selected PDF file: read as base64, send to backend for Claude parsing
     */
    async handlePDFFile(file) {
        if (file.size > 10 * 1024 * 1024) {
            this.showToast('File too large. Maximum 10MB.', 'error');
            return;
        }

        const progressEl = document.getElementById('uploadProgress');
        const statusEl = document.getElementById('uploadStatus');
        progressEl?.classList.remove('hidden');
        if (statusEl) statusEl.textContent = 'Reading PDF...';

        try {
            const base64 = await this.readFileAsBase64(file);
            if (statusEl) statusEl.textContent = 'Parsing with AI... This may take a moment.';

            const api = window.app?.api;
            if (!api) throw new Error('API not available');

            const result = await api.callGoogleScript('inventory', 'parsePDFWithClaude', [base64]);

            if (result && result.success === false) {
                throw new Error(result.error || 'Failed to parse PDF');
            }

            this.pendingWorkOrder = result;
            this.showPreview(result);
            progressEl?.classList.add('hidden');

        } catch (error) {
            console.error('PDF processing error:', error);
            this.showToast('Failed to parse PDF: ' + error.message, 'error');
            progressEl?.classList.add('hidden');
        }
    }

    /**
     * Read a file as base64 string (without data: prefix)
     */
    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Show parsed work order data in preview panel
     */
    showPreview(data) {
        const panel = document.getElementById('previewPanel');
        const content = document.getElementById('previewContent');
        if (!panel || !content) return;

        const wo = data.workOrder || {};
        const items = data.lineItems || [];

        let html = `
            <div class="preview-wo-details">
                <div class="preview-field"><strong>WO #:</strong> ${this.escapeHtml(wo.woNumber || 'N/A')}</div>
                <div class="preview-field"><strong>Job:</strong> ${this.escapeHtml(wo.jobName || '')}</div>
                <div class="preview-field"><strong>Client:</strong> ${this.escapeHtml(wo.clientName || '')}</div>
                <div class="preview-field"><strong>Category:</strong> ${this.escapeHtml(wo.category || '')}</div>
                <div class="preview-field"><strong>Address:</strong> ${this.escapeHtml(wo.address || '')}</div>
                <div class="preview-field"><strong>Sales Rep:</strong> ${this.escapeHtml(wo.salesRep || '')}</div>
            </div>`;

        if (items.length > 0) {
            html += `
                <h4 style="margin: var(--space-4) 0 var(--space-2);">Line Items (${items.length})</h4>
                <table class="preview-table">
                    <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Price</th><th>Total</th></tr></thead>
                    <tbody>
                        ${items.map(li => `<tr>
                            <td>${this.escapeHtml(li.item || '')}</td>
                            <td>${li.quantity || 0}</td>
                            <td>${this.escapeHtml(li.unit || '')}</td>
                            <td>$${(li.unitPrice || 0).toFixed(2)}</td>
                            <td>$${(li.total || 0).toFixed(2)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>`;
        }

        content.innerHTML = html;
        panel.classList.remove('hidden');
    }

    /**
     * Confirm and write the pending work order to Google Sheets
     */
    async confirmWorkOrder() {
        if (!this.pendingWorkOrder) return;

        const confirmBtn = document.getElementById('previewConfirmBtn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Saving...';
        }

        try {
            const api = window.app?.api;
            if (!api) throw new Error('API not available');

            // Write work order header
            await api.callGoogleScript('inventory', 'writeWorkOrder', [this.pendingWorkOrder.workOrder]);

            // Write line items if present
            if (this.pendingWorkOrder.lineItems?.length > 0) {
                await api.callGoogleScript('inventory', 'writeLineItems', [{
                    woNumber: this.pendingWorkOrder.workOrder.woNumber,
                    items: this.pendingWorkOrder.lineItems
                }]);
            }

            this.showToast('Work order saved successfully!', 'success');
            this.cancelPreview();

            // Refresh job cards
            await this.loadActiveJobs();
            this.renderJobCards();

        } catch (error) {
            console.error('Failed to save work order:', error);
            this.showToast('Failed to save: ' + error.message, 'error');
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirm & Save';
            }
        }
    }

    /**
     * Cancel preview and clear pending data
     */
    cancelPreview() {
        this.pendingWorkOrder = null;
        document.getElementById('previewPanel')?.classList.add('hidden');
    }

    /**
     * Render metrics cards on dashboard
     */
    renderMetricsCards() {
        const container = document.getElementById('metricsGrid');
        if (!container) {
            console.warn('Metrics container not found');
            return;
        }

        const inventory = this.metrics.get('inventory') || { total: 0, locations: 0 };
        const lowStock = this.metrics.get('lowStock') || [];
        const fleet = this.metrics.get('fleet') || { total: 0, active: 0, maintenance: 0 };

        const cards = [
            {
                icon: '🌱',
                label: 'Total Inventory Items',
                value: inventory.total,
                change: null,
                status: 'success'
            },
            {
                icon: '⚠️',
                label: 'Low Stock Items',
                value: lowStock.length || 0,
                change: lowStock.length > 0 ? { value: lowStock.length, positive: false } : null,
                status: lowStock.length > 5 ? 'error' : 'warning'
            },
            {
                icon: '📍',
                label: 'Storage Locations',
                value: inventory.locations,
                change: null,
                status: 'info'
            },
            {
                icon: '🚛',
                label: 'Active Vehicles',
                value: `${fleet.active}/${fleet.total}`,
                change: fleet.maintenance > 0 ? { value: fleet.maintenance, positive: false } : null,
                status: fleet.maintenance > 0 ? 'warning' : 'success'
            }
        ];

        container.innerHTML = cards.map(card => this.createMetricCard(card)).join('');
    }

    /**
     * Create a metric card HTML
     */
    createMetricCard({ icon, label, value, change, status }) {
        const changeHTML = change ? `
            <div class="metric-change ${change.positive ? 'positive' : 'negative'}">
                <span>${change.positive ? '↑' : '↓'}</span>
                <span>${change.value}</span>
            </div>
        ` : '';

        return `
            <div class="metric-card ${status}" data-metric="${label}">
                <div class="metric-header">
                    <div class="metric-info">
                        <div class="metric-value">${value}</div>
                        <div class="metric-label">${label}</div>
                        ${changeHTML}
                    </div>
                    <div class="metric-icon ${status}">${icon}</div>
                </div>
            </div>
        `;
    }

    /**
     * Setup auto-refresh for metrics
     */
    setupAutoRefresh() {
        this.refreshInterval = setInterval(async () => {
            await this.loadMetrics();
            this.renderMetricsCards();
            await this.loadActiveJobs();
            this.renderJobCards();
        }, this.updateInterval);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshMetrics');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                await this.loadMetrics();
                this.renderMetricsCards();
                this.showToast('Dashboard refreshed', 'success');
                setTimeout(() => refreshBtn.disabled = false, 2000);
            });
        }

        // Metric card clicks
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.metric-card');
            if (card) {
                const metric = card.dataset.metric;
                this.handleMetricClick(metric);
            }
        });
    }

    /**
     * Handle metric card click
     */
    handleMetricClick(metric) {
        // Could open detailed view, filter data, etc.
        console.log('Metric clicked:', metric);
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (window.app?.ui) {
            window.app.ui.showNotification(message, type);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showToast(message, 'error');
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    /**
     * Check if any endpoints are configured
     */
    hasConfiguredEndpoints() {
        const config = window.app?.config?.services;
        if (!config) return false;

        // Check if at least one service has a URL configured
        const services = ['inventory', 'grading', 'scheduler', 'tools'];
        return services.some(service => {
            const url = config[service]?.url;
            return url && url.trim() !== '';
        });
    }

    /**
     * Show setup required message
     */
    showSetupRequired() {
        const metricsGrid = document.querySelector('.metrics-grid');
        if (metricsGrid) {
            metricsGrid.innerHTML = `
                <div class="setup-required" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-secondary, #f8f9fa); border-radius: 12px; margin: 20px 0;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🧙‍♂️</div>
                    <h2 style="margin: 0 0 12px; color: var(--text-primary, #333);">Setup Required</h2>
                    <p style="color: var(--text-secondary, #666); margin-bottom: 24px; max-width: 500px; margin-left: auto; margin-right: auto;">
                        To see dashboard metrics and connect to your tools, you need to configure external connections.
                    </p>
                    <button
                        class="btn btn-primary"
                        onclick="document.getElementById('settingsBtn')?.click()"
                        style="padding: 12px 32px; font-size: 16px; cursor: pointer; background: var(--primary-color, #2196F3); color: white; border: none; border-radius: 8px; transition: all 0.3s ease;"
                    >
                        ⚙️ Open Settings & Run Setup Wizard
                    </button>
                    <p style="color: var(--text-secondary, #888); margin-top: 16px; font-size: 14px;">
                        Or continue using the chat interface without external tools
                    </p>
                </div>
            `;
        }
    }
}

/**
 * 🔔 Toast Notification System
 */
class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.defaultDuration = 5000;
        this.init();
    }

    init() {
        // Create toast container
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    }

    /**
     * Show toast notification
     */
    show(message, type = 'info', duration = this.defaultDuration) {
        const id = Date.now();
        const toast = this.createToast(id, message, type);

        this.container.appendChild(toast);
        this.toasts.set(id, toast);

        // Auto remove
        setTimeout(() => this.remove(id), duration);

        return id;
    }

    /**
     * Create toast element
     */
    createToast(id, message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.dataset.toastId = id;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="toast-close" onclick="window.toastManager.remove(${id})">×</button>
        `;

        return toast;
    }

    /**
     * Remove toast
     */
    remove(id) {
        const toast = this.toasts.get(id);
        if (toast) {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                toast.remove();
                this.toasts.delete(id);
            }, 300);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Shorthand methods
     */
    success(message) { return this.show(message, 'success'); }
    error(message) { return this.show(message, 'error'); }
    warning(message) { return this.show(message, 'warning'); }
    info(message) { return this.show(message, 'info'); }
}

/**
 * 📈 Data Visualization Helper
 */
class ChartHelper {
    /**
     * Create simple bar chart
     */
    static createBarChart(data, container) {
        const max = Math.max(...data.map(d => d.value));

        const html = data.map(item => {
            const percentage = (item.value / max) * 100;
            return `
                <div class="chart-bar">
                    <div class="chart-bar-label">${item.label}</div>
                    <div class="chart-bar-container">
                        <div class="chart-bar-fill" style="width: ${percentage}%">
                            <span class="chart-bar-value">${item.value}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    /**
     * Create donut chart data
     */
    static createDonutData(data) {
        const total = data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = 0;

        return data.map(item => {
            const percentage = (item.value / total) * 100;
            const angle = (item.value / total) * 360;
            const segment = {
                ...item,
                percentage: percentage.toFixed(1),
                startAngle: currentAngle,
                endAngle: currentAngle + angle
            };
            currentAngle += angle;
            return segment;
        });
    }
// Initialize toast manager globally
window.toastManager = new ToastManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DashboardManager, ToastManager, ChartHelper };
}
