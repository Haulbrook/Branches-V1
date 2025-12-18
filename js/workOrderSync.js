/**
 * Work Order Sync Module
 * Handles synchronization between localStorage and Google Sheets
 *
 * Usage:
 *   const sync = new WorkOrderSync();
 *   await sync.init();
 *   const workOrders = await sync.getWorkOrders();
 */

class WorkOrderSync {
  constructor(options = {}) {
    this.googleSheetsUrl = options.googleSheetsUrl || localStorage.getItem('workOrderSyncUrl') || '';
    this.useGoogleSheets = !!this.googleSheetsUrl;
    this.cacheKey = 'workOrders';
    this.progressKey = 'progressData';
    this.summaryKey = 'workOrderSummary';
    this.lastSyncKey = 'workOrderLastSync';
    this.syncInterval = options.syncInterval || 60000; // 1 minute default
    this.listeners = {};
    this._syncTimer = null;
  }

  /**
   * Initialize the sync module
   */
  async init() {
    // Try to get Google Sheets URL from various sources
    if (!this.googleSheetsUrl) {
      // Check dashboard settings
      try {
        const settings = JSON.parse(localStorage.getItem('dashboardSettings') || '{}');
        this.googleSheetsUrl = settings.workOrderSyncUrl || settings.schedulerUrl || '';
        this.useGoogleSheets = !!this.googleSheetsUrl;
      } catch (e) {}
    }

    // If Google Sheets is configured, sync on init
    if (this.useGoogleSheets) {
      await this.syncFromCloud();
    }

    // Listen for storage events from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === this.cacheKey) {
        this.emit('workOrdersUpdated', this.getLocalWorkOrders());
      }
      if (e.key === this.progressKey) {
        this.emit('progressUpdated', this.getLocalProgress());
      }
    });

    // Start auto-sync if configured
    if (this.useGoogleSheets && this.syncInterval > 0) {
      this.startAutoSync();
    }

    return this;
  }

  /**
   * Set Google Sheets URL
   */
  setGoogleSheetsUrl(url) {
    this.googleSheetsUrl = url;
    this.useGoogleSheets = !!url;
    localStorage.setItem('workOrderSyncUrl', url);

    if (url) {
      this.syncFromCloud();
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get all work orders (from cloud if available, else local)
   */
  async getWorkOrders(forceCloud = false) {
    if (this.useGoogleSheets && forceCloud) {
      try {
        const response = await this.fetchFromCloud('getAll');
        if (response.success) {
          this.saveToLocal(response.workOrders);
          return response.workOrders;
        }
      } catch (error) {
        console.warn('Cloud fetch failed, using local cache:', error);
      }
    }
    return this.getLocalWorkOrders();
  }

  /**
   * Get a single work order
   */
  async getWorkOrder(woNumber) {
    const workOrders = await this.getWorkOrders();
    return workOrders.find(wo => wo.woNumber === String(woNumber));
  }

  /**
   * Get work order summary (for widgets)
   * Returns: { woNumber, jobName, percentage, totalHours, usedHours, remainingHours }
   */
  async getSummary(forceCloud = false) {
    if (this.useGoogleSheets && forceCloud) {
      try {
        const response = await this.fetchFromCloud('getSummary');
        if (response.success) {
          localStorage.setItem(this.summaryKey, JSON.stringify(response.summary));
          return response;
        }
      } catch (error) {
        console.warn('Cloud fetch failed, computing locally:', error);
      }
    }
    return this.computeLocalSummary();
  }

  /**
   * Get progress for a work order
   */
  async getProgress(woNumber) {
    const allProgress = this.getLocalProgress();
    return allProgress[woNumber] || { items: [] };
  }

  // ============================================
  // WRITE OPERATIONS
  // ============================================

  /**
   * Save work orders (to both local and cloud)
   */
  async saveWorkOrders(workOrders) {
    if (!Array.isArray(workOrders)) {
      workOrders = [workOrders];
    }

    // Get existing and merge
    const existing = this.getLocalWorkOrders();
    const existingMap = new Map(existing.map(wo => [wo.woNumber, wo]));

    workOrders.forEach(wo => {
      wo.lastUpdated = new Date().toISOString();
      existingMap.set(wo.woNumber, wo);
    });

    const merged = Array.from(existingMap.values());

    // Save locally first
    this.saveToLocal(merged);
    this.emit('workOrdersUpdated', merged);

    // Then sync to cloud
    if (this.useGoogleSheets) {
      try {
        await this.postToCloud('saveWorkOrders', { workOrders: workOrders });
      } catch (error) {
        console.error('Cloud save failed:', error);
        // Mark as pending sync
        this.markPendingSync(workOrders.map(wo => wo.woNumber));
      }
    }

    return { success: true, saved: workOrders.length };
  }

  /**
   * Update progress for a work order
   */
  async updateProgress(woNumber, progress) {
    woNumber = String(woNumber);

    // Save locally
    const allProgress = this.getLocalProgress();
    allProgress[woNumber] = progress;
    localStorage.setItem(this.progressKey, JSON.stringify(allProgress));
    this.emit('progressUpdated', { woNumber, progress });

    // Sync to cloud
    if (this.useGoogleSheets) {
      try {
        await this.postToCloud('updateProgress', { woNumber, progress });
      } catch (error) {
        console.error('Cloud progress save failed:', error);
        this.markPendingProgressSync(woNumber);
      }
    }

    return { success: true };
  }

  /**
   * Delete a work order
   */
  async deleteWorkOrder(woNumber) {
    woNumber = String(woNumber);

    // Delete locally
    const workOrders = this.getLocalWorkOrders().filter(wo => wo.woNumber !== woNumber);
    this.saveToLocal(workOrders);

    const allProgress = this.getLocalProgress();
    delete allProgress[woNumber];
    localStorage.setItem(this.progressKey, JSON.stringify(allProgress));

    this.emit('workOrdersUpdated', workOrders);

    // Delete from cloud
    if (this.useGoogleSheets) {
      try {
        await this.postToCloud('deleteWorkOrder', { woNumber });
      } catch (error) {
        console.error('Cloud delete failed:', error);
      }
    }

    return { success: true };
  }

  /**
   * Clear all work orders
   */
  async clearAll() {
    localStorage.removeItem(this.cacheKey);
    localStorage.removeItem(this.progressKey);
    localStorage.removeItem(this.summaryKey);
    this.emit('workOrdersUpdated', []);

    if (this.useGoogleSheets) {
      try {
        await this.postToCloud('clearAll', {});
      } catch (error) {
        console.error('Cloud clear failed:', error);
      }
    }

    return { success: true };
  }

  // ============================================
  // SYNC OPERATIONS
  // ============================================

  /**
   * Sync from cloud to local
   */
  async syncFromCloud() {
    if (!this.useGoogleSheets) return { success: false, reason: 'No cloud URL configured' };

    try {
      const response = await this.fetchFromCloud('getAll');
      if (response.success) {
        // Save work orders
        this.saveToLocal(response.workOrders);

        // Extract and save progress
        const progressData = {};
        response.workOrders.forEach(wo => {
          if (wo.progress && wo.progress.items && wo.progress.items.length > 0) {
            progressData[wo.woNumber] = wo.progress;
          }
        });
        if (Object.keys(progressData).length > 0) {
          const existingProgress = this.getLocalProgress();
          const mergedProgress = { ...existingProgress, ...progressData };
          localStorage.setItem(this.progressKey, JSON.stringify(mergedProgress));
        }

        localStorage.setItem(this.lastSyncKey, new Date().toISOString());
        this.emit('syncComplete', { source: 'cloud', count: response.workOrders.length });

        return { success: true, count: response.workOrders.length };
      }
    } catch (error) {
      console.error('Sync from cloud failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync from local to cloud
   */
  async syncToCloud() {
    if (!this.useGoogleSheets) return { success: false, reason: 'No cloud URL configured' };

    const workOrders = this.getLocalWorkOrders();
    const progress = this.getLocalProgress();

    try {
      // Upload work orders
      await this.postToCloud('saveWorkOrders', { workOrders });

      // Upload progress for each work order
      for (const [woNumber, progressData] of Object.entries(progress)) {
        await this.postToCloud('updateProgress', { woNumber, progress: progressData });
      }

      localStorage.setItem(this.lastSyncKey, new Date().toISOString());
      return { success: true, uploaded: workOrders.length };
    } catch (error) {
      console.error('Sync to cloud failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start auto-sync timer
   */
  startAutoSync() {
    this.stopAutoSync();
    this._syncTimer = setInterval(() => {
      this.syncFromCloud();
    }, this.syncInterval);
  }

  /**
   * Stop auto-sync timer
   */
  stopAutoSync() {
    if (this._syncTimer) {
      clearInterval(this._syncTimer);
      this._syncTimer = null;
    }
  }

  /**
   * Get last sync timestamp
   */
  getLastSync() {
    return localStorage.getItem(this.lastSyncKey);
  }

  // ============================================
  // LOCAL STORAGE OPERATIONS
  // ============================================

  getLocalWorkOrders() {
    try {
      return JSON.parse(localStorage.getItem(this.cacheKey) || '[]');
    } catch (e) {
      return [];
    }
  }

  getLocalProgress() {
    try {
      return JSON.parse(localStorage.getItem(this.progressKey) || '{}');
    } catch (e) {
      return {};
    }
  }

  saveToLocal(workOrders) {
    localStorage.setItem(this.cacheKey, JSON.stringify(workOrders));
  }

  /**
   * Compute summary from local data
   */
  computeLocalSummary() {
    const workOrders = this.getLocalWorkOrders();
    const progressData = this.getLocalProgress();

    const summary = workOrders.map(wo => {
      const totalItems = wo.lineItems?.length || 0;
      const progress = progressData[wo.woNumber] || { items: [] };
      const progressItems = progress.items || [];

      // Calculate completion percentage
      const completed = progressItems.filter(p => p.status === 'completed').length;
      const percentage = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;

      // Calculate hours
      let totalHours = 0;
      let usedHours = 0;

      (wo.lineItems || []).forEach((item, idx) => {
        const itemLower = (item.itemName || '').toLowerCase();
        if (itemLower.includes('hour') || itemLower.includes('labor') || itemLower.includes('man')) {
          totalHours += parseFloat(item.quantity) || 0;
          const prog = progressItems.find(p => p.index === idx);
          if (prog) {
            usedHours += parseFloat(prog.hoursUsed) || parseFloat(prog.quantityCompleted) || 0;
          }
        }
      });

      return {
        woNumber: wo.woNumber,
        jobName: wo.jobName,
        client: wo.client,
        address: wo.address,
        percentage: percentage,
        totalItems: totalItems,
        completedItems: completed,
        totalHours: totalHours,
        usedHours: usedHours,
        remainingHours: totalHours - usedHours,
        status: percentage === 100 ? 'completed' : percentage > 0 ? 'in-progress' : 'not-started'
      };
    });

    return {
      success: true,
      summary: summary,
      totals: {
        workOrders: workOrders.length,
        totalHours: summary.reduce((sum, s) => sum + s.totalHours, 0),
        usedHours: summary.reduce((sum, s) => sum + s.usedHours, 0),
        avgCompletion: summary.length > 0
          ? Math.round(summary.reduce((sum, s) => sum + s.percentage, 0) / summary.length)
          : 0
      }
    };
  }

  // ============================================
  // CLOUD API HELPERS
  // ============================================

  async fetchFromCloud(action, params = {}) {
    const url = new URL(this.googleSheetsUrl);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([key, val]) => {
      url.searchParams.set(key, val);
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  async postToCloud(action, data) {
    const response = await fetch(this.googleSheetsUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action, ...data })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  // ============================================
  // PENDING SYNC TRACKING
  // ============================================

  markPendingSync(woNumbers) {
    const pending = JSON.parse(localStorage.getItem('pendingWorkOrderSync') || '[]');
    const updated = [...new Set([...pending, ...woNumbers])];
    localStorage.setItem('pendingWorkOrderSync', JSON.stringify(updated));
  }

  markPendingProgressSync(woNumber) {
    const pending = JSON.parse(localStorage.getItem('pendingProgressSync') || '[]');
    if (!pending.includes(woNumber)) {
      pending.push(woNumber);
      localStorage.setItem('pendingProgressSync', JSON.stringify(pending));
    }
  }

  getPendingSyncs() {
    return {
      workOrders: JSON.parse(localStorage.getItem('pendingWorkOrderSync') || '[]'),
      progress: JSON.parse(localStorage.getItem('pendingProgressSync') || '[]')
    };
  }

  clearPendingSyncs() {
    localStorage.removeItem('pendingWorkOrderSync');
    localStorage.removeItem('pendingProgressSync');
  }

  // ============================================
  // EVENT SYSTEM
  // ============================================

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Event listener error (${event}):`, e);
        }
      });
    }
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WorkOrderSync;
}
if (typeof window !== 'undefined') {
  window.WorkOrderSync = WorkOrderSync;
}
