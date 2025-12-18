/**
 * Progress Widget Component
 * Displays a compact progress indicator for work orders
 * Shows: % complete + hours used/remaining
 *
 * Usage:
 *   const widget = new ProgressWidget(workOrderSync);
 *   const html = widget.render(woNumber);
 *   // or
 *   widget.renderInto(containerElement, woNumber);
 */

class ProgressWidget {
  constructor(syncModule) {
    this.sync = syncModule;
    this.cache = {};
    this.cacheTimeout = 30000; // 30 seconds
  }

  /**
   * Get progress summary for a work order
   */
  async getSummary(woNumber) {
    woNumber = String(woNumber);

    // Check cache
    const cached = this.cache[woNumber];
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // Compute from local data
    const workOrders = this.sync ? this.sync.getLocalWorkOrders() :
      JSON.parse(localStorage.getItem('workOrders') || '[]');
    const progressData = this.sync ? this.sync.getLocalProgress() :
      JSON.parse(localStorage.getItem('progressData') || '{}');

    const wo = workOrders.find(w => w.woNumber === woNumber);
    if (!wo) return null;

    const lineItems = wo.lineItems || [];
    const progress = progressData[woNumber] || { items: [] };
    const progressItems = progress.items || [];

    // Calculate completion percentage
    const totalItems = lineItems.length;
    const completed = progressItems.filter(p => p.status === 'completed').length;
    const inProgress = progressItems.filter(p => p.status === 'in-progress').length;
    const percentage = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;

    // Calculate hours (look for items with "hour", "labor", or "man" in name)
    let totalHours = 0;
    let usedHours = 0;

    lineItems.forEach((item, idx) => {
      const itemLower = (item.itemName || '').toLowerCase();
      if (itemLower.includes('hour') || itemLower.includes('labor') || itemLower.includes('man')) {
        totalHours += parseFloat(item.quantity) || 0;
        const prog = progressItems.find(p => p.index === idx);
        if (prog) {
          usedHours += parseFloat(prog.hoursUsed) || parseFloat(prog.quantityCompleted) || 0;
        }
      }
    });

    const summary = {
      woNumber,
      jobName: wo.jobName,
      percentage,
      totalItems,
      completedItems: completed,
      inProgressItems: inProgress,
      totalHours,
      usedHours,
      remainingHours: Math.max(0, totalHours - usedHours),
      status: percentage === 100 ? 'completed' : percentage > 0 ? 'in-progress' : 'not-started'
    };

    // Cache result
    this.cache[woNumber] = { data: summary, timestamp: Date.now() };

    return summary;
  }

  /**
   * Clear cache for a work order (or all if no woNumber provided)
   */
  clearCache(woNumber) {
    if (woNumber) {
      delete this.cache[woNumber];
    } else {
      this.cache = {};
    }
  }

  /**
   * Render compact widget HTML
   */
  async render(woNumber, options = {}) {
    const summary = await this.getSummary(woNumber);
    if (!summary) {
      return `<div class="progress-widget progress-widget-empty">No data</div>`;
    }

    const {
      showJobName = false,
      showHours = true,
      compact = false,
      clickable = false
    } = options;

    const pct = summary.percentage;
    const barClass = pct < 33 ? 'low' : pct < 66 ? 'medium' : 'high';
    const statusIcon = summary.status === 'completed' ? '✓' :
                       summary.status === 'in-progress' ? '◐' : '○';

    const hoursDisplay = summary.totalHours > 0
      ? `<span class="pw-hours" title="${summary.usedHours}/${summary.totalHours} hours">⏱ ${Math.round(summary.usedHours)}/${Math.round(summary.totalHours)}h</span>`
      : '';

    const clickAttr = clickable ? `onclick="window.open('progress-tracker.html?wo=${woNumber}', '_blank')" style="cursor: pointer;"` : '';

    if (compact) {
      return `
        <div class="progress-widget progress-widget-compact" data-wo="${woNumber}" ${clickAttr} title="WO#${woNumber}: ${pct}% complete">
          <div class="pw-bar-mini">
            <div class="pw-bar-fill ${barClass}" style="width: ${pct}%"></div>
          </div>
          <span class="pw-pct-mini">${pct}%</span>
        </div>
      `;
    }

    return `
      <div class="progress-widget" data-wo="${woNumber}" ${clickAttr}>
        ${showJobName ? `<div class="pw-title">WO#${woNumber}</div>` : ''}
        <div class="pw-row">
          <div class="pw-bar">
            <div class="pw-bar-fill ${barClass}" style="width: ${pct}%"></div>
            <span class="pw-bar-text">${statusIcon} ${pct}%</span>
          </div>
          ${showHours && summary.totalHours > 0 ? hoursDisplay : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render widget into a container element
   */
  async renderInto(container, woNumber, options = {}) {
    if (typeof container === 'string') {
      container = document.getElementById(container);
    }
    if (!container) return;

    container.innerHTML = await this.render(woNumber, options);
  }

  /**
   * Get the CSS styles for the widget
   */
  static getStyles() {
    return `
      .progress-widget {
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 0.85em;
        padding: 8px 12px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 3px solid #2E7D32;
      }

      .progress-widget-compact {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: rgba(46, 125, 50, 0.1);
        border-left: none;
        border-radius: 4px;
      }

      .progress-widget-empty {
        color: #999;
        font-size: 0.8em;
        padding: 4px 8px;
      }

      .pw-title {
        font-weight: 600;
        font-size: 0.9em;
        color: #333;
        margin-bottom: 6px;
      }

      .pw-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .pw-bar {
        flex: 1;
        height: 20px;
        background: #e0e0e0;
        border-radius: 10px;
        position: relative;
        overflow: hidden;
        min-width: 80px;
      }

      .pw-bar-fill {
        height: 100%;
        border-radius: 10px;
        transition: width 0.3s ease;
      }

      .pw-bar-fill.low { background: linear-gradient(90deg, #ef5350, #ff7043); }
      .pw-bar-fill.medium { background: linear-gradient(90deg, #ffa726, #ffca28); }
      .pw-bar-fill.high { background: linear-gradient(90deg, #66bb6a, #4caf50); }

      .pw-bar-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 0.75em;
        font-weight: 600;
        color: #333;
        text-shadow: 0 0 2px rgba(255,255,255,0.8);
      }

      .pw-bar-mini {
        width: 50px;
        height: 6px;
        background: #e0e0e0;
        border-radius: 3px;
        overflow: hidden;
      }

      .pw-bar-mini .pw-bar-fill {
        height: 100%;
        border-radius: 3px;
      }

      .pw-pct-mini {
        font-size: 0.8em;
        font-weight: 600;
        color: #2E7D32;
        min-width: 32px;
      }

      .pw-hours {
        font-size: 0.85em;
        color: #666;
        white-space: nowrap;
        padding: 2px 6px;
        background: #fff;
        border-radius: 4px;
        border: 1px solid #e0e0e0;
      }

      /* Dark mode support */
      [data-theme="dark"] .progress-widget {
        background: #2d2d2d;
        border-left-color: #4caf50;
      }

      [data-theme="dark"] .pw-title {
        color: #eee;
      }

      [data-theme="dark"] .pw-bar {
        background: #444;
      }

      [data-theme="dark"] .pw-bar-text {
        color: #fff;
        text-shadow: 0 0 2px rgba(0,0,0,0.5);
      }

      [data-theme="dark"] .pw-hours {
        background: #3d3d3d;
        border-color: #555;
        color: #ccc;
      }
    `;
  }

  /**
   * Inject styles into the document (call once)
   */
  static injectStyles() {
    if (document.getElementById('progress-widget-styles')) return;

    const style = document.createElement('style');
    style.id = 'progress-widget-styles';
    style.textContent = ProgressWidget.getStyles();
    document.head.appendChild(style);
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressWidget;
}
if (typeof window !== 'undefined') {
  window.ProgressWidget = ProgressWidget;
}
