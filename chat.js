/**
 * Chat Manager - Handles chat interface and AI interactions
 */
class ChatManager {
    constructor() {
        this.messages = [];
        this.isProcessing = false;
        this.skills = {};
    }

    init() {
        this.setupInputListeners();
        console.log('✅ Chat Manager initialized');
    }

    setupInputListeners() {
        // Input listeners are handled by app.js
    }

    initializeSkills(config) {
        this.skills = {
            deconstruction: config?.enableDeconstructionSkill !== false,
            forwardThinker: config?.enableForwardThinkerSkill !== false,
            overseer: config?.enableAppleOverseer !== false
        };
    }

    async sendMessage(text) {
        if (!text || this.isProcessing) return;

        this.isProcessing = true;

        // Add user message
        this.messages.push({ role: 'user', content: text });
        this.addMessageToUI(text, 'user');

        try {
            // Try to call Claude API
            const apiKey = localStorage.getItem('claudeApiKey');
            
            if (apiKey) {
                const response = await this.callClaudeAPI(text, apiKey);
                this.addMessageToUI(response, 'assistant');
            } else {
                // Fallback response
                const fallback = this.getFallbackResponse(text);
                this.addMessageToUI(fallback, 'assistant');
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.addMessageToUI('Sorry, I encountered an error. Please check your API key in Settings.', 'assistant');
        }

        this.isProcessing = false;
    }

    async callClaudeAPI(text, apiKey) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1024,
                system: 'You are a helpful assistant for Deep Roots Landscape operations. Help with inventory, scheduling, tool checkout, and plant grading questions.',
                messages: [{ role: 'user', content: text }]
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0]?.text || 'No response received.';
    }

    getFallbackResponse(text) {
        const lower = text.toLowerCase();
        
        if (lower.includes('inventory') || lower.includes('plant')) {
            return "I can help with inventory questions! Open the Inventory tool to search plants, check stock levels, or manage equipment. Would you like me to open it for you?";
        }
        
        if (lower.includes('schedule') || lower.includes('crew')) {
            return "For scheduling questions, use the Crew Scheduler tool. You can assign crews to jobs, view today's schedule, and manage task assignments.";
        }
        
        if (lower.includes('tool') || lower.includes('checkout')) {
            return "The Tool Checkout system tracks equipment rentals. You can check tools in/out, see what's currently out, and track usage history.";
        }
        
        if (lower.includes('grade') || lower.includes('sell') || lower.includes('price')) {
            return "Use the Grade & Sell tool to assess plant quality and determine pricing. It helps with making sell/hold decisions based on plant condition.";
        }

        return "I'm here to help with Deep Roots operations! You can ask me about:\n\n🌱 Inventory & plant stock\n📅 Crew scheduling\n🔧 Tool checkout\n⭐ Plant grading\n\nOr configure your Claude API key in Settings for smarter responses.";
    }

    addMessageToUI(text, role) {
        if (window.app?.addChatMessage) {
            window.app.addChatMessage(text, role);
        }
    }

    addMessage(text, role) {
        this.addMessageToUI(text, role);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatManager;
}
