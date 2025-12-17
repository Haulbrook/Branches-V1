/**
 * Deep Roots Dashboard - Secure Chat API
 * Netlify Function that proxies requests to Claude API
 * 
 * Environment Variables Required:
 *   CLAUDE_API_KEY - Your Anthropic API key (sk-ant-...)
 */

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Get API key from environment
    const apiKey = process.env.CLAUDE_API_KEY;
    
    if (!apiKey) {
        console.error('CLAUDE_API_KEY environment variable not set');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Server configuration error',
                message: 'API key not configured. Contact administrator.'
            })
        };
    }

    // Parse request body
    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid JSON body' })
        };
    }

    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string') {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Message is required' })
        };
    }

    // Rate limiting check (basic - enhance for production)
    // You could add IP-based rate limiting here with a KV store

    // System prompt for Deep Roots assistant
    const systemPrompt = `You are the AI assistant for Deep Roots Landscape, a professional landscaping and construction company based in Georgia. You help employees and managers with:

## Landscaping Knowledge & Best Practices

You have deep expertise in:
- **Sod & Turf**: Installation, soil prep, watering schedules, varieties (Bermuda, Zoysia, Fescue)
- **Mulching**: Types (hardwood, pine, rubber), depth requirements, bed preparation
- **Planting**: Trees, shrubs, perennials, annuals - proper techniques, spacing, timing
- **Irrigation**: System design, installation, troubleshooting, winterization
- **Hardscaping**: Pavers, retaining walls, patios, drainage solutions, base preparation
- **Tree Care**: Pruning techniques, removal safety, disease identification
- **Grading & Drainage**: French drains, swales, erosion control, slope calculations
- **Lawn Care**: Fertilization schedules, aeration, overseeding, weed control
- **Equipment**: Proper tool selection, maintenance, safety procedures

## Operations Dashboard Context

The user has access to these integrated tools:
- **Inventory Management**: Plant stock, materials, supplies tracking
- **Crew Scheduler**: Job assignments, crew management, daily schedules  
- **Tool Checkout**: Equipment tracking, maintenance logs, accountability
- **Grade & Sell**: Plant quality assessment, pricing, customer quotes
- **Logistics Map**: Job locations, route optimization, service areas

## Response Guidelines

1. Be practical and specific - give actionable advice
2. Include safety considerations when relevant
3. Mention tool/equipment requirements for tasks
4. Reference Georgia climate and conditions when applicable
5. Keep responses concise but thorough
6. Use formatting (bold, lists) for clarity
7. If asked about dashboard operations, guide them to the appropriate tool

You represent Deep Roots professionally. Be helpful, knowledgeable, and efficient.`;

    // Build messages array
    const messages = [
        ...conversationHistory.slice(-10), // Keep last 10 messages for context
        { role: 'user', content: message }
    ];

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1500,
                system: systemPrompt,
                messages: messages
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Claude API error:', response.status, errorData);
            
            // Return appropriate error without exposing internal details
            if (response.status === 401) {
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Authentication error',
                        message: 'Server API configuration issue. Contact administrator.'
                    })
                };
            }
            
            if (response.status === 429) {
                return {
                    statusCode: 429,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Rate limited',
                        message: 'Too many requests. Please wait a moment and try again.'
                    })
                };
            }

            if (response.status === 529) {
                return {
                    statusCode: 503,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Service overloaded',
                        message: 'AI service is temporarily busy. Please try again shortly.'
                    })
                };
            }

            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'API error',
                    message: 'Failed to get response. Please try again.'
                })
            };
        }

        const data = await response.json();
        const assistantMessage = data.content?.[0]?.text || 'Sorry, I could not generate a response.';

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: assistantMessage,
                usage: {
                    input_tokens: data.usage?.input_tokens,
                    output_tokens: data.usage?.output_tokens
                }
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Server error',
                message: 'An unexpected error occurred. Please try again.'
            })
        };
    }
};
