/**
 * Progress Widget Component
 * Displays work order progress with visual progress bar
 *
 * Usage:
 *   ProgressWidget.render(woNumber, 'compact') - Small inline bar for cards
 *   ProgressWidget.render(woNumber, 'full') - Larger bar with hours detail
 */

const ProgressWidget = {

    /**
     * Get progress data for a work order
     */
    getProgress(woNumber) {
        // Load work orders and progress data from localStorage
        const workOrders = JSON.parse(localStorage.getItem('workOrders') || '[]');
        const progressData = JSON.parse(localStorage.getItem('progressData') || '{}');

        const wo = workOrders.find(w => w.woNumber === woNumber || w.woNumber === String(woNumber));
        if (!wo) return null;

        const progress = progressData[woNumber];
        const lineItems = wo.lineItems || [];

        // Calculate totals
        let totalItems = lineItems.length;
        let completedItems = 0;
        let inProgressItems = 0;

        // Calculate hours (look for labor-related items)
        let totalHours = 0;
        let completedHours = 0;

        lineItems.forEach((item, index) => {
            const itemProgress = progress?.items?.[index];
            const isLaborItem = /hour|labor|man|time|install/i.test(item.itemName || '');

            if (itemProgress) {
                if (itemProgress.status === 'completed') {
                    completedItems++;
                    if (isLaborItem) {
                        completedHours += item.quantity || 0;
                    }
                } else if (itemProgress.status === 'in-progress') {
                    inProgressItems++;
                    if (isLaborItem && itemProgress.quantityCompleted) {
                        completedHours += itemProgress.quantityCompleted;
                    }
                }
            }

            if (isLaborItem) {
                totalHours += item.quantity || 0;
            }
        });

        const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        const hoursPercentage = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : percentage;

        return {
            woNumber,
            totalItems,
            completedItems,
            inProgressItems,
            notStartedItems: totalItems - completedItems - inProgressItems,
            percentage,
            totalHours: Math.round(totalHours),
            completedHours: Math.round(completedHours),
            hoursPercentage
        };
    },

    /**
     * Render progress widget HTML
     * @param {string} woNumber - Work order number
     * @param {string} mode - 'compact' or 'full'
     * @returns {string} HTML string
     */
    render(woNumber, mode = 'compact') {
        const progress = this.getProgress(woNumber);

        if (!progress) {
            return mode === 'compact'
                ? '<span class="progress-widget-na">--</span>'
                : '<div class="progress-widget-na">No progress data</div>';
        }

        const { percentage, totalHours, completedHours, completedItems, totalItems } = progress;

        // Determine color class based on percentage
        const colorClass = percentage < 33 ? 'low' : percentage < 66 ? 'medium' : 'high';

        if (mode === 'compact') {
            return `
                <div class="progress-widget compact" onclick="ProgressWidget.openTracker('${woNumber}')" title="Click for details">
                    <div class="progress-widget-bar">
                        <div class="progress-widget-fill ${colorClass}" style="width: ${percentage}%"></div>
                    </div>
                    <span class="progress-widget-text">${percentage}%</span>
                </div>
            `;
        }

        // Full mode with hours
        return `
            <div class="progress-widget full" onclick="ProgressWidget.openTracker('${woNumber}')" title="Click for details">
                <div class="progress-widget-header">
                    <span class="progress-widget-icon">◐</span>
                    <span class="progress-widget-percentage">${percentage}%</span>
                    ${totalHours > 0 ? `<span class="progress-widget-hours">⏱ ${completedHours}/${totalHours}h</span>` : ''}
                </div>
                <div class="progress-widget-bar full">
                    <div class="progress-widget-fill ${colorClass}" style="width: ${percentage}%"></div>
                </div>
                <div class="progress-widget-footer">
                    <span>${completedItems}/${totalItems} items</span>
                </div>
            </div>
        `;
    },

    /**
     * Open progress tracker for a work order
     */
    openTracker(woNumber) {
        window.open(`progress-tracker.html?wo=${woNumber}`, '_blank');
    },

    /**
     * Inject required CSS styles
     */
    injectStyles() {
        if (document.getElementById('progress-widget-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'progress-widget-styles';
        styles.textContent = `
            /* Progress Widget Styles */
            .progress-widget {
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .progress-widget:hover {
                transform: scale(1.02);
            }

            /* Compact Mode */
            .progress-widget.compact {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 0;
            }

            .progress-widget.compact .progress-widget-bar {
                flex: 1;
                height: 8px;
                background: #E0E0E0;
                border-radius: 4px;
                overflow: hidden;
                min-width: 60px;
            }

            .progress-widget.compact .progress-widget-text {
                font-size: 0.75em;
                font-weight: 600;
                color: #424242;
                min-width: 35px;
                text-align: right;
            }

            /* Full Mode */
            .progress-widget.full {
                background: #F5F5F5;
                border-radius: 8px;
                padding: 12px;
                margin: 10px 0;
            }

            .progress-widget-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 8px;
            }

            .progress-widget-icon {
                font-size: 1.2em;
                color: #2E7D32;
            }

            .progress-widget-percentage {
                font-size: 1.1em;
                font-weight: 700;
                color: #212121;
            }

            .progress-widget-hours {
                font-size: 0.85em;
                color: #757575;
                margin-left: auto;
            }

            .progress-widget.full .progress-widget-bar {
                height: 12px;
                background: #E0E0E0;
                border-radius: 6px;
                overflow: hidden;
            }

            .progress-widget-footer {
                margin-top: 6px;
                font-size: 0.75em;
                color: #757575;
                text-align: right;
            }

            /* Progress Fill Colors */
            .progress-widget-fill {
                height: 100%;
                border-radius: inherit;
                transition: width 0.3s ease;
            }

            .progress-widget-fill.low {
                background: linear-gradient(90deg, #EF5350, #FF7043);
            }

            .progress-widget-fill.medium {
                background: linear-gradient(90deg, #FFA726, #FFCA28);
            }

            .progress-widget-fill.high {
                background: linear-gradient(90deg, #66BB6A, #4CAF50);
            }

            /* N/A State */
            .progress-widget-na {
                color: #9E9E9E;
                font-size: 0.8em;
                font-style: italic;
            }
        `;

        document.head.appendChild(styles);
    },

    /**
     * Initialize - inject styles on load
     */
    init() {
        this.injectStyles();
    }
};

// Auto-initialize when script loads
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ProgressWidget.init());
    } else {
        ProgressWidget.init();
    }
}
