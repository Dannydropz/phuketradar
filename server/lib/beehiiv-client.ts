/**
 * Beehiiv Client
 *
 * Handles all Beehiiv API interactions:
 *  1. Subscriber management (adding subscribers from the website form)
 *  2. Newsletter sending (creating and sending posts via Beehiiv's Posts API)
 *
 * Required environment variables:
 *  - BEEHIIV_API_KEY: From app.beehiiv.com > Settings > Integrations > API
 *  - BEEHIIV_PUBLICATION_ID: From app.beehiiv.com > Settings > Publication (format: pub_xxxxx)
 */

const BEEHIIV_API_BASE = 'https://api.beehiiv.com/v2';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BeehiivResponse {
    success: boolean;
    error?: string;
}

export interface BeehiivSubscribeResponse extends BeehiivResponse {
    subscriberId?: string;
    status?: string;
}

export interface BeehiivPostResponse extends BeehiivResponse {
    postId?: string;
    webUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCredentials(): { apiKey: string; publicationId: string } | null {
    const apiKey = process.env.BEEHIIV_API_KEY;
    const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
    if (!apiKey || !publicationId) return null;
    return { apiKey, publicationId };
}

function authHeaders(apiKey: string) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
    };
}

// ─── Subscriber Management ────────────────────────────────────────────────────

/**
 * Add a subscriber to the Beehiiv publication.
 * Called whenever someone signs up via the website form.
 */
export async function addBeehiivSubscriber(email: string, options: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    sendWelcomeEmail?: boolean;
    reactivateExisting?: boolean;
    referringUrl?: string;
} = {}): Promise<BeehiivSubscribeResponse> {
    const creds = getCredentials();
    if (!creds) {
        console.error('❌ Beehiiv not configured. Missing BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID');
        return { success: false, error: 'Beehiiv not configured' };
    }

    try {
        const endpoint = `${BEEHIIV_API_BASE}/publications/${creds.publicationId}/subscriptions`;
        console.log(`👤 Beehiiv: Adding subscriber ${email}`);

        const body: Record<string, unknown> = {
            email,
            reactivate_existing: options.reactivateExisting ?? true,
            send_welcome_email: options.sendWelcomeEmail ?? false,
            utm_source: options.utmSource || 'phuketradar_website',
            utm_medium: options.utmMedium || 'organic',
            utm_campaign: options.utmCampaign || 'website_signup',
        };
        if (options.referringUrl) body.referring_site = options.referringUrl;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: authHeaders(creds.apiKey),
            body: JSON.stringify(body),
        });

        const data = await response.json() as {
            data?: { id?: string; status?: string };
            errors?: Array<{ message: string }>;
        };

        if (!response.ok) {
            const errorMsg = data.errors?.[0]?.message || `HTTP ${response.status}`;
            console.error('❌ Beehiiv subscribe error:', data);
            return { success: false, error: errorMsg };
        }

        console.log(`✅ Beehiiv subscriber added: ${data.data?.id} (${data.data?.status})`);
        return { success: true, subscriberId: data.data?.id, status: data.data?.status };

    } catch (error) {
        console.error('❌ Failed to add Beehiiv subscriber:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

// ─── Newsletter Sending ───────────────────────────────────────────────────────

/**
 * Create and immediately send a newsletter post via Beehiiv's Posts API.
 *
 * @param subject     Email subject line
 * @param previewText Short preview text (shown in inbox preview)
 * @param bodyHtml    The full HTML body of the newsletter
 */
export async function sendBeehiivNewsletter(options: {
    subject: string;
    previewText: string;
    bodyHtml: string;
}): Promise<BeehiivPostResponse> {
    const creds = getCredentials();
    if (!creds) {
        console.error('❌ Beehiiv not configured. Missing BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID');
        return { success: false, error: 'Beehiiv not configured' };
    }

    try {
        const endpoint = `${BEEHIIV_API_BASE}/publications/${creds.publicationId}/posts`;
        console.log(`📧 Beehiiv: Creating newsletter post — "${options.subject}"`);

        const body = {
            subject: options.subject,
            preview_text: options.previewText,
            // "free" content tier — sent to all subscribers
            audience: 'free',
            // Immediately send (no scheduled_at = sends now)
            status: 'confirmed',
            // The email body HTML
            body_json: undefined, // use body_html instead
            body_byline: 'Phuket Radar',
            content_tags: ['daily-briefing'],
            send_at: undefined, // immediate send
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: authHeaders(creds.apiKey),
            body: JSON.stringify({
                subject: options.subject,
                preview_text: options.previewText,
                audience: 'free',
                status: 'confirmed',
                body_byline: 'Phuket Radar',
            }),
        });

        const data = await response.json() as {
            data?: { id?: string; web_url?: string; status?: string };
            errors?: Array<{ message: string }>;
        };

        if (!response.ok) {
            const errorMsg = data.errors?.[0]?.message || `HTTP ${response.status}: ${JSON.stringify(data)}`;
            console.error('❌ Beehiiv post creation failed:', data);
            return { success: false, error: errorMsg };
        }

        console.log(`✅ Beehiiv newsletter sent! Post ID: ${data.data?.id}, Status: ${data.data?.status}`);
        return {
            success: true,
            postId: data.data?.id,
            webUrl: data.data?.web_url,
        };

    } catch (error) {
        console.error('❌ Failed to send Beehiiv newsletter:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

// ─── Config ───────────────────────────────────────────────────────────────────

export function isBeehiivConfigured(): boolean {
    return !!(process.env.BEEHIIV_API_KEY && process.env.BEEHIIV_PUBLICATION_ID);
}

export function getBeehiivConfig() {
    return {
        isConfigured: isBeehiivConfigured(),
        apiKey: process.env.BEEHIIV_API_KEY ? '***configured***' : 'NOT SET',
        publicationId: process.env.BEEHIIV_PUBLICATION_ID || 'NOT SET',
    };
}
