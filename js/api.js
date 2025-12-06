/**
 * API Manager - Handles all external API calls
 */
class APIManager {
    constructor() {
        this.endpoints = {};
        this.claudeApiKey = null;
        this.openaiApiKey = null;
    }

    init() {
        this.claudeApiKey = localStorage.getItem('claudeApiKey');
        this.openaiApiKey = localStorage.getItem('openaiApiKey');
        console.log('✅ API Manager initialized');
    }

    /**
     * Call Claude API
     */
    async callClaude(messages, options = {}) {
        if (!this.claudeApiKey) {
            throw new Error('Claude API key not configured');
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.claudeApiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: options.model || 'claude-3-sonnet-20240229',
                max_tokens: options.maxTokens || 1024,
                messages: messages
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Call Google Apps Script endpoint
     */
    async callGAS(url, payload = {}) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`GAS error: ${response.status}`);
            }

            return response.json();
        } catch (error) {
            console.error('GAS call failed:', error);
            throw error;
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIManager;
}
