/**
 * UI Manager - Handles UI interactions and state
 */
class UIManager {
    constructor() {
        this.sidebarOpen = true;
    }

    init() {
        this.applyTheme();
        console.log('✅ UI Manager initialized');
    }

    applyTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.body.dataset.theme = savedTheme;
        }
    }

    showNotification(message, type = 'info') {
        if (window.app?.showToast) {
            window.app.showToast(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    showMessage(message, type = 'info') {
        this.showNotification(message, type);
    }

    updateUserInfo(user) {
        if (window.app?.updateUserDisplay) {
            window.app.updateUserDisplay(user);
        }
    }

    showSettingsModal() {
        if (window.app?.showSettingsModal) {
            window.app.showSettingsModal();
        }
    }

    hideSettingsModal() {
        if (window.app?.hideModal) {
            window.app.hideModal('settingsModal');
        }
    }

    hideAllModals() {
        if (window.app?.hideAllModals) {
            window.app.hideAllModals();
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
            this.sidebarOpen = sidebar.classList.contains('open');
        }
    }

    updateConnectionStatus(online) {
        console.log('Connection status:', online ? 'online' : 'offline');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
