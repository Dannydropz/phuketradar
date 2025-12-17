/**
 * Meta Pixel Tracking Hook
 * Use this hook to track custom events like Subscribe, ViewContent, etc.
 */

declare global {
    interface Window {
        fbq: (...args: any[]) => void;
    }
}

export type MetaEventName =
    | 'PageView'
    | 'ViewContent'
    | 'Search'
    | 'Subscribe'
    | 'Lead'
    | 'CompleteRegistration'
    | 'Contact';

export interface ViewContentParams {
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    content_type?: string;
    value?: number;
    currency?: string;
}

export interface SubscribeParams {
    value?: number;
    currency?: string;
    predicted_ltv?: number;
}

export interface SearchParams {
    search_string?: string;
    content_category?: string;
    content_ids?: string[];
}

export function useMetaPixel() {
    const trackEvent = (eventName: MetaEventName, params?: Record<string, any>) => {
        if (typeof window !== 'undefined' && window.fbq) {
            window.fbq('track', eventName, params);
        }
    };

    const trackViewContent = (params: ViewContentParams) => {
        trackEvent('ViewContent', params);
    };

    const trackSubscribe = (params?: SubscribeParams) => {
        trackEvent('Subscribe', params);
    };

    const trackSearch = (params: SearchParams) => {
        trackEvent('Search', params);
    };

    const trackLead = (params?: { value?: number; currency?: string }) => {
        trackEvent('Lead', params);
    };

    return {
        trackEvent,
        trackViewContent,
        trackSubscribe,
        trackSearch,
        trackLead,
    };
}

// Standalone function for use outside of React components
export function trackMetaEvent(eventName: MetaEventName, params?: Record<string, any>) {
    if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', eventName, params);
    }
}
