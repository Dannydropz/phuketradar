/**
 * Maillayer Client for sending transactional emails
 * 
 * Maillayer is a self-hosted email marketing platform that connects to
 * email providers like Amazon SES, SendGrid, or Mailgun.
 * 
 * Required environment variables:
 * - MAILLAYER_API_URL: The base URL of your Maillayer instance (e.g., https://mail.phuketradar.com)
 * - MAILLAYER_API_KEY: The transactional template API key from Maillayer
 * - MAILLAYER_FROM_EMAIL: The sender email address (optional, defaults to newsletter@phuketradar.com)
 * 
 * For Maillayer integration, you need to:
 * 1. Create a transactional template in your Maillayer dashboard
 * 2. The template should have variables: {{subject}}, {{htmlContent}} (or just use raw HTML in body)
 * 3. Copy the API key from the template settings
 */

export interface MaillayerSendResponse {
    success: boolean;
    messageId?: string;
    error?: string;
}

export interface MaillayerEmailOptions {
    to: string;
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
}

/**
 * Send an email using Maillayer's transactional API
 * This uses the standard /api/transactional/send endpoint
 */
export async function sendMaillayerEmail(options: MaillayerEmailOptions): Promise<MaillayerSendResponse> {
    const apiUrl = process.env.MAILLAYER_API_URL;
    const apiKey = process.env.MAILLAYER_API_KEY;

    if (!apiUrl || !apiKey) {
        console.error('❌ Maillayer not configured. Missing MAILLAYER_API_URL or MAILLAYER_API_KEY');
        return {
            success: false,
            error: 'Maillayer not configured'
        };
    }

    try {
        const endpoint = `${apiUrl.replace(/\/$/, '')}/api/transactional/send`;

        console.log(`📤 Maillayer: Sending to ${options.to} via ${endpoint}`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                apiKey,
                to: options.to,
                variables: {
                    subject: options.subject,
                    content: options.html,
                    htmlContent: options.html,
                    body: options.html,
                }
            }),
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
            console.error('❌ Maillayer API error:', data);
            return {
                success: false,
                error: data.error || `HTTP ${response.status}: ${JSON.stringify(data)}`
            };
        }

        console.log(`✅ Maillayer sent successfully:`, data);
        return {
            success: true,
            messageId: data.messageId || data.id
        };
    } catch (error) {
        console.error('❌ Failed to send email via Maillayer:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Send a raw email using Maillayer's email API
 * This attempts to use multiple endpoints for compatibility
 */
export async function sendMaillayerRawEmail(options: MaillayerEmailOptions): Promise<MaillayerSendResponse> {
    const apiUrl = process.env.MAILLAYER_API_URL;
    const apiKey = process.env.MAILLAYER_API_KEY;
    const fromEmail = process.env.MAILLAYER_FROM_EMAIL || 'newsletter@phuketradar.com';

    if (!apiUrl || !apiKey) {
        console.error('❌ Maillayer not configured. Missing MAILLAYER_API_URL or MAILLAYER_API_KEY');
        return {
            success: false,
            error: 'Maillayer not configured'
        };
    }

    const baseUrl = apiUrl.replace(/\/$/, '');

    // Try the transactional send endpoint first (standard Maillayer API)
    try {
        const endpoint = `${baseUrl}/api/transactional/send`;

        console.log(`📤 Maillayer: Sending to ${options.to} via ${endpoint}`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                apiKey,
                to: options.to,
                variables: {
                    subject: options.subject,
                    content: options.html,
                    htmlContent: options.html,
                }
            }),
        });

        const data = await response.json();

        if (response.ok && data.success !== false) {
            console.log(`✅ Maillayer sent successfully via transactional endpoint:`, data);
            return {
                success: true,
                messageId: data.messageId || data.id
            };
        }

        // If transactional endpoint fails, log and try fallback
        console.warn(`⚠️ Maillayer transactional endpoint returned:`, data);

    } catch (error) {
        console.error('⚠️ Maillayer transactional endpoint error:', error);
    }

    // Try alternative endpoint for raw email sending
    try {
        const rawEndpoint = `${baseUrl}/api/email/send`;

        console.log(`📤 Maillayer: Trying raw endpoint ${rawEndpoint}`);

        const response = await fetch(rawEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                to: options.to,
                from: options.from || fromEmail,
                subject: options.subject,
                html: options.html,
                replyTo: options.replyTo,
            }),
        });

        const data = await response.json();

        if (response.ok && data.success !== false) {
            console.log(`✅ Maillayer raw email sent successfully:`, data);
            return {
                success: true,
                messageId: data.messageId || data.id
            };
        }

        console.error('❌ Maillayer raw email endpoint failed:', data);
        return {
            success: false,
            error: data.error || `HTTP ${response.status}`
        };

    } catch (error) {
        console.error('❌ Failed to send raw email via Maillayer:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Check if Maillayer is properly configured
 */
export function isMaillayerConfigured(): boolean {
    return !!(process.env.MAILLAYER_API_URL && process.env.MAILLAYER_API_KEY);
}

/**
 * Get Maillayer configuration status for debugging
 */
export function getMaillayerConfig() {
    return {
        isConfigured: isMaillayerConfigured(),
        apiUrl: process.env.MAILLAYER_API_URL ? '***configured***' : 'NOT SET',
        apiKey: process.env.MAILLAYER_API_KEY ? '***configured***' : 'NOT SET',
        fromEmail: process.env.MAILLAYER_FROM_EMAIL || 'newsletter@phuketradar.com (default)',
    };
}
