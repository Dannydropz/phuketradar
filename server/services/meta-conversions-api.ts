/**
 * Meta Conversions API Service
 * Server-side event tracking for reliable conversion attribution
 * 
 * This complements the client-side Meta Pixel for better event matching.
 */

import crypto from 'crypto';

const META_PIXEL_ID = '831369166474772';
const META_API_VERSION = 'v18.0';

interface UserData {
    client_ip_address?: string;
    client_user_agent?: string;
    em?: string; // hashed email
    ph?: string; // hashed phone
    fbc?: string; // click id cookie
    fbp?: string; // browser id cookie
    country?: string;
}

interface CustomData {
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    content_type?: string;
    value?: number;
    currency?: string;
    search_string?: string;
}

interface ServerEvent {
    event_name: string;
    event_time: number;
    event_id?: string;
    event_source_url: string;
    action_source: 'website';
    user_data: UserData;
    custom_data?: CustomData;
}

// SHA-256 hash function for PII
function hashValue(value: string): string {
    return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

export class MetaConversionsAPI {
    private accessToken: string;
    private pixelId: string;
    private testEventCode?: string;

    constructor() {
        this.accessToken = process.env.META_ACCESS_TOKEN || '';
        this.pixelId = META_PIXEL_ID;
        this.testEventCode = process.env.META_TEST_EVENT_CODE; // Optional for testing

        if (!this.accessToken) {
            console.warn('[Meta CAPI] No META_ACCESS_TOKEN found - server-side tracking disabled');
        }
    }

    /**
     * Send an event to Meta's Conversions API
     */
    async sendEvent(event: ServerEvent): Promise<boolean> {
        if (!this.accessToken) {
            console.warn('[Meta CAPI] Skipping event - no access token configured');
            return false;
        }

        const url = `https://graph.facebook.com/${META_API_VERSION}/${this.pixelId}/events`;

        const payload: any = {
            data: [event],
            access_token: this.accessToken,
        };

        // Add test event code if in testing mode
        if (this.testEventCode) {
            payload.test_event_code = this.testEventCode;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('[Meta CAPI] Error sending event:', result);
                return false;
            }

            console.log(`[Meta CAPI] Event '${event.event_name}' sent successfully:`, result);
            return true;
        } catch (error) {
            console.error('[Meta CAPI] Failed to send event:', error);
            return false;
        }
    }

    /**
     * Track a PageView event
     */
    async trackPageView(params: {
        url: string;
        clientIp?: string;
        userAgent?: string;
        fbc?: string;
        fbp?: string;
    }): Promise<boolean> {
        const event: ServerEvent = {
            event_name: 'PageView',
            event_time: Math.floor(Date.now() / 1000),
            event_id: crypto.randomUUID(),
            event_source_url: params.url,
            action_source: 'website',
            user_data: {
                client_ip_address: params.clientIp,
                client_user_agent: params.userAgent,
                fbc: params.fbc,
                fbp: params.fbp,
            },
        };

        return this.sendEvent(event);
    }

    /**
     * Track a ViewContent event (article view)
     */
    async trackViewContent(params: {
        url: string;
        clientIp?: string;
        userAgent?: string;
        fbc?: string;
        fbp?: string;
        contentName: string;
        contentCategory?: string;
        contentId?: string;
    }): Promise<boolean> {
        const event: ServerEvent = {
            event_name: 'ViewContent',
            event_time: Math.floor(Date.now() / 1000),
            event_id: crypto.randomUUID(),
            event_source_url: params.url,
            action_source: 'website',
            user_data: {
                client_ip_address: params.clientIp,
                client_user_agent: params.userAgent,
                fbc: params.fbc,
                fbp: params.fbp,
            },
            custom_data: {
                content_name: params.contentName,
                content_category: params.contentCategory,
                content_ids: params.contentId ? [params.contentId] : undefined,
                content_type: 'article',
            },
        };

        return this.sendEvent(event);
    }

    /**
     * Track a Subscribe event (newsletter signup)
     */
    async trackSubscribe(params: {
        url: string;
        clientIp?: string;
        userAgent?: string;
        email?: string;
        fbc?: string;
        fbp?: string;
    }): Promise<boolean> {
        const event: ServerEvent = {
            event_name: 'Subscribe',
            event_time: Math.floor(Date.now() / 1000),
            event_id: crypto.randomUUID(),
            event_source_url: params.url,
            action_source: 'website',
            user_data: {
                client_ip_address: params.clientIp,
                client_user_agent: params.userAgent,
                em: params.email ? hashValue(params.email) : undefined,
                fbc: params.fbc,
                fbp: params.fbp,
            },
        };

        return this.sendEvent(event);
    }

    /**
     * Track a Search event
     */
    async trackSearch(params: {
        url: string;
        clientIp?: string;
        userAgent?: string;
        searchQuery: string;
        fbc?: string;
        fbp?: string;
    }): Promise<boolean> {
        const event: ServerEvent = {
            event_name: 'Search',
            event_time: Math.floor(Date.now() / 1000),
            event_id: crypto.randomUUID(),
            event_source_url: params.url,
            action_source: 'website',
            user_data: {
                client_ip_address: params.clientIp,
                client_user_agent: params.userAgent,
                fbc: params.fbc,
                fbp: params.fbp,
            },
            custom_data: {
                search_string: params.searchQuery,
            },
        };

        return this.sendEvent(event);
    }
}

// Singleton instance
export const metaConversionsAPI = new MetaConversionsAPI();
