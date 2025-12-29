/**
 * 📊 Enhanced Dashboard Manager
 * Professional dashboard with metrics, visualizations, and real-time updates
 */

class DashboardManager {
    constructor() {
        this.metrics = new Map();
        this.refreshInterval = null;
        this.updateInterval = 30000; // 30 seconds
    }

    async init() {
        // Render empty states immediately
        this.renderMetricsCards();
        this.renderRecentActivity();

        // Setup listeners first so navigation always works
        this.setupEventListeners();
        this.setupAutoRefresh();

        // Load data in background (non-blocking)
        this.loadMetrics().then(() => {
            this.renderMetricsCards();
        }).catch(error => {
            console.warn('Failed to load metrics:', error);
        });

        this.loadRecentActivity().then(() => {
            this.renderRecentActivity();
        }).catch(error => {
            console.warn('Failed to load recent activity:', error);
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

    /**
     * Load recent activity from backend
     */
    async loadRecentActivity() {
        try {
            const api = window.app?.api;
            if (!api) {
                console.warn('API not available for activity loading');
                return;
            }

            // Check if any endpoints are configured
            if (!this.hasConfiguredEndpoints()) {
                console.log('No endpoints configured - skipping activity load');
                this.metrics.set('recentActivity', []);
                return;
            }

            // Load recent inventory changes
            const recentActivity = await api.callGoogleScript('inventory', 'getRecentActivity', [5]);

            this.metrics.set('recentActivity', recentActivity);

        } catch (error) {
            // Only show error if it's not about missing endpoints
            if (!error.message.includes('No Google Apps Script endpoint')) {
                console.error('Failed to load recent activity:', error);
            }
            // Set empty array as fallback
            this.metrics.set('recentActivity', []);
        }
    }

    /**
     * Render recent activity list
     */
    renderRecentActivity() {
        const container = document.getElementById('activityList');
        if (!container) {
            console.warn('Activity list container not found');
            return;
        }

        let activities = this.metrics.get('recentActivity') || [];

        // Show sample data if no real data available
        if (activities.length === 0) {
            activities = this.getSampleActivityData();
        }

        const activityHTML = activities.map(activity => this.createActivityItem(activity)).join('');
        container.innerHTML = activityHTML;
    }

    /**
     * Get sample activity data for demonstration
     */
    getSampleActivityData() {
        const now = Date.now();
        return [
            {
                action: 'added',
                itemName: 'Boxwood - 3 Gallon',
                details: 'Added 50 units to Yard A',
                timestamp: new Date(now - 2 * 60 * 60 * 1000), // 2 hours ago
                user: 'John Smith'
            },
            {
                action: 'maintenance',
                itemName: 'Truck #3',
                details: 'Scheduled for oil change',
                timestamp: new Date(now - 5 * 60 * 60 * 1000), // 5 hours ago
                user: 'Mike Johnson'
            },
            {
                action: 'removed',
                itemName: 'Rake - Standard',
                details: 'Removed 2 units (broken)',
                timestamp: new Date(now - 24 * 60 * 60 * 1000), // 1 day ago
                user: 'Sarah Williams'
            },
            {
                action: 'returned',
                itemName: 'Wheelbarrow #5',
                details: 'Returned to service after repair',
                timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                user: 'Tom Davis'
            },
            {
                action: 'added',
                itemName: 'Holly - 5 Gallon',
                details: 'Added 30 units to Yard B',
                timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                user: 'Chris Brown'
            }
        ];
    }

    /**
     * Create activity item HTML
     */
    createActivityItem(activity) {
        const { action, itemName, details, timestamp, user } = activity;

        // Determine icon and color based on action type
        const actionMap = {
            'added': { icon: '➕', color: 'success', label: 'Added' },
            'removed': { icon: '➖', color: 'error', label: 'Removed' },
            'edited': { icon: '✏️', color: 'info', label: 'Edited' },
            'broken': { icon: '⚠️', color: 'warning', label: 'Marked as Broken' },
            'out_of_service': { icon: '🔴', color: 'error', label: 'Out of Service' },
            'maintenance': { icon: '🔧', color: 'warning', label: 'In Maintenance' },
            'returned': { icon: '✅', color: 'success', label: 'Returned to Service' }
        };

        const actionInfo = actionMap[action] || { icon: '📝', color: 'info', label: action };
        const timeAgo = this.formatTimeAgo(timestamp);

        return `
            <div class="activity-item ${actionInfo.color}">
                <div class="activity-icon ${actionInfo.color}">
                    ${actionInfo.icon}
                </div>
                <div class="activity-content">
                    <div class="activity-header">
                        <span class="activity-title">${itemName}</span>
                        <span class="activity-badge ${actionInfo.color}">${actionInfo.label}</span>
                    </div>
                    <div class="activity-details">${details || 'No additional details'}</div>
                    <div class="activity-meta">
                        <span class="activity-time">${timeAgo}</span>
                        ${user ? `<span class="activity-user">by ${user}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Format timestamp as relative time
     */
    formatTimeAgo(timestamp) {
        if (!timestamp) return 'Recently';

        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffMs = now - activityTime;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
        if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
        if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;

        return activityTime.toLocaleDateString();
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
            await this.loadRecentActivity();
            this.renderRecentActivity();
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
