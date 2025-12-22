/**
 * Work Order Sync Module
 *
 * Handles bidirectional synchronization between localStorage and Google Sheets.
 * Features:
 * - Offline-first with localStorage cache
 * - Auto-sync at configurable intervals
 * - Event system for real-time updates across tools
 * - Conflict resolution (last-write-wins)
 */

const WorkOrderSync = {
    // Configuration
    config: {
        enabled: true,
        sheetUrl: 'https://script.google.com/macros/s/AKfycbz_8YjbZhRMN-Indd_Hxf4ZbVSLu_SUvj2Qi1u4DZj0f-NH5VRZqnA2CT9QJ0lZp5qKUg/exec',
        interval: '60', // manual, 15, 30, 60 (minutes)
        lastSync: null,
        syncInProgress: false
    },

    // Default URL (used if no settings saved)
    DEFAULT_SHEET_URL: 'https://script.google.com/macros/s/AKfycbz_8YjbZhRMN-Indd_Hxf4ZbVSLu_SUvj2Qi1u4DZj0f-NH5VRZqnA2CT9QJ0lZp5qKUg/exec',

    // Sync timer
    syncTimer: null,

    // Event listeners
    listeners: {},

    /**
     * Initialize the sync module
     */
    init() {
        this.loadSettings();
        this.startAutoSync();
        this.setupEventListeners();
        console.log('[WorkOrderSync] Initialized', this.config);
    },

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const stored = localStorage.getItem('workOrderSyncSettings');
            if (stored) {
                const settings = JSON.parse(stored);
                this.config.enabled = settings.enabled !== undefined ? settings.enabled : true;
                this.config.sheetUrl = settings.sheetUrl || this.DEFAULT_SHEET_URL;
                this.config.interval = settings.interval || '60';
            } else {
                // No settings saved - use defaults and save them
                this.config.enabled = true;
                this.config.sheetUrl = this.DEFAULT_SHEET_URL;
                this.config.interval = '60';
                this.saveSettings();
            }

            const lastSync = localStorage.getItem('workOrderSyncLastSync');
            if (lastSync) {
                this.config.lastSync = lastSync;
            }
        } catch (error) {
            console.error('[WorkOrderSync] Error loading settings:', error);
        }
    },

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('workOrderSyncSettings', JSON.stringify({
                enabled: this.config.enabled,
                sheetUrl: this.config.sheetUrl,
                interval: this.config.interval
            }));
        } catch (error) {
            console.error('[WorkOrderSync] Error saving settings:', error);
        }
    },

    /**
     * Setup event listeners for settings changes
     */
    setupEventListeners() {
        // Listen for settings changes from the dashboard
        window.addEventListener('workOrderSyncSettingsChanged', (event) => {
            const settings = event.detail;
            this.config.enabled = settings.enabled;
            this.config.sheetUrl = settings.sheetUrl;
            this.config.interval = settings.interval;
            this.startAutoSync();

            // Trigger initial sync when enabled
            if (this.config.enabled && this.config.sheetUrl) {
                this.sync();
            }
        });

        // Listen for work order updates
        window.addEventListener('workOrdersUpdated', (event) => {
            if (this.config.enabled && this.config.sheetUrl) {
                // Debounce sync to avoid rapid-fire updates
                this.debouncedSync();
            }
        });

        // Listen for progress updates
        window.addEventListener('progressUpdated', (event) => {
            if (this.config.enabled && this.config.sheetUrl && event.detail) {
                this.syncProgress(event.detail.woNumber, event.detail.progress);
            }
        });
    },

    /**
     * Debounced sync to prevent rapid-fire API calls
     */
    _syncDebounceTimer: null,
    debouncedSync() {
        if (this._syncDebounceTimer) {
            clearTimeout(this._syncDebounceTimer);
        }
        this._syncDebounceTimer = setTimeout(() => {
            this.sync();
        }, 2000);
    },

    /**
     * Start auto-sync based on interval setting
     */
    startAutoSync() {
        // Clear existing timer
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }

        if (!this.config.enabled || this.config.interval === 'manual') {
            return;
        }

        const intervalMinutes = parseInt(this.config.interval, 10);
        if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
            return;
        }

        const intervalMs = intervalMinutes * 60 * 1000;
        this.syncTimer = setInterval(() => {
            this.sync();
        }, intervalMs);

        console.log(`[WorkOrderSync] Auto-sync started: every ${intervalMinutes} minutes`);
    },

    /**
     * Stop auto-sync
     */
    stopAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    },

    /**
     * Check if online
     */
    isOnline() {
        return navigator.onLine;
    },

    /**
     * Get sync status
     */
    getStatus() {
        return {
            enabled: this.config.enabled,
            connected: this.config.enabled && this.config.sheetUrl,
            lastSync: this.config.lastSync,
            syncInProgress: this.config.syncInProgress,
            interval: this.config.interval,
            online: this.isOnline()
        };
    },

    /**
     * Make API request to Google Sheets
     */
    async apiRequest(action, data = {}, method = 'GET') {
        if (!this.config.sheetUrl) {
            throw new Error('Sheet URL not configured');
        }

        const url = new URL(this.config.sheetUrl);

        if (method === 'GET') {
            url.searchParams.set('action', action);
            Object.keys(data).forEach(key => {
                url.searchParams.set(key, data[key]);
            });
        }

        const options = {
            method: method,
            mode: 'cors',
            headers: {}
        };

        if (method === 'POST') {
            options.headers['Content-Type'] = 'text/plain';
            options.body = JSON.stringify({ action, ...data });
        }

        const response = await fetch(url.toString(), options);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        return await response.json();
    },

    /**
     * Test connection to Google Sheets
     */
    async testConnection() {
        try {
            const result = await this.apiRequest('ping');
            return result.success;
        } catch (error) {
            console.error('[WorkOrderSync] Connection test failed:', error);
            return false;
        }
    },

    /**
     * Initialize sheets on first use
     */
    async initializeSheets() {
        try {
            const result = await this.apiRequest('init', {}, 'POST');
            return result;
        } catch (error) {
            console.error('[WorkOrderSync] Failed to initialize sheets:', error);
            throw error;
        }
    },

    /**
     * Full sync - bidirectional sync of work orders and progress
     */
    async sync() {
        if (this.config.syncInProgress) {
            console.log('[WorkOrderSync] Sync already in progress');
            return { success: false, reason: 'sync_in_progress' };
        }

        if (!this.config.enabled || !this.config.sheetUrl) {
            console.log('[WorkOrderSync] Sync disabled or not configured');
            return { success: false, reason: 'not_configured' };
        }

        if (!this.isOnline()) {
            console.log('[WorkOrderSync] Offline, skipping sync');
            return { success: false, reason: 'offline' };
        }

        this.config.syncInProgress = true;
        this.emit('syncStart');

        try {
            // Get local data
            const localWorkOrders = JSON.parse(localStorage.getItem('workOrders') || '[]');
            const localProgress = JSON.parse(localStorage.getItem('progressData') || '{}');

            // Get remote data
            const remoteData = await this.apiRequest('getAll');

            if (!remoteData.success) {
                throw new Error(remoteData.error || 'Failed to fetch remote data');
            }

            // Merge strategy: local data wins (last-write-wins with local preference)
            // This is because users are actively working locally

            let merged = {
                workOrders: localWorkOrders,
                progressData: localProgress
            };

            // If local is empty but remote has data, use remote
            if (localWorkOrders.length === 0 && remoteData.workOrders?.length > 0) {
                merged.workOrders = remoteData.workOrders;
                localStorage.setItem('workOrders', JSON.stringify(merged.workOrders));
                this.emit('workOrdersUpdated', { workOrders: merged.workOrders, source: 'remote' });
            }

            // Merge progress data
            if (Object.keys(localProgress).length === 0 && remoteData.progressData) {
                merged.progressData = remoteData.progressData;
                localStorage.setItem('progressData', JSON.stringify(merged.progressData));
                this.emit('progressUpdated', { progressData: merged.progressData, source: 'remote' });
            }

            // Push local data to remote
            if (merged.workOrders.length > 0) {
                await this.apiRequest('fullSync', {
                    workOrders: merged.workOrders,
                    progressData: merged.progressData
                }, 'POST');
            }

            // Update last sync time
            this.config.lastSync = new Date().toISOString();
            localStorage.setItem('workOrderSyncLastSync', this.config.lastSync);

            this.config.syncInProgress = false;
            this.emit('syncComplete', { timestamp: this.config.lastSync });

            console.log('[WorkOrderSync] Sync completed:', this.config.lastSync);
            return { success: true, timestamp: this.config.lastSync };

        } catch (error) {
            this.config.syncInProgress = false;
            this.emit('syncError', { error: error.message });
            console.error('[WorkOrderSync] Sync failed:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Push work orders to remote
     */
    async pushWorkOrders(workOrders) {
        if (!this.config.enabled || !this.config.sheetUrl) {
            console.log('[WorkOrderSync] Push skipped - not configured');
            return { success: false, reason: 'not_configured' };
        }

        if (!this.isOnline()) {
            console.log('[WorkOrderSync] Offline, queued for later sync');
            return { success: false, reason: 'offline' };
        }

        try {
            const result = await this.apiRequest('syncWorkOrders', { workOrders }, 'POST');

            if (result.success) {
                this.config.lastSync = result.timestamp;
                localStorage.setItem('workOrderSyncLastSync', this.config.lastSync);
                this.emit('syncComplete', { timestamp: result.timestamp });
            }

            return result;
        } catch (error) {
            console.error('[WorkOrderSync] Push failed:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Sync progress for a specific work order
     */
    async syncProgress(woNumber, progress) {
        if (!this.config.enabled || !this.config.sheetUrl) {
            return { success: false, reason: 'not_configured' };
        }

        if (!this.isOnline()) {
            return { success: false, reason: 'offline' };
        }

        try {
            const result = await this.apiRequest('syncProgress', { woNumber, progress }, 'POST');
            return result;
        } catch (error) {
            console.error('[WorkOrderSync] Progress sync failed:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Update a single progress item
     */
    async updateProgressItem(woNumber, itemIndex, progressData) {
        if (!this.config.enabled || !this.config.sheetUrl) {
            return { success: false, reason: 'not_configured' };
        }

        if (!this.isOnline()) {
            return { success: false, reason: 'offline' };
        }

        try {
            const result = await this.apiRequest('updateProgress', {
                woNumber,
                itemIndex,
                progressData
            }, 'POST');
            return result;
        } catch (error) {
            console.error('[WorkOrderSync] Update progress failed:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get summary for progress widget
     */
    async getSummary(woNumber) {
        if (!this.config.enabled || !this.config.sheetUrl) {
            return null;
        }

        try {
            const result = await this.apiRequest('getSummary', { woNumber });
            return result.success ? result.summary : null;
        } catch (error) {
            console.error('[WorkOrderSync] Get summary failed:', error);
            return null;
        }
    },

    /**
     * Pull latest data from remote
     */
    async pull() {
        if (!this.config.enabled || !this.config.sheetUrl) {
            return { success: false, reason: 'not_configured' };
        }

        if (!this.isOnline()) {
            return { success: false, reason: 'offline' };
        }

        try {
            const result = await this.apiRequest('getAll');

            if (result.success) {
                // Update local storage
                if (result.workOrders) {
                    localStorage.setItem('workOrders', JSON.stringify(result.workOrders));
                    this.emit('workOrdersUpdated', { workOrders: result.workOrders, source: 'remote' });
                }
                if (result.progressData) {
                    localStorage.setItem('progressData', JSON.stringify(result.progressData));
                    this.emit('progressUpdated', { progressData: result.progressData, source: 'remote' });
                }

                this.config.lastSync = result.lastSync;
                localStorage.setItem('workOrderSyncLastSync', this.config.lastSync);
            }

            return result;
        } catch (error) {
            console.error('[WorkOrderSync] Pull failed:', error);
            return { success: false, error: error.message };
        }
    },

    // ==================== Event System ====================

    /**
     * Subscribe to sync events
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },

    /**
     * Unsubscribe from sync events
     */
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    },

    /**
     * Emit an event
     */
    emit(event, data = {}) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[WorkOrderSync] Event handler error for ${event}:`, error);
                }
            });
        }

        // Also dispatch as a DOM event for cross-tool communication
        window.dispatchEvent(new CustomEvent(`workOrderSync:${event}`, { detail: data }));
    },

    // ==================== Helper Methods ====================

    /**
     * Get work orders (from localStorage with sync awareness)
     */
    getWorkOrders() {
        try {
            const stored = localStorage.getItem('workOrders');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('[WorkOrderSync] Error loading work orders:', error);
            return [];
        }
    },

    /**
     * Get progress data
     */
    getProgressData() {
        try {
            const stored = localStorage.getItem('progressData');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('[WorkOrderSync] Error loading progress data:', error);
            return {};
        }
    },

    /**
     * Save work orders (to localStorage and trigger sync)
     */
    saveWorkOrders(workOrders) {
        localStorage.setItem('workOrders', JSON.stringify(workOrders));

        // Emit event for other tools
        window.dispatchEvent(new CustomEvent('workOrdersUpdated', {
            detail: { workOrders }
        }));
    },

    /**
     * Save progress data (to localStorage and trigger sync)
     */
    saveProgressData(progressData) {
        localStorage.setItem('progressData', JSON.stringify(progressData));

        // Emit event for sync
        window.dispatchEvent(new CustomEvent('progressUpdated', {
            detail: { progressData }
        }));
    },

    /**
     * Format last sync time for display
     */
    formatLastSync() {
        if (!this.config.lastSync) {
            return 'Never';
        }

        const date = new Date(this.config.lastSync);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
        return date.toLocaleDateString();
    }
};

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => WorkOrderSync.init());
    } else {
        WorkOrderSync.init();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkOrderSync;
}
