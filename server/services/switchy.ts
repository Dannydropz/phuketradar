/**
 * Switchy URL Shortener Service
 * Creates branded short links with Meta Pixel retargeting and UTM tracking
 */

interface SwitchyLinkOptions {
    title?: string;           // Override OG title
    description?: string;     // Override OG description
    imageUrl?: string;        // Override OG image
    slug?: string;            // Custom short slug (optional)
    utmSource?: string;       // e.g., 'instagram', 'facebook'
    utmMedium?: string;       // e.g., 'social', 'story'
    utmCampaign?: string;     // e.g., 'bio_link', 'breaking_news'
}

interface SwitchyLink {
    id: string;
    shortUrl: string;
    originalUrl: string;
    title?: string;
    clicks?: number;
    createdAt?: string;
}

interface CreateLinkResponse {
    success: boolean;
    link?: SwitchyLink;
    error?: string;
}

class SwitchyService {
    private apiKey: string;
    private domain: string;
    private baseUrl = 'https://api.switchy.io/v1';

    constructor() {
        const apiKey = process.env.SWITCHY_API_KEY;
        const domain = process.env.SWITCHY_DOMAIN || 'go.phuketradar.com';

        if (!apiKey) {
            console.warn('[SWITCHY] SWITCHY_API_KEY not set. URL shortening will be disabled.');
        }
        this.apiKey = apiKey || '';
        this.domain = domain;
    }

    /**
     * Build a URL with UTM parameters
     */
    private buildUrlWithUtm(baseUrl: string, options: SwitchyLinkOptions): string {
        const url = new URL(baseUrl);

        if (options.utmSource) {
            url.searchParams.set('utm_source', options.utmSource);
        }
        if (options.utmMedium) {
            url.searchParams.set('utm_medium', options.utmMedium);
        }
        if (options.utmCampaign) {
            url.searchParams.set('utm_campaign', options.utmCampaign);
        }

        return url.toString();
    }

    /**
     * Extract or construct a short URL from the Switchy API response
     */
    private extractShortUrl(data: any, originalUrl: string): string | null {
        // Some response variations have a nested link object, some are flat
        const linkData = data.link || data;

        // 1. Try explicit shortUrl field
        if (linkData.shortUrl && linkData.shortUrl !== originalUrl) {
            return linkData.shortUrl;
        }

        // 2. Construct from domain + id (How raw Switchy API usually works)
        if (linkData.domain && linkData.id) {
            return `https://${linkData.domain}/${linkData.id}`;
        }

        return null;
    }

    /**
     * Create a shortened URL with optional UTM parameters and OG overrides
     */
    async createShortLink(
        originalUrl: string,
        options: SwitchyLinkOptions = {}
    ): Promise<CreateLinkResponse> {
        if (!this.apiKey) {
            return {
                success: false,
                error: 'SWITCHY_API_KEY not configured'
            };
        }

        try {
            // Build URL with UTM parameters
            const urlWithUtm = this.buildUrlWithUtm(originalUrl, options);



            console.log('[SWITCHY] Creating short link for:', urlWithUtm);

            const payload: Record<string, any> = {
                link: {
                    url: urlWithUtm,
                    domain: this.domain,
                    // Attach the Facebook Pixel automatically
                    pixels: [
                        { platform: 'facebook', value: '831369166474772' }
                    ]
                }
            };

            // Add optional overrides to the nested link object
            if (options.title) {
                payload.link.title = options.title;
            }
            if (options.description) {
                payload.link.description = options.description;
            }
            if (options.imageUrl) {
                payload.link.image = options.imageUrl;
            }
            if (options.slug) {
                payload.link.slug = options.slug;
            }

            const response = await fetch(`${this.baseUrl}/links/create`, {
                method: 'POST',
                headers: {
                    'Api-Authorization': this.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    success: false,
                    error: `API error: ${response.status} - ${errorText}`
                };
            }

            let data = await response.json();
            let shortUrl = this.extractShortUrl(data, urlWithUtm);

            // Fallback logic if the first attempt returned the long URL
            if (!shortUrl || shortUrl === urlWithUtm) {
                console.warn('[SWITCHY] First attempt failed. Trying fallback domain switchy.io...');

                // Retry with switchy.io if we aren't already using it
                if (this.domain !== 'switchy.io') {
                    const fallbackPayload = {
                        link: {
                            ...payload.link,
                            domain: 'switchy.io'
                        }
                    };
                    const fbRes = await fetch(`${this.baseUrl}/links/create`, {
                        method: 'POST',
                        headers: { 'Api-Authorization': this.apiKey, 'Content-Type': 'application/json' },
                        body: JSON.stringify(fallbackPayload),
                    });

                    if (fbRes.ok) {
                        const fbData = await fbRes.json();
                        const fbShortUrl = this.extractShortUrl(fbData, urlWithUtm);
                        if (fbShortUrl && fbShortUrl !== urlWithUtm) {
                            data = fbData;
                            shortUrl = fbShortUrl;
                        }
                    }
                }
            }

            if (!shortUrl || shortUrl === urlWithUtm) {
                return {
                    success: false,
                    error: 'API returned long URL instead of short URL.'
                };
            }

            return {
                success: true,
                link: {
                    id: data.id || (data.link && data.link.id),
                    shortUrl: shortUrl,
                    originalUrl: urlWithUtm,
                    title: options.title,
                    createdAt: data.createdAt || new Date().toISOString(),
                }
            };
        } catch (error) {
            console.error('[SWITCHY] Error creating short link:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Create a short link for an article with default UTM parameters for a specific platform
     */
    async createArticleLink(
        articleUrl: string,
        platform: 'instagram' | 'facebook' | 'threads' | 'newsletter' | 'bio',
        articleTitle?: string,
        articleImage?: string
    ): Promise<CreateLinkResponse> {
        const utmMap: Record<string, { source: string; medium: string; campaign: string }> = {
            instagram: { source: 'instagram', medium: 'social', campaign: 'organic_post' },
            facebook: { source: 'facebook', medium: 'social', campaign: 'organic_post' },
            threads: { source: 'threads', medium: 'social', campaign: 'organic_post' },
            newsletter: { source: 'newsletter', medium: 'email', campaign: 'daily_digest' },
            bio: { source: 'instagram', medium: 'social', campaign: 'bio_link' },
        };

        const utm = utmMap[platform] || utmMap.instagram;

        return this.createShortLink(articleUrl, {
            title: articleTitle,
            imageUrl: articleImage,
            utmSource: utm.source,
            utmMedium: utm.medium,
            utmCampaign: utm.campaign,
        });
    }

    /**
     * Check if Switchy is configured and available
     */
    isConfigured(): boolean {
        return !!this.apiKey;
    }
}

// Singleton instance
export const switchyService = new SwitchyService();
