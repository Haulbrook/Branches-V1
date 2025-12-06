/**
 * Tool Manager - Handles tool loading and iframe management
 */
class ToolManager {
    constructor() {
        this.currentTool = null;
        this.toolHistory = [];
    }

    init() {
        console.log('✅ Tool Manager initialized');
    }

    loadTool(toolId, url) {
        this.currentTool = toolId;
        this.toolHistory.push({ toolId, timestamp: Date.now() });
        
        // Tool loading is handled by app.js
        console.log(`Loading tool: ${toolId}`);
    }

    refreshTool() {
        if (window.app?.refreshCurrentTool) {
            window.app.refreshCurrentTool();
        }
    }

    closeTool() {
        this.currentTool = null;
        if (window.app?.showDashboardView) {
            window.app.showDashboardView();
        }
    }

    getToolHistory() {
        return this.toolHistory;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToolManager;
}
