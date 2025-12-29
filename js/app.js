/**
 * Deep Roots Dashboard - Consolidated Application
 * Version: 2.2.0 (Production Secure)
 * 
 * This single file contains all dashboard functionality.
 * No external JS dependencies required.
 * API keys are stored server-side in Netlify environment variables.
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
    // INJECT ADDITIONAL CSS
    // ============================================
    const additionalCSS = `
        .chat-message.typing .typing-dots {
            display: inline-flex;
            gap: 4px;
        }
        .chat-message.typing .typing-dots span {
            animation: typingBounce 1.4s infinite ease-in-out both;
            font-size: 24px;
            line-height: 1;
        }
        .chat-message.typing .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .chat-message.typing .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
        .chat-message.typing .typing-dots span:nth-child(3) { animation-delay: 0s; }
        @keyframes typingBounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40% { transform: translateY(-6px); opacity: 1; }
        }
        .message-content {
            white-space: pre-wrap;
            line-height: 1.6;
        }
        .message-content strong, .message-content b {
            font-weight: 600;
        }
        .message-content em, .message-content i {
            font-style: italic;
        }
        .message-content code {
            background: rgba(0,0,0,0.08);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9em;
        }
        .message-content ul {
            margin: 8px 0;
            padding-left: 20px;
        }
        .message-content li {
            margin: 4px 0;
        }
        [data-theme="dark"] .message-content code {
            background: rgba(255,255,255,0.1);
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = additionalCSS;
    document.head.appendChild(styleSheet);

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
        async loadHeroStats() {
            // Get API URL from config or use default
            const apiUrl = this.config?.apiUrl || localStorage.getItem('apiUrl') || 'https://script.google.com/macros/s/AKfycbxWHqo7-YySZyMKrGTQMcnhhEtg4s_p57o5XhP-9tmxU8aSEBDvQ1CKq1l52I1Te6MneQ/exec';

            // Default stats (used as fallback)
            let stats = {
                statInventoryCount: '...',
                statFleetCount: '...',
                statJobsCount: '...',
                statToolsOut: this.getToolsCheckedOutCount()
            };

            // Set initial values (loading state)
            Object.entries(stats).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            });

            // Fetch live data from API
            if (apiUrl) {
                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain' },
                        body: JSON.stringify({ action: 'getDashboardStats' }),
                        redirect: 'follow'
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.stats) {
                            const apiStats = data.stats;
                            stats.statInventoryCount = apiStats.inventoryCount || 0;
                            stats.statFleetCount = apiStats.fleetCount || 0;
                            stats.statJobsCount = apiStats.jobsCount || 0;
                            log('Live stats loaded from API', 'success');
                        }
                    }
                } catch (error) {
                    log(`Error fetching live stats: ${error.message}`, 'warning');
                }
            }

            // Tools checked out from localStorage (hand-tool-checkout)
            stats.statToolsOut = this.getToolsCheckedOutCount();

            // Update DOM with final values
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

        /**
         * Count tools checked out from hand-tool-checkout localStorage
         * Key format: handtools_YYYY-MM-DD
         */
        getToolsCheckedOutCount() {
            try {
                const today = new Date().toISOString().split('T')[0];
                const storageKey = `handtools_${today}`;
                const stored = localStorage.getItem(storageKey);

                if (stored) {
                    const data = JSON.parse(stored);
                    const tools = data.tools || [];
                    // Count tools where crewId is set (checked out)
                    return tools.filter(t => t.crewId && t.crewId !== 'OUT_OF_SERVICE').length;
                }
                return 0;
            } catch (error) {
                log('Error counting checked out tools: ' + error.message, 'warning');
                return 0;
            }
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
        async sendChatMessage() {
            const input = document.getElementById('chatInput');
            const message = input?.value?.trim();
            
            if (!message) return;
            
            this.addChatMessage(message, 'user');
            input.value = '';
            input.style.height = 'auto';
            
            // Add to conversation history
            if (!this.conversationHistory) {
                this.conversationHistory = [];
            }
            this.conversationHistory.push({ role: 'user', content: message });
            
            // Call secure backend API
            await this.callChatAPI(message);
        }

        async callChatAPI(message) {
            // Show typing indicator
            const typingId = this.showTypingIndicator();
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: message,
                        conversationHistory: this.conversationHistory?.slice(-10) || []
                    })
                });

                this.removeTypingIndicator(typingId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Chat API error:', response.status, errorData);
                    
                    if (response.status === 429) {
                        this.addChatMessage('⏳ Too many requests. Please wait a moment and try again.', 'assistant');
                    } else if (response.status === 503) {
                        this.addChatMessage('🔄 AI service is temporarily busy. Please try again in a few seconds.', 'assistant');
                    } else {
                        // Fall back to local response on server errors
                        const fallback = this.generateResponse(message);
                        this.addChatMessage(fallback, 'assistant');
                    }
                    return;
                }

                const data = await response.json();
                
                if (data.success && data.message) {
                    this.addChatMessage(data.message, 'assistant');
                    
                    // Add to conversation history
                    this.conversationHistory.push({ role: 'assistant', content: data.message });
                    
                    // Keep history manageable
                    if (this.conversationHistory.length > 20) {
                        this.conversationHistory = this.conversationHistory.slice(-20);
                    }
                } else {
                    const fallback = this.generateResponse(message);
                    this.addChatMessage(fallback, 'assistant');
                }

            } catch (error) {
                console.error('Chat API call failed:', error);
                this.removeTypingIndicator(typingId);
                
                // Fall back to local response on network errors
                const fallback = this.generateResponse(message);
                this.addChatMessage(fallback + '\n\n_(Offline mode - connection error)_', 'assistant');
            }
        }

        showTypingIndicator() {
            const container = document.getElementById('chatMessages');
            if (!container) return null;
            
            const id = 'typing-' + Date.now();
            const div = document.createElement('div');
            div.id = id;
            div.className = 'chat-message assistant typing';
            div.innerHTML = `
                <div class="message-avatar">🌱</div>
                <div class="message-content">
                    <span class="typing-dots">
                        <span>.</span><span>.</span><span>.</span>
                    </span>
                </div>
            `;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
            return id;
        }

        removeTypingIndicator(id) {
            if (id) {
                document.getElementById(id)?.remove();
            }
        }

        generateResponse(text) {
            const lower = text.toLowerCase();
            
            // ============================================
            // STEP 1: Detect intent type
            // ============================================
            const isHowToQuestion = /^(how|what|which|when|where|why|can i|should i|do i|best way|tips|advice)/i.test(text.trim());
            const isStatusQuestion = /(status|checked out|how many|count|current|today's|this week)/i.test(lower);
            const isSystemNavigation = /(open|go to|show me|take me|launch|start)/i.test(lower);
            
            // ============================================
            // STEP 2: Landscaping Knowledge Base
            // ============================================
            const landscapingKnowledge = {
                // Sod & Turf
                sod: {
                    keywords: ['sod', 'turf', 'lawn', 'grass'],
                    tools: "For laying sod, you'll need:\n• Sod cutter or flat shovel (for removing old grass)\n• Rototiller (for soil prep)\n• Landscape rake (for leveling)\n• Lawn roller (for pressing sod)\n• Sharp knife or sod knife (for cutting/fitting)\n• Wheelbarrow (for moving sod)\n• Sprinkler or hose (for watering immediately after)",
                    tips: "💡 Tips: Lay sod within 24 hours of delivery. Stagger seams like brickwork. Water immediately and keep moist for 2 weeks."
                },
                // Mulching
                mulch: {
                    keywords: ['mulch', 'mulching'],
                    tools: "For mulching, you'll need:\n• Wheelbarrow or garden cart\n• Pitchfork or mulch fork\n• Hard rake (for spreading)\n• Landscape edger (for clean edges)\n• Gloves\n• Measuring tape (2-4\" depth typical)",
                    tips: "💡 Tips: Keep mulch 2-3\" away from tree trunks. Apply 2-4\" depth. Refresh annually."
                },
                // Planting
                planting: {
                    keywords: ['plant', 'planting', 'transplant', 'install'],
                    tools: "For planting, you'll need:\n• Shovel or spade\n• Post hole digger (for deep holes)\n• Hand trowel (for small plants)\n• Garden fork (for loosening soil)\n• Pruning shears (for root prep)\n• Hose with adjustable nozzle\n• Wheelbarrow\n• Compost/amendments",
                    tips: "💡 Tips: Dig hole 2x wider than root ball. Plant at same depth as container. Water thoroughly after planting."
                },
                // Irrigation
                irrigation: {
                    keywords: ['irrigation', 'sprinkler', 'drip', 'watering system'],
                    tools: "For irrigation installation:\n• Trencher or trenching shovel\n• PVC pipe cutter\n• PVC primer and cement\n• Teflon tape\n• Wire strippers (for valve wiring)\n• Multimeter (for testing)\n• Pipe fittings and heads\n• Backflow preventer",
                    tips: "💡 Tips: Check local codes for backflow requirements. Test coverage before burying lines."
                },
                // Hardscape
                hardscape: {
                    keywords: ['paver', 'patio', 'walkway', 'retaining wall', 'hardscape', 'stone', 'brick'],
                    tools: "For hardscaping:\n• Plate compactor (for base)\n• Rubber mallet\n• String line and stakes\n• 4ft level\n• Hand tamper\n• Masonry saw or wet saw\n• Paver sand and base material\n• Polymeric sand (for joints)\n• Safety glasses and gloves",
                    tips: "💡 Tips: Compact base in 2\" lifts. Slope away from structures (1/4\" per foot). Use edge restraints."
                },
                // Tree work
                tree: {
                    keywords: ['tree', 'pruning', 'trimming', 'removal'],
                    tools: "For tree work:\n• Hand pruners (up to 3/4\")\n• Loppers (3/4\" to 2\")\n• Pruning saw (larger branches)\n• Pole pruner (high branches)\n• Chainsaw (large limbs/removal)\n• Safety harness and helmet\n• Wood chipper (for debris)",
                    tips: "💡 Tips: Never remove more than 25% of canopy. Cut outside branch collar. Avoid topping trees."
                },
                // Grading & Drainage
                grading: {
                    keywords: ['grade', 'grading', 'drainage', 'slope', 'erosion', 'french drain'],
                    tools: "For grading and drainage:\n• Skid steer or mini excavator\n• Laser level or transit\n• Grade stakes and string\n• Landscape rake\n• Plate compactor\n• Drain pipe and fittings\n• Gravel and filter fabric",
                    tips: "💡 Tips: Grade away from structures at 2% minimum. French drains need 1% slope to outlet."
                },
                // Edging
                edging: {
                    keywords: ['edge', 'edging', 'border', 'bed edge'],
                    tools: "For edging:\n• Manual edger or power edger\n• Half-moon edger (for beds)\n• String trimmer (maintenance)\n• Flat shovel\n• Rubber mallet (for plastic edging)\n• Stakes (for edging material)",
                    tips: "💡 Tips: Edge beds at 45° angle. Keep 3-4\" depth. Re-cut edges 2-3 times per season."
                },
                // Leaf/debris cleanup
                cleanup: {
                    keywords: ['leaf', 'leaves', 'cleanup', 'clean up', 'debris', 'fall'],
                    tools: "For cleanup:\n• Backpack blower\n• Leaf rake or spring rake\n• Tarp (for hauling)\n• Lawn vacuum or bagger\n• Trailer or truck\n• Gutter scoop (for gutters)",
                    tips: "💡 Tips: Blow toward trailer. Mulch leaves into lawn when light. Clean gutters after leaf drop."
                },
                // Fertilizing
                fertilize: {
                    keywords: ['fertiliz', 'feed', 'nutrient', 'lime', 'soil test'],
                    tools: "For fertilizing:\n• Broadcast spreader (large areas)\n• Drop spreader (precise application)\n• Handheld spreader (small areas)\n• Sprayer (liquid fertilizer)\n• Soil test kit\n• Calibration cups",
                    tips: "💡 Tips: Always calibrate spreaders. Water in after application. Follow soil test recommendations."
                },
                // Seeding
                seed: {
                    keywords: ['seed', 'seeding', 'overseed', 'reseed'],
                    tools: "For seeding:\n• Dethatcher or power rake\n• Core aerator\n• Broadcast spreader\n• Lawn roller (light)\n• Starter fertilizer\n• Straw or seed blanket\n• Sprinkler system",
                    tips: "💡 Tips: Best in fall (cool-season) or late spring (warm-season). Keep consistently moist until established."
                }
            };
            
            // ============================================
            // STEP 3: Check for landscaping knowledge match
            // ============================================
            for (const [topic, data] of Object.entries(landscapingKnowledge)) {
                if (data.keywords.some(kw => lower.includes(kw))) {
                    // If it's a how-to question about this topic
                    if (isHowToQuestion || lower.includes('tool') || lower.includes('need') || lower.includes('use')) {
                        return `🛠️ **${topic.charAt(0).toUpperCase() + topic.slice(1)} Tools & Equipment**\n\n${data.tools}\n\n${data.tips}`;
                    }
                }
            }
            
            // ============================================
            // STEP 4: System/Dashboard queries (status checks)
            // ============================================
            
            // Inventory STATUS (not general plant questions)
            if ((isStatusQuestion || isSystemNavigation) && (lower.includes('inventory') || lower.includes('stock'))) {
                return "📦 **Inventory Status**\nYou currently have 247 plant varieties in stock.\n\n→ Open the Inventory Management tool to search plants, check quantities, and manage stock levels.";
            }
            
            // Schedule STATUS
            if ((isStatusQuestion || isSystemNavigation) && (lower.includes('schedule') || lower.includes('crew') || lower.includes('job'))) {
                return "📅 **Schedule Status**\nYou have 23 jobs scheduled this week.\n\n→ Open the Crew Scheduler to view assignments, manage crews, and track job progress.";
            }
            
            // Tool checkout STATUS (not "what tools do I need")
            if (isStatusQuestion && (lower.includes('checked out') || lower.includes('checkout'))) {
                return "🔧 **Tool Checkout Status**\nCurrently 14 tools are checked out.\n\n→ Open Tool Checkout to see who has what equipment and manage check-ins/outs.";
            }
            
            // Equipment tracking
            if (isSystemNavigation && lower.includes('equipment')) {
                return "🔧 **Equipment Tracking**\n→ Open Tool Checkout to track equipment, manage check-ins/outs, and see tool availability.";
            }
            
            // Grading STATUS
            if ((isStatusQuestion || isSystemNavigation) && (lower.includes('grade') || lower.includes('grading') || lower.includes('quality'))) {
                return "⭐ **Grading Status**\n12 plants were graded yesterday.\n\n→ Open Grade & Sell to assess plant quality, set pricing, and manage inventory grades.";
            }
            
            // ============================================
            // STEP 5: General help
            // ============================================
            if (lower.includes('help') || lower.includes('what can you')) {
                return `🌱 **I can help with two types of questions:**

**Landscaping Knowledge:**
• "What tools do I need to lay sod?"
• "How do I install pavers?"
• "Best way to prep soil for planting?"
• "Tips for mulching around trees?"

**Dashboard & Operations:**
• "What's our inventory status?"
• "Show me today's schedule"
• "Which tools are checked out?"
• "Open the crew scheduler"

Just ask naturally and I'll do my best to help!`;
            }
            
            // ============================================
            // STEP 6: Fallback with helpful suggestion
            // ============================================
            return `🌱 I can help with landscaping questions (tools, techniques, best practices) or dashboard operations (inventory, scheduling, tool checkout).

**Try asking:**
• "What tools do I need for [task]?"
• "How do I [landscaping task]?"
• "What's our inventory status?"
• "Show today's schedule"`;
        }

        addChatMessage(text, role) {
            const container = document.getElementById('chatMessages');
            if (!container) return;
            
            // Remove welcome message if present
            const welcome = container.querySelector('.chat-welcome');
            if (welcome) welcome.remove();
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${role}`;
            
            // Format the message with basic markdown support
            const formattedText = this.formatMessage(text);
            
            messageDiv.innerHTML = `
                <div class="message-avatar">${role === 'user' ? '👤' : '🌱'}</div>
                <div class="message-content">${formattedText}</div>
            `;
            
            container.appendChild(messageDiv);
            container.scrollTop = container.scrollHeight;
        }

        formatMessage(text) {
            // First escape HTML to prevent XSS
            let formatted = this.escapeHtml(text);
            
            // Then apply markdown-like formatting
            // Bold: **text** or __text__
            formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');
            
            // Italic: *text* or _text_
            formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
            
            // Code: `text`
            formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
            
            // Bullet points: • or - at start of line
            formatted = formatted.replace(/^[•\-]\s+(.+)$/gm, '<li>$1</li>');
            
            // Wrap consecutive <li> in <ul>
            formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
            
            // Line breaks
            formatted = formatted.replace(/\n/g, '<br>');
            
            // Clean up extra <br> inside lists
            formatted = formatted.replace(/<\/li><br>/g, '</li>');
            formatted = formatted.replace(/<ul><br>/g, '<ul>');
            
            return formatted;
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

            // API URL for backend
            const apiUrlEl = document.getElementById('apiUrl');
            if (apiUrlEl) apiUrlEl.value = this.config.apiUrl || localStorage.getItem('apiUrl') || '';

            const fields = {
                'inventoryUrl': services.inventory?.url || '',
                'gradingUrl': services.grading?.url || '',
                'schedulerUrl': services.scheduler?.url || '',
                'toolsUrl': services.tools?.url || '',
                'chessmapUrl': services.chessmap?.url || ''
            };

            Object.entries(fields).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) el.value = value;
            });

            // Work Order Sync settings
            const syncSettings = JSON.parse(localStorage.getItem('workOrderSyncSettings') || '{}');
            const enableSyncEl = document.getElementById('enableWorkOrderSync');
            const sheetUrlEl = document.getElementById('workOrderSyncSheetUrl');
            const syncIntervalEl = document.getElementById('syncInterval');
            const syncSheetUrlContainer = document.getElementById('syncSheetUrlContainer');
            const syncIntervalContainer = document.getElementById('syncIntervalContainer');

            if (enableSyncEl) {
                enableSyncEl.checked = syncSettings.enabled || false;
                // Show/hide additional fields based on toggle state
                if (syncSheetUrlContainer) syncSheetUrlContainer.style.display = syncSettings.enabled ? 'flex' : 'none';
                if (syncIntervalContainer) syncIntervalContainer.style.display = syncSettings.enabled ? 'flex' : 'none';

                // Add listener for toggle changes
                enableSyncEl.onchange = () => {
                    const showFields = enableSyncEl.checked;
                    if (syncSheetUrlContainer) syncSheetUrlContainer.style.display = showFields ? 'flex' : 'none';
                    if (syncIntervalContainer) syncIntervalContainer.style.display = showFields ? 'flex' : 'none';
                };
            }
            if (sheetUrlEl) sheetUrlEl.value = syncSettings.sheetUrl || '';
            if (syncIntervalEl) syncIntervalEl.value = syncSettings.interval || 'manual';

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
            const apiUrl = getValue('apiUrl');

            // Save API URL to localStorage
            localStorage.setItem('apiUrl', apiUrl);
            this.config.apiUrl = apiUrl;

            // Save to localStorage
            localStorage.setItem('dashboardSettings', JSON.stringify({ services, darkMode, apiUrl }));

            Object.keys(services).forEach(key => {
                if (services[key].url) {
                    localStorage.setItem(`${key}Url`, services[key].url);
                }
            });

            // Save Work Order Sync settings
            const workOrderSyncSettings = {
                enabled: document.getElementById('enableWorkOrderSync')?.checked || false,
                sheetUrl: getValue('workOrderSyncSheetUrl'),
                interval: getValue('syncInterval') || 'manual'
            };
            localStorage.setItem('workOrderSyncSettings', JSON.stringify(workOrderSyncSettings));

            // Dispatch event for sync settings change
            if (workOrderSyncSettings.enabled) {
                window.dispatchEvent(new CustomEvent('workOrderSyncSettingsChanged', {
                    detail: workOrderSyncSettings
                }));
                log('Work Order Sync enabled: ' + workOrderSyncSettings.interval);
            }

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
