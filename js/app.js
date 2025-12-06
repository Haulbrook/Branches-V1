/**
 * Deep Roots Dashboard - Main Application Controller
 * Version: 2.0.0 (Fixed)
 */

class DashboardApp {
    constructor() {
        this.isInitialized = false;
        this.currentTool = null;
        this.currentView = 'dashboard';
        this.config = null;
        this.user = null;
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing Dashboard App...');
            this.showLoadingScreen(true);
            await this.loadConfiguration();
            await this.initializeUser();
            this.setupEventListeners();
            this.loadHeroStats();
            this.loadRecentActivity();

            setTimeout(() => {
                this.showLoadingScreen(false);
                this.isInitialized = true;
                this.showDashboardView();
                console.log('✅ Dashboard App initialized successfully');
                this.showToast('Welcome to Deep Roots Dashboard!', 'success');
            }, 1000);

        } catch (error) {
            console.error('❌ Failed to initialize:', error);
            this.handleInitializationError(error);
        }
    }

    async loadConfiguration() {
        try {
            const response = await fetch('config.json');
            this.config = await response.json();
            const savedSettings = localStorage.getItem('dashboardSettings');
            if (savedSettings) {
                this.config = { ...this.config, ...JSON.parse(savedSettings) };
            }
            this.updateToolURLs();
            console.log('✅ Configuration loaded');
        } catch (error) {
            console.warn('⚠️ Using default configuration');
            this.config = this.getDefaultConfig();
        }
    }

    updateToolURLs() {
        if (!this.config.services) return;
        Object.keys(this.config.services).forEach(key => {
            const savedUrl = localStorage.getItem(`${key}Url`);
            if (savedUrl) {
                this.config.services[key].url = savedUrl;
            }
        });
    }

    async initializeUser() {
        this.user = {
            name: 'Deep Roots User',
            email: 'user@deeprootslandscape.com',
            avatar: '🌱'
        };
        this.updateUserDisplay(this.user);
    }

    updateUserDisplay(user) {
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const dropdownAvatar = document.getElementById('dropdownAvatar');
        const dropdownName = document.getElementById('dropdownName');
        const dropdownEmail = document.getElementById('dropdownEmail');

        if (userAvatar) userAvatar.textContent = user.avatar || '👤';
        if (userName) userName.textContent = user.name || 'User';
        if (dropdownAvatar) dropdownAvatar.textContent = user.avatar || '👤';
        if (dropdownName) dropdownName.textContent = user.name || 'User';
        if (dropdownEmail) dropdownEmail.textContent = user.email || '';
    }

    loadHeroStats() {
        const stats = {
            inventoryCount: 247,
            fleetCount: 8,
            jobsCount: 23,
            toolsOut: 14
        };
        const el = (id) => document.getElementById(id);
        if (el('statInventoryCount')) el('statInventoryCount').textContent = stats.inventoryCount;
        if (el('statFleetCount')) el('statFleetCount').textContent = stats.fleetCount;
        if (el('statJobsCount')) el('statJobsCount').textContent = stats.jobsCount;
        if (el('statToolsOut')) el('statToolsOut').textContent = stats.toolsOut;
    }

    loadRecentActivity() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        const activities = [
            { icon: '🌱', text: 'Inventory updated: 15 new plants added', time: '2 hours ago' },
            { icon: '📅', text: 'Crew Alpha assigned to Johnson property', time: '3 hours ago' },
            { icon: '🔧', text: 'Chainsaw #4 checked out by Mike', time: '5 hours ago' },
            { icon: '⭐', text: '12 plants graded and priced', time: 'Yesterday' }
        ];
        activityList.innerHTML = activities.map(a => `
            <div class="activity-item">
                <span class="activity-icon">${a.icon}</span>
                <div class="activity-content">
                    <p class="activity-text">${a.text}</p>
                    <span class="activity-time">${a.time}</span>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');

        // Navigation
        document.getElementById('dashboardBtn')?.addEventListener('click', () => this.showDashboardView());
        document.getElementById('newChatBtn')?.addEventListener('click', () => this.showChatInterface());
        document.getElementById('analyticsBtn')?.addEventListener('click', () => this.showAnalyticsView());

        // Tool cards
        document.querySelectorAll('.tool-card[data-tool], .tool-item[data-tool]').forEach(el => {
            el.addEventListener('click', () => {
                const toolId = el.dataset.tool;
                if (toolId === 'chat') this.showChatInterface();
                else this.openTool(toolId);
            });
        });

        // Header buttons
        document.getElementById('headerBackBtn')?.addEventListener('click', () => this.showDashboardView());
        document.getElementById('headerRefreshBtn')?.addEventListener('click', () => this.refreshCurrentTool());
        document.getElementById('headerFullscreenBtn')?.addEventListener('click', () => this.toggleToolFullscreen());
        document.getElementById('toolBackBtn')?.addEventListener('click', () => this.showDashboardView());
        document.getElementById('toolRefreshBtn')?.addEventListener('click', () => this.refreshCurrentTool());
        document.getElementById('toolFullscreenBtn')?.addEventListener('click', () => this.toggleToolFullscreen());

        // Settings
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.showSettingsModal());
        document.getElementById('saveSettings')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('cancelSettings')?.addEventListener('click', () => this.hideModal('settingsModal'));
        document.getElementById('closeSettingsModal')?.addEventListener('click', () => this.hideModal('settingsModal'));

        // User dropdown
        const userProfileBtn = document.getElementById('userProfileBtn');
        const userDropdown = document.getElementById('userDropdown');
        userProfileBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown?.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-profile-wrapper')) userDropdown?.classList.add('hidden');
        });
        document.getElementById('dropdownSettings')?.addEventListener('click', () => {
            userDropdown?.classList.add('hidden');
            this.showSettingsModal();
        });
        document.getElementById('dropdownTheme')?.addEventListener('click', () => {
            userDropdown?.classList.add('hidden');
            this.toggleTheme();
        });
        document.getElementById('dropdownHelp')?.addEventListener('click', () => {
            userDropdown?.classList.add('hidden');
            this.showModal('helpModal');
        });

        // Notifications
        const notificationsBtn = document.getElementById('notificationsBtn');
        const notificationsPanel = document.getElementById('notificationsPanel');
        notificationsBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationsPanel?.classList.toggle('hidden');
        });
        document.getElementById('closeNotifications')?.addEventListener('click', () => notificationsPanel?.classList.add('hidden'));

        // Mobile menu
        document.getElementById('mobileMenuBtn')?.addEventListener('click', () => this.toggleSidebar());
        document.getElementById('sidebarToggle')?.addEventListener('click', () => this.toggleSidebar());

        // Modal overlays
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => this.hideAllModals());
        });
        document.getElementById('closeHelpModal')?.addEventListener('click', () => this.hideModal('helpModal'));

        // Chat
        const chatInput = document.getElementById('chatInput');
        const chatSendBtn = document.getElementById('chatSendBtn');
        chatSendBtn?.addEventListener('click', () => this.sendChatMessage());
        chatInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        });
        chatInput?.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
        });

        // Quick actions
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const query = btn.dataset.query;
                if (query && chatInput) {
                    chatInput.value = query;
                    this.sendChatMessage();
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.showChatInterface();
            }
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal:not(.hidden)');
                if (openModal) this.hideAllModals();
                else if (this.currentView === 'tool') this.showDashboardView();
            }
        });

        // Password toggles
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById(btn.dataset.target);
                if (input) {
                    input.type = input.type === 'password' ? 'text' : 'password';
                    btn.textContent = input.type === 'password' ? '👁️' : '🙈';
                }
            });
        });

        console.log('✅ Event listeners attached');
    }

    showDashboardView() {
        this.currentView = 'dashboard';
        this.currentTool = null;
        document.querySelectorAll('.view').forEach(v => { v.classList.add('hidden'); v.classList.remove('active'); });
        const dv = document.getElementById('dashboardView');
        if (dv) { dv.classList.remove('hidden'); dv.classList.add('active'); }
        this.updateNavigation('dashboardBtn');
        this.updateHeader('Operations Dashboard', 'Overview of inventory, fleet, and recent activity');
        this.toggleHeaderToolButtons(false);
    }

    showChatInterface() {
        this.currentView = 'chat';
        this.currentTool = null;
        document.querySelectorAll('.view').forEach(v => { v.classList.add('hidden'); v.classList.remove('active'); });
        const ci = document.getElementById('chatInterface');
        if (ci) { ci.classList.remove('hidden'); ci.classList.add('active'); }
        this.updateNavigation('newChatBtn');
        this.updateHeader('AI Assistant', 'Ask me anything about your operations');
        this.toggleHeaderToolButtons(false);
        setTimeout(() => document.getElementById('chatInput')?.focus(), 100);
    }

    showAnalyticsView() {
        this.currentView = 'analytics';
        document.querySelectorAll('.view').forEach(v => { v.classList.add('hidden'); v.classList.remove('active'); });
        const av = document.getElementById('analyticsView');
        if (av) { av.classList.remove('hidden'); av.classList.add('active'); }
        this.updateNavigation('analyticsBtn');
        this.updateHeader('Analytics', 'Performance metrics and insights');
        this.toggleHeaderToolButtons(false);
    }

    async openTool(toolId) {
        const tool = this.config.services?.[toolId];
        if (!tool) { this.showToast(`Tool "${toolId}" not found`, 'error'); return; }
        if (!tool.url || tool.url.includes('YOUR_')) {
            this.showToast('Tool not configured. Set URL in Settings.', 'warning');
            this.showSettingsModal();
            return;
        }
        this.currentTool = toolId;
        this.currentView = 'tool';
        document.querySelectorAll('.view').forEach(v => { v.classList.add('hidden'); v.classList.remove('active'); });
        const tc = document.getElementById('toolContainer');
        if (tc) { tc.classList.remove('hidden'); tc.classList.add('active'); }
        document.getElementById('toolIcon').textContent = tool.icon || '🔧';
        document.getElementById('toolTitle').textContent = tool.name || toolId;
        document.getElementById('toolDescription').textContent = tool.description || '';
        this.updateHeader(tool.name || toolId, tool.description || '');
        this.toggleHeaderToolButtons(true);
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelector(`[data-tool="${toolId}"]`)?.classList.add('active');
        this.loadToolInIframe(tool.url);
    }

    loadToolInIframe(url) {
        const iframe = document.getElementById('toolIframe');
        const loading = document.querySelector('.tool-loading');
        if (!iframe) return;
        loading.style.display = 'flex';
        let loaded = false;
        const onLoad = () => { loaded = true; loading.style.display = 'none'; iframe.removeEventListener('load', onLoad); };
        iframe.addEventListener('load', onLoad);
        iframe.src = url;
        setTimeout(() => {
            if (!loaded) {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (!doc || doc.body === null) this.showIframeError(url);
                } catch (e) {
                    if (e.name === 'SecurityError') { loaded = true; loading.style.display = 'none'; }
                    else this.showIframeError(url);
                }
            }
        }, 3000);
    }

    showIframeError(url) {
        document.querySelector('.tool-loading').innerHTML = `
            <div style="text-align:center;padding:2rem;">
                <div style="font-size:3rem;margin-bottom:1rem;">🔒</div>
                <h3>Cannot Load in Frame</h3>
                <p style="margin:1rem 0;">This tool cannot be embedded.</p>
                <button onclick="window.open('${url}','_blank')" class="btn btn-primary">↗️ Open in New Tab</button>
                <button onclick="window.app.showDashboardView()" class="btn btn-secondary">← Back</button>
            </div>`;
    }

    refreshCurrentTool() {
        if (this.currentTool) {
            const tool = this.config.services?.[this.currentTool];
            if (tool?.url) this.loadToolInIframe(tool.url);
        }
    }

    toggleToolFullscreen() {
        const c = document.getElementById('toolContainer');
        if (document.fullscreenElement) document.exitFullscreen();
        else c?.requestFullscreen?.();
    }

    updateNavigation(activeId) {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.getElementById(activeId)?.classList.add('active');
    }

    updateHeader(title, subtitle) {
        const t = document.getElementById('pageTitle');
        const s = document.getElementById('pageSubtitle');
        if (t) t.textContent = title;
        if (s) s.textContent = subtitle;
    }

    toggleHeaderToolButtons(show) {
        ['headerBackBtn', 'headerRefreshBtn', 'headerFullscreenBtn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = show ? 'flex' : 'none';
        });
    }

    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const msg = input?.value?.trim();
        if (!msg) return;
        this.addChatMessage(msg, 'user');
        input.value = '';
        input.style.height = 'auto';
        setTimeout(() => {
            this.addChatMessage(this.getFallbackResponse(msg), 'assistant');
        }, 500);
    }

    getFallbackResponse(text) {
        const lower = text.toLowerCase();
        if (lower.includes('inventory') || lower.includes('plant')) return "Open the Inventory tool to manage plants and stock levels.";
        if (lower.includes('schedule') || lower.includes('crew')) return "Use the Crew Scheduler to manage jobs and assignments.";
        if (lower.includes('tool') || lower.includes('checkout')) return "The Tool Checkout system tracks equipment rentals.";
        if (lower.includes('grade') || lower.includes('sell')) return "Use Grade & Sell for plant quality assessment.";
        return "I can help with inventory, scheduling, tools, and grading. Configure your Claude API key in Settings for smarter responses.";
    }

    addChatMessage(text, role) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        const welcome = container.querySelector('.chat-welcome');
        if (welcome) welcome.remove();
        const div = document.createElement('div');
        div.className = `chat-message ${role}`;
        div.innerHTML = `<div class="message-avatar">${role === 'user' ? '👤' : '🌱'}</div><div class="message-content">${this.escapeHtml(text)}</div>`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showSettingsModal() {
        const s = this.config.services || {};
        document.getElementById('darkMode').checked = document.body.dataset.theme === 'dark';
        document.getElementById('inventoryUrl').value = s.inventory?.url || '';
        document.getElementById('gradingUrl').value = s.grading?.url || '';
        document.getElementById('schedulerUrl').value = s.scheduler?.url || '';
        document.getElementById('toolsUrl').value = s.tools?.url || '';
        document.getElementById('chessmapUrl').value = s.chessmap?.url || '';
        document.getElementById('claudeApiKey').value = localStorage.getItem('claudeApiKey') || '';
        document.getElementById('openaiApiKey').value = localStorage.getItem('openaiApiKey') || '';
        this.showModal('settingsModal');
    }

    saveSettings() {
        const services = {
            inventory: { ...this.config.services?.inventory, url: document.getElementById('inventoryUrl').value },
            grading: { ...this.config.services?.grading, url: document.getElementById('gradingUrl').value },
            scheduler: { ...this.config.services?.scheduler, url: document.getElementById('schedulerUrl').value },
            tools: { ...this.config.services?.tools, url: document.getElementById('toolsUrl').value },
            chessmap: { ...this.config.services?.chessmap, url: document.getElementById('chessmapUrl').value }
        };
        const darkMode = document.getElementById('darkMode').checked;
        localStorage.setItem('dashboardSettings', JSON.stringify({ services, darkMode }));
        Object.keys(services).forEach(k => { if (services[k].url) localStorage.setItem(`${k}Url`, services[k].url); });
        const claudeKey = document.getElementById('claudeApiKey').value.trim();
        const openaiKey = document.getElementById('openaiApiKey').value.trim();
        if (claudeKey) localStorage.setItem('claudeApiKey', claudeKey);
        if (openaiKey) localStorage.setItem('openaiApiKey', openaiKey);
        document.body.dataset.theme = darkMode ? 'dark' : 'light';
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
        this.config.services = services;
        this.hideModal('settingsModal');
        this.showToast('Settings saved!', 'success');
    }

    toggleTheme() {
        const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        this.showToast(`${newTheme === 'dark' ? '🌙' : '☀️'} ${newTheme} mode`, 'success');
    }

    toggleSidebar() {
        document.getElementById('sidebar')?.classList.toggle('open');
    }

    showModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
    hideModal(id) { document.getElementById(id)?.classList.add('hidden'); }
    hideAllModals() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
        toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-message">${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 4000);
    }

    showLoadingScreen(show) {
        const loading = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        if (show) { if (loading) loading.style.display = 'flex'; }
        else {
            if (loading) { loading.style.opacity = '0'; loading.style.pointerEvents = 'none'; setTimeout(() => loading.style.display = 'none', 500); }
            if (app) { app.classList.remove('hidden'); app.style.opacity = '1'; }
        }
    }

    handleInitializationError(error) {
        const loading = document.getElementById('loadingScreen');
        if (loading) loading.innerHTML = `<div style="text-align:center;color:white;"><div style="font-size:3rem;">❌</div><h2>Failed to Load</h2><p>${error.message}</p><button onclick="location.reload()" class="btn btn-primary">Reload</button></div>`;
    }

    getDefaultConfig() {
        return {
            app: { name: "Deep Roots Dashboard", version: "2.0.0" },
            services: {
                inventory: { name: "Inventory", icon: "🌱", url: "", description: "Manage plants" },
                grading: { name: "Grade & Sell", icon: "⭐", url: "", description: "Quality assessment" },
                scheduler: { name: "Scheduler", icon: "📅", url: "", description: "Crew schedules" },
                tools: { name: "Tool Checkout", icon: "🔧", url: "", description: "Equipment tracking" },
                chessmap: { name: "Logistics Map", icon: "🗺️", url: "", description: "Route planning" }
            }
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const theme = localStorage.getItem('theme');
    if (theme) document.body.dataset.theme = theme;
    window.app = new DashboardApp();
});
