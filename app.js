/**
 * 🚀 Deep Roots Dashboard - Main Application Controller
 * Version: 2.0.0 (Fixed)
 * 
 * Fixes Applied:
 * 1. ✅ Duplicate IDs resolved (header buttons renamed)
 * 2. ✅ dashboardView properly shown
 * 3. ✅ chatInterface toggle working
 * 4. ✅ settingsBtn accessible from header
 * 5. ✅ userProfileBtn/dropdown handlers added
 * 6. ✅ Analytics nav functional
 * 7. ✅ Notifications panel functional
 * 8. ✅ Hero stats load dynamically
 * 9. ✅ User info loads with fallback
 */

class DashboardApp {
    constructor() {
        this.isInitialized = false;
        this.currentTool = null;
        this.currentView = 'dashboard';
        this.config = null;
        this.user = null;

        // Initialize core components
        this.ui = null;
        this.chat = null;
        this.tools = null;
        this.api = null;
        this.dashboard = null;

        // Initialize setup wizard (if available)
        this.setupWizard = window.SetupWizard ? new SetupWizard() : null;

        // Skills (will be initialized after configuration)
        this.deconstructionSkill = null;
        this.forwardThinkerSkill = null;
        this.appleOverseer = null;

        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing Dashboard App...');

            // Show loading screen
            this.showLoadingScreen(true);

            // Load configuration
            await this.loadConfiguration();

            // Initialize managers (check if classes exist)
            if (typeof APIManager !== 'undefined') {
                this.api = new APIManager();
                this.api.init();
                console.log('✅ API Manager initialized');
            }

            if (typeof UIManager !== 'undefined') {
                this.ui = new UIManager();
            } else {
                // Fallback UI manager
                this.ui = this.createFallbackUIManager();
            }

            if (typeof ChatManager !== 'undefined') {
                this.chat = new ChatManager();
            } else {
                this.chat = this.createFallbackChatManager();
            }

            if (typeof ToolManager !== 'undefined') {
                this.tools = new ToolManager();
            }

            // Run setup wizard if needed
            if (this.setupWizard) {
                const wizardConfig = await this.setupWizard.start();
                if (wizardConfig) {
                    this.config = { ...this.config, ...wizardConfig };
                    console.log('✅ Setup wizard completed');
                }
            }

            // Initialize skills with configuration
            await this.initializeSkills();

            // Initialize user session
            await this.initializeUser();

            // Setup ALL event listeners
            this.setupEventListeners();

            // Initialize UI components
            if (this.ui?.init) this.ui.init();
            if (this.chat?.init) this.chat.init();
            if (this.tools?.init) this.tools.init();

            // Initialize skills in chat manager
            if (this.chat?.initializeSkills) {
                this.chat.initializeSkills(this.config);
                console.log('✅ Chat skills initialized');
            }

            // Initialize dashboard manager
            if (typeof DashboardManager !== 'undefined') {
                this.dashboard = new DashboardManager();
                this.dashboard.init().then(() => {
                    console.log('✅ Dashboard Manager initialized');
                    this.loadHeroStats();
                }).catch(error => {
                    console.warn('⚠️ Dashboard Manager failed:', error);
                    this.loadHeroStatsFallback();
                });
            } else {
                this.loadHeroStatsFallback();
            }

            // Load recent activity
            this.loadRecentActivity();

            // Start proactive suggestions
            this.startProactiveSuggestions();

            // Hide loading screen and show app
            setTimeout(() => {
                this.showLoadingScreen(false);
                this.isInitialized = true;
                this.showDashboardView();
                console.log('✅ Dashboard App initialized successfully');
                this.showWelcomeToast();
            }, 1000);

        } catch (error) {
            console.error('❌ Failed to initialize Dashboard App:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Create fallback UI manager if UIManager class doesn't exist
     */
    createFallbackUIManager() {
        return {
            init: () => {},
            showNotification: (msg, type) => this.showToast(msg, type),
            showMessage: (msg, type) => this.showToast(msg, type),
            updateUserInfo: (user) => this.updateUserDisplay(user),
            showSettingsModal: () => this.showSettingsModal(),
            hideSettingsModal: () => this.hideModal('settingsModal'),
            hideAllModals: () => this.hideAllModals(),
            toggleSidebar: () => this.toggleSidebar(),
            updateConnectionStatus: (online) => console.log('Connection:', online ? 'online' : 'offline')
        };
    }

    /**
     * Create fallback Chat manager if ChatManager class doesn't exist
     */
    createFallbackChatManager() {
        return {
            init: () => {},
            initializeSkills: () => {},
            sendMessage: (msg) => console.log('Chat message:', msg),
            addMessage: (msg, role) => this.addChatMessage(msg, role)
        };
    }

    /**
     * Initialize AI skills
     */
    async initializeSkills() {
        try {
            const enableDeconstruction = this.config.enableDeconstructionSkill !== false;
            const enableForwardThinker = this.config.enableForwardThinkerSkill !== false;
            const enableOverseer = this.config.enableAppleOverseer !== false;

            if (enableDeconstruction && window.DeconstructionRebuildSkill) {
                this.deconstructionSkill = new DeconstructionRebuildSkill(this.config);
                console.log('✅ Deconstruction Skill initialized');
            }

            if (enableForwardThinker && window.ForwardThinkerSkill) {
                this.forwardThinkerSkill = new ForwardThinkerSkill(this.config);
                console.log('✅ Forward Thinker Skill initialized');
            }

            if (enableOverseer && window.AppleOverseer) {
                this.appleOverseer = new AppleOverseer(this.config);
                console.log('✅ Apple Overseer initialized');

                if (this.deconstructionSkill?.connectOverseer) {
                    this.deconstructionSkill.connectOverseer(this.appleOverseer);
                }
                if (this.forwardThinkerSkill?.connectOverseer) {
                    this.forwardThinkerSkill.connectOverseer(this.appleOverseer);
                }
            }
        } catch (error) {
            console.warn('⚠️ Skills initialization failed:', error);
        }
    }

    /**
     * Load configuration from config.json and localStorage
     */
    async loadConfiguration() {
        try {
            const response = await fetch('config.json');
            this.config = await response.json();
            
            // Merge with localStorage settings
            const savedSettings = localStorage.getItem('dashboardSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                this.config = { ...this.config, ...settings };
            }
            
            // Update tool URLs from localStorage
            this.updateToolURLs();
            console.log('✅ Configuration loaded');
            
        } catch (error) {
            console.warn('⚠️ Using default configuration:', error);
            this.config = this.getDefaultConfig();
        }
    }

    /**
     * Update tool URLs from localStorage
     */
    updateToolURLs() {
        if (!this.config.services) return;
        
        Object.keys(this.config.services).forEach(key => {
            const savedUrl = localStorage.getItem(`${key}Url`);
            const configUrl = this.config.services[key]?.url;

            if (savedUrl) {
                this.config.services[key].url = savedUrl;
            } else if (configUrl && !configUrl.includes('YOUR_')) {
                localStorage.setItem(`${key}Url`, configUrl);
            }
        });
    }

    /**
     * Initialize user with fallback - FIX #9
     */
    async initializeUser() {
        try {
            this.user = await this.getUserInfo();
        } catch (error) {
            console.warn('⚠️ Using fallback user:', error);
            this.user = {
                name: 'Deep Roots User',
                email: 'user@deeprootslandscape.com',
                avatar: '🌱'
            };
        }
        this.updateUserDisplay(this.user);
    }

    /**
     * Get user info (mock for now, would call GAS in production)
     */
    async getUserInfo() {
        return new Promise((resolve, reject) => {
            // Try to get from localStorage first
            const savedUser = localStorage.getItem('dashboardUser');
            if (savedUser) {
                resolve(JSON.parse(savedUser));
                return;
            }

            // Mock user after short delay
            setTimeout(() => {
                resolve({
                    name: 'Deep Roots User',
                    email: 'user@deeprootslandscape.com',
                    avatar: '🌱'
                });
            }, 500);
        });
    }

    /**
     * Update user display in header - FIX #9
     */
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

    /**
     * Load hero stats dynamically - FIX #8
     */
    loadHeroStats() {
        if (this.dashboard?.getMetrics) {
            const metrics = this.dashboard.getMetrics();
            this.updateHeroStats(metrics);
        } else {
            this.loadHeroStatsFallback();
        }
    }

    /**
     * Fallback hero stats - FIX #8
     */
    loadHeroStatsFallback() {
        // Load from localStorage or use defaults
        const savedStats = localStorage.getItem('dashboardStats');
        let stats = savedStats ? JSON.parse(savedStats) : {
            inventoryCount: 247,
            fleetCount: 8,
            jobsCount: 23,
            toolsOut: 14
        };

        this.updateHeroStats(stats);
    }

    /**
     * Update hero stat cards
     */
    updateHeroStats(stats) {
        const statInventory = document.getElementById('statInventoryCount');
        const statFleet = document.getElementById('statFleetCount');
        const statJobs = document.getElementById('statJobsCount');
        const statTools = document.getElementById('statToolsOut');

        if (statInventory) statInventory.textContent = stats.inventoryCount || '--';
        if (statFleet) statFleet.textContent = stats.fleetCount || '--';
        if (statJobs) statJobs.textContent = stats.jobsCount || '--';
        if (statTools) statTools.textContent = stats.toolsOut || '--';
    }

    /**
     * Load recent activity
     */
    loadRecentActivity() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        // Mock activity data (would come from GAS in production)
        const activities = [
            { icon: '🌱', text: 'Inventory updated: 15 new plants added', time: '2 hours ago' },
            { icon: '📅', text: 'Crew Alpha assigned to Johnson property', time: '3 hours ago' },
            { icon: '🔧', text: 'Chainsaw #4 checked out by Mike', time: '5 hours ago' },
            { icon: '⭐', text: '12 plants graded and priced', time: 'Yesterday' }
        ];

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <span class="activity-icon">${activity.icon}</span>
                <div class="activity-content">
                    <p class="activity-text">${activity.text}</p>
                    <span class="activity-time">${activity.time}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Setup ALL event listeners - FIXES #1, #4, #5, #6, #7
     */
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');

        // ===== NAVIGATION =====
        
        // Dashboard button
        document.getElementById('dashboardBtn')?.addEventListener('click', () => {
            this.showDashboardView();
        });

        // Chat button
        document.getElementById('newChatBtn')?.addEventListener('click', () => {
            this.showChatInterface();
        });

        // Analytics button - FIX #6
        document.getElementById('analyticsBtn')?.addEventListener('click', () => {
            this.showAnalyticsView();
        });

        // ===== TOOL CARDS =====
        
        // Tool cards in dashboard
        document.querySelectorAll('.tool-card[data-tool]').forEach(card => {
            card.addEventListener('click', () => {
                const toolId = card.dataset.tool;
                if (toolId === 'chat') {
                    this.showChatInterface();
                } else {
                    this.openTool(toolId);
                }
            });
        });

        // Tool items in sidebar
        document.querySelectorAll('.tool-item[data-tool]').forEach(item => {
            item.addEventListener('click', () => {
                const toolId = item.dataset.tool;
                this.openTool(toolId);
            });
        });

        // ===== HEADER BUTTONS (renamed to avoid duplicate IDs) - FIX #1 =====
        
        document.getElementById('headerBackBtn')?.addEventListener('click', () => {
            this.showDashboardView();
        });

        document.getElementById('headerRefreshBtn')?.addEventListener('click', () => {
            this.refreshCurrentTool();
        });

        document.getElementById('headerFullscreenBtn')?.addEventListener('click', () => {
            this.toggleToolFullscreen();
        });

        // ===== TOOL CONTAINER BUTTONS =====
        
        document.getElementById('toolBackBtn')?.addEventListener('click', () => {
            this.showDashboardView();
        });

        document.getElementById('toolRefreshBtn')?.addEventListener('click', () => {
            this.refreshCurrentTool();
        });

        document.getElementById('toolFullscreenBtn')?.addEventListener('click', () => {
            this.toggleToolFullscreen();
        });

        // ===== SETTINGS - FIX #4 =====
        
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.showSettingsModal();
        });

        document.getElementById('saveSettings')?.addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('cancelSettings')?.addEventListener('click', () => {
            this.hideModal('settingsModal');
        });

        document.getElementById('closeSettingsModal')?.addEventListener('click', () => {
            this.hideModal('settingsModal');
        });

        // Setup wizard button
        document.getElementById('runSetupWizard')?.addEventListener('click', async () => {
            if (this.setupWizard) {
                this.hideModal('settingsModal');
                const wizardConfig = await this.setupWizard.forceStart();
                if (wizardConfig) {
                    this.config = { ...this.config, ...wizardConfig };
                    await this.initializeSkills();
                    this.showToast('Configuration updated!', 'success');
                }
            }
        });

        // Password toggle buttons
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                if (input) {
                    input.type = input.type === 'password' ? 'text' : 'password';
                    btn.textContent = input.type === 'password' ? '👁️' : '🙈';
                }
            });
        });

        // ===== USER PROFILE - FIX #5 =====
        
        const userProfileBtn = document.getElementById('userProfileBtn');
        const userDropdown = document.getElementById('userDropdown');
        
        userProfileBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown?.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-profile-wrapper')) {
                userDropdown?.classList.add('hidden');
            }
        });

        // Dropdown items
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
            this.showHelpModal();
        });

        document.getElementById('dropdownLogout')?.addEventListener('click', () => {
            userDropdown?.classList.add('hidden');
            this.showToast('Sign out not implemented yet', 'info');
        });

        // ===== NOTIFICATIONS - FIX #7 =====
        
        const notificationsBtn = document.getElementById('notificationsBtn');
        const notificationsPanel = document.getElementById('notificationsPanel');
        
        notificationsBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationsPanel?.classList.toggle('hidden');
        });

        document.getElementById('closeNotifications')?.addEventListener('click', () => {
            notificationsPanel?.classList.add('hidden');
        });

        // Close notifications when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notifications-panel') && !e.target.closest('.notifications-btn')) {
                notificationsPanel?.classList.add('hidden');
            }
        });

        // ===== HELP MODAL =====
        
        document.getElementById('closeHelpModal')?.addEventListener('click', () => {
            this.hideModal('helpModal');
        });

        // ===== MOBILE MENU =====
        
        document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
            this.toggleSidebar();
        });

        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            this.toggleSidebar();
        });

        // ===== MODAL OVERLAYS =====
        
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => {
                this.hideAllModals();
            });
        });

        // ===== CHAT =====
        
        const chatInput = document.getElementById('chatInput');
        const chatSendBtn = document.getElementById('chatSendBtn');

        chatSendBtn?.addEventListener('click', () => {
            this.sendChatMessage();
        });

        chatInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        });

        // Auto-resize chat input
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

        // ===== KEYBOARD SHORTCUTS =====
        
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // ===== WINDOW EVENTS =====
        
        window.addEventListener('online', () => {
            this.showToast('Back online', 'success');
        });

        window.addEventListener('offline', () => {
            this.showToast('You are offline', 'warning');
        });

        console.log('✅ All event listeners attached');
    }

    /**
     * Show Dashboard View - FIX #2
     */
    showDashboardView() {
        this.currentView = 'dashboard';
        this.currentTool = null;

        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        
        // Show dashboard
        const dashboardView = document.getElementById('dashboardView');
        if (dashboardView) {
            dashboardView.classList.remove('hidden');
            dashboardView.classList.add('active');
        }

        // Update navigation
        this.updateNavigation('dashboardBtn');

        // Update header
        this.updateHeader('Operations Dashboard', 'Overview of inventory, fleet, and recent activity');

        // Hide tool action buttons
        this.toggleHeaderToolButtons(false);

        console.log('📊 Dashboard view shown');
    }

    /**
     * Show Chat Interface - FIX #3
     */
    showChatInterface() {
        this.currentView = 'chat';
        this.currentTool = null;

        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        
        // Show chat
        const chatInterface = document.getElementById('chatInterface');
        if (chatInterface) {
            chatInterface.classList.remove('hidden');
            chatInterface.classList.add('active');
        }

        // Update navigation
        this.updateNavigation('newChatBtn');

        // Update header
        this.updateHeader('AI Assistant', 'Ask me anything about your operations');

        // Hide tool action buttons
        this.toggleHeaderToolButtons(false);

        // Focus input
        setTimeout(() => {
            document.getElementById('chatInput')?.focus();
        }, 100);

        console.log('💬 Chat interface shown');
    }

    /**
     * Show Analytics View - FIX #6
     */
    showAnalyticsView() {
        this.currentView = 'analytics';
        this.currentTool = null;

        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        
        // Show analytics
        const analyticsView = document.getElementById('analyticsView');
        if (analyticsView) {
            analyticsView.classList.remove('hidden');
            analyticsView.classList.add('active');
        }

        // Update navigation
        this.updateNavigation('analyticsBtn');

        // Update header
        this.updateHeader('Analytics', 'Performance metrics and insights');

        // Hide tool action buttons
        this.toggleHeaderToolButtons(false);

        console.log('📈 Analytics view shown');
    }

    /**
     * Open a tool in iframe
     */
    async openTool(toolId) {
        console.log(`🔧 Opening tool: ${toolId}`);

        const tool = this.config.services?.[toolId];
        if (!tool) {
            this.showToast(`Tool "${toolId}" not found in configuration`, 'error');
            return;
        }

        if (!tool.url || tool.url === '' || tool.url.includes('YOUR_')) {
            this.showToast('Tool not configured. Please set the URL in Settings.', 'warning');
            this.showSettingsModal();
            return;
        }

        this.currentTool = toolId;
        this.currentView = 'tool';

        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        
        // Show tool container
        const toolContainer = document.getElementById('toolContainer');
        if (toolContainer) {
            toolContainer.classList.remove('hidden');
            toolContainer.classList.add('active');
        }

        // Update tool info
        const toolIcon = document.getElementById('toolIcon');
        const toolTitle = document.getElementById('toolTitle');
        const toolDescription = document.getElementById('toolDescription');
        
        if (toolIcon) toolIcon.textContent = tool.icon || '🔧';
        if (toolTitle) toolTitle.textContent = tool.name || toolId;
        if (toolDescription) toolDescription.textContent = tool.description || '';

        // Update header
        this.updateHeader(tool.name || toolId, tool.description || '');
        this.toggleHeaderToolButtons(true);

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-tool="${toolId}"]`)?.classList.add('active');

        // Load in iframe
        this.loadToolInIframe(tool.url);
    }

    /**
     * Load tool URL in iframe with error handling
     */
    loadToolInIframe(url) {
        const iframe = document.getElementById('toolIframe');
        const loading = document.querySelector('.tool-loading');

        if (!iframe) return;

        loading.style.display = 'flex';
        let hasLoaded = false;

        const onLoad = () => {
            hasLoaded = true;
            loading.style.display = 'none';
            iframe.removeEventListener('load', onLoad);
        };

        iframe.addEventListener('load', onLoad);

        const showError = () => {
            loading.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
                    <h3 style="margin-bottom: 1rem;">Cannot Load in Frame</h3>
                    <p style="margin-bottom: 1.5rem; max-width: 400px; margin: 0 auto 1.5rem;">
                        This tool cannot be embedded due to security restrictions.
                    </p>
                    <button onclick="window.open('${url}', '_blank')" class="btn btn-primary" style="margin-right: 0.5rem;">
                        ↗️ Open in New Tab
                    </button>
                    <button onclick="window.app.showDashboardView()" class="btn btn-secondary">
                        ← Back
                    </button>
                </div>
            `;
        };

        iframe.src = url;

        // Timeout fallback for X-Frame-Options issues
        setTimeout(() => {
            if (!hasLoaded) {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (!iframeDoc || iframeDoc.body === null) {
                        showError();
                    }
                } catch (e) {
                    if (e.name === 'SecurityError') {
                        // Cross-origin loaded successfully
                        hasLoaded = true;
                        loading.style.display = 'none';
                    } else {
                        showError();
                    }
                }
            }
        }, 3000);
    }

    /**
     * Refresh current tool
     */
    refreshCurrentTool() {
        if (this.currentTool) {
            const tool = this.config.services?.[this.currentTool];
            if (tool?.url) {
                this.loadToolInIframe(tool.url);
                this.showToast('Refreshing...', 'info');
            }
        }
    }

    /**
     * Toggle tool fullscreen
     */
    toggleToolFullscreen() {
        const container = document.getElementById('toolContainer');
        if (!container) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            container.requestFullscreen?.();
        }
    }

    /**
     * Update navigation active state
     */
    updateNavigation(activeId) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.getElementById(activeId)?.classList.add('active');
    }

    /**
     * Update header title and subtitle
     */
    updateHeader(title, subtitle) {
        const pageTitle = document.getElementById('pageTitle');
        const pageSubtitle = document.getElementById('pageSubtitle');
        
        if (pageTitle) pageTitle.textContent = title;
        if (pageSubtitle) pageSubtitle.textContent = subtitle;
    }

    /**
     * Toggle header tool action buttons
     */
    toggleHeaderToolButtons(show) {
        const backBtn = document.getElementById('headerBackBtn');
        const refreshBtn = document.getElementById('headerRefreshBtn');
        const fullscreenBtn = document.getElementById('headerFullscreenBtn');

        if (backBtn) backBtn.style.display = show ? 'flex' : 'none';
        if (refreshBtn) refreshBtn.style.display = show ? 'flex' : 'none';
        if (fullscreenBtn) fullscreenBtn.style.display = show ? 'flex' : 'none';
    }

    /**
     * Send chat message
     */
    sendChatMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput?.value?.trim();

        if (!message) return;

        // Add user message
        this.addChatMessage(message, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Process with chat manager or fallback
        if (this.chat?.sendMessage) {
            this.chat.sendMessage(message);
        } else {
            // Fallback response
            setTimeout(() => {
                this.addChatMessage("I'm here to help! This is a placeholder response. Configure your Claude API key in Settings to enable AI responses.", 'assistant');
            }, 500);
        }
    }

    /**
     * Add message to chat
     */
    addChatMessage(text, role) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        // Remove welcome message if it exists
        const welcome = chatMessages.querySelector('.chat-welcome');
        if (welcome) welcome.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;
        messageDiv.innerHTML = `
            <div class="message-avatar">${role === 'user' ? '👤' : '🌱'}</div>
            <div class="message-content">${this.escapeHtml(text)}</div>
        `;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
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
     * Show settings modal
     */
    showSettingsModal() {
        // Populate current values
        const settings = this.config;
        
        document.getElementById('darkMode').checked = document.body.dataset.theme === 'dark';
        document.getElementById('enableAppleOverseer').checked = settings.enableAppleOverseer !== false;
        document.getElementById('enableDeconstructionSkill').checked = settings.enableDeconstructionSkill !== false;
        document.getElementById('enableForwardThinkerSkill').checked = settings.enableForwardThinkerSkill !== false;

        // Tool URLs
        if (settings.services) {
            document.getElementById('inventoryUrl').value = settings.services.inventory?.url || '';
            document.getElementById('gradingUrl').value = settings.services.grading?.url || '';
            document.getElementById('schedulerUrl').value = settings.services.scheduler?.url || '';
            document.getElementById('toolsUrl').value = settings.services.tools?.url || '';
            document.getElementById('chessmapUrl').value = settings.services.chessmap?.url || '';
        }

        // API keys (from localStorage)
        document.getElementById('claudeApiKey').value = localStorage.getItem('claudeApiKey') || '';
        document.getElementById('openaiApiKey').value = localStorage.getItem('openaiApiKey') || '';

        this.showModal('settingsModal');
    }

    /**
     * Show help modal
     */
    showHelpModal() {
        this.showModal('helpModal');
    }

    /**
     * Save settings
     */
    async saveSettings() {
        const settings = {
            services: {
                inventory: { ...this.config.services?.inventory, url: document.getElementById('inventoryUrl').value },
                grading: { ...this.config.services?.grading, url: document.getElementById('gradingUrl').value },
                scheduler: { ...this.config.services?.scheduler, url: document.getElementById('schedulerUrl').value },
                tools: { ...this.config.services?.tools, url: document.getElementById('toolsUrl').value },
                chessmap: { ...this.config.services?.chessmap, url: document.getElementById('chessmapUrl').value }
            },
            darkMode: document.getElementById('darkMode').checked,
            enableAppleOverseer: document.getElementById('enableAppleOverseer').checked,
            enableDeconstructionSkill: document.getElementById('enableDeconstructionSkill').checked,
            enableForwardThinkerSkill: document.getElementById('enableForwardThinkerSkill').checked
        };

        // Save API keys
        const claudeKey = document.getElementById('claudeApiKey').value.trim();
        const openaiKey = document.getElementById('openaiApiKey').value.trim();
        
        if (claudeKey) localStorage.setItem('claudeApiKey', claudeKey);
        if (openaiKey) localStorage.setItem('openaiApiKey', openaiKey);

        // Save to localStorage
        localStorage.setItem('dashboardSettings', JSON.stringify(settings));
        
        // Save individual URLs
        Object.keys(settings.services).forEach(key => {
            if (settings.services[key].url) {
                localStorage.setItem(`${key}Url`, settings.services[key].url);
            }
        });

        // Apply theme
        if (settings.darkMode) {
            document.body.dataset.theme = 'dark';
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.dataset.theme = 'light';
            localStorage.setItem('theme', 'light');
        }

        // Update config
        this.config = { ...this.config, ...settings };

        // Reinitialize skills
        await this.initializeSkills();

        this.hideModal('settingsModal');
        this.showToast('Settings saved!', 'success');
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const currentTheme = document.body.dataset.theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        
        this.showToast(`${newTheme === 'dark' ? '🌙' : '☀️'} ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode enabled`, 'success');
    }

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const app = document.getElementById('app');
        
        sidebar?.classList.toggle('collapsed');
        app?.classList.toggle('sidebar-collapsed');
    }

    /**
     * Show modal
     */
    showModal(modalId) {
        document.getElementById(modalId)?.classList.remove('hidden');
    }

    /**
     * Hide modal
     */
    hideModal(modalId) {
        document.getElementById(modalId)?.classList.add('hidden');
    }

    /**
     * Hide all modals
     */
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

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

        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    /**
     * Show welcome toast
     */
    showWelcomeToast() {
        const skillsEnabled = [];
        if (this.deconstructionSkill) skillsEnabled.push('Query Analysis');
        if (this.forwardThinkerSkill) skillsEnabled.push('Predictive AI');
        if (this.appleOverseer) skillsEnabled.push('Quality Control');

        if (skillsEnabled.length > 0) {
            this.showToast(`AI Skills: ${skillsEnabled.join(', ')}`, 'success');
        } else {
            this.showToast('Welcome to Deep Roots Dashboard!', 'success');
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + / : Focus chat
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            this.showChatInterface();
        }

        // Ctrl/Cmd + K : Command palette (future)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.showToast('Command palette coming soon!', 'info');
        }

        // Escape: Close modals or go back
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal:not(.hidden)');
            if (openModal) {
                this.hideAllModals();
            } else if (this.currentView === 'tool') {
                this.showDashboardView();
            }
        }

        // Number keys 1-5 for quick tool access (when not in chat input)
        if (!e.target.matches('input, textarea')) {
            const toolKeys = { '1': 'inventory', '2': 'grading', '3': 'scheduler', '4': 'tools', '5': 'chessmap' };
            if (toolKeys[e.key]) {
                e.preventDefault();
                this.openTool(toolKeys[e.key]);
            }
        }
    }

    /**
     * Start proactive suggestions
     */
    startProactiveSuggestions() {
        if (!this.forwardThinkerSkill || !this.config.enableForwardThinkerSkill) return;

        setInterval(() => {
            const currentState = {
                lowInventory: false,
                upcomingDeadlines: false
            };

            const suggestions = this.forwardThinkerSkill.generateProactiveSuggestions?.(currentState);
            if (suggestions?.success && suggestions.suggestions?.length > 0) {
                this.showProactiveSuggestion(suggestions.suggestions[0]);
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    /**
     * Show proactive suggestion
     */
    showProactiveSuggestion(suggestion) {
        this.showToast(`💡 ${suggestion.title}: ${suggestion.description}`, 'info');
    }

    /**
     * Show loading screen
     */
    showLoadingScreen(show) {
        const loading = document.getElementById('loadingScreen');
        const app = document.getElementById('app');

        if (show) {
            if (loading) loading.style.display = 'flex';
        } else {
            if (loading) {
                loading.style.opacity = '0';
                loading.style.pointerEvents = 'none';
                setTimeout(() => loading.style.display = 'none', 500);
            }
            if (app) {
                app.classList.remove('hidden');
                app.style.opacity = '1';
            }
        }
    }

    /**
     * Handle initialization error
     */
    handleInitializationError(error) {
        const loading = document.getElementById('loadingScreen');
        if (loading) {
            loading.innerHTML = `
                <div class="loading-content" style="text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                    <h2>Failed to Load</h2>
                    <p style="margin: 1rem 0; opacity: 0.8;">${error.message || 'Unknown error'}</p>
                    <button onclick="location.reload()" class="btn btn-primary">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }

    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            app: { name: "Deep Roots Operations Dashboard", version: "2.0.0" },
            services: {
                inventory: { name: "Inventory Management", icon: "🌱", url: "", description: "Manage plant inventory and stock levels" },
                grading: { name: "Grade & Sell", icon: "⭐", url: "", description: "Plant quality assessment and pricing" },
                scheduler: { name: "Crew Scheduler", icon: "📅", url: "", description: "Manage crews and job schedules" },
                tools: { name: "Tool Checkout", icon: "🔧", url: "", description: "Track tool rentals and checkouts" },
                chessmap: { name: "Logistics Map", icon: "🗺️", url: "", description: "View job locations and routes" }
            },
            enableAppleOverseer: true,
            enableDeconstructionSkill: true,
            enableForwardThinkerSkill: true
        };
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.dataset.theme = savedTheme;
    }

    // Create app instance
    window.app = new DashboardApp();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardApp;
}
