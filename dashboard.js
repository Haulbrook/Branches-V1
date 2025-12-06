/**
 * Dashboard Manager - Handles dashboard metrics and activity
 */
class DashboardManager {
    constructor() {
        this.metrics = {
            inventoryCount: 0,
            fleetCount: 0,
            jobsCount: 0,
            toolsOut: 0
        };
        this.recentActivity = [];
    }

    async init() {
        await this.loadMetrics();
        await this.loadRecentActivity();
        console.log('✅ Dashboard Manager initialized');
    }

    async loadMetrics() {
        // Try to load from localStorage first
        const savedMetrics = localStorage.getItem('dashboardMetrics');
        if (savedMetrics) {
            this.metrics = JSON.parse(savedMetrics);
        } else {
            // Default demo metrics
            this.metrics = {
                inventoryCount: 247,
                fleetCount: 8,
                jobsCount: 23,
                toolsOut: 14
            };
        }
        
        this.renderMetricsCards();
    }

    renderMetricsCards() {
        const statInventory = document.getElementById('statInventoryCount');
        const statFleet = document.getElementById('statFleetCount');
        const statJobs = document.getElementById('statJobsCount');
        const statTools = document.getElementById('statToolsOut');

        if (statInventory) statInventory.textContent = this.metrics.inventoryCount;
        if (statFleet) statFleet.textContent = this.metrics.fleetCount;
        if (statJobs) statJobs.textContent = this.metrics.jobsCount;
        if (statTools) statTools.textContent = this.metrics.toolsOut;
    }

    async loadRecentActivity() {
        // Try to load from localStorage
        const savedActivity = localStorage.getItem('dashboardActivity');
        if (savedActivity) {
            this.recentActivity = JSON.parse(savedActivity);
        } else {
            // Default demo activity
            this.recentActivity = [
                { icon: '🌱', text: 'Inventory updated: 15 new plants added', time: '2 hours ago' },
                { icon: '📅', text: 'Crew Alpha assigned to Johnson property', time: '3 hours ago' },
                { icon: '🔧', text: 'Chainsaw #4 checked out by Mike', time: '5 hours ago' },
                { icon: '⭐', text: '12 plants graded and priced', time: 'Yesterday' }
            ];
        }

        this.renderRecentActivity();
    }

    renderRecentActivity() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        if (this.recentActivity.length === 0) {
            activityList.innerHTML = '<div class="activity-loading">No recent activity</div>';
            return;
        }

        activityList.innerHTML = this.recentActivity.map(activity => `
            <div class="activity-item">
                <span class="activity-icon">${activity.icon}</span>
                <div class="activity-content">
                    <p class="activity-text">${activity.text}</p>
                    <span class="activity-time">${activity.time}</span>
                </div>
            </div>
        `).join('');
    }

    getMetrics() {
        return this.metrics;
    }

    updateMetrics(newMetrics) {
        this.metrics = { ...this.metrics, ...newMetrics };
        localStorage.setItem('dashboardMetrics', JSON.stringify(this.metrics));
        this.renderMetricsCards();
    }

    addActivity(activity) {
        this.recentActivity.unshift(activity);
        this.recentActivity = this.recentActivity.slice(0, 10); // Keep last 10
        localStorage.setItem('dashboardActivity', JSON.stringify(this.recentActivity));
        this.renderRecentActivity();
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardManager;
}
