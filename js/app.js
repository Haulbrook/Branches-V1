/**
 * Deep Roots Dashboard - Consolidated Application
 * Version: 2.1.0 (Bulletproof)
 * 
 * This single file contains all dashboard functionality.
 * No external JS dependencies required.
 */

(function() {
    'use strict';

    // ============================================
    // DEBUG MODE - Set to false for production
    // ============================================
    const DEBUG = true;
    
    function log(message, type = 'info') {
        if (!DEBUG && type !== 'error') return;
        const prefix = {
            'info': '📘',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌'
        }[type] || 'ℹ️';
        console.log(`${prefix} [Dashboard] ${message}`);
    }

    // ============================================
    // DASHBOARD APP CLASS
    // ============================================
    class DashboardApp {
        constructor() {
            log('Constructor called');
            this.isInitialized = false;
            this.currentTool = null;
            this.currentView = 'dashboard';
            this.config = null;
            this.user = null;
        }

        async init() {
            log('Initialization starting...');
            
            try {
                this.showLoadingScreen(true);
                
                // Step 1: Load configuration
                log('Step 1: Loading configuration...');
                await this.loadConfiguration();
                log('Configuration loaded', 'success');
                
                // Step 2: Initialize user
                log('Step 2: Initializing user...');
                await this.initializeUser();
                log('User initialized', 'success');
                
                // Step 3: Setup event listeners
                log('Step 3: Setting up event listeners...');
                this.setupEventListeners();
                log('Event listeners attached', 'success');
                
                // Step 4: Load dashboard data
                log('Step 4: Loading hero stats...');
                this.loadHeroStats();
                log('Hero stats loaded', 'success');
                
                log('Step 5: Loading recent activity...');
                this.loadRecentActivity();
                log('Recent activity loaded', 'success');

                // Step 6: Finish initialization
                setTimeout(() => {
                    this.showLoadingScreen(false);
                    this.isInitialized = true;
                    this.showDashboardView();
                    log('Dashboard fully initialized!', 'success');
                    this.showToast('Welcome to Deep Roots Dashboard!', 'success');
                }, 800);

            } catch (error) {
                log(`Initialization failed: ${error.message}`, 'error');
                console.error('Full error:', error);
                this.handleInitializationError(error);
            }
        }

        // ============================================
        // CONFIGURATION
        // ============================================
        async loadConfiguration() {
            try {
                const response = await fetch('config.json');
                if (!response.ok) {
                    throw new Error(`Config fetch failed: ${response.status}`);
                }
                this.config = await response.json();
                log('Config loaded from config.json');
            } catch (error) {
                log(`Config load failed: ${error.message}, using defaults`, 'warning');
                this.config = this.getDefaultConfig();
            }
            
            // Merge with saved settings
            try {
                const savedSettings = localStorage.getItem('dashboardSettings');
                if (savedSettings) {
                    const parsed = JSON.parse(savedSettings);
                    this.config = { ...this.config, ...parsed };
                    log('Merged with localStorage settings');
                }
            } catch (e) {
                log('Could not parse saved settings', 'warning');
            }
            
            this.updateToolURLs();
        }

        updateToolURLs() {
            if (!this.config.services) {
                log('No services in config', 'warning');
                return;
            }
            Object.keys(this.config.services).forEach(key => {
                const savedUrl = localStorage.getItem(`${key}Url`);
                if (savedUrl) {
                    this.config.services[key].url = savedUrl;
                }
            });
        }

        getDefaultConfig() {
            return {
                app: { name: "Deep Roots Dashboard", version: "2.1.0" },
                services: {
                    inventory: { name: "Inventory", icon: "🌱", url: "", description: "Manage plants and stock" },
                    grading: { name: "Grade & Sell", icon: "⭐", url: "", description: "Quality assessment" },
                    scheduler: { name: "Scheduler", icon: "📅", url: "", description: "Crew schedules" },
                    tools: { name: "Tool Checkout", icon: "🔧", url: "", description: "Equipment tracking" },
                    chessmap: { name: "Logistics Map", icon: "🗺️", url: "", description: "Route planning" }
                }
            };
        }

        // ============================================
        // USER MANAGEMENT
        // ============================================
        async initializeUser() {
            this.user = {
                name: 'Deep Roots User',
                email: 'user@deeprootslandscape.com',
                avatar: '🌱'
            };
            this.updateUserDisplay(this.user);
        }

        updateUserDisplay(user) {
            const updates = {
                'userAvatar': user.avatar || '👤',
                'userName': user.name || 'User',
                'dropdownAvatar': user.avatar || '👤',
                'dropdownName': user.name || 'User',
                'dropdownEmail': user.email || ''
            };
            
            Object.entries(updates).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = value;
                    log(`Updated #${id} = "${value}"`);
                } else {
                    log(`Element #${id} not found`, 'warning');
                }
            });
        }

        // ============================================
        // DASHBOARD DATA
        // ============================================
        loadHeroStats() {
            // Hardcoded stats for now - replace with API call later
            const stats = {
                statInventoryCount: 247,
                statFleetCount: 8,
                statJobsCount: 23,
                statToolsOut: 14
            };
            
            Object.entries(stats).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = value;
                    log(`Set #${id} = ${value}`);
                } else {
                    log(`Stat element #${id} not found!`, 'error');
                }
            });
        }

        loadRecentActivity() {
            const activityList = document.getElementById('activityList');
            if (!activityList) {
                log('Activity list element not found!', 'error');
                return;
            }
            
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
            
            log(`Rendered ${activities.length} activity items`);
        }

        // ============================================
        // EVENT LISTENERS
        // ============================================
        setupEventListeners() {
            // Helper to safely add event listeners
            const on = (id, event, handler) => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener(event, handler);
                } else {
                    log(`Event target #${id} not found`, 'warning');
                }
            };
            
            // Navigation
            on('dashboardBtn', 'click', () => this.showDashboardView());
            on('newChatBtn', 'click', () => this.showChatInterface());
            on('analyticsBtn', 'click', () => this.showAnalyticsView());

            // Tool cards (using querySelectorAll for multiple elements)
            document.querySelectorAll('.tool-card[data-tool], .tool-item[data-tool]').forEach(el => {
                el.addEventListener('click', () => {
                    const toolId = el.dataset.tool;
                    if (toolId === 'chat') {
                        this.showChatInterface();
                    } else {
                        this.openTool(toolId);
                    }
                });
            });

            // Header buttons
            on('headerBackBtn', 'click', () => this.showDashboardView());
            on('headerRefreshBtn', 'click', () => this.refreshCurrentTool());
            on('headerFullscreenBtn', 'click', () => this.toggleToolFullscreen());
            on('toolBackBtn', 'click', () => this.showDashboardView());
            on('toolRefreshBtn', 'click', () => this.refreshCurrentTool());
            on('toolFullscreenBtn', 'click', () => this.toggleToolFullscreen());

            // Settings
            on('settingsBtn', 'click', () => this.showSettingsModal());
            on('saveSettings', 'click', () => this.saveSettings());
            on('cancelSettings', 'click', () => this.hideModal('settingsModal'));
            on('closeSettingsModal', 'click', () => this.hideModal('settingsModal'));

            // User dropdown
            const userProfileBtn = document.getElementById('userProfileBtn');
            const userDropdown = document.getElementById('userDropdown');
            if (userProfileBtn && userDropdown) {
                userProfileBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    userDropdown.classList.toggle('hidden');
                });
                document.addEventListener('click', (e) => {
                    if (!e.target.closest('.user-profile-wrapper')) {
                        userDropdown.classList.add('hidden');
                    }
                });
            }
            
            on('dropdownSettings', 'click', () => {
                document.getElementById('userDropdown')?.classList.add('hidden');
                this.showSettingsModal();
            });
            on('dropdownTheme', 'click', () => {
                document.getElementById('userDropdown')?.classList.add('hidden');
                this.toggleTheme();
            });
            on('dropdownHelp', 'click', () => {
                document.getElementById('userDropdown')?.classList.add('hidden');
                this.showModal('helpModal');
            });

            // Notifications
            const notificationsBtn = document.getElementById('notificationsBtn');
            const notificationsPanel = document.getElementById('notificationsPanel');
            if (notificationsBtn && notificationsPanel) {
                notificationsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    notificationsPanel.classList.toggle('hidden');
                });
            }
            on('closeNotifications', 'click', () => {
                document.getElementById('notificationsPanel')?.classList.add('hidden');
            });

            // Mobile menu
            on('mobileMenuBtn', 'click', () => this.toggleSidebar());
            on('sidebarToggle', 'click', () => this.toggleSidebar());

            // Modal overlays
            document.querySelectorAll('.modal-overlay').forEach(overlay => {
                overlay.addEventListener('click', () => this.hideAllModals());
            });
            on('closeHelpModal', 'click', () => this.hideModal('helpModal'));

            // Chat
            const chatInput = document.getElementById('chatInput');
            on('chatSendBtn', 'click', () => this.sendChatMessage());
            if (chatInput) {
                chatInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendChatMessage();
                    }
                });
                chatInput.addEventListener('input', () => {
                    chatInput.style.height = 'auto';
                    chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
                });
            }

            // Quick actions
            document.querySelectorAll('.quick-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    const query = btn.dataset.query;
                    const input = document.getElementById('chatInput');
                    if (query && input) {
                        input.value = query;
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
                    if (openModal) {
                        this.hideAllModals();
                    } else if (this.currentView === 'tool') {
                        this.showDashboardView();
                    }
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

            log('All event listeners attached');
        }

        // ============================================
        // VIEW MANAGEMENT
        // ============================================
        showDashboardView() {
            this.currentView = 'dashboard';
            this.currentTool = null;
            this.switchView('dashboardView');
            this.updateNavigation('dashboardBtn');
            this.updateHeader('Operations Dashboard', 'Overview of inventory, fleet, and recent activity');
            this.toggleHeaderToolButtons(false);
        }

        showChatInterface() {
            this.currentView = 'chat';
            this.currentTool = null;
            this.switchView('chatInterface');
            this.updateNavigation('newChatBtn');
            this.updateHeader('AI Assistant', 'Ask me anything about your operations');
            this.toggleHeaderToolButtons(false);
            setTimeout(() => document.getElementById('chatInput')?.focus(), 100);
        }

        showAnalyticsView() {
            this.currentView = 'analytics';
            this.switchView('analyticsView');
            this.updateNavigation('analyticsBtn');
            this.updateHeader('Analytics', 'Performance metrics and insights');
            this.toggleHeaderToolButtons(false);
            this.loadAnalyticsCharts();
        }

        switchView(viewId) {
            document.querySelectorAll('.view').forEach(v => {
                v.classList.add('hidden');
                v.classList.remove('active');
            });
            const view = document.getElementById(viewId);
            if (view) {
                view.classList.remove('hidden');
                view.classList.add('active');
            }
        }

        loadAnalyticsCharts() {
            // Placeholder - implement actual charts here
            log('Analytics view opened - charts would load here');
        }

        // ============================================
        // TOOL MANAGEMENT
        // ============================================
        async openTool(toolId) {
            const tool = this.config.services?.[toolId];
            if (!tool) {
                this.showToast(`Tool "${toolId}" not found`, 'error');
                return;
            }
            
            if (!tool.url || tool.url.includes('YOUR_') || tool.url === '') {
                this.showToast('Tool not configured. Set URL in Settings.', 'warning');
                this.showSettingsModal();
                return;
            }
            
            this.currentTool = toolId;
            this.currentView = 'tool';
            this.switchView('toolContainer');
            
            const toolIcon = document.getElementById('toolIcon');
            const toolTitle = document.getElementById('toolTitle');
            const toolDescription = document.getElementById('toolDescription');
            
            if (toolIcon) toolIcon.textContent = tool.icon || '🔧';
            if (toolTitle) toolTitle.textContent = tool.name || toolId;
            if (toolDescription) toolDescription.textContent = tool.description || '';
            
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
            
            if (loading) loading.style.display = 'flex';
            
            let loaded = false;
            const onLoad = () => {
                loaded = true;
                if (loading) loading.style.display = 'none';
                iframe.removeEventListener('load', onLoad);
            };
            
            iframe.addEventListener('load', onLoad);
            iframe.src = url;
            
            // Timeout fallback
            setTimeout(() => {
                if (!loaded) {
                    try {
                        const doc = iframe.contentDocument || iframe.contentWindow?.document;
                        if (!doc || doc.body === null) {
                            this.showIframeError(url);
                        }
                    } catch (e) {
                        if (e.name === 'SecurityError') {
                            // Cross-origin, but loaded successfully
                            loaded = true;
                            if (loading) loading.style.display = 'none';
                        } else {
                            this.showIframeError(url);
                        }
                    }
                }
            }, 5000);
        }

        showIframeError(url) {
            const loading = document.querySelector('.tool-loading');
            if (loading) {
                loading.innerHTML = `
                    <div style="text-align:center;padding:2rem;">
                        <div style="font-size:3rem;margin-bottom:1rem;">🔒</div>
                        <h3>Cannot Load in Frame</h3>
                        <p style="margin:1rem 0;color:#666;">This tool cannot be embedded due to security restrictions.</p>
                        <button onclick="window.open('${url}','_blank')" class="btn btn-primary" style="margin:0.5rem;">
                            ↗️ Open in New Tab
                        </button>
                        <button onclick="window.app.showDashboardView()" class="btn btn-secondary" style="margin:0.5rem;">
                            ← Back to Dashboard
                        </button>
                    </div>
                `;
            }
        }

        refreshCurrentTool() {
            if (this.currentTool) {
                const tool = this.config.services?.[this.currentTool];
                if (tool?.url) {
                    this.loadToolInIframe(tool.url);
                }
            }
        }

        toggleToolFullscreen() {
            const container = document.getElementById('toolContainer');
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                container?.requestFullscreen?.();
            }
        }

        // ============================================
        // NAVIGATION & HEADER
        // ============================================
        updateNavigation(activeId) {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.getElementById(activeId)?.classList.add('active');
        }

        updateHeader(title, subtitle) {
            const titleEl = document.getElementById('pageTitle');
            const subtitleEl = document.getElementById('pageSubtitle');
            if (titleEl) titleEl.textContent = title;
            if (subtitleEl) subtitleEl.textContent = subtitle;
        }

        toggleHeaderToolButtons(show) {
            ['headerBackBtn', 'headerRefreshBtn', 'headerFullscreenBtn'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = show ? 'flex' : 'none';
            });
        }

        toggleSidebar() {
            document.getElementById('sidebar')?.classList.toggle('open');
        }

        // ============================================
        // CHAT FUNCTIONALITY
        // ============================================
        sendChatMessage() {
            const input = document.getElementById('chatInput');
            const message = input?.value?.trim();
            
            if (!message) return;
            
            this.addChatMessage(message, 'user');
            input.value = '';
            input.style.height = 'auto';
            
            // Simulate response (replace with actual API call)
            setTimeout(() => {
                const response = this.generateResponse(message);
                this.addChatMessage(response, 'assistant');
            }, 500);
        }

        generateResponse(text) {
            const lower = text.toLowerCase();
            
            if (lower.includes('inventory') || lower.includes('plant')) {
                return "📦 To check inventory, open the Inventory Management tool from the dashboard. You currently have 247 plant varieties in stock.";
            }
            if (lower.includes('schedule') || lower.includes('crew') || lower.includes('today')) {
                return "📅 You have 23 jobs scheduled this week. Open the Crew Scheduler to view assignments and manage schedules.";
            }
            if (lower.includes('tool') || lower.includes('checkout') || lower.includes('equipment')) {
                return "🔧 Currently 14 tools are checked out. Use the Tool Checkout system to see who has what equipment.";
            }
            if (lower.includes('grade') || lower.includes('sell') || lower.includes('quality')) {
                return "⭐ Open Grade & Sell to assess plant quality and set pricing. 12 plants were graded yesterday.";
            }
            if (lower.includes('help') || lower.includes('what can you')) {
                return "🌱 I can help you with:\n• Inventory status and plant information\n• Crew scheduling and job assignments\n• Tool checkout tracking\n• Plant grading and pricing\n\nJust ask about any of these topics!";
            }
            
            return "🌱 I can help with inventory, scheduling, tools, and grading. For smarter AI responses, configure your Claude API key in Settings.";
        }

        addChatMessage(text, role) {
            const container = document.getElementById('chatMessages');
            if (!container) return;
            
            // Remove welcome message if present
            const welcome = container.querySelector('.chat-welcome');
            if (welcome) welcome.remove();
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${role}`;
            messageDiv.innerHTML = `
                <div class="message-avatar">${role === 'user' ? '👤' : '🌱'}</div>
                <div class="message-content">${this.escapeHtml(text).replace(/\n/g, '<br>')}</div>
            `;
            
            container.appendChild(messageDiv);
            container.scrollTop = container.scrollHeight;
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // ============================================
        // SETTINGS
        // ============================================
        showSettingsModal() {
            const services = this.config.services || {};
            
            // Populate current values
            const darkModeEl = document.getElementById('darkMode');
            if (darkModeEl) darkModeEl.checked = document.body.dataset.theme === 'dark';
            
            const fields = {
                'inventoryUrl': services.inventory?.url || '',
                'gradingUrl': services.grading?.url || '',
                'schedulerUrl': services.scheduler?.url || '',
                'toolsUrl': services.tools?.url || '',
                'chessmapUrl': services.chessmap?.url || '',
                'claudeApiKey': localStorage.getItem('claudeApiKey') || '',
                'openaiApiKey': localStorage.getItem('openaiApiKey') || ''
            };
            
            Object.entries(fields).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) el.value = value;
            });
            
            this.showModal('settingsModal');
        }

        saveSettings() {
            const getValue = (id) => document.getElementById(id)?.value || '';
            
            const services = {
                inventory: { ...this.config.services?.inventory, url: getValue('inventoryUrl') },
                grading: { ...this.config.services?.grading, url: getValue('gradingUrl') },
                scheduler: { ...this.config.services?.scheduler, url: getValue('schedulerUrl') },
                tools: { ...this.config.services?.tools, url: getValue('toolsUrl') },
                chessmap: { ...this.config.services?.chessmap, url: getValue('chessmapUrl') }
            };
            
            const darkMode = document.getElementById('darkMode')?.checked || false;
            
            // Save to localStorage
            localStorage.setItem('dashboardSettings', JSON.stringify({ services, darkMode }));
            
            Object.keys(services).forEach(key => {
                if (services[key].url) {
                    localStorage.setItem(`${key}Url`, services[key].url);
                }
            });
            
            // Save API keys
            const claudeKey = getValue('claudeApiKey').trim();
            const openaiKey = getValue('openaiApiKey').trim();
            if (claudeKey) localStorage.setItem('claudeApiKey', claudeKey);
            if (openaiKey) localStorage.setItem('openaiApiKey', openaiKey);
            
            // Apply theme
            document.body.dataset.theme = darkMode ? 'dark' : 'light';
            localStorage.setItem('theme', darkMode ? 'dark' : 'light');
            
            // Update config
            this.config.services = services;
            
            this.hideModal('settingsModal');
            this.showToast('Settings saved successfully!', 'success');
        }

        toggleTheme() {
            const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
            document.body.dataset.theme = newTheme;
            localStorage.setItem('theme', newTheme);
            this.showToast(`${newTheme === 'dark' ? '🌙 Dark' : '☀️ Light'} mode enabled`, 'success');
        }

        // ============================================
        // MODALS
        // ============================================
        showModal(id) {
            document.getElementById(id)?.classList.remove('hidden');
        }

        hideModal(id) {
            document.getElementById(id)?.classList.add('hidden');
        }

        hideAllModals() {
            document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        }

        // ============================================
        // TOAST NOTIFICATIONS
        // ============================================
        showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            if (!container) {
                console.log(`Toast (${type}): ${message}`);
                return;
            }
            
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            
            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };
            
            toast.innerHTML = `
                <span class="toast-icon">${icons[type] || icons.info}</span>
                <span class="toast-message">${message}</span>
            `;
            
            container.appendChild(toast);
            
            // Trigger animation
            setTimeout(() => toast.classList.add('show'), 10);
            
            // Remove after delay
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }

        // ============================================
        // LOADING & ERROR HANDLING
        // ============================================
        showLoadingScreen(show) {
            const loading = document.getElementById('loadingScreen');
            const app = document.getElementById('app');
            
            if (show) {
                if (loading) loading.style.display = 'flex';
            } else {
                if (loading) {
                    loading.style.opacity = '0';
                    loading.style.pointerEvents = 'none';
                    setTimeout(() => {
                        loading.style.display = 'none';
                    }, 500);
                }
                if (app) {
                    app.classList.remove('hidden');
                    app.style.opacity = '1';
                }
            }
        }

        handleInitializationError(error) {
            const loading = document.getElementById('loadingScreen');
            if (loading) {
                loading.innerHTML = `
                    <div style="text-align:center;color:white;padding:2rem;">
                        <div style="font-size:3rem;margin-bottom:1rem;">❌</div>
                        <h2>Failed to Load Dashboard</h2>
                        <p style="margin:1rem 0;opacity:0.8;">${error.message}</p>
                        <button onclick="location.reload()" class="btn btn-primary" style="margin-top:1rem;">
                            🔄 Reload Page
                        </button>
                    </div>
                `;
            }
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
        log('DOM loaded, starting app...');
        
        // Apply saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.body.dataset.theme = savedTheme;
        }
        
        // Create and initialize app
        window.app = new DashboardApp();
        window.app.init();
    });

    // Fallback if DOMContentLoaded already fired
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        log('DOM already ready, starting app immediately...');
        setTimeout(() => {
            if (!window.app) {
                const savedTheme = localStorage.getItem('theme');
                if (savedTheme) {
                    document.body.dataset.theme = savedTheme;
                }
                window.app = new DashboardApp();
                window.app.init();
            }
        }, 1);
    }

})();
